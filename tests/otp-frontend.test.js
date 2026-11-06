// In-app (Uber/Ola-style) arrival OTP: generated at booking, shown to the
// customer, entered by the worker at the door. No SMS, no server call —
// this is the flow that runs on the static Vercel deployment.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BookingService, generateArrivalOtp, verifyArrivalOtp, hashArrivalOtp } from '../bookings.js';

const worker = { id: 'w1', name: 'Test Worker', specialities: { plumber: { startingPrice: 350, visitingCharge: 100 } } };
const customer = { name: 'Test Customer', phone: '+91 90000 00000', locality: 'andheri' };

test('1. Booking creates a usable in-app OTP', () => {
  const booking = BookingService.createBooking(worker, customer, { serviceKey: 'plumber' });
  assert.match(booking.arrivalOtp, /^\d{6}$/);
  assert.ok(booking.arrivalOtpExpiresAt > Date.now());
  assert.equal(booking.arrivalOtpUsed, false);
  assert.equal(booking.arrivalOtpAttempts, 0);
});

test('2. Worker verifies with the code customer shares at the door', () => {
  const booking = BookingService.createBooking(worker, customer, { serviceKey: 'plumber' });
  assert.equal(verifyArrivalOtp(booking, '000000').ok, false); // wrong code (unless generated 000000 — never, min 100000)
  assert.equal(booking.arrivalOtpAttempts, 1);
  assert.equal(verifyArrivalOtp(booking, booking.arrivalOtp).ok, true);
  assert.equal(booking.arrivalOtpUsed, true);
});

test('3. OTP is single-use and resend replaces it', () => {
  const booking = BookingService.createBooking(worker, customer, { serviceKey: 'plumber' });
  const oldOtp = booking.arrivalOtp;
  assert.equal(verifyArrivalOtp(booking, oldOtp).ok, true);
  assert.equal(verifyArrivalOtp(booking, oldOtp).ok, false); // reuse rejected

  const newOtp = generateArrivalOtp();
  const fresh = { ...booking, arrivalOtpHash: hashArrivalOtp(newOtp), arrivalOtpUsed: false, arrivalOtpAttempts: 0 };
  delete fresh.arrivalOtp; // persisted booking: hash only, like the real save path
  assert.equal(verifyArrivalOtp(fresh, oldOtp).ok, false); // old code invalid after resend
  assert.equal(verifyArrivalOtp(fresh, newOtp).ok, true);
});

test('5. Persisted booking (worker-visible) contains NO plaintext code', () => {
  const booking = BookingService.createBooking(worker, customer, { serviceKey: 'plumber' });
  const plain = booking.arrivalOtp;
  delete booking.arrivalOtp; // simulate customer.js stripping before saveBookings
  assert.equal(JSON.stringify(booking).includes(plain), false);
  assert.ok(booking.arrivalOtpHash);
  assert.notEqual(booking.arrivalOtpHash, plain);
  assert.equal(verifyArrivalOtp(booking, plain).ok, true); // worker can still verify by typing it
});

test('6. Job cannot start before OTP verification popup (Worker arrived)', () => {
  const booking = BookingService.createBooking(worker, customer, { serviceKey: 'plumber' });
  for (const status of ['Pending confirmation', 'Confirmed', 'Worker en route']) {
    const started = BookingService.startJob({ ...booking, status });
    assert.equal(started.status, status, `startJob must be blocked from ${status}`);
  }
  const arrived = BookingService.startJob({ ...booking, status: 'Worker arrived' });
  assert.equal(arrived.status, 'Job in progress');
});

test('4. Expired OTP is rejected', () => {
  const booking = BookingService.createBooking(worker, customer, { serviceKey: 'plumber' });
  booking.arrivalOtpExpiresAt = Date.now() - 1000;
  const result = verifyArrivalOtp(booking, booking.arrivalOtp);
  assert.equal(result.ok, false);
  assert.match(result.error, /expired/i);
});
