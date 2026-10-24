import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { INITIAL_WORKERS, INITIAL_BOOKINGS, INITIAL_REVIEWS, INITIAL_COMPLAINTS } from './data.js';

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
`);

const stmtGet = db.prepare('SELECT value FROM store WHERE key = ?');
const stmtSet = db.prepare(`
  INSERT INTO store (key, value, updated_at) 
  VALUES (?, ?, ?) 
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);

function getStore(key, fallback) {
  try {
    const row = stmtGet.get(key);
    return row ? JSON.parse(row.value) : fallback;
  } catch (err) {
    console.error(`Error reading ${key} from db:`, err);
    return fallback;
  }
}

function setStore(key, value) {
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
const sseClients = new Set();

function broadcastEvent(type, payload, excludeClient = null) {
  const data = JSON.stringify({ type, ...payload, timestamp: Date.now() });
  const message = `event: sync\ndata: ${data}\n\n`;

  for (const client of sseClients) {
    if (client !== excludeClient && !client.writableEnded) {
      try {
        client.write(message);
      } catch (err) {
        sseClients.delete(client);
      }
    }
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
  '.ico': 'image/x-icon'
};

function readBody(req) {
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

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // Health check
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'ok', time: new Date().toISOString() });
  }

  // Bootstrap (all collections at once)
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
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(':keep-alive\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // Bookings API
  if (pathname === '/api/bookings') {
    if (req.method === 'GET') {
      return sendJson(res, 200, getStore('localkaam_bookings', INITIAL_BOOKINGS));
    }
    if (req.method === 'POST') {
      try {
        const newBooking = await readBody(req);
        if (!newBooking || !newBooking.id) {
          return sendJson(res, 400, { error: 'Invalid booking payload' });
        }
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

  // Single Booking Update: /api/bookings/:id
  if (pathname.startsWith('/api/bookings/') && req.method === 'PUT') {
    const bookingId = pathname.slice('/api/bookings/'.length);
    try {
      const updatedBooking = await readBody(req);
      const bookings = getStore('localkaam_bookings', INITIAL_BOOKINGS);
      const idx = bookings.findIndex(b => b.id === bookingId);
      if (idx >= 0) {
        bookings[idx] = { ...bookings[idx], ...updatedBooking };
        setStore('localkaam_bookings', bookings);
        broadcastEvent('BOOKINGS_UPDATED', { key: 'localkaam_bookings', value: bookings });
        return sendJson(res, 200, bookings[idx]);
      } else {
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
      return sendJson(res, 200, getStore('localkaam_workers', INITIAL_WORKERS));
    }
    if (req.method === 'PUT') {
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

  // Single Worker Update: /api/workers/:id
  if (pathname.startsWith('/api/workers/') && req.method === 'PUT') {
    const workerId = pathname.slice('/api/workers/'.length);
    try {
      const updates = await readBody(req);
      const workers = getStore('localkaam_workers', INITIAL_WORKERS);
      const idx = workers.findIndex(w => w.id === workerId);
      if (idx >= 0) {
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
      return sendJson(res, 200, getStore('localkaam_reviews', INITIAL_REVIEWS));
    }
    if (req.method === 'POST') {
      try {
        const newReview = await readBody(req);
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

  // Complaints API
  if (pathname === '/api/complaints') {
    if (req.method === 'GET') {
      return sendJson(res, 200, getStore('localkaam_complaints', INITIAL_COMPLAINTS));
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        const data = await readBody(req);
        const complaints = Array.isArray(data) ? data : [...getStore('localkaam_complaints', INITIAL_COMPLAINTS), data];
        setStore('localkaam_complaints', complaints);
        broadcastEvent('COMPLAINTS_UPDATED', { key: 'localkaam_complaints', value: complaints });
        return sendJson(res, 200, { success: true });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
  }

  // Reset Demo Data
  if (pathname === '/api/reset' && req.method === 'POST') {
    setStore('localkaam_workers', INITIAL_WORKERS);
    setStore('localkaam_bookings', INITIAL_BOOKINGS);
    setStore('localkaam_reviews', INITIAL_REVIEWS);
    setStore('localkaam_complaints', INITIAL_COMPLAINTS);
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
      // Fallback for SPA routing if not found
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
setInterval(() => {
  for (const client of sseClients) {
    if (!client.writableEnded) {
      try {
        client.write(':keepalive\n\n');
      } catch (e) {
        sseClients.delete(client);
      }
    }
  }
}, 15000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LocalKaam backend server running at http://localhost:${PORT}/ (and on local network)`);
});
