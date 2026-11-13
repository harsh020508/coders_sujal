// LocalKaam - Comprehensive Rate Limiting Automated Test Suite
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  server,
  checkBucketRateLimit,
  resolveRateLimitBucket,
  getClientIp,
  clearAllRateLimits,
  RATE_LIMIT_CONFIGS,
  rateLimitBuckets
} from '../server.js';

let testServer;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    testServer = server.listen(0, '127.0.0.1', () => {
      const addr = testServer.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  clearAllRateLimits();
  await new Promise((resolve) => {
    testServer.close(resolve);
  });
});

test.beforeEach(() => {
  clearAllRateLimits();
});

test('1. Rate Limiter: Bucket resolves correctly for various endpoints', () => {
  assert.equal(resolveRateLimitBucket('/api/analyze-photo'), 'ai');
  assert.equal(resolveRateLimitBucket('/api/customer-care'), 'ai');
  assert.equal(resolveRateLimitBucket('/api/bookings/BK-123/verify-arrival'), 'otpVerify');
  assert.equal(resolveRateLimitBucket('/api/bookings/BK-123/resend-arrival-otp'), 'otpAction');
  assert.equal(resolveRateLimitBucket('/api/bookings/BK-123/generate-arrival-otp'), 'otpAction');
  assert.equal(resolveRateLimitBucket('/api/workers'), 'general');
  assert.equal(resolveRateLimitBucket('/api/notifications'), 'general');
});

test('2. Rate Limiter: IP extraction handles direct, proxies, and IPv6 loopback', () => {
  const req1 = { headers: {}, socket: { remoteAddress: '192.168.1.100' } };
  assert.equal(getClientIp(req1), '192.168.1.100');

  const req2 = { headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' }, socket: {} };
  assert.equal(getClientIp(req2), '203.0.113.195');

  const req3 = { headers: {}, socket: { remoteAddress: '::ffff:192.168.1.50' } };
  assert.equal(getClientIp(req3), '192.168.1.50');

  const req4 = { headers: {}, socket: { remoteAddress: '::1' } };
  assert.equal(getClientIp(req4), '127.0.0.1');
});

test('3. Rate Limiter Unit: Sliding window enforces max limit and returns remaining count', () => {
  const testIp = '10.0.0.1';
  const max = 3;
  const windowMs = 5000;

  const r1 = checkBucketRateLimit('general', testIp, max, windowMs);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);

  const r2 = checkBucketRateLimit('general', testIp, max, windowMs);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 1);

  const r3 = checkBucketRateLimit('general', testIp, max, windowMs);
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);

  // 4th request must be rejected
  const r4 = checkBucketRateLimit('general', testIp, max, windowMs);
  assert.equal(r4.allowed, false);
  assert.equal(r4.remaining, 0);
  assert.ok(r4.retryAfter > 0);
  assert.ok(r4.message.includes('Rate limit exceeded'));
});

test('4. Rate Limiter Unit: Sliding window resets after window expires', async () => {
  const testIp = '10.0.0.2';
  const max = 2;
  const windowMs = 40; // 40ms window for fast test

  assert.equal(checkBucketRateLimit('general', testIp, max, windowMs).allowed, true);
  assert.equal(checkBucketRateLimit('general', testIp, max, windowMs).allowed, true);
  assert.equal(checkBucketRateLimit('general', testIp, max, windowMs).allowed, false);

  // Wait for window to expire
  await new Promise((resolve) => setTimeout(resolve, 60));

  // Should now be allowed again
  const refreshed = checkBucketRateLimit('general', testIp, max, windowMs);
  assert.equal(refreshed.allowed, true);
  assert.equal(refreshed.remaining, 1);
});

test('5. Rate Limiter Unit: Isolation across distinct IPs', () => {
  const ip1 = '192.168.0.1';
  const ip2 = '192.168.0.2';
  const max = 1;

  assert.equal(checkBucketRateLimit('general', ip1, max, 60000).allowed, true);
  assert.equal(checkBucketRateLimit('general', ip1, max, 60000).allowed, false);

  // ip2 must still be allowed
  assert.equal(checkBucketRateLimit('general', ip2, max, 60000).allowed, true);
});

