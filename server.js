import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { INITIAL_WORKERS, INITIAL_BOOKINGS, INITIAL_REVIEWS, INITIAL_COMPLAINTS } from './data.js';

// Load environment variables from .env if present
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (e) {
    // .env might not exist or already loaded
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'localkaam.db');

// Initialize SQLite database
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    booking_id TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    UNIQUE(booking_id, notification_type)
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON notifications(booking_id);
`);

const stmtGet = db.prepare('SELECT value FROM store WHERE key = ?');
const stmtSet = db.prepare(`
  INSERT INTO store (key, value, updated_at) 
  VALUES (?, ?, ?) 
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);

// Prepared statements for persistent notifications
export const stmtInsertNotification = db.prepare(`
  INSERT INTO notifications (id, user_id, booking_id, notification_type, title, message, is_read, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  ON CONFLICT(booking_id, notification_type) DO NOTHING
`);

export const stmtGetNotificationsByUser = db.prepare(`
  SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC
`);

export const stmtMarkNotificationRead = db.prepare(`
  UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?
`);

export const stmtMarkAllNotificationsRead = db.prepare(`
  UPDATE notifications SET is_read = 1 WHERE user_id = ?
`);

export const stmtClearNotifications = db.prepare(`
  DELETE FROM notifications
`);

export function getStore(key, fallback) {
  try {
    const row = stmtGet.get(key);
    return row ? JSON.parse(row.value) : fallback;
  } catch (err) {
    console.error(`Error reading ${key} from db:`, err);
    return fallback;
  }
}

export function setStore(key, value) {
  try {
    stmtSet.run(key, JSON.stringify(value), Date.now());
  } catch (err) {
    console.error(`Error writing ${key} to db:`, err);
  }
}

// Seed initial data if not already present
if (!stmtGet.get('localkaam_workers')) {
  setStore('localkaam_workers', INITIAL_WORKERS);
}
if (!stmtGet.get('localkaam_bookings')) {
  setStore('localkaam_bookings', INITIAL_BOOKINGS);
}
if (!stmtGet.get('localkaam_reviews')) {
  setStore('localkaam_reviews', INITIAL_REVIEWS);
}
if (!stmtGet.get('localkaam_complaints')) {
  setStore('localkaam_complaints', INITIAL_COMPLAINTS);
}

// Server-Sent Events (SSE) subscribers
// Each client record: { res, user, userId }
export const sseClients = new Set();

export function broadcastEvent(type, payload, excludeClient = null) {
  const data = JSON.stringify({ type, ...payload, timestamp: Date.now() });
  const message = `event: sync\ndata: ${data}\n\n`;

  for (const client of sseClients) {
    const res = client.res || client;
    if (res !== excludeClient && client !== excludeClient && !res.writableEnded) {
      try {
        res.write(message);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  }
}

/**
 * Dispatches private notification event strictly to the authenticated customer.
 * Prevents broadcasting private notifications to unrelated customers or workers.
 */
export function sendNotificationToCustomer(customerId, notification) {
  if (!customerId || !notification) return;
  const data = JSON.stringify({ type: 'NOTIFICATION', notification, timestamp: Date.now() });
  const message = `event: notification\ndata: ${data}\n\n`;

  for (const client of sseClients) {
    if (client.userId === customerId) {
      const res = client.res || client;
      if (!res.writableEnded) {
        try {
          res.write(message);
        } catch (err) {
          sseClients.delete(client);
        }
      }
    }
  }
}

/**
 * Handles genuine booking status transitions and creates persistent notifications.
 * Implements strict database duplicate prevention via UNIQUE(booking_id, notification_type).
 */
export function handleBookingStatusNotification(booking, prevStatus, newStatus) {
  if (!booking || !newStatus || prevStatus === newStatus) return null;

  const customerId = booking.customerId || booking.customer_id;
  if (!customerId) return null;

  let eventType = null;
  let title = '';
  let message = '';

  const isPrevPending = ['Pending confirmation', 'Pending'].includes(prevStatus);
  const isNewAccepted = ['Confirmed', 'Accepted'].includes(newStatus);

  const isPrevNotArrived = !['Worker arrived', 'Arrived'].includes(prevStatus);
  const isNewArrived = ['Worker arrived', 'Arrived'].includes(newStatus);

  const isPrevNotCompleted = !['Job completed', 'Completed'].includes(prevStatus);
  const isNewCompleted = ['Job completed', 'Completed'].includes(newStatus);

  // EVENT 1: ORDER ACCEPTED
  if (isPrevPending && isNewAccepted) {
    eventType = 'ORDER_ACCEPTED';
    title = 'Order Accepted!';
    message = 'Good news! Your service provider has accepted your order and will be arriving shortly.';
  }
  // EVENT 2: WORKER ARRIVED
  else if (isPrevNotArrived && isNewArrived) {
    eventType = 'WORKER_ARRIVED';
    title = 'Your Worker Has Arrived!';
    message = 'Your service provider has reached your location and is ready to start the service.';
  }
  // EVENT 3: ORDER COMPLETED
  else if (isPrevNotCompleted && isNewCompleted) {
    eventType = 'ORDER_COMPLETED';
    title = 'Order Completed Successfully!';
    message = 'Your service has been completed. Thank you for choosing LocalKaam!';
  }

  if (!eventType) return null;

  const notifId = `notif_${booking.id}_${eventType}`;
  const now = Date.now();

  try {
    const result = stmtInsertNotification.run(
      notifId,
      customerId,
      booking.id,
      eventType,
      title,
      message,
      now
    );

    // If changes === 0, duplicate was rejected by UNIQUE constraint
    if (result.changes === 0) {
      return null;
    }

    const notification = {
      id: notifId,
      userId: customerId,
      bookingId: booking.id,
      notificationType: eventType,
      title,
      message,
      isRead: false,
      createdAt: new Date(now).toISOString()
    };

    // Deliver to authenticated customer connection
    sendNotificationToCustomer(customerId, notification);
    return notification;
  } catch (err) {
    console.error('[Notification] Error inserting notification:', err);
    return null;
  }
}

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

export function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

export function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(data));
}

