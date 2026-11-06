// LocalKaam - Comprehensive Booking Arrival OTP Verification Test Suite
// Covers all scenarios specified in Section 10 of the implementation prompt

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';

import {
  server,
  stmtUpsertOtp,
  stmtGetOtpByBooking,
  stmtConsumeOtp,
  stmtClearOtps,
  stmtIncrementAttempts,
  setStore,
  getStore
} from '../server.js';
const TEST_JWT_SECRET = 'localkaam-super-secret-jwt-key-32chars!';
process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;

function createSignedJwt(payload, secret = TEST_JWT_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
  return `${headerB64}.${payloadB64}.${signature}`;
}

const customerUser = {
  sub: 'c_user_123',
  email: 'customer@localkaam.in',
  role: 'customer',
  exp: Math.floor(Date.now() / 1000) + 3600
};

const workerUser = {
  sub: 'w_user_456',
  email: 'worker@localkaam.in',
  role: 'worker',
  exp: Math.floor(Date.now() / 1000) + 3600
};

const otherWorkerUser = {
  sub: 'w_user_999',
  email: 'other_worker@localkaam.in',
  role: 'worker',
  exp: Math.floor(Date.now() / 1000) + 3600
};

const customerToken = createSignedJwt(customerUser);
const workerToken = createSignedJwt(workerUser);
const otherWorkerToken = createSignedJwt(otherWorkerUser);

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
  await new Promise((resolve) => {
    testServer.close(resolve);
  });
});

test.beforeEach(() => {
  stmtClearOtps.run();
});

test('1. OTP Generation after worker acceptance succeeds', async () => {
  const booking = {
    id: 'BK_TEST_01',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    customerPhone: '+91 98765 43210',
    status: 'Confirmed'
  };
  setStore('localkaam_bookings', [booking]);

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_01/generate-arrival-otp`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${workerToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.expiresAt);

  const row = stmtGetOtpByBooking.get('BK_TEST_01');
  assert.ok(row);
  assert.equal(row.booking_id, 'BK_TEST_01');
  assert.equal(row.attempts, 0);
  assert.equal(row.consumed_at, null);
  assert.equal(row.otp_hash.length, 64); // SHA-256 hex length
});

test('2. No OTP generation before acceptance (status = Pending confirmation)', async () => {
  const booking = {
    id: 'BK_TEST_02',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    customerPhone: '+91 98765 43210',
    status: 'Pending confirmation'
  };
  setStore('localkaam_bookings', [booking]);

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_02/generate-arrival-otp`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${workerToken}` }
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /only be generated for accepted bookings/i);
});

test('3. Valid OTP verification successfully marks booking as "Worker arrived"', async () => {
  const booking = {
    id: 'BK_TEST_03',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    status: 'Worker en route'
  };
  setStore('localkaam_bookings', [booking]);

  const plainOtp = '123456';
  const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
  const now = Date.now();

  stmtUpsertOtp.run(
    'otp_03',
    'BK_TEST_03',
    customerUser.sub,
    workerUser.sub,
    otpHash,
    now + 1800000,
    'sent',
    now,
    now
  );

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_03/verify-arrival`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${workerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otp: plainOtp })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.status, 'Worker arrived');

  // Verify OTP consumed in database
  const updatedOtp = stmtGetOtpByBooking.get('BK_TEST_03');
  assert.ok(updatedOtp.consumed_at > 0);

  // Verify booking updated in database
  const allBookings = getStore('localkaam_bookings', []);
  const updatedBooking = allBookings.find(b => b.id === 'BK_TEST_03');
  assert.equal(updatedBooking.status, 'Worker arrived');
});

