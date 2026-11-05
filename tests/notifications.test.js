// LocalKaam - Comprehensive Real-Time Order Status Notifications Test Suite
// Covers all 14 scenarios specified in Phase 10

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Setup minimal browser mocks for testing client-side code in Node.js
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
    history: { pushState: () => {}, replaceState: () => {} }
  };
}
if (typeof globalThis.document === 'undefined') {
  const createMockElement = () => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    setAttribute: () => {},
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: () => {},
    remove: () => {},
    addEventListener: () => {}
  });
  globalThis.document = {
    createElement: createMockElement,
    body: { appendChild: () => {} },
    head: { appendChild: () => {} },
    getElementById: () => null,
    addEventListener: () => {}
  };
}

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

// Import backend logic & services
import {
  handleBookingStatusNotification,
  stmtInsertNotification,
  stmtGetNotificationsByUser,
  stmtMarkNotificationRead,
  stmtMarkAllNotificationsRead,
  stmtClearNotifications,
  sendNotificationToCustomer,
  sseClients,
  requireAuth
} from '../server.js';
import { StorageService } from '../storage.js';
import { BookingService } from '../bookings.js';
import { NotificationService } from '../notificationService.js';

test('LocalKaam Real-Time Order Notifications Test Suite', async (t) => {

  const customerId = 'cust-uuid-101';
  const workerId = 'w1';
  const otherCustomerId = 'cust-uuid-202';

  t.beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sseClients.clear();
    try { stmtClearNotifications.run(); } catch(e) {}
  });

  // --------------------------------------------------------------------------
  // TEST 1: Worker accepts an order
  // --------------------------------------------------------------------------
  await t.test('1. Worker accepts an order generates ORDER_ACCEPTED event', () => {
    const booking = {
      id: 'BK-TEST-1',
      customerId,
      workerId,
      status: 'Pending confirmation'
    };

    const acceptedBooking = BookingService.acceptBooking(booking, true);
    assert.strictEqual(acceptedBooking.status, 'Confirmed');

    const notif = handleBookingStatusNotification(
      acceptedBooking,
      booking.status,
      acceptedBooking.status
    );

    assert.ok(notif, 'Notification should be created');
    assert.strictEqual(notif.notificationType, 'ORDER_ACCEPTED');
    assert.strictEqual(notif.title, 'Order Accepted!');
    assert.strictEqual(
      notif.message,
      'Good news! Your service provider has accepted your order and will be arriving shortly.'
    );
    assert.strictEqual(notif.userId, customerId);
    assert.strictEqual(notif.bookingId, 'BK-TEST-1');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Correct customer receives acceptance notification
  // --------------------------------------------------------------------------
  await t.test('2. Correct customer receives acceptance notification via SSE', () => {
    let receivedMessage = null;
    const mockRes = {
      writableEnded: false,
      write: (data) => { receivedMessage = data; }
    };

    sseClients.add({ res: mockRes, userId: customerId, user: { id: customerId } });

    const booking = { id: 'BK-TEST-2', customerId, workerId, status: 'Confirmed' };
    const notif = handleBookingStatusNotification(booking, 'Pending confirmation', 'Confirmed');

    assert.ok(receivedMessage, 'SSE message must be delivered');
    assert.match(receivedMessage, /event: notification/);
    assert.match(receivedMessage, /"ORDER_ACCEPTED"/);
    assert.match(receivedMessage, /"Order Accepted!"/);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Worker marks arrival
  // --------------------------------------------------------------------------
  await t.test('3. Worker marks arrival generates WORKER_ARRIVED event', () => {
    const booking = { id: 'BK-TEST-3', customerId, workerId, status: 'Worker en route' };
    const arrivedBooking = BookingService.setArrived(booking);
    assert.strictEqual(arrivedBooking.status, 'Worker arrived');

    const notif = handleBookingStatusNotification(arrivedBooking, booking.status, arrivedBooking.status);
    assert.ok(notif);
    assert.strictEqual(notif.notificationType, 'WORKER_ARRIVED');
    assert.strictEqual(notif.title, 'Your Worker Has Arrived!');
    assert.strictEqual(
      notif.message,
      'Your service provider has reached your location and is ready to start the service.'
    );
  });

  // --------------------------------------------------------------------------
  // TEST 4: Correct customer receives arrival notification
  // --------------------------------------------------------------------------
  await t.test('4. Correct customer receives arrival notification', () => {
    let customerReceived = null;
    let otherCustomerReceived = null;

    sseClients.add({
      res: { writableEnded: false, write: (d) => { customerReceived = d; } },
      userId: customerId,
      user: { id: customerId }
    });
    sseClients.add({
      res: { writableEnded: false, write: (d) => { otherCustomerReceived = d; } },
      userId: otherCustomerId,
      user: { id: otherCustomerId }
    });

    const booking = { id: 'BK-TEST-4', customerId, workerId, status: 'Worker arrived' };
    handleBookingStatusNotification(booking, 'Worker en route', 'Worker arrived');

    assert.ok(customerReceived, 'Target customer must receive notification');
    assert.match(customerReceived, /"WORKER_ARRIVED"/);
    assert.strictEqual(otherCustomerReceived, null, 'Unrelated customer must NOT receive notification');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Worker completes the order
  // --------------------------------------------------------------------------
  await t.test('5. Worker completes the order generates ORDER_COMPLETED event', () => {
    const booking = { id: 'BK-TEST-5', customerId, workerId, status: 'Job in progress' };
    const completedBooking = BookingService.completeJob(booking);
    assert.strictEqual(completedBooking.status, 'Job completed');

    const notif = handleBookingStatusNotification(completedBooking, booking.status, completedBooking.status);
    assert.ok(notif);
    assert.strictEqual(notif.notificationType, 'ORDER_COMPLETED');
    assert.strictEqual(notif.title, 'Order Completed Successfully!');
    assert.strictEqual(
      notif.message,
      'Your service has been completed. Thank you for choosing LocalKaam!'
    );
  });

  // --------------------------------------------------------------------------
  // TEST 6: Correct customer receives completion notification
  // --------------------------------------------------------------------------
  await t.test('6. Correct customer receives completion notification via targeted delivery', () => {
    let received = null;
    sseClients.add({
      res: { writableEnded: false, write: (d) => { received = d; } },
      userId: customerId,
      user: { id: customerId }
    });

    const booking = { id: 'BK-TEST-6', customerId, workerId, status: 'Job completed' };
    handleBookingStatusNotification(booking, 'Job in progress', 'Job completed');

    assert.ok(received);
    assert.match(received, /"ORDER_COMPLETED"/);
    assert.match(received, /"Order Completed Successfully!"/);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Duplicate status updates do not create duplicate notifications
  // --------------------------------------------------------------------------
  await t.test('7. Duplicate status updates do not create duplicate notifications', () => {
    const booking = { id: 'BK-DUP-1', customerId, workerId, status: 'Confirmed' };

    // First transition
    const notif1 = handleBookingStatusNotification(booking, 'Pending confirmation', 'Confirmed');
    assert.ok(notif1, 'First notification must succeed');

    // Worker sends the same status transition again
    const notif2 = handleBookingStatusNotification(booking, 'Pending confirmation', 'Confirmed');
    assert.strictEqual(notif2, null, 'Duplicate transition must be rejected by UNIQUE constraint');

    // Storage level check: only 1 notification for this booking + type
    const rows = stmtGetNotificationsByUser.all(customerId).filter(r => r.booking_id === 'BK-DUP-1');
    assert.strictEqual(rows.length, 1, 'Database must contain exactly 1 notification record');
  });

  // --------------------------------------------------------------------------
  // TEST 8: Unrelated customers cannot receive another customer's notifications
  // --------------------------------------------------------------------------
  await t.test('8. Unrelated customers cannot receive another customer\'s notifications', () => {
    let customerABuff = [];
    let customerBBuff = [];

    sseClients.add({
      res: { writableEnded: false, write: (d) => { customerABuff.push(d); } },
      userId: 'user-A',
      user: { id: 'user-A' }
    });
    sseClients.add({
      res: { writableEnded: false, write: (d) => { customerBBuff.push(d); } },
      userId: 'user-B',
      user: { id: 'user-B' }
    });

    // Worker arrives for user-A's booking
    const bookingA = { id: 'BK-A-1', customerId: 'user-A', workerId, status: 'Worker arrived' };
    handleBookingStatusNotification(bookingA, 'Worker en route', 'Worker arrived');

    assert.strictEqual(customerABuff.length, 1);
    assert.strictEqual(customerBBuff.length, 0);

    // Worker completes user-B's booking
    const bookingB = { id: 'BK-B-1', customerId: 'user-B', workerId, status: 'Job completed' };
    handleBookingStatusNotification(bookingB, 'Job in progress', 'Job completed');

    assert.strictEqual(customerABuff.length, 1);
    assert.strictEqual(customerBBuff.length, 1);
  });

  // --------------------------------------------------------------------------
  // TEST 9: Notifications survive page refresh
  // --------------------------------------------------------------------------
  await t.test('9. Notifications survive page refresh and are persisted in database', () => {
    const booking = { id: 'BK-PERSIST-1', customerId: 'user-persist', workerId, status: 'Confirmed' };
    handleBookingStatusNotification(booking, 'Pending confirmation', 'Confirmed');

    // Simulate page refresh: query persistent store directly
    const stored = stmtGetNotificationsByUser.all('user-persist');
    assert.ok(stored.length > 0);
    const item = stored.find(s => s.booking_id === 'BK-PERSIST-1');
    assert.ok(item);
    assert.strictEqual(item.notification_type, 'ORDER_ACCEPTED');
    assert.strictEqual(item.title, 'Order Accepted!');
  });

  // --------------------------------------------------------------------------
  // TEST 10: Offline customers receive missed notifications after reconnecting
  // --------------------------------------------------------------------------
  await t.test('10. Offline customers receive missed notifications after reconnecting', async () => {
    const offlineCustId = 'cust-offline-10';
    // Customer is NOT in sseClients (offline)
    assert.strictEqual(
      Array.from(sseClients).some(c => c.userId === offlineCustId),
      false
    );

    // Worker arrives while customer is offline
    const booking = { id: 'BK-OFFLINE-1', customerId: offlineCustId, workerId, status: 'Worker arrived' };
    handleBookingStatusNotification(booking, 'Worker en route', 'Worker arrived');

    // Customer comes back online and synchronizes
    const missed = stmtGetNotificationsByUser.all(offlineCustId);
    assert.ok(missed.length > 0);
    assert.strictEqual(missed[0].notification_type, 'WORKER_ARRIVED');
    assert.strictEqual(missed[0].is_read, 0); // Unread badge ready for customer
  });

  // --------------------------------------------------------------------------
  // TEST 11: Multiple tabs do not produce duplicate popups unnecessarily
  // --------------------------------------------------------------------------
  await t.test('11. Multiple tabs do not produce duplicate popups via seen tracking', () => {
    const testId = 'notif_BK-TABS_ORDER_ACCEPTED';
    assert.strictEqual(NotificationService._isPopupSeen(testId), false);

    NotificationService._markPopupSeenLocally(testId);
    assert.strictEqual(NotificationService._isPopupSeen(testId), true);

    // Second tab or duplicate incoming event will be skipped
    let shown = false;
    const notif = {
      id: testId,
      notificationType: 'ORDER_ACCEPTED',
      title: 'Order Accepted!',
      message: '...',
      userId: customerId
    };

    // Mock showToastPopup to verify it is NOT called when seen
    const origShow = NotificationService.showToastPopup;
    NotificationService.showToastPopup = () => { shown = true; };
    StorageService.setCurrentRole('customer');

    try {
      NotificationService.handleIncomingNotification(notif);
      assert.strictEqual(shown, false, 'Duplicate popup must be suppressed');
    } finally {
      NotificationService.showToastPopup = origShow;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 12: Read/unread functionality works correctly
  // --------------------------------------------------------------------------
  await t.test('12. Read/unread functionality works correctly', () => {
    const testUser = 'user-read-test';
    const notifId = 'notif_READ_TEST_1';
    stmtInsertNotification.run(
      notifId, testUser, 'BK-READ-1', 'ORDER_ACCEPTED', 'Order Accepted!', 'Msg', Date.now()
    );

    let rows = stmtGetNotificationsByUser.all(testUser);
    assert.strictEqual(rows[0].is_read, 0);

    // Mark single notification read
    stmtMarkNotificationRead.run(notifId, testUser);
    rows = stmtGetNotificationsByUser.all(testUser);
    assert.strictEqual(rows[0].is_read, 1);

    // Add a second unread notification
    const notifId2 = 'notif_READ_TEST_2';
    stmtInsertNotification.run(
      notifId2, testUser, 'BK-READ-2', 'WORKER_ARRIVED', 'Arrived', 'Msg', Date.now()
    );
    rows = stmtGetNotificationsByUser.all(testUser);
    assert.strictEqual(rows.filter(r => r.is_read === 0).length, 1);

    // Mark all as read
    stmtMarkAllNotificationsRead.run(testUser);
    rows = stmtGetNotificationsByUser.all(testUser);
    assert.strictEqual(rows.filter(r => r.is_read === 0).length, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 13: Unauthorized notification access is rejected
  // --------------------------------------------------------------------------
  await t.test('13. Unauthorized notification access is rejected', async () => {
    // Attempting to mark another user's notification as read
    const ownerId = 'user-owner';
    const attackerId = 'user-attacker';
    const notifId = 'notif_SEC_TEST';

    stmtInsertNotification.run(
      notifId, ownerId, 'BK-SEC-1', 'ORDER_ACCEPTED', 'Title', 'Msg', Date.now()
    );

    // Attacker tries to update notification with their ID
    const result = stmtMarkNotificationRead.run(notifId, attackerId);
    assert.strictEqual(result.changes, 0, 'Attacker cannot modify another user\'s notification');

    // Owner verify: notification remains unread
    const rows = stmtGetNotificationsByUser.all(ownerId);
    assert.strictEqual(rows[0].is_read, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 14: Notifications do not appear for unsuccessful booking updates
  // --------------------------------------------------------------------------
  await t.test('14. Notifications do not appear for unsuccessful booking updates or unchanged status', () => {
    const booking = { id: 'BK-NO-CHANGE', customerId, workerId, status: 'Confirmed' };

    // Same status (no transition)
    const res1 = handleBookingStatusNotification(booking, 'Confirmed', 'Confirmed');
    assert.strictEqual(res1, null, 'Unchanged status must produce null');

    // Missing status
    const res2 = handleBookingStatusNotification(booking, 'Confirmed', null);
    assert.strictEqual(res2, null, 'Null status must produce null');

    // Missing booking
    const res3 = handleBookingStatusNotification(null, 'Pending', 'Confirmed');
    assert.strictEqual(res3, null, 'Null booking must produce null');
  });

});
