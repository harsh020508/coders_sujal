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

function safeSet(key, value) {
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

export const StorageService = {
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
    safeSet(STORAGE_KEYS.WORKERS, INITIAL_WORKERS);
    safeSet(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    safeSet(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    safeSet(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
    safeSetItem(STORAGE_KEYS.CURRENT_ROLE, 'landing');
    safeSetItem(STORAGE_KEYS.SELECTED_WORKER_ID, 'w1');
    safeSetItem(STORAGE_KEYS.CUSTOMER_LOCALITY, 'andheri');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
};