test('4. Invalid OTP rejection increments attempts and leaves booking en route', async () => {
  const booking = {
    id: 'BK_TEST_04',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    status: 'Worker en route'
  };
  setStore('localkaam_bookings', [booking]);

  const plainOtp = '888888';
  const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
  const now = Date.now();

  stmtUpsertOtp.run(
    'otp_04',
    'BK_TEST_04',
    customerUser.sub,
    workerUser.sub,
    otpHash,
    now + 1800000,
    'sent',
    now,
    now
  );

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_04/verify-arrival`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${workerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otp: '999999' })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /incorrect otp/i);
  assert.equal(data.attemptsRemaining, 4);

  const updatedOtp = stmtGetOtpByBooking.get('BK_TEST_04');
  assert.equal(updatedOtp.attempts, 1);
  assert.equal(updatedOtp.consumed_at, null);
});

test('5. Expired OTP rejection prevents arrival verification', async () => {
  const booking = {
    id: 'BK_TEST_05',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    status: 'Worker en route'
  };
  setStore('localkaam_bookings', [booking]);

  const plainOtp = '112233';
  const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
  const now = Date.now();

  stmtUpsertOtp.run(
    'otp_05',
    'BK_TEST_05',
    customerUser.sub,
    workerUser.sub,
    otpHash,
    now - 1000, // Expired in the past
    'sent',
    now - 2000,
    now - 2000
  );

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_05/verify-arrival`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${workerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otp: plainOtp })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /expired/i);
});

test('6. Five-attempt limit locks the OTP', async () => {
  const booking = {
    id: 'BK_TEST_06',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    status: 'Worker en route'
  };
  setStore('localkaam_bookings', [booking]);

  const plainOtp = '123123';
  const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
  const now = Date.now();

  stmtUpsertOtp.run(
    'otp_06',
    'BK_TEST_06',
    customerUser.sub,
    workerUser.sub,
    otpHash,
    now + 1800000,
    'sent',
    now,
    now
  );

  // Set attempts to 5
  for (let i = 0; i < 5; i++) {
    stmtIncrementAttempts.run(now, 'BK_TEST_06');
  }

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_06/verify-arrival`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${workerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otp: plainOtp })
  });

  assert.equal(res.status, 429);
  const data = await res.json();
  assert.match(data.error, /maximum otp attempts exceeded/i);
});

test('7. OTP single-use enforcement: already-consumed OTP cannot be used twice', async () => {
  const booking = {
    id: 'BK_TEST_07',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    status: 'Worker arrived'
  };
  setStore('localkaam_bookings', [booking]);

  const plainOtp = '654321';
  const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
  const now = Date.now();

  stmtUpsertOtp.run(
    'otp_07',
    'BK_TEST_07',
    customerUser.sub,
    workerUser.sub,
    otpHash,
    now + 1800000,
    'sent',
    now,
    now
  );
  stmtConsumeOtp.run(now, now, 'BK_TEST_07');

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_07/verify-arrival`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${workerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otp: plainOtp })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /already been used/i);
});

test('8. Resend invalidates previous OTP', async () => {
  const booking = {
    id: 'BK_TEST_08',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    customerPhone: '+91 98765 43210',
    status: 'Confirmed'
  };
  setStore('localkaam_bookings', [booking]);

  const oldOtpPlain = '111111';
  const oldHash = crypto.createHash('sha256').update(oldOtpPlain).digest('hex');
  const oldTime = Date.now() - 70000; // 70s ago (bypasses cooldown)

  stmtUpsertOtp.run(
    'otp_08',
    'BK_TEST_08',
    customerUser.sub,
    workerUser.sub,
    oldHash,
    oldTime + 1800000,
    'sent',
    oldTime,
    oldTime
  );

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_08/resend-arrival-otp`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });

  assert.equal(res.status, 200);
  const newRow = stmtGetOtpByBooking.get('BK_TEST_08');
  assert.notEqual(newRow.otp_hash, oldHash); // Hash replaced

  // Verifying old OTP must now fail
  const verifyRes = await fetch(`${baseUrl}/api/bookings/BK_TEST_08/verify-arrival`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${workerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otp: oldOtpPlain })
  });

  assert.equal(verifyRes.status, 400);
});

test('9. Unauthorized worker cannot verify arrival for another worker booking', async () => {
  const booking = {
    id: 'BK_TEST_09',
    customerId: customerUser.sub,
    workerId: workerUser.sub, // Assigned to workerUser, NOT otherWorkerUser
    status: 'Worker en route'
  };
  setStore('localkaam_bookings', [booking]);

  const plainOtp = '123456';
  const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
  const now = Date.now();

  stmtUpsertOtp.run(
    'otp_09',
    'BK_TEST_09',
    customerUser.sub,
    workerUser.sub,
    otpHash,
    now + 1800000,
    'sent',
    now,
    now
  );

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_09/verify-arrival`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${otherWorkerToken}`, // Imposter
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otp: plainOtp })
  });

  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /only the assigned worker/i);
});

test('10. Customer cannot verify arrival on behalf of the worker', async () => {
  const booking = {
    id: 'BK_TEST_10',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    status: 'Worker en route'
  };
  setStore('localkaam_bookings', [booking]);

  const plainOtp = '123456';
  const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
  const now = Date.now();

  stmtUpsertOtp.run(
    'otp_10',
    'BK_TEST_10',
    customerUser.sub,
    workerUser.sub,
    otpHash,
    now + 1800000,
    'sent',
    now,
    now
  );

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_10/verify-arrival`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${customerToken}`, // Customer attempts verify
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otp: plainOtp })
  });

  assert.equal(res.status, 403);
});

test('11. Worker cannot retrieve the OTP via otp-status endpoint', async () => {
  const booking = {
    id: 'BK_TEST_11',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    status: 'Worker en route'
  };
  setStore('localkaam_bookings', [booking]);

  const plainOtp = '654321';
  const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
  const now = Date.now();

  stmtUpsertOtp.run(
    'otp_11',
    'BK_TEST_11',
    customerUser.sub,
    workerUser.sub,
    otpHash,
    now + 1800000,
    'sent',
    now,
    now
  );

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_11/otp-status`, {
    headers: { 'Authorization': `Bearer ${workerToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.exists, true);
  assert.equal(data.otp, undefined);
  assert.equal(data.otp_hash, undefined);
  assert.equal(data.otpHash, undefined);
});

test('12. Direct booking status change to "Worker arrived" is blocked without OTP verification', async () => {
  const booking = {
    id: 'BK_TEST_12',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    status: 'Worker en route'
  };
  setStore('localkaam_bookings', [booking]);

  // Attempt to bypass OTP check by directly updating booking via PUT
  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_12`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${workerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'Worker arrived' })
  });

  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /cannot transition to "Worker arrived" without valid customer OTP/i);
});

