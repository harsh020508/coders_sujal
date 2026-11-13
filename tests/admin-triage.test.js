// LocalKaam - Admin Complaint Triage Test Suite
// Covers the new passcode-protected triage endpoints (GET/PATCH) and the
// client-side complaint lifecycle wiring in admin.js.

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// ---- browser mocks (same pattern as notifications.test.js) ----
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
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: { origin: 'http://localhost:3000', pathname: '/', protocol: 'http:' },
    history: { pushState: () => {}, replaceState: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({ style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, remove() {}, addEventListener() {} }),
    body: { appendChild() {} },
    getElementById: () => null,
    addEventListener: () => {},
    visibilityState: 'visible'
  };
}

const { server, getStore, setStore } = await import('../server.js');
const { AdminDashboard } = await import('../admin.js');

const PASSCODE = 'localkaam2024';

const seededComplaints = [
  {
    id: 'CMP-TRIAGE-1',
    customerId: 'c1',
    bookingId: 'BK-TRIAGE-1',
    category: 'did_not_arrive',
    description: 'Worker never showed up for the 10 AM cleaning slot.',
    incidentDate: '2026-11-10',
    resolutionRequest: 'Full refund',
    status: 'Submitted',
    statusHistory: [{ status: 'Submitted', timestamp: '2026-11-10T09:00:00.000Z', note: 'Complaint submitted' }],
    createdAt: '2026-11-10T09:00:00.000Z'
  },
  {
    id: 'CMP-TRIAGE-2',
    customerId: 'c2',
    customer_id: 'c2',
    bookingId: 'BK-TRIAGE-2',
    category: 'poor_quality',
    description: 'AC repair failed again within two days.',
    incidentDate: '2026-11-11',
    status: 'Under Review',
    statusHistory: [
      { status: 'Submitted', timestamp: '2026-11-11T10:00:00.000Z', note: 'Complaint submitted' },
      { status: 'Under Review', timestamp: '2026-11-12T08:00:00.000Z', note: 'Updated by admin' }
    ],
    createdAt: '2026-11-11T10:00:00.000Z'
  }
];

