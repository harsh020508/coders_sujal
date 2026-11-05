import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { INITIAL_WORKERS, INITIAL_BOOKINGS, INITIAL_REVIEWS, INITIAL_COMPLAINTS } from './data.js';
import { getPriceTablePromptSummary, getPricingForTask } from './pricingTable.js';

// Load environment variables from .env if present
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (e) {
    // .env might not exist or already loaded
  }
}

// Route all logging to stdout to prevent PowerShell background task runners from treating stderr writes as process termination
console.warn = (...args) => console.log('[WARN]', ...args);
console.error = (...args) => console.log('[ERROR]', ...args);

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

// ---- Haversine distance (km) ----
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---- Rate limiter for photo analysis (5 req/min/IP) ----
const photoRateLimits = new Map();
function checkPhotoRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 5;
  let record = photoRateLimits.get(ip);
  if (!record) { record = []; photoRateLimits.set(ip, record); }
  // Remove old timestamps
  while (record.length && record[0] < now - windowMs) record.shift();
  if (record.length >= max) return false;
  record.push(now);
  return true;
}

// ---- Photo AI: multi-key pool (round-robin) with failover ----
// Keys come from .env: GEMINI_API_KEYS / AI_API_KEYS (comma-separated) or a single
// GEMINI_API_KEY / AI_API_KEY. Keys are NEVER logged; only the key index is.
let geminiKeyCursor = 0;
export function getGeminiKeys() {
  const raw =
    process.env.GEMINI_API_KEYS ||
    process.env.AI_API_KEYS ||
    process.env.GEMINI_API_KEY ||
    process.env.AI_API_KEY ||
    '';
  const keys = raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k && k.length > 20); // drop empty entries and obvious placeholders like "key1"
  // Deduplicate while preserving order
  return [...new Set(keys)];
}

export function getVisionModels() {
  const primary = process.env.AI_MODEL || 'gemini-3-flash-preview';
  // Ordered by what actually works today with vision: gemini-3-flash-preview
  // (verified 200). Others are tried next, end-to-end, if the primary is busy.
  const fallback = ['gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  return [...new Set([primary, ...fallback])];
}

// Keys that hit 403 (project billing/free-tier dead) or 429 (quota done) are
// skipped for a short cooldown, so a finished/exhausted key never slows down
// the next request — the pool automatically switches to the next live key.
const keyExhaustedUntil = new Map(); // keyIndex -> timestamp (ms)

async function callGeminiWithFailover(keys, models, buildBody) {
  const tried = [];
  const now = () => Date.now();
  const modelFailedKeys = new Set(); // keys where the current model 404'd
  for (const model of models) {
    modelFailedKeys.clear();
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const keyIndex = (geminiKeyCursor + attempt) % keys.length;
      const key = keys[keyIndex];
      const exhaustedUntil = keyExhaustedUntil.get(keyIndex) || 0;
      const allExhausted = keys.every((_, i) => (keyExhaustedUntil.get(i) || 0) > now());
      if (exhaustedUntil > now() && !allExhausted) {
        tried.push(`model=${model} key#${keyIndex + 1} skipped (quota/billing cooldown)`);
        continue;
      }
      if (modelFailedKeys.has(keyIndex)) continue;
      // One small retry for transient 429/503 (high-demand spikes are temporary)
      let aiRes = null;
      let status = 0;
      for (let retry = 0; retry < 2; retry++) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        try {
          aiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildBody(model))
          });
        } catch (networkErr) {
          tried.push(`model=${model} key#${keyIndex + 1} network=${networkErr.message}`);
          aiRes = null; status = 0;
          break;
        }
        status = aiRes.status;
        if (aiRes.ok) break;
        if ((status === 429 || status === 503) && retry === 0) {
          try { await aiRes.text(); } catch (e) {}
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        break;
      }
      if (aiRes && aiRes.ok) {
        geminiKeyCursor = (keyIndex + 1) % keys.length; // rotate: next request starts on the NEXT key
        keyExhaustedUntil.delete(keyIndex);
        return { aiRes, keyIndex, model };
      }
      if (!aiRes) continue; // network error on this key -> next key
      let errText = '';
      try { errText = await aiRes.text(); } catch (e) {}
      tried.push(`model=${model} key#${keyIndex + 1} http=${status}`);
      // 404 = this model is not available on this key/project -> same model, next key
      if (status === 404) { modelFailedKeys.add(keyIndex); continue; }
      // 403 (dead project / no billing) and 429 (quota finished) -> this key is
      // done for now: bench it and switch to the next key
      if (status === 403 || status === 429) {
        keyExhaustedUntil.set(keyIndex, now() + 2 * 60 * 1000);
        continue;
      }
      // Any other 4xx/5xx (bad key, busy model, network hiccup) -> next key
      if (status >= 400) continue;
    }
  }
  return { aiRes: null, tried };
}