// ==============================================================================
// AUTHENTICATION & JWT VERIFICATION MIDDLEWARE (Supabase JWT)
// ==============================================================================

/**
 * Verifies a Supabase JWT.
 * Validates token structure, expiration, subject identity, and cryptographic signature.
 */
export async function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return { user: null, error: { status: 401, message: 'Missing or empty bearer token' } };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { user: null, error: { status: 401, message: 'Malformed JWT token structure' } };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (e) {
    return { user: null, error: { status: 401, message: 'Invalid JWT payload encoding' } };
  }

  // Reject expired tokens
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSeconds) {
    return { user: null, error: { status: 401, message: 'Token has expired' } };
  }

  // Require valid subject identity (UUID)
  if (!payload.sub || typeof payload.sub !== 'string') {
    return { user: null, error: { status: 401, message: 'Invalid token subject (missing sub)' } };
  }

  // Cryptographic signature verification
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (jwtSecret) {
    try {
      const expectedSig = crypto.createHmac('sha256', jwtSecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      const sigBuf = Buffer.from(signatureB64);
      const expectedBuf = Buffer.from(expectedSig);

      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return { user: null, error: { status: 401, message: 'Invalid token cryptographic signature' } };
      }
    } catch (err) {
      return { user: null, error: { status: 401, message: 'Cryptographic signature verification error' } };
    }
  } else {
    // Validate with Supabase Auth API endpoint
    const supabaseUrl = process.env.SUPABASE_URL || 'https://dcijrqwoxkazggouvhdn.supabase.co';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaWpycXdveGthemdnb3V2aGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MzEwNjIsImV4cCI6MjEwODQwNzA2Mn0.aFaK7IAkKf6YjUN09PBXNbZHOrGhqjABr9NiD9nS4g0';

    try {
      const res = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey
        }
      });

      if (!res.ok) {
        return { user: null, error: { status: 401, message: 'Token rejected by authentication provider' } };
      }

      const userData = await res.json();
      if (!userData || userData.id !== payload.sub) {
        return { user: null, error: { status: 401, message: 'Token subject mismatch' } };
      }
    } catch (err) {
      return { user: null, error: { status: 401, message: `Authentication service unavailable: ${err.message}` } };
    }
  }

  // Authoritative verified identity
  const user = {
    id: payload.sub,
    email: payload.email || '',
    role: payload.app_metadata?.role || payload.user_metadata?.role || payload.role || 'customer',
    app_metadata: payload.app_metadata || {},
    user_metadata: payload.user_metadata || {}
  };

  return { user, error: null };
}

/**
 * Extracts and verifies authorization bearer token from incoming HTTP request.
 * Automatically sends HTTP 401 on failure.
 */
