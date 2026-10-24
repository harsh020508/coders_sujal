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

// In-memory fallback if localStorage is unavailable
const memoryStore = {};
const changeListeners = [];

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
  initialized: false,

  async init(onDataReady) {
    if (this.initialized) return;
    this.initialized = true;

    // Set up Realtime listener from Supabase
    SupabaseDataService.subscribeRealtime((table, payload) => {
      this.handleRealtimeEvent(table, payload);
    });

    // If Supabase is configured, pull latest live database state
    if (SupabaseService.isConfigured()) {
      await this.syncFromSupabase();
      if (onDataReady) onDataReady();
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
      try { fn(dataType, data); } catch (e) { console.error(e); }
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

      const [workersResult, bookingsResult, reviewsResult, complaintsResult] = results;

      const remoteWorkers = workersResult.status === 'fulfilled' ? workersResult.value : null;
      const remoteBookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value : null;
      const remoteReviews = reviewsResult.status === 'fulfilled' ? reviewsResult.value : null;
      const remoteComplaints = complaintsResult.status === 'fulfilled' ? complaintsResult.value : null;

      if (remoteWorkers && remoteWorkers.length > 0) {
        safeSet(STORAGE_KEYS.WORKERS, remoteWorkers);
      }
      if (remoteBookings) {
        safeSet(STORAGE_KEYS.BOOKINGS, remoteBookings);
      }
      if (remoteReviews) {
        safeSet(STORAGE_KEYS.REVIEWS, remoteReviews);
      }
      if (remoteComplaints) {
        safeSet(STORAGE_KEYS.COMPLAINTS, remoteComplaints);
      }

      this.notifyChange('sync', { remoteWorkers, remoteBookings });
      return true;
    } catch (e) {
      console.warn('Sync from Supabase failed, relying on local cache:', e);
      return false;
    }
  },

  handleRealtimeEvent(table, payload) {
    if (table === 'bookings') {
      const currentBookings = this.getBookings();
      if (payload.eventType === 'INSERT') {
        const newBooking = payload.new ? DataMapper.dbToBooking(payload.new) : null;
        if (newBooking && !currentBookings.find(b => b.id === newBooking.id)) {
          currentBookings.unshift(newBooking);
          safeSet(STORAGE_KEYS.BOOKINGS, currentBookings);
          this.notifyChange('bookings', currentBookings);
        }
      } else if (payload.eventType === 'UPDATE') {
        this.syncFromSupabase();
      }
    } else if (table === 'workers') {
      this.syncFromSupabase();
    }
  },

  // Workers
  getWorkers() {
    return safeGet(STORAGE_KEYS.WORKERS, INITIAL_WORKERS);
  },
  saveWorkers(workers) {
    safeSet(STORAGE_KEYS.WORKERS, workers);
    this.notifyChange('workers', workers);

    // Background sync to Supabase
    if (SupabaseService.isConfigured()) {
      workers.forEach(w => {
        SupabaseDataService.upsertWorker(w).catch(err => console.warn('Supabase worker sync error:', err));
      });
    }
  },

  // Bookings
  getBookings() {
    return safeGet(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
  },
  saveBookings(bookings) {
    safeSet(STORAGE_KEYS.BOOKINGS, bookings);
    this.notifyChange('bookings', bookings);

    // Background sync to Supabase
    if (SupabaseService.isConfigured()) {
      bookings.forEach(b => {
        SupabaseDataService.upsertBooking(b).catch(err => console.warn('Supabase booking sync error:', err));
      });
    }
  },

  // Reviews
  getReviews() {
    return safeGet(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
  },
  saveReviews(reviews) {
    safeSet(STORAGE_KEYS.REVIEWS, reviews);
    this.notifyChange('reviews', reviews);

    // Background sync to Supabase
    if (SupabaseService.isConfigured()) {
      reviews.forEach(r => {
        SupabaseDataService.upsertReview(r).catch(err => console.warn('Supabase review sync error:', err));
      });
    }
  },

  // Complaints
  getComplaints() {
    return safeGet(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
  },
  saveComplaints(complaints) {
    safeSet(STORAGE_KEYS.COMPLAINTS, complaints);
    this.notifyChange('complaints', complaints);

    // Background sync to Supabase
    if (SupabaseService.isConfigured()) {
      complaints.forEach(c => {
        SupabaseDataService.upsertComplaint(c).catch(err => console.warn('Supabase complaint sync error:', err));
      });
    }
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