// ---- Fix steps generator (used when the vision model omits them) ----
function getFixStepsFor(serviceCategory, likelyMaterials = [], issue = '') {
  const generic = {
    plumber: [
      'Turn off the water valve / main supply and clear the work area',
      'Inspect the fitting, remove the damaged part/washer and clean the thread or joint',
      'Fit the new part/materials with Teflon tape or sealant and tighten securely',
      'Re-open the supply, check for leaks, and test the flow/pressure'
    ],
    electrician: [
      'Switch OFF the main breaker for that room and verify with a tester (no live wires)',
      'Inspect and remove the damaged switch/socket/MCB and exposed wires',
      'Fit the new part, tighten all terminals, and insulate joints properly',
      'Switch ON the breaker, test the circuit, and check for sparking or heat'
    ],
    carpenter: [
      'Inspect the damage, remove loose or broken fittings, and measure/cut replacements',
      'Fix the hinges, lock, channels or joints with screws and adhesive as needed',
      'Align and test the door/drawer/furniture for smooth movement',
      'Sand, fill and finish for a clean look before handing over'
    ],
    painter: [
      'Scrape loose paint/putty, fill cracks and sand the surface smooth',
      'Apply primer/sealer and let it dry fully',
      'Apply 2 coats of the right paint/waterproofing with drying time between coats',
      'Touch up edges, clean up, and check for even finish and no seepage'
    ],
    cleaner: [
      'Clear the area and apply the right cleaning chemical/solution',
      'Scrub/deep-clean the surface with the proper tool or machine pads',
      'Rinse/extract, disinfect, and dry the area',
      'Final check for stains, odour, and cleanliness before completion'
    ],
    appliance_repair: [
      'Unplug the appliance and inspect the visible fault area',
      'Test/replace the faulty part (pump, relay, diode, filter, etc.)',
      'Reassemble, run a short test cycle, and check for noise/leaks/heating',
      'Clean up and share care instructions with the customer'
    ]
  };
  const base = generic[serviceCategory] || generic.plumber;
  const mats = Array.isArray(likelyMaterials) && likelyMaterials.length
    ? ` using ${likelyMaterials.slice(0, 3).join(', ')}`
    : '';
  return base.map((s, i) => (i === 1 ? s + mats : s));
}

