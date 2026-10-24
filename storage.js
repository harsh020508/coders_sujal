import { INITIAL_WORKERS, INITIAL_BOOKINGS, INITIAL_REVIEWS, INITIAL_COMPLAINTS } from './data.js';

const STORAGE_KEYS = {
  WORKERS: 'localkaam_workers',
  BOOKINGS: 'localkaam_bookings',
  REVIEWS: 'localkaam_reviews',
  COMPLAINTS: 'localkaam_complaints',
  CURRENT_ROLE: 'localkaam_current_role',
  SELECTED_WORKER_ID: 'localkaam_selected_worker_id',
  CUSTOMER_LOCALITY: 'localkaam_customer_locality',
  THEME: 'localkaam_theme'
};

// In-memory fallback if localStorage is unavailable
const memoryStore = {};

function safeGet(key, fallback) {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    }
  } catch (e) {
    console.warn('localStorage read error for key:', key, e);
  }
  return memoryStore[key] !== undefined ? memoryStore[key] : fallback;
}

// Sets only local storage and memory store (without echoing back to backend)
function safeSetLocal(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }
  } catch (e) {
    console.warn('localStorage write error for key:', key, e);
  }
  memoryStore[key] = value;
}

async function pushToBackend(key, value) {
  if (typeof window === 'undefined' || !window.location || !window.location.protocol.startsWith('http')) {
    return;
  }
  try {
    let endpoint = null;
    if (key === STORAGE_KEYS.BOOKINGS) endpoint = '/api/bookings';
    else if (key === STORAGE_KEYS.WORKERS) endpoint = '/api/workers';
    else if (key === STORAGE_KEYS.REVIEWS) endpoint = '/api/reviews';
    else if (key === STORAGE_KEYS.COMPLAINTS) endpoint = '/api/complaints';
    if (!endpoint) return;

    await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
  } catch (err) {
    console.info('Backend sync skipped or offline, state kept locally:', err.message);
  }
}

function safeSet(key, value) {
  safeSetLocal(key, value);
  pushToBackend(key, value);
}

function safeGetItem(key, fallback) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) || fallback;
    }
  } catch (e) {}
  return memoryStore[key] !== undefined ? memoryStore[key] : fallback;
}

function safeSetItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch (e) {}
  memoryStore[key] = value;
}

let eventSource = null;
let onRemoteUpdateCallback = null;

export const StorageService = {
  // Real-time backend sync initialization
  async initBackendSync(onRemoteUpdate) {
    onRemoteUpdateCallback = onRemoteUpdate;
    if (typeof window === 'undefined' || !window.location || !window.location.protocol.startsWith('http')) {
      return;
    }

    // 1. Initial bootstrap from server
    try {
      const res = await fetch('/api/bootstrap');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.workers)) safeSetLocal(STORAGE_KEYS.WORKERS, data.workers);
        if (Array.isArray(data.bookings)) safeSetLocal(STORAGE_KEYS.BOOKINGS, data.bookings);
        if (Array.isArray(data.reviews)) safeSetLocal(STORAGE_KEYS.REVIEWS, data.reviews);
        if (Array.isArray(data.complaints)) safeSetLocal(STORAGE_KEYS.COMPLAINTS, data.complaints);
        if (onRemoteUpdateCallback) {
          onRemoteUpdateCallback('bootstrap', data);
        }
      }
    } catch (err) {
      console.info('Backend server unreachable, running in local-first mode:', err.message);
    }

    // 2. Real-time Server-Sent Events (SSE)
    try {
      if (typeof EventSource !== 'undefined') {
        if (eventSource) {
          eventSource.close();
        }
        eventSource = new EventSource('/api/events');

        eventSource.addEventListener('sync', (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.key && payload.value !== undefined) {
              safeSetLocal(payload.key, payload.value);
              if (onRemoteUpdateCallback) {
                onRemoteUpdateCallback(payload.key, payload.value);
              }
            } else if (payload.type === 'RESET') {
              if (payload.workers) safeSetLocal(STORAGE_KEYS.WORKERS, payload.workers);
              if (payload.bookings) safeSetLocal(STORAGE_KEYS.BOOKINGS, payload.bookings);
              if (payload.reviews) safeSetLocal(STORAGE_KEYS.REVIEWS, payload.reviews);
              if (payload.complaints) safeSetLocal(STORAGE_KEYS.COMPLAINTS, payload.complaints);
              if (onRemoteUpdateCallback) {
                onRemoteUpdateCallback('reset', payload);
              }
            }
          } catch (err) {
            console.warn('Error parsing SSE event data:', err);
          }
        });

        eventSource.onerror = () => {
          // Browser will automatically attempt reconnect
        };
      }
    } catch (err) {
      console.warn('EventSource initialization failed:', err);
    }
  },

  getWorkers() {
    return safeGet(STORAGE_KEYS.WORKERS, INITIAL_WORKERS);
  },
  saveWorkers(workers) {
    safeSet(STORAGE_KEYS.WORKERS, workers);
  },

  getBookings() {
    return safeGet(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
  },
  saveBookings(bookings) {
    safeSet(STORAGE_KEYS.BOOKINGS, bookings);
  },

  getReviews() {
    return safeGet(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
  },
  saveReviews(reviews) {
    safeSet(STORAGE_KEYS.REVIEWS, reviews);
  },

  getComplaints() {
    return safeGet(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
  },
  saveComplaints(complaints) {
    safeSet(STORAGE_KEYS.COMPLAINTS, complaints);
  },

  getCurrentRole() {
    return safeGetItem(STORAGE_KEYS.CURRENT_ROLE, 'landing');
  },
  setCurrentRole(role) {
    safeSetItem(STORAGE_KEYS.CURRENT_ROLE, role);
  },

  getSelectedWorkerId() {
    return safeGetItem(STORAGE_KEYS.SELECTED_WORKER_ID, 'w1');
  },
  setSelectedWorkerId(id) {
    safeSetItem(STORAGE_KEYS.SELECTED_WORKER_ID, id);
  },

  getCustomerLocality() {
    return safeGetItem(STORAGE_KEYS.CUSTOMER_LOCALITY, 'andheri');
  },
  setCustomerLocality(loc) {
    safeSetItem(STORAGE_KEYS.CUSTOMER_LOCALITY, loc);
  },

  getTheme() {
    return safeGetItem(STORAGE_KEYS.THEME, 'light');
  },
  setTheme(theme) {
    safeSetItem(STORAGE_KEYS.THEME, theme);
  },

  resetDemoData() {
    safeSetLocal(STORAGE_KEYS.WORKERS, INITIAL_WORKERS);
    safeSetLocal(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    safeSetLocal(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    safeSetLocal(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
    safeSetItem(STORAGE_KEYS.CURRENT_ROLE, 'landing');
    safeSetItem(STORAGE_KEYS.SELECTED_WORKER_ID, 'w1');
    safeSetItem(STORAGE_KEYS.CUSTOMER_LOCALITY, 'andheri');

    if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
      fetch('/api/reset', { method: 'POST' }).catch(() => {});
    }

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
};