let testServer;
let baseUrl;
let originalComplaints;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (_) {}
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test.before(async () => {
  await new Promise((resolve) => {
    testServer = server.listen(0, '127.0.0.1', () => {
      const addr = testServer.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
  originalComplaints = getStore('localkaam_complaints', null);
  setStore('localkaam_complaints', seededComplaints);
});

test.after(async () => {
  // Restore the pre-test state; never leave a null row behind (a missing
  // row is fine — getStore falls back to INITIAL_COMPLAINTS)
  setStore('localkaam_complaints', Array.isArray(originalComplaints) ? originalComplaints : []);
  await new Promise((resolve) => testServer.close(resolve));
});

// ---------- server-side triage endpoints ----------

test('GET /api/admin/complaints requires the admin passcode', async () => {
  const res = await request('GET', '/api/admin/complaints');
  assert.equal(res.status, 401);
});

test('GET /api/admin/complaints rejects a wrong passcode', async () => {
  const res = await request('GET', '/api/admin/complaints', null, { 'X-Admin-Passcode': 'wrong' });
  assert.equal(res.status, 401);
});

test('GET /api/admin/complaints returns all complaints with the passcode', async () => {
  const res = await request('GET', '/api/admin/complaints', null, { 'X-Admin-Passcode': PASSCODE });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body), 'returns an array');
  assert.ok(res.body.some(c => c.id === 'CMP-TRIAGE-1'), 'seeded complaint present');
  assert.ok(res.body.some(c => c.id === 'CMP-TRIAGE-2'), 'second seeded complaint present');
});

test('PATCH unknown complaint returns 404', async () => {
  const res = await request('PATCH', '/api/admin/complaints/CMP-DOES-NOT-EXIST',
    { status: 'Resolved' }, { 'X-Admin-Passcode': PASSCODE });
  assert.equal(res.status, 404);
  assert.match(res.body.error, /not found/i);
});

test('PATCH updates status, appends statusHistory, and saves admin notes', async () => {
  const res = await request('PATCH', '/api/admin/complaints/CMP-TRIAGE-1',
    { status: 'Under Review', adminNotes: 'Contacting the worker for their side.' },
    { 'X-Admin-Passcode': PASSCODE });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'Under Review');
  assert.equal(res.body.adminNotes, 'Contacting the worker for their side.');
  assert.ok(Array.isArray(res.body.statusHistory), 'statusHistory present');
  const last = res.body.statusHistory[res.body.statusHistory.length - 1];
  assert.equal(last.status, 'Under Review', 'history appended');
  assert.equal(last.note, 'Contacting the worker for their side.');
  assert.ok(last.timestamp, 'history entry has a timestamp');
});

test('PATCH ignores fields outside the allowlist', async () => {
  const before = (await request('GET', '/api/admin/complaints', null, { 'X-Admin-Passcode': PASSCODE }))
    .body.find(c => c.id === 'CMP-TRIAGE-2');
  const res = await request('PATCH', '/api/admin/complaints/CMP-TRIAGE-2',
    { description: 'HACKED', customerId: 'c-attacker', status: 'Resolved' },
    { 'X-Admin-Passcode': PASSCODE });
  assert.equal(res.status, 200);
  assert.equal(res.body.description, before.description, 'description unchanged');
  assert.equal(res.body.customerId, before.customerId, 'customerId unchanged');
  assert.equal(res.body.status, 'Resolved', 'allowed field did change');
});

test('PATCH without a status change does not append duplicate history', async () => {
  const before = (await request('GET', '/api/admin/complaints', null, { 'X-Admin-Passcode': PASSCODE }))
    .body.find(c => c.id === 'CMP-TRIAGE-2');
  const historyLen = before.statusHistory.length;
  const res = await request('PATCH', '/api/admin/complaints/CMP-TRIAGE-2',
    { adminNotes: 'Note only, no status change.' }, { 'X-Admin-Passcode': PASSCODE });
  assert.equal(res.status, 200);
  assert.equal(res.body.statusHistory.length, historyLen, 'history unchanged');
  assert.equal(res.body.adminNotes, 'Note only, no status change.');
});

// ---------- client-side lifecycle wiring ----------

test('AdminDashboard lifecycle: statuses are unique and actions target valid statuses', () => {
  const statuses = AdminDashboard.COMPLAINT_STATUSES;
  assert.equal(new Set(statuses).size, statuses.length, 'no duplicate statuses');
  assert.equal(statuses.length, 5, 'five lifecycle states');

  for (const [from, actions] of Object.entries(AdminDashboard._COMPLAINT_ACTIONS)) {
    assert.ok(statuses.includes(from), `${from} is a known status`);
    assert.ok(actions.length > 0, `${from} offers at least one action`);
    for (const a of actions) {
      assert.ok(statuses.includes(a.to), `${from} → ${a.to} is a valid transition`);
      assert.notEqual(from, a.to, `${from} has no self-transition`);
    }
  }
});

test('AdminDashboard triage state: open-complaints logic excludes Resolved/Closed', () => {
  const complaints = [
    { id: 'A', status: 'Submitted' },
    { id: 'B', status: 'Under Review' },
    { id: 'C', status: 'Awaiting Response' },
    { id: 'D', status: 'Resolved' },
    { id: 'E', status: 'Closed' }
  ];
  const open = complaints.filter(c => !['Resolved', 'Closed'].includes(c.status));
  assert.equal(open.length, 3, 'only Submitted/Under Review/Awaiting count as open');
});

test('AdminDashboard: badge helper renders markup for every lifecycle status', () => {
  for (const status of AdminDashboard.COMPLAINT_STATUSES) {
    const badge = AdminDashboard._complaintStatusBadge(status);
    assert.match(badge, /<span/, `${status} badge is a span`);
    assert.ok(badge.includes(status), `${status} badge contains its label`);
  }
  const unknown = AdminDashboard._complaintStatusBadge('Mystery');
  assert.match(unknown, /#e0e7ff/, 'unknown status falls back to Submitted styling');
  assert.ok(unknown.includes('Mystery'), 'unknown status keeps its real label');
});

// ---------- render smoke tests (no DOM: container is a stub) ----------

function makeFakeContainer() {
  return {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

const smokeWorkers = [{
  id: 'w1', name: 'Rajesh Kumar', phone: '+91 98211 44551', avatar: '',
  verificationStatus: 'Pending', specialities: { cleaning: true },
  serviceArea: 'Andheri West', uploadedDocs: [], adminNotes: ''
}];

test('render: complaints tab renders triage header, filter chips and complaint cards', () => {
  const container = makeFakeContainer();
  Object.assign(AdminDashboard, {
    _workers: smokeWorkers,
    _complaints: [seededComplaints[0]],
    _currentTab: 'complaints',
    _currentFilter: 'all',
    _complaintFilter: 'all',
    _searchQuery: '',
    _selectedWorkerId: null,
    _selectedComplaintId: null
  });
  AdminDashboard._renderDashboard(container);

  assert.match(container.innerHTML, /Complaint Triage/, 'complaints header');
  assert.match(container.innerHTML, /admin-complaint-filter/, 'status filter chips');
  assert.match(container.innerHTML, /admin-complaint-card/, 'complaint card');
  assert.match(container.innerHTML, /CMP-TRIAGE-1/, 'seeded complaint rendered');
  assert.match(container.innerHTML, /Worker never showed up/, 'description snippet');
  assert.match(container.innerHTML, /BK-TRIAGE-1/, 'booking reference');
  assert.doesNotMatch(container.innerHTML, /undefined/, 'no broken interpolation');
  assert.doesNotMatch(container.innerHTML, /\[object/, 'no object-to-string bugs');
});

test('render: verification tab still renders worker cards, no complaint chrome', () => {
  const container = makeFakeContainer();
  Object.assign(AdminDashboard, {
    _workers: smokeWorkers,
    _complaints: [seededComplaints[0]],
    _currentTab: 'verification',
    _currentFilter: 'all',
    _complaintFilter: 'all',
    _searchQuery: '',
    _selectedWorkerId: null,
    _selectedComplaintId: null
  });
  AdminDashboard._renderDashboard(container);

  assert.match(container.innerHTML, /Worker Document Verification/, 'verification header');
  assert.match(container.innerHTML, /admin-worker-card/, 'worker card present');
  assert.match(container.innerHTML, /Rajesh Kumar/, 'worker name');
  assert.doesNotMatch(container.innerHTML, /admin-complaint-filter/, 'no complaint chips on verification tab');
  assert.doesNotMatch(container.innerHTML, /undefined/, 'no broken interpolation');
});

test('render: complaints tab with an unmatched filter shows the empty state', () => {
  const container = makeFakeContainer();
  Object.assign(AdminDashboard, {
    _workers: smokeWorkers,
    _complaints: [seededComplaints[0]], // status Submitted
    _currentTab: 'complaints',
    _currentFilter: 'all',
    _complaintFilter: 'Closed',        // nothing matches
    _searchQuery: '',
    _selectedWorkerId: null,
    _selectedComplaintId: null
  });
  AdminDashboard._renderDashboard(container);
  assert.match(container.innerHTML, /No complaints found/, 'friendly empty state');
});

test('render: complaint triage panel renders actions for the current status', () => {
  const complaint = { ...seededComplaints[0], adminNotes: '' };
  AdminDashboard._complaints = [complaint];
  AdminDashboard._currentTab = 'complaints';

  const container = makeFakeContainer();
  AdminDashboard._openComplaintPanel(container, complaint); // early-returns without a panel node…

  // With a panel stub the full markup path runs
  const panel = { style: {}, innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const container2 = {
    innerHTML: '',
    querySelector: (sel) => (sel === '#admin-detail-panel' ? panel : null),
    querySelectorAll: () => []
  };
  AdminDashboard._openComplaintPanel(container2, complaint);

  assert.match(panel.innerHTML, /Complaint Triage/, 'panel header');
  assert.match(panel.innerHTML, /Customer Report/, 'customer report section');
  assert.match(panel.innerHTML, /Status Timeline/, 'timeline section');
  assert.match(panel.innerHTML, /Start Review/, 'Submitted offers Start Review');
  assert.match(panel.innerHTML, /Awaiting Customer/, 'Submitted offers Awaiting Customer');
  assert.doesNotMatch(panel.innerHTML, /undefined/, 'no broken interpolation in panel');

  // Resolved state offers Close
  const resolved = { ...complaint, status: 'Resolved' };
  const panel2 = { style: {}, innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const container3 = {
    innerHTML: '',
    querySelector: (sel) => (sel === '#admin-detail-panel' ? panel2 : null),
    querySelectorAll: () => []
  };
  AdminDashboard._openComplaintPanel(container3, resolved);
  assert.match(panel2.innerHTML, /Close Complaint/, 'Resolved offers Close');

  // Closed state offers Reopen
  const closed = { ...complaint, status: 'Closed' };
  const panel3 = { style: {}, innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const container4 = {
    innerHTML: '',
    querySelector: (sel) => (sel === '#admin-detail-panel' ? panel3 : null),
    querySelectorAll: () => []
  };
  AdminDashboard._openComplaintPanel(container4, closed);
  assert.match(panel3.innerHTML, /Reopen Complaint/, 'Closed offers Reopen');

  // State bookkeeping
  assert.equal(AdminDashboard._selectedComplaintId, closed.id, 'selected complaint tracked');
});

// ---------- fix verification: details shape, demo seeds, live sync ----------

test('admin triage renders customer-filed complaints that use the details field', () => {
  const container = makeFakeContainer();
  const customerShaped = {
    id: 'CMP-CUST-1',
    bookingId: 'BK-10381',
    customerName: 'Aarav Mehta',
    issue: 'incomplete_service',
    category: 'incomplete_service',
    details: 'Two switchboard points were still dead when he left.',
    status: 'Submitted',
    incidentDate: '2026-11-05',
    createdAt: '2026-11-05T14:30:00.000Z',
    statusHistory: [{ status: 'Submitted', timestamp: '2026-11-05T14:30:00.000Z', note: 'Complaint submitted' }]
  };
  Object.assign(AdminDashboard, {
    _workers: smokeWorkers,
    _complaints: [customerShaped],
    _currentTab: 'complaints',
    _currentFilter: 'all',
    _complaintFilter: 'all',
    _searchQuery: '',
    _selectedWorkerId: null,
    _selectedComplaintId: null
  });
  AdminDashboard._renderDashboard(container);
  assert.match(container.innerHTML, /Two switchboard points were still dead/, 'details text rendered');
  assert.match(container.innerHTML, /Aarav Mehta/, 'customerName shown');
  assert.doesNotMatch(container.innerHTML, /undefined/, 'no broken interpolation');
});

test('demo complaint seeds are internally consistent and cover the lifecycle', async () => {
  const { INITIAL_COMPLAINTS, COMPLAINT_CATEGORIES } = await import('../data.js');
  assert.ok(INITIAL_COMPLAINTS.length >= 3, 'demo complaints seeded');
  const statusSet = new Set(AdminDashboard.COMPLAINT_STATUSES);
  for (const c of INITIAL_COMPLAINTS) {
    assert.match(c.id, /^CMP-/, `${c.id} id format`);
    assert.ok(statusSet.has(c.status), `${c.id} has a valid status`);
    assert.ok(COMPLAINT_CATEGORIES.some(x => x.id === c.category), `${c.id} has a valid category`);
    assert.ok(Array.isArray(c.statusHistory) && c.statusHistory.length > 0, `${c.id} has history`);
    assert.equal(c.statusHistory[c.statusHistory.length - 1].status, c.status, `${c.id} history matches status`);
    assert.ok(c.details, `${c.id} has a description`);
  }
  const statuses = new Set(INITIAL_COMPLAINTS.map(c => c.status));
  assert.ok(
    statuses.has('Submitted') && statuses.has('Under Review') && statuses.has('Resolved'),
    'demo covers Submitted, Under Review and Resolved stages'
  );
});

test('StorageService.applyServerSync updates the local cache and rejects bad input', async () => {
  const { StorageService } = await import('../storage.js');
  const complaints = [{ id: 'CMP-SYNC-1', status: 'Resolved', details: 'x' }];
  assert.equal(StorageService.applyServerSync('complaints', complaints), true, 'applied');
  assert.deepEqual(StorageService.getComplaints(), complaints, 'cache updated');
  assert.equal(StorageService.applyServerSync('complaints', 'not-an-array'), false, 'rejects non-arrays');
  assert.equal(StorageService.applyServerSync('unknown-type', []), false, 'rejects unknown types');
});

test('NotificationService applies COMPLAINTS_UPDATED / WORKERS_UPDATED sync broadcasts', async () => {
  const listeners = new Map();
  class SyncMockEventSource {
    constructor(url) { this.url = url; this.onerror = null; this.onopen = null; }
    close() {}
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    }
  }
  const prevES = globalThis.EventSource;
  globalThis.EventSource = SyncMockEventSource;

  try {
    const { NotificationService } = await import('../notificationService.js');
    const { StorageService } = await import('../storage.js');
    NotificationService.disconnect();
    NotificationService.connectRealtime('sync-user');

    const syncFns = listeners.get('sync') || [];
    assert.ok(syncFns.length >= 1, 'sync listener bound on the SSE source');

    const complaintsBroadcast = {
      data: JSON.stringify({
        type: 'COMPLAINTS_UPDATED',
        key: 'localkaam_complaints',
        value: [{ id: 'CMP-B-1', status: 'Closed', details: 'd' }]
      })
    };
    syncFns.forEach(fn => fn(complaintsBroadcast));
    assert.ok(
      StorageService.getComplaints().some(c => c.id === 'CMP-B-1' && c.status === 'Closed'),
      'complaint broadcast applied to the local cache'
    );

    const workersBroadcast = {
      data: JSON.stringify({
        type: 'WORKERS_UPDATED',
        key: 'localkaam_workers',
        value: [{ id: 'w-sync', name: 'Synced Worker' }]
      })
    };
    syncFns.forEach(fn => fn(workersBroadcast));
    assert.ok(
      StorageService.getWorkers().some(w => w.id === 'w-sync'),
      'workers broadcast applied to the local cache'
    );

    // Malformed payloads are swallowed, never thrown
    assert.doesNotThrow(() => syncFns.forEach(fn => fn({ data: 'not json' })));
    assert.doesNotThrow(() => syncFns.forEach(fn => fn({ data: JSON.stringify({ type: 'OTHER' }) })));
  } finally {
    globalThis.EventSource = prevES;
    const { NotificationService } = await import('../notificationService.js');
    NotificationService.disconnect();
  }
});