test('6. HTTP Rate Limiting: General API returns 429 with RFC 6585 headers when exceeded', async () => {
  const max = RATE_LIMIT_CONFIGS.general.max;
  const targetUrl = `${baseUrl}/api/bootstrap`;

  // Exhaust limit
  for (let i = 0; i < max; i++) {
    rateLimitBuckets.general.get('127.0.0.1') || rateLimitBuckets.general.set('127.0.0.1', []);
    rateLimitBuckets.general.get('127.0.0.1').push(Date.now());
  }

  const res = await fetch(targetUrl, {
    headers: { 'x-test-rate-limit': '1' }
  });

  assert.equal(res.status, 429);
  assert.ok(res.headers.get('retry-after'));
  assert.equal(res.headers.get('x-ratelimit-remaining'), '0');
  assert.equal(res.headers.get('x-ratelimit-limit'), String(max));

  const body = await res.json();
  assert.ok(body.error.includes('Rate limit exceeded'));
  assert.ok(body.retryAfter >= 1);
});

test('7. HTTP Rate Limiting: AI endpoint enforces strict 25 req/min limit', async () => {
  const aiMax = RATE_LIMIT_CONFIGS.ai.max;
  const targetUrl = `${baseUrl}/api/customer-care`;

  // Pre-fill the AI bucket up to limit
  const bucket = rateLimitBuckets.ai;
  bucket.set('127.0.0.1', Array.from({ length: aiMax }, () => Date.now()));

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-rate-limit': '1'
    },
    body: JSON.stringify({ message: 'How do I book a plumber?' })
  });

  assert.equal(res.status, 429);
  const body = await res.json();
  assert.ok(body.error.includes('AI Operations'));
  assert.equal(res.headers.get('x-ratelimit-limit'), String(aiMax));
});

test('8. HTTP Rate Limiting: OTP verification enforces strict 15 req/min limit', async () => {
  const otpMax = RATE_LIMIT_CONFIGS.otpVerify.max;
  const targetUrl = `${baseUrl}/api/bookings/BK-TEST-123/verify-arrival`;

  // Pre-fill otpVerify bucket
  rateLimitBuckets.otpVerify.set('127.0.0.1', Array.from({ length: otpMax }, () => Date.now()));

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-rate-limit': '1'
    },
    body: JSON.stringify({ otp: '123456' })
  });

  assert.equal(res.status, 429);
  const body = await res.json();
  assert.ok(body.error.includes('Arrival OTP Verification'));
  assert.equal(res.headers.get('x-ratelimit-limit'), String(otpMax));
});

test('9. HTTP Rate Limiting: Successful responses include rate limit headers', async () => {
  const res = await fetch(`${baseUrl}/api/health`, {
    headers: { 'x-test-rate-limit': '1' }
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-ratelimit-limit'), String(RATE_LIMIT_CONFIGS.general.max));
  assert.ok(res.headers.get('x-ratelimit-remaining'));
  assert.ok(res.headers.get('x-ratelimit-reset'));
});

test('10. Performance & Compression: Static JS assets served with ETag and gzip support', async () => {
  const res = await fetch(`${baseUrl}/app.js`, {
    headers: { 'Accept-Encoding': 'gzip' }
  });

  assert.equal(res.status, 200);
  assert.ok(res.headers.get('etag'), 'Has ETag header');
  assert.equal(res.headers.get('content-encoding'), 'gzip', 'Gzip compressed');

  const etag = res.headers.get('etag');

  // Second request with If-None-Match should return 304 Not Modified
  const res304 = await fetch(`${baseUrl}/app.js`, {
    headers: { 'If-None-Match': etag }
  });

  assert.equal(res304.status, 304);
});