export async function requireAuth(req, res) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    sendJson(res, 401, { error: 'Missing Authorization header' });
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    sendJson(res, 401, { error: 'Invalid Authorization header format. Expected Bearer <token>' });
    return null;
  }

  const token = parts[1].trim();
  const { user, error } = await verifyToken(token);
  if (error) {
    sendJson(res, error.status || 401, { error: error.message });
    return null;
  }

  return user;
}

export const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // Health check (Public)
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'ok', time: new Date().toISOString() });
  }

  // Bootstrap (Public catalog discovery)
  if (pathname === '/api/bootstrap' && req.method === 'GET') {
    return sendJson(res, 200, {
      workers: getStore('localkaam_workers', INITIAL_WORKERS),
      bookings: getStore('localkaam_bookings', INITIAL_BOOKINGS),
      reviews: getStore('localkaam_reviews', INITIAL_REVIEWS),
      complaints: getStore('localkaam_complaints', INITIAL_COMPLAINTS)
    });
  }

  // Server-Sent Events (Real-time updates)
  if (pathname === '/api/events' && req.method === 'GET') {
    const token = url.searchParams.get('token') || (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : null);
    let authenticatedUser = null;
    if (token) {
      try {
        const { user } = await verifyToken(token);
        authenticatedUser = user;
      } catch (e) {}
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(':keep-alive\n\n');

    const client = {
      res,
      user: authenticatedUser,
      userId: authenticatedUser ? authenticatedUser.id : null
    };
    sseClients.add(client);

    req.on('close', () => {
      sseClients.delete(client);
    });
    return;
  }

  // Notifications API (Protected)
  if (pathname === '/api/notifications' && req.method === 'GET') {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const rows = stmtGetNotificationsByUser.all(user.id);
      const formatted = rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        bookingId: r.booking_id,
        notificationType: r.notification_type,
        title: r.title,
        message: r.message,
        isRead: Boolean(r.is_read),
        createdAt: new Date(r.created_at).toISOString()
      }));
      return sendJson(res, 200, formatted);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Mark all notifications as read
  if (pathname === '/api/notifications/mark-all-read' && req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return;

    try {
      const result = stmtMarkAllNotificationsRead.run(user.id);
      return sendJson(res, 200, { success: true, count: result.changes });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Mark single notification as read: /api/notifications/:id/read
  if (pathname.startsWith('/api/notifications/') && pathname.endsWith('/read') && (req.method === 'PATCH' || req.method === 'PUT' || req.method === 'POST')) {
    const user = await requireAuth(req, res);
    if (!user) return;

    const notifId = pathname.slice('/api/notifications/'.length, -('/read'.length));
    try {
      const result = stmtMarkNotificationRead.run(notifId, user.id);
      if (result.changes === 0) {
        return sendJson(res, 404, { error: 'Notification not found or access denied' });
      }
      return sendJson(res, 200, { success: true, id: notifId, isRead: true });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Bookings API (Protected)
  if (pathname === '/api/bookings') {
    if (req.method === 'GET') {
      const user = await requireAuth(req, res);
      if (!user) return;

      const allBookings = getStore('localkaam_bookings', INITIAL_BOOKINGS);
      // Admin sees all; regular user sees bookings they participate in
      if (user.role === 'admin') {
        return sendJson(res, 200, allBookings);
      }
      const userBookings = allBookings.filter(b => 
        b.customerId === user.id || b.customer_id === user.id || 
        b.workerId === user.id || b.worker_id === user.id
      );
      return sendJson(res, 200, userBookings);
    }

    if (req.method === 'POST') {
      const user = await requireAuth(req, res);
      if (!user) return;

      try {
        const newBooking = await readBody(req);
        if (!newBooking || !newBooking.id) {
          return sendJson(res, 400, { error: 'Invalid booking payload' });
        }

        // Strictly bind customerId to verified JWT user.id (Never trust body customerId)
        newBooking.customerId = user.id;
        newBooking.customer_id = user.id;

        const bookings = getStore('localkaam_bookings', INITIAL_BOOKINGS);
        const existingIdx = bookings.findIndex(b => b.id === newBooking.id);
        if (existingIdx >= 0) {
          bookings[existingIdx] = newBooking;
        } else {
          bookings.unshift(newBooking);
        }
        setStore('localkaam_bookings', bookings);
        broadcastEvent('BOOKINGS_UPDATED', { key: 'localkaam_bookings', value: bookings });
        return sendJson(res, 201, newBooking);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (req.method === 'PUT') {
      const user = await requireAuth(req, res);
      if (!user) return;

      if (user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Forbidden: administrative privileges required for batch booking updates' });
      }

      try {
        const bookings = await readBody(req);
        if (!Array.isArray(bookings)) {
          return sendJson(res, 400, { error: 'Expected an array of bookings' });
        }
        setStore('localkaam_bookings', bookings);
        broadcastEvent('BOOKINGS_UPDATED', { key: 'localkaam_bookings', value: bookings });
        return sendJson(res, 200, { success: true, count: bookings.length });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
  }

  // Single Booking Update: /api/bookings/:id (Protected)
  if (pathname.startsWith('/api/bookings/') && req.method === 'PUT') {
    const user = await requireAuth(req, res);
    if (!user) return;

    const bookingId = pathname.slice('/api/bookings/'.length);
    try {
      const updatedBooking = await readBody(req);
      const bookings = getStore('localkaam_bookings', INITIAL_BOOKINGS);
      const idx = bookings.findIndex(b => b.id === bookingId);

      if (idx >= 0) {
        const existing = bookings[idx];
        const isCustomer = (existing.customerId === user.id || existing.customer_id === user.id);
        const isWorker = (existing.workerId === user.id || existing.worker_id === user.id);

        if (user.role !== 'admin' && !isCustomer && !isWorker) {
          return sendJson(res, 403, { error: 'Forbidden: you cannot modify another user\'s booking' });
        }

        // Prevent tampering with customer ownership
        updatedBooking.customerId = existing.customerId || user.id;
        updatedBooking.customer_id = existing.customer_id || user.id;

        const prevStatus = existing.status;
        const newStatus = updatedBooking.status;

        bookings[idx] = { ...existing, ...updatedBooking };
        setStore('localkaam_bookings', bookings);
        broadcastEvent('BOOKINGS_UPDATED', { key: 'localkaam_bookings', value: bookings });

        // Trigger real-time persistent notification on genuine status transitions
        if (newStatus && prevStatus !== newStatus) {
          handleBookingStatusNotification(bookings[idx], prevStatus, newStatus);
        }

        return sendJson(res, 200, bookings[idx]);
      } else {
        if (user.role !== 'admin') {
          return sendJson(res, 404, { error: 'Booking not found' });
        }
        bookings.unshift(updatedBooking);
        setStore('localkaam_bookings', bookings);
        broadcastEvent('BOOKINGS_UPDATED', { key: 'localkaam_bookings', value: bookings });
        return sendJson(res, 201, updatedBooking);
      }
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // Workers API
  if (pathname === '/api/workers') {
    if (req.method === 'GET') {
      // Public directory for marketplace discovery
      return sendJson(res, 200, getStore('localkaam_workers', INITIAL_WORKERS));
    }

    if (req.method === 'PUT') {
      const user = await requireAuth(req, res);
      if (!user) return;

      if (user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Forbidden: administrative privileges required for bulk worker updates' });
      }

      try {
        const workers = await readBody(req);
        if (!Array.isArray(workers)) {
          return sendJson(res, 400, { error: 'Expected an array of workers' });
        }
        setStore('localkaam_workers', workers);
        broadcastEvent('WORKERS_UPDATED', { key: 'localkaam_workers', value: workers });
        return sendJson(res, 200, { success: true, count: workers.length });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
  }

  // Single Worker Update: /api/workers/:id (Protected)
  if (pathname.startsWith('/api/workers/') && req.method === 'PUT') {
    const user = await requireAuth(req, res);
    if (!user) return;

    const workerId = pathname.slice('/api/workers/'.length);
    try {
      const updates = await readBody(req);
      const workers = getStore('localkaam_workers', INITIAL_WORKERS);
      const idx = workers.findIndex(w => w.id === workerId);

      if (idx >= 0) {
        const targetWorker = workers[idx];
        // Enforce ownership: must be the worker's user_id or admin
        if (user.role !== 'admin' && targetWorker.user_id && targetWorker.user_id !== user.id) {
          return sendJson(res, 403, { error: 'Forbidden: you cannot modify another worker\'s profile' });
        }

        workers[idx] = { ...workers[idx], ...updates };
        setStore('localkaam_workers', workers);
        broadcastEvent('WORKERS_UPDATED', { key: 'localkaam_workers', value: workers });
        return sendJson(res, 200, workers[idx]);
      } else {
        return sendJson(res, 404, { error: 'Worker not found' });
      }
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // Reviews API
  if (pathname === '/api/reviews') {
    if (req.method === 'GET') {
      // Public review reading
      return sendJson(res, 200, getStore('localkaam_reviews', INITIAL_REVIEWS));
    }

    if (req.method === 'POST') {
      const user = await requireAuth(req, res);
      if (!user) return;

      try {
        const newReview = await readBody(req);
        // Bind customerId to verified user
        newReview.customerId = user.id;
        newReview.customer_id = user.id;

        const reviews = getStore('localkaam_reviews', INITIAL_REVIEWS);
        reviews.unshift(newReview);
        setStore('localkaam_reviews', reviews);
        broadcastEvent('REVIEWS_UPDATED', { key: 'localkaam_reviews', value: reviews });
        return sendJson(res, 201, newReview);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (req.method === 'PUT') {
      const user = await requireAuth(req, res);
      if (!user) return;

      if (user.role !== 'admin') {
        return sendJson(res, 403, { error: 'Forbidden: administrative privileges required for review batch updates' });
      }

      try {
        const reviews = await readBody(req);
        setStore('localkaam_reviews', reviews);
        broadcastEvent('REVIEWS_UPDATED', { key: 'localkaam_reviews', value: reviews });
        return sendJson(res, 200, { success: true, count: reviews.length });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
  }

  // Complaints API (Protected)
  if (pathname === '/api/complaints') {
    if (req.method === 'GET') {
      const user = await requireAuth(req, res);
      if (!user) return;

      const complaints = getStore('localkaam_complaints', INITIAL_COMPLAINTS);
      if (user.role === 'admin') {
        return sendJson(res, 200, complaints);
      }
      const userComplaints = complaints.filter(c => c.customerId === user.id || c.customer_id === user.id);
      return sendJson(res, 200, userComplaints);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const user = await requireAuth(req, res);
      if (!user) return;

      try {
        const data = await readBody(req);
        if (Array.isArray(data)) {
          if (user.role !== 'admin') {
            return sendJson(res, 403, { error: 'Forbidden: administrative privileges required for batch complaint updates' });
          }
          setStore('localkaam_complaints', data);
          broadcastEvent('COMPLAINTS_UPDATED', { key: 'localkaam_complaints', value: data });
          return sendJson(res, 200, { success: true });
        } else {
          data.customerId = user.id;
          data.customer_id = user.id;
          const complaints = [...getStore('localkaam_complaints', INITIAL_COMPLAINTS), data];
          setStore('localkaam_complaints', complaints);
          broadcastEvent('COMPLAINTS_UPDATED', { key: 'localkaam_complaints', value: complaints });
          return sendJson(res, 200, { success: true });
        }
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
  }

  // Reset Demo Data (Protected - Admin only)
  if (pathname === '/api/reset' && req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return sendJson(res, 403, { error: 'Forbidden: administrative privileges required to reset database' });
    }

    setStore('localkaam_workers', INITIAL_WORKERS);
    setStore('localkaam_bookings', INITIAL_BOOKINGS);
    setStore('localkaam_reviews', INITIAL_REVIEWS);
    setStore('localkaam_complaints', INITIAL_COMPLAINTS);
    try { stmtClearNotifications.run(); } catch(e) {}
    broadcastEvent('RESET', {
      workers: INITIAL_WORKERS,
      bookings: INITIAL_BOOKINGS,
      reviews: INITIAL_REVIEWS,
      complaints: INITIAL_COMPLAINTS
    });
    return sendJson(res, 200, { success: true, message: 'Database reset to initial demo data' });
  }

  // ----------------------------------------------------
  // STATIC FILE SERVING
  // ----------------------------------------------------
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
});

// Periodic SSE heartbeat (every 15s)
const sseInterval = setInterval(() => {
  for (const client of sseClients) {
    const res = client.res || client;
    if (!res.writableEnded) {
      try {
        res.write(':keepalive\n\n');
      } catch (e) {
        sseClients.delete(client);
      }
    } else {
      sseClients.delete(client);
    }
  }
}, 15000);
if (sseInterval.unref) sseInterval.unref();

// Start server if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`LocalKaam backend server running at http://localhost:${PORT}/ (and on local network)`);
  });
}
