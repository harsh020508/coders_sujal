// Live (no-reload) sync: a change in one tab fires a `storage` event in
// the other tab; StorageService must forward it to app listeners so the
// UI re-renders instantly (customer running too, worker verifying, ...).
import test from 'node:test';
import assert from 'node:assert/strict';

// Fake window before importing storage.js (it guards on typeof window).
let storageHandler = null;
globalThis.window = {
  addEventListener: (type, fn) => { if (type === 'storage') storageHandler = fn; }
};

const { StorageService } = await import('../storage.js');

function dispatchStorage(key, newValue, oldValue) {
  assert.ok(storageHandler, 'storage listener was not registered');
  storageHandler({ key, newValue, oldValue });
}

test('1. Other-tab booking change notifies listeners live (no reload)', async () => {
  await StorageService.init();
  const seen = [];
  StorageService.onChange((type, data) => seen.push({ type, data }));

  const booking = { id: 'BK_LIVE_01', serviceTask: 'Leaking Tap', status: 'Pending confirmation' };
  dispatchStorage('localkaam_bookings', JSON.stringify([booking]), JSON.stringify([]));

  const event = seen.find(s => s.type === 'bookings');
  assert.ok(event, 'listener should receive bookings change');
  assert.equal(event.data[0].id, 'BK_LIVE_01');
  // getBookings() in this tab now returns the other tab's data
  assert.equal(StorageService.getBookings()[0].id, 'BK_LIVE_01');
});

test('2. Worker verification in another tab flips customer OTP panel state', async () => {
  const seen = [];
  StorageService.onChange((type) => seen.push(type));
  const verified = { id: 'BK_LIVE_01', serviceTask: 'Leaking Tap', status: 'Worker arrived', arrivalOtpUsed: true };
  dispatchStorage('localkaam_bookings', JSON.stringify([verified]), JSON.stringify([{ ...verified, status: 'Worker en route', arrivalOtpUsed: false }]));
  assert.ok(seen.includes('bookings'));
  assert.equal(StorageService.getBookings()[0].status, 'Worker arrived');
  assert.equal(StorageService.getBookings()[0].arrivalOtpUsed, true);
});

test('3. Customer OTP resend in another tab syncs the new code store', async () => {
  const seen = [];
  StorageService.onChange((type) => seen.push(type));
  dispatchStorage('localkaam_customer_otps', JSON.stringify({ BK_LIVE_01: '123456' }), JSON.stringify({}));
  assert.ok(seen.includes('customer_otps'));
  assert.equal(StorageService.getCustomerOtp('BK_LIVE_01'), '123456');
});

test('4. Unrelated storage keys are ignored', async () => {
  const seen = [];
  StorageService.onChange((type) => seen.push(type));
  dispatchStorage('some_other_key', '"x"', null);
  assert.equal(seen.includes(undefined), false);
});
