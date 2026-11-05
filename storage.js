// LocalKaam - Storage & Live Sync Service
// Primary: Supabase PostgreSQL & Realtime WebSockets
// Fallback: Synchronous localStorage / memory cache
import { INITIAL_WORKERS, INITIAL_BOOKINGS, INITIAL_REVIEWS, INITIAL_COMPLAINTS } from './data.js';
import { SupabaseService } from './supabaseClient.js';
import { SupabaseDataService, DataMapper } from './supabaseDataService.js';
import { Toast } from './toast.js';

const STORAGE_KEYS = {
  WORKERS: 'localkaam_workers',
  BOOKINGS: 'localkaam_bookings',
  REVIEWS: 'localkaam_reviews',
  COMPLAINTS: 'localkaam_complaints',
  SUPPORT_TICKETS: 'localkaam_support_tickets',
  NOTIFICATIONS: 'localkaam_notifications',
  CURRENT_ROLE: 'localkaam_current_role',
  SELECTED_WORKER_ID: 'localkaam_selected_worker_id',
  CUSTOMER_LOCALITY: 'localkaam_customer_locality',
  THEME: 'localkaam_theme',
  CURRENT_USER: 'localkaam_current_user'
};

const memoryStore = {};
const changeListeners = [];
let realtimeInitialized = false;

function safeGet(key, fallback) {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(key);
      if (data !== null && data !== undefined) {
        try {
          return JSON.parse(data);
        } catch (_) {
          return data;
        }
      }
    }
  } catch (e) {}
  return memoryStore[key] !== undefined ? memoryStore[key] : fallback;
}

function safeSetLocal(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {}
  memoryStore[key] = value;
}

function notifyChange(dataType, data) {
  changeListeners.forEach(fn => {
    try { fn(dataType, data); } catch (e) { console.error('[Storage] Listener error:', e); }
  });
}

