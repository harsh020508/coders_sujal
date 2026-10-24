import { INITIAL_WORKERS, INITIAL_BOOKINGS, INITIAL_REVIEWS, INITIAL_COMPLAINTS } from './data.js';
import { SupabaseService } from './supabaseClient.js';
import { SupabaseDataService, DataMapper } from './supabaseDataService.js';

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

const memoryStore = {};
const changeListeners = [];

function safeGet(key, fallback) {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    }
  } catch (e) {}
  return memoryStore[key] !== undefined ? memoryStore[key] : fallback;
}

function safeSet(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }
  } catch (e) {}
  memoryStore[key] = value;
}

// Use sessionStorage for tab-specific state (role, selected worker) so two tabs (Customer & Worker) don't overwrite each other!
function sessionGetItem(key, fallback) {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const val = sessionStorage.getItem(key);
      if (val !== null) return val;
    }
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch (e) {}
  return memoryStore[key] !== undefined ? memoryStore[key] : fallback;
}

function sessionSetItem(key, value) {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, value);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch (e) {}
  memoryStore[key] = value;
}

export const StorageService = {
  initialized: false,

  async init(onDataReady) {
    if (this.initialized) return;
    this.initialized = true;

    try {
      SupabaseDataService.subscribeRealtime((table, payload) => {
        this.handleRealtimeEvent(table, payload);
      });
    } catch (e) {}

    if (SupabaseService.isConfigured()) {
      try {
        await Promise.race([
          this.syncFromSupabase(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Sync timeout')), 3000))
        ]);
      } catch (e) {}
    }
    if (onDataReady) {
      try { onDataReady(); } catch(e) {}
    }
  },

  onChange(callback) {
    changeListeners.push(callback);
    return () => {
      const idx = changeListeners.indexOf(callback);
      if (idx !== -1) changeListeners.splice(idx, 1);
    };
  },

  notifyChange(dataType, data) {
    changeListeners.forEach(fn => {
      try { fn(dataType, data); } catch (e) {}
    });
  },

  async syncFromSupabase() {
    if (!SupabaseService.isConfigured()) return false;
    try {
      const results = await Promise.allSettled([
        SupabaseDataService.fetchWorkers(),
        SupabaseDataService.fetchBookings(),
        SupabaseDataService.fetchReviews(),
        SupabaseDataService.fetchComplaints()
      ]);
      const [wRes, bRes, rRes, cRes] = results;
      if (wRes.status === 'fulfilled' && wRes.value?.length) safeSet(STORAGE_KEYS.WORKERS, wRes.value);
      if (bRes.status === 'fulfilled' && bRes.value) safeSet(STORAGE_KEYS.BOOKINGS, bRes.value);
      if (rRes.status === 'fulfilled' && rRes.value) safeSet(STORAGE_KEYS.REVIEWS, rRes.value);
      if (cRes.status === 'fulfilled' && cRes.value) safeSet(STORAGE_KEYS.COMPLAINTS, cRes.value);
      this.notifyChange('sync', {});
      return true;
    } catch (e) {
      return false;
    }
  },

  handleRealtimeEvent(table, payload) {
    if (table === 'bookings' || table === 'workers') {
      this.syncFromSupabase();
    }
  },

  getWorkers() {
    return safeGet(STORAGE_KEYS.WORKERS, INITIAL_WORKERS);
  },
  saveWorkers(workers) {
    safeSet(STORAGE_KEYS.WORKERS, workers);
    this.notifyChange('workers', workers);
    if (SupabaseService.isConfigured()) {
      workers.forEach(w => SupabaseDataService.upsertWorker(w).catch(() => {}));
    }
  },

  getBookings() {
    return safeGet(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
  },
  saveBookings(bookings) {
    safeSet(STORAGE_KEYS.BOOKINGS, bookings);
    this.notifyChange('bookings', bookings);
    if (SupabaseService.isConfigured()) {
      bookings.forEach(b => SupabaseDataService.upsertBooking(b).catch(() => {}));
    }
  },

  getReviews() {
    return safeGet(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
  },
  saveReviews(reviews) {
    safeSet(STORAGE_KEYS.REVIEWS, reviews);
    this.notifyChange('reviews', reviews);
  },

  getComplaints() {
    return safeGet(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
  },
  saveComplaints(complaints) {
    safeSet(STORAGE_KEYS.COMPLAINTS, complaints);
    this.notifyChange('complaints', complaints);
  },

  getCurrentRole() {
    return sessionGetItem(STORAGE_KEYS.CURRENT_ROLE, 'landing');
  },
  setCurrentRole(role) {
    sessionSetItem(STORAGE_KEYS.CURRENT_ROLE, role);
  },

  getSelectedWorkerId() {
    return sessionGetItem(STORAGE_KEYS.SELECTED_WORKER_ID, 'w1');
  },
  setSelectedWorkerId(id) {
    sessionSetItem(STORAGE_KEYS.SELECTED_WORKER_ID, id);
  },

  getCustomerLocality() {
    return sessionGetItem(STORAGE_KEYS.CUSTOMER_LOCALITY, 'andheri');
  },
  setCustomerLocality(loc) {
    sessionSetItem(STORAGE_KEYS.CUSTOMER_LOCALITY, loc);
  },

  getTheme() {
    return sessionGetItem(STORAGE_KEYS.THEME, 'light');
  },
  setTheme(theme) {
    sessionSetItem(STORAGE_KEYS.THEME, theme);
  },

  resetDemoData() {
    safeSet(STORAGE_KEYS.WORKERS, INITIAL_WORKERS);
    safeSet(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    safeSet(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    safeSet(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
    sessionSetItem(STORAGE_KEYS.CURRENT_ROLE, 'landing');
    sessionSetItem(STORAGE_KEYS.SELECTED_WORKER_ID, 'w1');
    sessionSetItem(STORAGE_KEYS.CUSTOMER_LOCALITY, 'andheri');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
};