// ---- Best worker picker for a diagnosed category ----
function pickBestWorkers(serviceCategory, workers, limit = 3) {
  const alias = (cat) => {
    if (cat === 'cleaner') return ['cleaner', 'cleaning'];
    if (cat === 'cleaning') return ['cleaning', 'cleaner'];
    return [cat];
  };
  const wanted = alias(serviceCategory);
  const scored = workers
    .filter((w) => {
      if (!w) return false;
      const cats = Object.keys(w.specialities || {});
      const cat = w.category || '';
      const matches = wanted.some((c) => cats.includes(c) || cat === c);
      if (!matches) return false;
      return true;
    })
    .map((w) => {
      const spec = wanted.map((c) => w.specialities?.[c]).find(Boolean) || {};
      return {
        score:
          (w.ratingAverage || 0) * 10 +
          Math.min((w.ratingCount || 0) / 10, 2) +
          (w.verificationStatus === 'Verified' ? 5 : 0) +
          (w.available && !w.pauseNewBookings ? 3 : 0) +
          (w.profileCompleted ? 2 : 0) -
          (spec.visitingCharge || 0) / 1000,
        worker: {
          id: w.id,
          name: w.name,
          phone: w.phone,
          ratingAverage: w.ratingAverage,
          ratingCount: w.ratingCount,
          experience: w.experience,
          baseLocality: w.baseLocality,
          serviceArea: w.serviceArea,
          availability: w.available,
          startingPrice: spec.startingPrice ?? null,
          visitingCharge: spec.visitingCharge ?? null,
          certifications: spec.certifications || null,
          avatar: w.avatar || null,
          tasks: spec.tasks || []
        }
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.worker);
  return scored;
}

// ---- Pick the profession from the customer's description ----------
// Strong description keywords decide the service category (profession), the
// rate-card price, the materials, the fix plan, and the best worker. The
// photo still drives the issue/cause, but a clear description wins on
// profession so the right worker is booked.
const NOTE_CATEGORY_KEYWORDS = {
  electrician: ['electric', 'wire', 'spark', 'switch', 'socket', 'fan ', ' light', 'mcb', 'fuse', 'power cut', 'short circuit'],
  plumber: ['leak', 'tap', 'drip', 'pipe', 'water', 'toilet', 'flush', 'drain', 'geyser', 'washer', 'bathroom tap'],
  carpenter: ['door', 'lock', 'hinge', 'furniture', 'wood', 'bed', 'wardrobe', 'drawer', 'chair', 'table'],
  painter: ['paint', 'damp', 'wall', 'peel', 'colour', 'color', 'waterproof'],
  appliance_repair: ['fridge', 'refrigerator', 'washing', 'microwave', 'ac ', 'air conditioner', ' ro', 'purifier', 'oven', 'heater'],
  cleaner: ['clean', 'dust', 'dirty', 'sofa', 'carpet', 'scrub', 'shampoo']
};

export function getCategoryFromNote(note) {
  const n = (note || '').toLowerCase();
  if (!n.trim()) return null;
  let best = null;
  let bestHits = 0;
  for (const [cat, words] of Object.entries(NOTE_CATEGORY_KEYWORDS)) {
    const hits = words.filter((w) => n.includes(w)).length;
    if (hits > bestHits) { bestHits = hits; best = cat; }
  }
  return bestHits > 0 ? best : null;
}

// ---- Demo fallback AI result (keyword-based, NO universal default) ----
// Returns problem_found:false for unknown/wrong images instead of inventing a
// fake leaking-tap diagnosis. The live vision model normally returns its own
// follow_up_question for unclear/non-household photos.
function getDemoAiResult(note) {
  const n = (note || '').toLowerCase();
  if (n.includes('electric') || n.includes('wire') || n.includes('spark') || n.includes('switch')) {
    return {
      problem_found: true, issue: 'Faulty electrical switchboard with exposed wiring',
      cause: 'Loose terminals and a burnt switch/socket causing overheating and sparking risk',
      service_category: 'electrician', urgency: 'emergency',
      price_min: 800, price_max: 2500, likely_materials: ['MCB breaker', 'Electrical tape', 'Wire connectors'],
      fix_steps: getFixStepsFor('electrician', ['MCB breaker', 'Electrical tape', 'Wire connectors']),
      estimated_duration_minutes: 45, safety_warning: 'Do NOT touch exposed wires. Turn off the main breaker immediately.',
      confidence: 'high', follow_up_question: null
    };
  }
  if (n.includes('paint') || n.includes('damp') || n.includes('wall') || n.includes('peel')) {
    return {
      problem_found: true, issue: 'Damp wall with paint peeling and possible seepage',
      cause: 'Water seepage from the outer wall / plumbing leak trapped behind paint',
      service_category: 'painter', urgency: 'medium',
      price_min: 1500, price_max: 5000, likely_materials: ['Primer', 'Waterproof putty', 'Emulsion paint'],
      fix_steps: getFixStepsFor('painter', ['Primer', 'Waterproof putty', 'Emulsion paint']),
      estimated_duration_minutes: 180, safety_warning: null,
      confidence: 'high', follow_up_question: null
    };
  }
  if (n.includes('carpenter') || n.includes('wood') || n.includes('door') || n.includes('furniture')) {
    return {
      problem_found: true, issue: 'Damaged wooden door hinge and frame repair needed',
      cause: 'Loose/worn hinges and screws holding the door frame',
      service_category: 'carpenter', urgency: 'low',
      price_min: 500, price_max: 2000, likely_materials: ['Door hinges', 'Wood screws', 'Wood filler'],
      fix_steps: getFixStepsFor('carpenter', ['Door hinges', 'Wood screws', 'Wood filler']),
      estimated_duration_minutes: 60, safety_warning: null,
      confidence: 'high', follow_up_question: null
    };
  }
  if (n.includes('leak') || n.includes('tap') || n.includes('drip') || n.includes('pipe') || n.includes('water')) {
    return {
      problem_found: true, issue: 'Leaking kitchen tap with worn-out washer',
      cause: 'Worn-out rubber washer / loose spindle causing constant dripping',
      service_category: 'plumber', urgency: 'medium',
      price_min: 300, price_max: 800, likely_materials: ['Tap washer', 'Teflon tape', 'Adjustable wrench'],
      fix_steps: getFixStepsFor('plumber', ['Tap washer', 'Teflon tape', 'Adjustable wrench']),
      estimated_duration_minutes: 30, safety_warning: null,
      confidence: 'high', follow_up_question: null
    };
  }
  // Unknown / wrong image: do NOT invent a problem
  return {
    problem_found: false,
    issue: null,
    cause: null,
    service_category: null,
    urgency: null,
    price_min: null,
    price_max: null,
    likely_materials: [],
    fix_steps: [],
    estimated_duration_minutes: null,
    safety_warning: null,
    confidence: 'low',
    follow_up_question: 'I could not identify a clear household repair problem in this photo. Please upload a clear, well-lit photo of the broken item (tap, switch, wall, door, appliance) and try again.'
  };
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
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

  // ---- Nearby Workers API (Public, Geo-sorted) ----
  if (pathname === '/api/workers/nearby' && req.method === 'GET') {
    const lat = parseFloat(url.searchParams.get('lat'));
    const lng = parseFloat(url.searchParams.get('lng'));
    const radius = parseFloat(url.searchParams.get('radius')) || 10;
    const serviceFilter = url.searchParams.get('service') || '';
    const minRating = parseFloat(url.searchParams.get('minRating')) || 0;
    const availableOnly = url.searchParams.get('availableOnly') !== 'false';

    if (isNaN(lat) || isNaN(lng)) {
      return sendJson(res, 400, { error: 'lat and lng query params are required' });
    }

    const workers = getStore('localkaam_workers', INITIAL_WORKERS);
    const results = workers
      .filter(w => {
        if (availableOnly && (!w.available || w.pauseNewBookings)) return false;
        if (minRating && (w.ratingAverage || 0) < minRating) return false;
        if (serviceFilter && serviceFilter !== 'all') {
          const cats = Object.keys(w.specialities || {});
          const cat = w.category || '';
          const match = cats.includes(serviceFilter) || cat === serviceFilter ||
            (serviceFilter === 'cleaner' && (cats.includes('cleaning') || cat === 'cleaning')) ||
            (serviceFilter === 'cleaning' && (cats.includes('cleaner') || cat === 'cleaner'));
          if (!match) return false;
        }
        return w.lat != null && w.lng != null;
      })
      .map(w => {
        const distanceKm = haversineDistanceKm(lat, lng, w.lat, w.lng);
        const estimatedArrivalMinutes = Math.round(distanceKm * 4 + 5); // ~15 km/h avg in city + 5 min prep
        return { ...w, distanceKm: Math.round(distanceKm * 100) / 100, estimatedArrivalMinutes };
      })
      .filter(w => w.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return sendJson(res, 200, results);
  }

  // ---- Photo Analysis (AI Diagnosis) ----
  // Rotates an .env key pool (GEMINI_API_KEYS / AI_API_KEYS). On 429/400/5xx it
  // fails over to the next key and the next vision model, so one exhausted key
  // never breaks the feature. Enriches the result with cause, fix_steps and
  // the best matching workers ranked by rating / count / verification.
  if (pathname === '/api/analyze-photo' && req.method === 'POST') {
    const clientIp = req.socket.remoteAddress || 'unknown';
    if (!checkPhotoRateLimit(clientIp)) {
      return sendJson(res, 429, { error: 'Rate limit exceeded. Max 5 requests per minute.' });
    }

    let note = '';
    try {
      const body = await readBody(req);
      const { image } = body;
      note = body.note || '';
      if (!image) {
        return sendJson(res, 400, { error: 'image field (base64 data URL) is required' });
      }

      // Extract base64 data from data URL
      const base64Match = image.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
      if (!base64Match) {
        return sendJson(res, 400, { error: 'Invalid image format. Expected data:image/(jpeg|png|webp);base64,...' });
      }
      const mimeType = `image/${base64Match[1]}`;
      const base64Data = base64Match[2];

      const workers = getStore('localkaam_workers', INITIAL_WORKERS);
      const withWorkers = (diag) => {
        const d = { ...diag };
        // Unclear / wrong image: do NOT invent a fix, price or worker
        if (d.problem_found === false) {
          d.fix_steps = [];
          d.best_worker = null;
          d.recommended_workers = [];
          return d;
        }
        // Description-first profession: a clear description decides the
        // profession (and price/materials/fix plan/best worker), the photo
        // still supplies the specific issue and cause.
        const noteCategory = getCategoryFromNote(note);
        if (noteCategory && noteCategory !== d.service_category) {
          const pricing = getPricingForTask(noteCategory, d.issue || note);
          d.service_category = noteCategory;
          d.price_min = pricing.price_min;
          d.price_max = pricing.price_max;
          d.estimated_duration_minutes = pricing.duration_minutes || d.estimated_duration_minutes;
          if (!d.likely_materials || !d.likely_materials.length) d.likely_materials = pricing.materials || [];
          d.fix_steps = [];
        }
        if (!d.fix_steps || !Array.isArray(d.fix_steps) || d.fix_steps.length === 0) {
          d.fix_steps = getFixStepsFor(d.service_category, d.likely_materials || [], d.issue || '');
        }
        if (!d.cause) d.cause = d.issue ? `Likely cause: ${d.issue}` : 'Requires on-site inspection.';
        const bestWorkers = d.service_category ? pickBestWorkers(d.service_category, workers, 3) : [];
        d.best_worker = bestWorkers[0] || null;
        d.recommended_workers = bestWorkers;
        return d;
      };

      const DEMO_MODE = process.env.DEMO_MODE === 'true';
      const apiKeys = getGeminiKeys();

      // Use demo fallback if explicitly in demo mode or no keys configured
      if (DEMO_MODE || apiKeys.length === 0) {
        const demoResult = withWorkers(getDemoAiResult(note));
        return sendJson(res, 200, { success: true, diagnosis: demoResult, ...demoResult });
      }

      const pricingSummary = getPriceTablePromptSummary();
      const systemPrompt = `You are an expert home-services diagnostic assistant for LocalKaam, an Indian blue-collar services marketplace in Mumbai.

PRICING TABLE (use ONLY these ranges for estimates):
${pricingSummary}

Analyze the photo and any note the customer provides. Reply with ONLY valid JSON (no markdown fences):
{
  "problem_found": true/false,
  "issue": "short plain-language description of what is broken",
  "cause": "likely root cause in one short sentence",
  "service_category": "plumber|electrician|painter|cleaner|carpenter|appliance_repair",
  "urgency": "low|medium|high|emergency",
  "price_min": number_in_INR,
  "price_max": number_in_INR,
  "likely_materials": ["item1", "item2"],
  "fix_steps": ["step 1 the worker will do", "step 2", "step 3", "step 4"],
  "estimated_duration_minutes": number,
  "safety_warning": "string or null",
  "confidence": "low|medium|high",
  "follow_up_question": "string or null"
}

Rules:
- BEST-EFFORT DIAGNOSIS: be helpful, not strict. If the photo shows ANY household item, fixture, fitting, wall, door, or appliance — even as a photo, illustration, render, or AI-generated image from the web — ALWAYS return problem_found=true with your best-guess issue, service_category, price range, fix steps, and confidence (use "low" if unsure). Do NOT reject stock/AI/illustration photos just because they are not a real camera photo.
- Only return problem_found=false for clearly non-household content with no fixable item at all (blank/solid color, pure nature, animal, person close-up), and then ask a follow_up_question.
- CUSTOMER DESCRIPTION FIRST: read the customer's description carefully. If the description clearly names the broken thing or its profession (tap/pipe→plumber, switch/wire→electrician, door/lock/furniture→carpenter, wall/paint→painter, appliance→appliance_repair, cleaning→cleaner), choose THAT service_category even if the photo is ambiguous, and price it from the matching pricing-table rows.
- If a real problem is plausible but details are unclear, still give a best-guess diagnosis with confidence "low" and describe the likely fix.
- fix_steps must be 3-5 short actionable steps a professional will actually perform to fix it, in order.
- Set urgency=emergency and add safety_warning for hazards (exposed wires, sparks, water near electricity, gas leaks).
- Prices MUST come from the pricing table above.`;

      const buildGeminiBody = () => ({
        contents: [{
          parts: [
            { text: systemPrompt + (note ? `\n\nCustomer note: "${note}"` : '\n\nNo additional note provided.') },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]
        }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.3
        }
      });

      const models = getVisionModels();
      const { aiRes, keyIndex, model, tried } = await callGeminiWithFailover(apiKeys, models, buildGeminiBody);

      if (!aiRes) {
        console.warn('Gemini API all keys/models failed (falling back to demo mode):', (tried || []).join(' | '));
        const fallback = withWorkers(getDemoAiResult(note));
        // _aiTried: which keys/models were attempted (indices only, never key values)
        // so a finished/exhausted key can be spotted at a glance. Safe to expose.
        return sendJson(res, 200, { success: true, diagnosis: fallback, ...fallback, _aiUsedFallback: true, _aiTried: (tried || []).slice(0, 20) });
      }

      const aiData = await aiRes.json();
      let text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      // Strip markdown fences if present
      text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

      try {
        const parsed = JSON.parse(text);
        const enriched = withWorkers(parsed);
        return sendJson(res, 200, { success: true, diagnosis: enriched, ...enriched, _aiKeyUsed: keyIndex + 1, _aiModelUsed: model });
      } catch (parseErr) {
        // Tolerant fallback: some models wrap JSON in prose, so try to carve out
        // the outermost {...} block before giving up and using the demo result.
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            const parsed = JSON.parse(m[0]);
            const enriched = withWorkers(parsed);
            return sendJson(res, 200, { success: true, diagnosis: enriched, ...enriched, _aiKeyUsed: keyIndex + 1, _aiModelUsed: model });
          } catch (e) { /* fall through to demo */ }
        }
        console.warn('AI response parse warning, using fallback');
        const fallback = withWorkers(getDemoAiResult(note));
        return sendJson(res, 200, { success: true, diagnosis: fallback, ...fallback, _aiUsedFallback: true, _aiRawText: text.slice(0, 200) });
      }
    } catch (err) {
      console.warn('analyze-photo warning, using fallback:', err.message);
      const fallback = (() => {
        const d = getDemoAiResult(note);
        const w = pickBestWorkers(d.service_category, getStore('localkaam_workers', INITIAL_WORKERS), 3);
        d.best_worker = w[0] || null;
        d.recommended_workers = w;
        return d;
      })();
      return sendJson(res, 200, { success: true, diagnosis: fallback, ...fallback });
    }
  }

  // ---- Worker Location Update (POST /api/workers/:id/location) ----
  if (pathname.match(/^\/api\/workers\/[^/]+\/location$/) && req.method === 'POST') {
    const workerId = pathname.split('/')[3];
    try {
      const body = await readBody(req);
      const { lat, lng } = body;
      if (lat == null || lng == null) {
        return sendJson(res, 400, { error: 'lat and lng are required' });
      }

      const workers = getStore('localkaam_workers', INITIAL_WORKERS);
      const idx = workers.findIndex(w => w.id === workerId);
      if (idx < 0) {
        return sendJson(res, 404, { error: 'Worker not found' });
      }

      workers[idx].lat = lat;
      workers[idx].lng = lng;
      workers[idx].location = { type: 'Point', coordinates: [lng, lat] };
      setStore('localkaam_workers', workers);

      // Broadcast location update for live tracking
      broadcastEvent('WORKER_LOCATION_UPDATED', {
        workerId,
        lat,
        lng,
        timestamp: Date.now()
      });

      return sendJson(res, 200, { success: true, lat, lng });
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

// Global process-level safety guards to prevent crashes from broken client pipes or unhandled rejections
process.on('uncaughtException', (err) => {
  console.warn('[Server] Uncaught exception intercepted:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[Server] Unhandled rejection intercepted:', reason);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`LocalKaam backend server running at http://localhost:${PORT}/ (and on local network)`);
});