export const StorageService = {
  initialized: false,

  async init(onDataReady) {
    if (this.initialized) {
      if (onDataReady) onDataReady();
      return;
    }
    this.initialized = true;

    // Ensure fallback local defaults exist
    if (!safeGet(STORAGE_KEYS.WORKERS, null)) safeSetLocal(STORAGE_KEYS.WORKERS, INITIAL_WORKERS);
    if (!safeGet(STORAGE_KEYS.BOOKINGS, null)) safeSetLocal(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    if (!safeGet(STORAGE_KEYS.REVIEWS, null)) safeSetLocal(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    if (!safeGet(STORAGE_KEYS.COMPLAINTS, null)) safeSetLocal(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);

    // Initial sync from Supabase if configured
    if (SupabaseService.isConfigured()) {
      try {
        await Promise.race([
          this.syncFromSupabase(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Sync timeout')), 4000))
        ]);
        console.log('[Storage] Hydrated from Supabase PostgreSQL');
      } catch (e) {
        console.warn('[Storage] Supabase sync deferred/timed out, using cached state:', e.message);
        try {
          if (typeof window !== 'undefined' && window.Toast) {
            window.Toast.show('Showing sample data', 'info');
          }
        } catch (_) {}
      }

      this.initRealtime();
    }

    if (onDataReady) {
      try { onDataReady(); } catch (e) {}
    }
  },

  initRealtime() {
    if (realtimeInitialized) return;
    realtimeInitialized = true;

    SupabaseDataService.subscribeRealtime((table, payload) => {
      if (table === 'bookings') {
        const bookings = safeGet(STORAGE_KEYS.BOOKINGS, []);
        if (payload.eventType === 'DELETE' && payload.old?.id) {
          const next = bookings.filter(b => b.id !== payload.old.id);
          safeSetLocal(STORAGE_KEYS.BOOKINGS, next);
          notifyChange('bookings', next);
          return;
        }

        if (payload.new && payload.new.id) {
          const incoming = DataMapper.dbToBooking(payload.new);
          const idx = bookings.findIndex(b => b.id === incoming.id);
          let prevStatus = null;

          if (idx >= 0) {
            prevStatus = bookings[idx].status;
            bookings[idx] = { ...bookings[idx], ...incoming };
          } else {
            bookings.unshift(incoming);
          }

          safeSetLocal(STORAGE_KEYS.BOOKINGS, bookings);
          notifyChange('bookings', incoming);

          // Helpful toast notification for incoming realtime event
          if (!prevStatus) {
            Toast.show(`New booking received: ${incoming.id} (${incoming.serviceTask})`, 'info');
          } else if (prevStatus !== incoming.status) {
            Toast.show(`Booking ${incoming.id} updated to: ${incoming.status}`, 'success');
          }
        }
      } else if (table === 'workers') {
        if (payload.new && payload.new.id) {
          const incoming = DataMapper.dbToWorker(payload.new);
          const workers = safeGet(STORAGE_KEYS.WORKERS, []);
          const idx = workers.findIndex(w => w.id === incoming.id);
          if (idx >= 0) {
            workers[idx] = { ...workers[idx], ...incoming };
          } else {
            workers.push(incoming);
          }
          safeSetLocal(STORAGE_KEYS.WORKERS, workers);
          notifyChange('workers', incoming);
        }
      } else if (table === 'reviews') {
        if (payload.new && payload.new.id) {
          const incoming = DataMapper.dbToReview(payload.new);
          const reviews = safeGet(STORAGE_KEYS.REVIEWS, []);
          const idx = reviews.findIndex(r => r.id === incoming.id);
          if (idx >= 0) {
            reviews[idx] = incoming;
          } else {
            reviews.unshift(incoming);
          }
          safeSetLocal(STORAGE_KEYS.REVIEWS, reviews);
          notifyChange('reviews', incoming);
        }
      } else if (table === 'complaints') {
        if (payload.new && payload.new.id) {
          const incoming = DataMapper.dbToComplaint(payload.new);
          const complaints = safeGet(STORAGE_KEYS.COMPLAINTS, []);
          const idx = complaints.findIndex(c => c.id === incoming.id);
          if (idx >= 0) {
            complaints[idx] = incoming;
          } else {
            complaints.unshift(incoming);
          }
          safeSetLocal(STORAGE_KEYS.COMPLAINTS, complaints);
          notifyChange('complaints', incoming);
        }
      } else if (table === 'notifications') {
        if (payload.new && payload.new.id) {
          const incoming = DataMapper.dbToNotification(payload.new);
          this.addNotification(incoming);
        }
      }
    });
  },

  async syncFromSupabase() {
    if (!SupabaseService.isConfigured()) return false;
    try {
      const results = await Promise.allSettled([
        SupabaseDataService.fetchWorkers(),
        SupabaseDataService.fetchBookings(),
        SupabaseDataService.fetchReviews(),
        SupabaseDataService.fetchComplaints(),
        SupabaseDataService.fetchSupportTickets(),
        SupabaseDataService.fetchNotifications()
      ]);

      const [wRes, bRes, rRes, cRes, tRes, nRes] = results;

      if (wRes.status === 'fulfilled' && wRes.value && wRes.value.length) {
        safeSetLocal(STORAGE_KEYS.WORKERS, wRes.value);
      }
      if (bRes.status === 'fulfilled' && bRes.value && bRes.value.length) {
        safeSetLocal(STORAGE_KEYS.BOOKINGS, bRes.value);
      }
      if (rRes.status === 'fulfilled' && rRes.value && rRes.value.length) {
        safeSetLocal(STORAGE_KEYS.REVIEWS, rRes.value);
      }
      if (cRes.status === 'fulfilled' && cRes.value && cRes.value.length) {
        safeSetLocal(STORAGE_KEYS.COMPLAINTS, cRes.value);
      }
      if (tRes && tRes.status === 'fulfilled' && tRes.value && tRes.value.length) {
        safeSetLocal(STORAGE_KEYS.SUPPORT_TICKETS, tRes.value);
      }
      if (nRes && nRes.status === 'fulfilled' && nRes.value && nRes.value.length) {
        const existing = safeGet(STORAGE_KEYS.NOTIFICATIONS, []);
        const merged = [...nRes.value];
        existing.forEach(e => {
          if (!merged.some(m => m.id === e.id || (m.bookingId === e.bookingId && m.notificationType === e.notificationType))) {
            merged.push(e);
          }
        });
        safeSetLocal(STORAGE_KEYS.NOTIFICATIONS, merged);
      }

      notifyChange('sync', {});
      return true;
    } catch (e) {
      console.warn('[Storage] syncFromSupabase error:', e);
      return false;
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
    notifyChange(dataType, data);
  },

  // --- WORKERS ---
  getWorkers() {
    return safeGet(STORAGE_KEYS.WORKERS, INITIAL_WORKERS);
  },

  saveWorkers(workers) {
    safeSetLocal(STORAGE_KEYS.WORKERS, workers);
    notifyChange('workers', workers);

    if (SupabaseService.isConfigured()) {
      workers.forEach(async (w) => {
        const { error } = await SupabaseDataService.upsertWorker(w);
        if (error) {
          console.warn('[Storage] Supabase worker sync failed:', error.message);
        }
      });
    }
  },

  saveSingleWorker(worker) {
    const workers = this.getWorkers();
    const idx = workers.findIndex(w => w.id === worker.id);
    if (idx >= 0) {
      workers[idx] = { ...workers[idx], ...worker };
    } else {
      workers.push(worker);
    }
    safeSetLocal(STORAGE_KEYS.WORKERS, workers);
    notifyChange('workers', worker);

    if (SupabaseService.isConfigured()) {
      SupabaseDataService.upsertWorker(worker).then(({ error }) => {
        if (error) {
          Toast.show(`Worker sync warning: ${error.message}`, 'warning');
        }
      });
    }
  },

  // --- BOOKINGS ---
  getBookings() {
    return safeGet(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
  },

  saveBookings(bookings) {
    const prevBookings = this.getBookings();
    safeSetLocal(STORAGE_KEYS.BOOKINGS, bookings);
    notifyChange('bookings', bookings);

    // Identify which booking(s) were modified
    if (Array.isArray(bookings)) {
      bookings.forEach(b => {
        const prev = prevBookings.find(p => p.id === b.id);
        if (prev && prev.status !== b.status) {
          this._handleStatusTransitionNotification(prev, b);
          if (SupabaseService.isConfigured()) {
            SupabaseDataService.upsertBooking(b).catch(err => console.warn('[Storage] Supabase sync error:', err));
          }
        }
      });
    }

    if (SupabaseService.isConfigured() && Array.isArray(bookings) && bookings.length > 0) {
      const target = bookings[0];
      SupabaseDataService.upsertBooking(target).catch(err => console.warn('[Storage] Supabase sync error:', err));
    }
  },

  saveSingleBooking(booking) {
    const bookings = this.getBookings();
    const idx = bookings.findIndex(b => b.id === booking.id);
    let prev = null;
    if (idx >= 0) {
      prev = bookings[idx];
      bookings[idx] = { ...bookings[idx], ...booking };
    } else {
      bookings.unshift(booking);
    }
    safeSetLocal(STORAGE_KEYS.BOOKINGS, bookings);
    notifyChange('bookings', booking);

    if (prev && prev.status !== booking.status) {
      this._handleStatusTransitionNotification(prev, booking);
    }

    if (SupabaseService.isConfigured()) {
      SupabaseDataService.upsertBooking(booking).then(({ error }) => {
        if (error) {
          console.error('[Storage] Supabase booking sync error:', error.message);
          Toast.show(`Booking sync error: ${error.message}`, 'error');
        }
      });
    }
  },

  _handleStatusTransitionNotification(prevBooking, newBooking) {
    if (!newBooking || !prevBooking) return;
    const prevStatus = prevBooking.status;
    const newStatus = newBooking.status;
    if (!newStatus || prevStatus === newStatus) return;

    const customerId = newBooking.customerId || newBooking.customer_id;
    let eventType = null;
    let title = '';
    let message = '';

    const isPrevPending = ['Pending confirmation', 'Pending'].includes(prevStatus);
    const isNewAccepted = ['Confirmed', 'Accepted'].includes(newStatus);
    const isPrevNotArrived = !['Worker arrived', 'Arrived'].includes(prevStatus);
    const isNewArrived = ['Worker arrived', 'Arrived'].includes(newStatus);
    const isPrevNotCompleted = !['Job completed', 'Completed'].includes(prevStatus);
    const isNewCompleted = ['Job completed', 'Completed'].includes(newStatus);

    if (isPrevPending && isNewAccepted) {
      eventType = 'ORDER_ACCEPTED';
      title = 'Order Accepted!';
      message = 'Good news! Your service provider has accepted your order and will be arriving shortly.';
    } else if (isPrevNotArrived && isNewArrived) {
      eventType = 'WORKER_ARRIVED';
      title = 'Your Worker Has Arrived!';
      message = 'Your service provider has reached your location and is ready to start the service.';
    } else if (isPrevNotCompleted && isNewCompleted) {
      eventType = 'ORDER_COMPLETED';
      title = 'Order Completed Successfully!';
      message = 'Your service has been completed. Thank you for choosing LocalKaam!';
    }

    if (eventType) {
      const notif = {
        id: `notif_${newBooking.id}_${eventType}`,
        userId: customerId,
        bookingId: newBooking.id,
        notificationType: eventType,
        title,
        message,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      this.addNotification(notif);
    }
  },

  // --- REVIEWS ---
  getReviews() {
    return safeGet(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
  },

  saveReviews(reviews) {
    safeSetLocal(STORAGE_KEYS.REVIEWS, reviews);
    notifyChange('reviews', reviews);

    if (SupabaseService.isConfigured() && Array.isArray(reviews) && reviews.length > 0) {
      SupabaseDataService.upsertReview(reviews[0]).catch(e => console.warn(e));
    }
  },

  // --- COMPLAINTS ---
  getComplaints() {
    return safeGet(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
  },

  saveComplaints(complaints) {
    safeSetLocal(STORAGE_KEYS.COMPLAINTS, complaints);
    notifyChange('complaints', complaints);

    if (SupabaseService.isConfigured() && Array.isArray(complaints) && complaints.length > 0) {
      SupabaseDataService.upsertComplaint(complaints[0]).catch(e => console.warn(e));
    }
  },

  // --- NOTIFICATIONS ---
  getNotifications(userId = null) {
    const list = safeGet(STORAGE_KEYS.NOTIFICATIONS, []);
    if (!userId) return list;
    return list.filter(n => !n.userId || n.userId === userId);
  },

  saveNotifications(notifications) {
    safeSetLocal(STORAGE_KEYS.NOTIFICATIONS, notifications);
    notifyChange('notifications', notifications);
  },

  addNotification(notification) {
    if (!notification || !notification.notificationType) return;
    const current = safeGet(STORAGE_KEYS.NOTIFICATIONS, []);

    // Prevent duplicate notification by stable identifier (bookingId + notificationType or id)
    const exists = current.some(n => 
      n.id === notification.id || 
      (n.bookingId === notification.bookingId && n.notificationType === notification.notificationType)
    );

    if (exists) return;

    current.unshift(notification);
    safeSetLocal(STORAGE_KEYS.NOTIFICATIONS, current);
    notifyChange('notifications', notification);

    if (SupabaseService.isConfigured()) {
      SupabaseDataService.upsertNotification(notification).catch(err => console.warn(err));
    }
  },

  async markNotificationRead(id, userId = null) {
    const list = safeGet(STORAGE_KEYS.NOTIFICATIONS, []);
    let changed = false;
    list.forEach(n => {
      if (n.id === id) {
        n.isRead = true;
        changed = true;
      }
    });

    if (changed) {
      safeSetLocal(STORAGE_KEYS.NOTIFICATIONS, list);
      notifyChange('notifications', list);
    }

    if (SupabaseService.isConfigured()) {
      await SupabaseDataService.markNotificationRead(id, userId);
    }

    // Try backend REST API if available
    try {
      const token = typeof window !== 'undefined' ? (window.AuthService?.getToken?.() || localStorage.getItem('sb-access-token')) : null;
      if (token) {
        await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (e) {}

    return true;
  },

  async markAllNotificationsRead(userId = null) {
    const list = safeGet(STORAGE_KEYS.NOTIFICATIONS, []);
    list.forEach(n => {
      if (!userId || !n.userId || n.userId === userId) {
        n.isRead = true;
      }
    });

    safeSetLocal(STORAGE_KEYS.NOTIFICATIONS, list);
    notifyChange('notifications', list);

    if (SupabaseService.isConfigured() && userId) {
      await SupabaseDataService.markAllNotificationsRead(userId);
    }

    try {
      const token = typeof window !== 'undefined' ? (window.AuthService?.getToken?.() || localStorage.getItem('sb-access-token')) : null;
      if (token) {
        await fetch('/api/notifications/mark-all-read', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (e) {}

    return true;
  },

  async syncNotifications(userId = null) {
    let synced = [];

    // 1. Try Supabase
    if (SupabaseService.isConfigured()) {
      synced = await SupabaseDataService.fetchNotifications(userId);
    }

    // 2. If no Supabase or empty, try Backend API
    if ((!synced || synced.length === 0) && typeof window !== 'undefined') {
      try {
        const token = window.AuthService?.getToken?.() || localStorage.getItem('sb-access-token');
        if (token) {
          const res = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            synced = await res.json();
          }
        }
      } catch (e) {}
    }

    if (Array.isArray(synced) && synced.length > 0) {
      const existing = safeGet(STORAGE_KEYS.NOTIFICATIONS, []);
      const merged = [...synced];
      existing.forEach(e => {
        if (!merged.some(m => m.id === e.id || (m.bookingId === e.bookingId && m.notificationType === e.notificationType))) {
          merged.push(e);
        }
      });
      safeSetLocal(STORAGE_KEYS.NOTIFICATIONS, merged);
      notifyChange('notifications', merged);
      return merged;
    }

    return this.getNotifications(userId);
  },

  // --- SUPPORT TICKETS ---
  getSupportTickets() {
    return safeGet(STORAGE_KEYS.SUPPORT_TICKETS, []);
  },

  saveSupportTickets(tickets) {
    safeSetLocal(STORAGE_KEYS.SUPPORT_TICKETS, tickets);
    notifyChange('support_tickets', tickets);

    if (SupabaseService.isConfigured() && Array.isArray(tickets) && tickets.length > 0) {
      SupabaseDataService.upsertSupportTicket(tickets[0]).catch(e => console.warn(e));
    }
  },

  // --- SESSION STATE ---
  getCurrentRole() {
    return safeGet(STORAGE_KEYS.CURRENT_ROLE, 'landing');
  },

  setCurrentRole(role) {
    safeSetLocal(STORAGE_KEYS.CURRENT_ROLE, role);
  },

  getSelectedWorkerId() {
    return safeGet(STORAGE_KEYS.SELECTED_WORKER_ID, 'w1');
  },

  setSelectedWorkerId(id) {
    safeSetLocal(STORAGE_KEYS.SELECTED_WORKER_ID, id);
  },

  getCustomerLocality() {
    return safeGet(STORAGE_KEYS.CUSTOMER_LOCALITY, 'andheri');
  },

  setCustomerLocality(loc) {
    safeSetLocal(STORAGE_KEYS.CUSTOMER_LOCALITY, loc);
  },

  getTheme() {
    return safeGet(STORAGE_KEYS.THEME, 'light');
  },

  setTheme(theme) {
    safeSetLocal(STORAGE_KEYS.THEME, theme);
  },

  getCurrentUser() {
    return safeGet(STORAGE_KEYS.CURRENT_USER, null);
  },

  setCurrentUser(user) {
    safeSetLocal(STORAGE_KEYS.CURRENT_USER, user);
  },

  resetDemoData() {
    safeSetLocal(STORAGE_KEYS.WORKERS, INITIAL_WORKERS);
    safeSetLocal(STORAGE_KEYS.BOOKINGS, INITIAL_BOOKINGS);
    safeSetLocal(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
    safeSetLocal(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
    safeSetLocal(STORAGE_KEYS.SUPPORT_TICKETS, []);
    safeSetLocal(STORAGE_KEYS.NOTIFICATIONS, []);
    safeSetLocal(STORAGE_KEYS.CURRENT_ROLE, 'landing');
    safeSetLocal(STORAGE_KEYS.SELECTED_WORKER_ID, 'w1');
    safeSetLocal(STORAGE_KEYS.CUSTOMER_LOCALITY, 'andheri');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
};