// LocalKaam - SSE Downgrade Resilience Test Suite
// Verifies that the notification service stops retrying /api/events after
// repeated failures (static hosting parity) instead of retrying forever,
// and that it recovers when the network/tab returns or the backend starts.

import test from 'node:test';
import assert from 'node:assert/strict';

// Setup minimal browser mocks (same pattern as notifications.test.js)
const mockStorage = new Map();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear()
  };
}
if (typeof globalThis.sessionStorage === 'undefined') {
  const sessionMap = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => sessionMap.get(k) || null,
    setItem: (k, v) => sessionMap.set(k, String(v)),
    removeItem: (k) => sessionMap.delete(k),
    clear: () => sessionMap.clear()
  };
}

const windowListeners = new Map();
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: { origin: 'http://localhost:3000', pathname: '/', protocol: 'http:' },
    history: { pushState: () => {}, replaceState: () => {} },
    addEventListener: (type, fn) => {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(fn);
    },
    removeEventListener: () => {}
  };
}

const documentListeners = new Map();
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({ style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, remove() {}, addEventListener() {} }),
    body: { appendChild() {} },
    getElementById: () => null,
    addEventListener: (type, fn) => {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(fn);
    },
    visibilityState: 'visible'
  };
}

// Mock EventSource that fails on demand (mimics a 404 endpoint)
const esInstances = [];
class MockEventSource {
  constructor(url) {
    this.url = url;
    this.closed = false;
    this.onerror = null;
    this.onopen = null;
    esInstances.push(this);
  }
  close() { this.closed = true; }
  addEventListener() {}
  fail() { if (this.onerror) this.onerror(new Error('connection failed')); }
  open() { if (this.onopen) this.onopen(); }
}

globalThis.EventSource = MockEventSource;

const { NotificationService } = await import('../notificationService.js');

// Stub setTimeout during simulated failures so backoff timers never run
// (keeps the test process from waiting on pending 1s-16s timers).
const realSetTimeout = globalThis.setTimeout;
const scheduledTimers = [];
function stubTimers() {
  scheduledTimers.length = 0;
  globalThis.setTimeout = (fn, ms) => {
    scheduledTimers.push({ fn, ms });
    return { stubbed: true }; // truthy handle so reconnect guard works
  };
}
function restoreTimers() {
  globalThis.setTimeout = realSetTimeout;
}

test('SSE downgrades after max consecutive failures instead of retrying forever', () => {
  NotificationService.disconnect();
  NotificationService.sseMaxFailures = 5;
  stubTimers();

  NotificationService.connectRealtime('user-sse-1');
  assert.equal(esInstances.length, 1, 'first connection attempt creates an EventSource');

  // Fail 4 times — still retrying (backoff timers scheduled and elapsing)
  for (let i = 1; i <= 4; i++) {
    esInstances[esInstances.length - 1].fail();
    assert.equal(NotificationService.sseFailures, i, `failure ${i} recorded`);
    assert.equal(NotificationService.sseDowngraded, false, `not downgraded after ${i} failures`);
    assert.equal(scheduledTimers.length, 1, `backoff timer scheduled after failure ${i}`);
    const timer = scheduledTimers[0];
    scheduledTimers.length = 0;
    timer.fn(); // simulate the backoff elapsing → next attempt
  }

  // 5th failure triggers the downgrade — no more EventSource churn
  esInstances[esInstances.length - 1].fail();
  assert.equal(NotificationService.sseDowngraded, true, 'downgraded after max failures');
  assert.equal(NotificationService.eventSource, null, 'no open EventSource after downgrade');
  assert.equal(esInstances.length, 5, 'exactly one EventSource per attempt, no extras');
  assert.equal(scheduledTimers.length, 0, 'no backoff timer scheduled after downgrade');

  restoreTimers();
  NotificationService.disconnect();
});

test('backoff delay doubles with each failure up to the max', () => {
  NotificationService.disconnect();
  NotificationService.sseMaxFailures = 10;
  stubTimers();

  NotificationService.connectRealtime('user-sse-backoff');
  const delays = [];
  for (let i = 1; i <= 4; i++) {
    esInstances[esInstances.length - 1].fail();
    delays.push(scheduledTimers[scheduledTimers.length - 1]?.ms);
    const timer = scheduledTimers[0];
    scheduledTimers.length = 0;
    timer.fn(); // elapse backoff → next attempt
  }
  assert.deepEqual(delays, [1000, 2000, 4000, 8000], 'exponential backoff 1s..8s');

  restoreTimers();
  NotificationService.disconnect();
});

test('connectRealtime while downgraded does not open a new SSE connection', () => {
  NotificationService.disconnect();
  NotificationService.sseMaxFailures = 3;
  stubTimers();

  NotificationService.connectRealtime('user-sse-2');
  for (let i = 0; i < 3; i++) esInstances[esInstances.length - 1].fail();
  assert.equal(NotificationService.sseDowngraded, true, 'precondition: downgraded');

  const before = esInstances.length;
  NotificationService.connectRealtime('user-sse-2');
  assert.equal(esInstances.length, before, 'no new EventSource while downgraded');

  restoreTimers();
  NotificationService.disconnect();
});

test('successful open resets failure state (local server comes back)', () => {
  NotificationService.disconnect();
  NotificationService.sseMaxFailures = 2;
  stubTimers();

  NotificationService.connectRealtime('user-sse-3');
  esInstances[esInstances.length - 1].fail();
  assert.equal(NotificationService.sseFailures, 1, 'one failure recorded');

  esInstances[esInstances.length - 1].open();
  assert.equal(NotificationService.sseFailures, 0, 'open resets failure count');
  assert.equal(NotificationService.sseDowngraded, false, 'open clears downgrade');

  restoreTimers();
  NotificationService.disconnect();
});

test('network-retry listener binds once and reconnects exactly once', () => {
  NotificationService.disconnect();
  NotificationService.sseMaxFailures = 1;
  windowListeners.clear();
  documentListeners.clear();
  stubTimers();

  NotificationService.connectRealtime('user-sse-4');
  esInstances[esInstances.length - 1].fail(); // immediate downgrade
  assert.equal(NotificationService.sseDowngraded, true, 'downgraded');
  assert.equal(NotificationService.sseRetryBound, true, 'retry listener bound');

  // Duplicate binds must be ignored
  NotificationService._bindSseNetworkRetry('user-sse-4');
  assert.equal(NotificationService.sseRetryBound, true, 'still bound once');

  // Fire the online event → single reconnect attempt
  const onlineFns = windowListeners.get('online') || [];
  assert.equal(onlineFns.length, 1, 'exactly one online listener');
  const before = esInstances.length;
  onlineFns.forEach(fn => fn());
  assert.equal(NotificationService.sseDowngraded, false, 'downgrade cleared after retry');
  assert.equal(esInstances.length, before + 1, 'exactly one new SSE attempt after online event');

  restoreTimers();
  NotificationService.disconnect();
});

test('disconnect resets SSE failure and downgrade state', () => {
  NotificationService.disconnect();
  NotificationService.sseMaxFailures = 1;
  stubTimers();

  NotificationService.connectRealtime('user-sse-5');
  esInstances[esInstances.length - 1].fail();
  assert.equal(NotificationService.sseDowngraded, true, 'precondition: downgraded');

  restoreTimers();
  NotificationService.disconnect();
  assert.equal(NotificationService.sseFailures, 0, 'failures reset');
  assert.equal(NotificationService.sseDowngraded, false, 'downgrade reset');
});