test('13. Uber/Ola-style: OTP is issued in-app when the customer books (no SMS)', async () => {
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${customerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: 'BK_TEST_13',
      workerId: workerUser.sub,
      status: 'Pending confirmation',
      appointmentDate: new Date().toISOString().split('T')[0]
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  // Customer gets the code in-app at booking time …
  assert.match(data.arrivalOtp, /^\d{6}$/);
  assert.ok(data.otpExpiresAt);

  // … stored hash-only, delivered in-app, never by SMS
  const row = stmtGetOtpByBooking.get('BK_TEST_13');
  assert.ok(row);
  assert.equal(row.delivery_status, 'in_app');
  assert.equal(row.otp_hash.length, 64);
  assert.notEqual(row.otp_hash, data.arrivalOtp);

  // Customer can re-view the same code in-app via otp-status …
  const statusRes = await fetch(`${baseUrl}/api/bookings/BK_TEST_13/otp-status`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  assert.equal(statusRes.status, 200);
  const status = await statusRes.json();
  assert.equal(status.otp, data.arrivalOtp);
  assert.equal(status.otp_hash, undefined);

  // … and that code verifies arrival when the assigned worker enters it
  const verifyRes = await fetch(`${baseUrl}/api/bookings/BK_TEST_13/verify-arrival`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${workerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otp: data.arrivalOtp })
  });
  assert.equal(verifyRes.status, 200);
  const verified = await verifyRes.json();
  assert.equal(verified.status, 'Worker arrived');
});

test('14. Resend cooldown (60 seconds) is enforced', async () => {
  const booking = {
    id: 'BK_TEST_14',
    customerId: customerUser.sub,
    workerId: workerUser.sub,
    status: 'Confirmed'
  };
  setStore('localkaam_bookings', [booking]);

  const plainOtp = '333333';
  const otpHash = crypto.createHash('sha256').update(plainOtp).digest('hex');
  const now = Date.now(); // Updated right now

  stmtUpsertOtp.run(
    'otp_14',
    'BK_TEST_14',
    customerUser.sub,
    workerUser.sub,
    otpHash,
    now + 1800000,
    'sent',
    now,
    now
  );

  const res = await fetch(`${baseUrl}/api/bookings/BK_TEST_14/resend-arrival-otp`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });

  assert.equal(res.status, 429);
  const data = await res.json();
  assert.match(data.error, /please wait before requesting another otp/i);
  assert.ok(data.retryAfterSeconds > 0);
});
