// LocalKaam - Real-Time Order Status Notification System
// Handles: Authenticated SSE / Supabase Realtime, Top-Right Toast Popups,
// Multi-Tab Coordination, Reconnection Recovery, and Notification Center (Bell + Dropdown)

import { StorageService } from './storage.js';
import { AuthService } from './authService.js';
import { SupabaseService } from './supabaseClient.js';
import { SupabaseDataService } from './supabaseDataService.js';

const POPUP_DURATION_MS = 6000;
const SEEN_POPUPS_KEY = 'localkaam_seen_popups';

// Multi-tab broadcast channel
let broadcastChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel('localkaam_notif_channel');
    // Node's BroadcastChannel holds the event loop open (tests would never exit)
    if (broadcastChannel.unref) broadcastChannel.unref();
  }
} catch (e) {}

export const NotificationService = {
  initialized: false,
  eventSource: null,
  realtimeUnsub: null,
  reconnectTimeout: null,
  reconnectDelay: 1000,
  maxReconnectDelay: 16000,
  currentUserId: null,
  activePopups: new Map(), // notifId -> DOMElement

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Listen for storage notifications changes
    StorageService.onChange((type, data) => {
      if (type === 'notifications') {
        this.updateBadge();
        this.renderDropdownContent();
        // If a single new notification arrived in offline/local fallback
        if (data && !Array.isArray(data) && data.notificationType) {
          this.handleIncomingNotification(data);
        }
      }
    });

    // Listen for multi-tab messages
    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'POPUP_SHOWN' && event.data.id) {
          this._markPopupSeenLocally(event.data.id);
        }
      };
    }

    // Bind document click to close dropdown when clicked outside
    if (typeof document !== 'undefined') {
      document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('notification-bell-wrapper');
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown && dropdown.classList.contains('open')) {
          if (wrapper && !wrapper.contains(e.target)) {
            dropdown.classList.remove('open');
          }
        }
      });
    }

    this.setupUserSubscription();
  },

  setupUserSubscription() {
    const user = AuthService.getUser?.() || StorageService.getCurrentUser?.();
    const userId = user?.id || null;
    const role = StorageService.getCurrentRole();

    // Only customers receive customer order status popups
    if (role !== 'customer') {
      this.disconnect();
      return;
    }

    if (userId !== this.currentUserId) {
      this.disconnect();
      this.currentUserId = userId;
    }

    // Connect SSE and/or Supabase Realtime
    this.connectRealtime(userId);

    // Initial fetch of unread/persisted notifications
    StorageService.syncNotifications(userId).then(() => {
      this.updateBadge();
      this.renderDropdownContent();
    });
  },

  disconnect() {
    if (this.eventSource) {
      try { this.eventSource.close(); } catch (e) {}
      this.eventSource = null;
    }
    if (this.realtimeUnsub) {
      try { this.realtimeUnsub(); } catch (e) {}
      this.realtimeUnsub = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectDelay = 1000;
  },

  connectRealtime(userId) {
    if (typeof window === 'undefined') return;

    // 1. Server-Sent Events (SSE) via backend
    const token = AuthService.getToken?.() || (typeof localStorage !== 'undefined' ? localStorage.getItem('sb-access-token') : null);
    const sseUrl = token ? `/api/events?token=${encodeURIComponent(token)}` : '/api/events';

    try {
      if (typeof EventSource !== 'undefined') {
        if (this.eventSource) {
          this.eventSource.close();
        }

        const es = new EventSource(sseUrl);
        this.eventSource = es;

        es.onopen = () => {
          this.reconnectDelay = 1000;
          // Re-sync notifications in case any were missed during disconnect
          StorageService.syncNotifications(userId).then(() => {
            this.updateBadge();
            this.renderDropdownContent();
          });
        };

        es.addEventListener('notification', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.notification) {
              const notif = data.notification;
              StorageService.addNotification(notif);
              this.handleIncomingNotification(notif);
            }
          } catch (err) {
            console.error('[NotificationService] Failed to parse SSE notification:', err);
          }
        });

        es.onerror = () => {
          es.close();
          this.eventSource = null;
          // Reconnection with exponential backoff
          if (!this.reconnectTimeout) {
            this.reconnectTimeout = setTimeout(() => {
              this.reconnectTimeout = null;
              this.connectRealtime(userId);
            }, this.reconnectDelay);
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
          }
        };
      }
    } catch (e) {
      console.warn('[NotificationService] SSE connection error:', e);
    }

    // 2. Supabase Realtime channel subscription (if Supabase configured)
    if (SupabaseService.isConfigured() && userId) {
      SupabaseService.getClient().then(client => {
        if (!client) return;
        const channelName = `notif-user-${userId}-${Date.now()}`;
        const channel = client.channel(channelName)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          }, payload => {
            if (payload.new) {
              const notif = DataMapper.dbToNotification(payload.new);
              StorageService.addNotification(notif);
              this.handleIncomingNotification(notif);
            }
          })
          .subscribe();

        this.realtimeUnsub = () => {
          client.removeChannel(channel);
        };
      });
    }
  },

  handleIncomingNotification(notif) {
    if (!notif || !notif.notificationType) return;

    // Strictly ensure only customers receive customer order status popups
    const role = StorageService.getCurrentRole();
    if (role !== 'customer') return;

    // Filter by user ID if authenticated
    const currentUser = AuthService.getUser?.() || StorageService.getCurrentUser?.();
    if (currentUser?.id && notif.userId && notif.userId !== currentUser.id) {
      return;
    }

    // Prevent duplicate popups across tabs and session
    if (this._isPopupSeen(notif.id)) {
      return;
    }

    this._markPopupSeenLocally(notif.id);
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'POPUP_SHOWN', id: notif.id });
    }

    // Show Popup Toast
    this.showToastPopup(notif);

    // Update Notification Center badge & dropdown
    this.updateBadge();
    this.renderDropdownContent();
  },

  _isPopupSeen(id) {
    try {
      const seenStr = sessionStorage.getItem(SEEN_POPUPS_KEY);
      if (!seenStr) return false;
      const seen = JSON.parse(seenStr);
      return Array.isArray(seen) && seen.includes(id);
    } catch (e) {
      return false;
    }
  },

  _markPopupSeenLocally(id) {
    try {
      const seenStr = sessionStorage.getItem(SEEN_POPUPS_KEY);
      const seen = seenStr ? JSON.parse(seenStr) : [];
      if (!seen.includes(id)) {
        seen.push(id);
        sessionStorage.setItem(SEEN_POPUPS_KEY, JSON.stringify(seen));
      }
    } catch (e) {}
  },

  // ============================================================================
  // PHASE 5: NOTIFICATION POPUP UI (TOAST)
  // ============================================================================
  showToastPopup(notif) {
    if (typeof document === 'undefined') return;

    let container = document.getElementById('order-notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'order-notification-container';
      document.body.appendChild(container);
    }

    // Configuration per event type
    const configMap = {
      ORDER_ACCEPTED: {
        typeClass: 'accepted',
        iconName: 'check-circle',
        badgeColor: '#10b981',
        badgeBg: '#ecfdf5',
        borderColor: '#a7f3d0'
      },
      WORKER_ARRIVED: {
        typeClass: 'arrived',
        iconName: 'map-pin',
        badgeColor: '#2563eb',
        badgeBg: '#eff6ff',
        borderColor: '#bfdbfe'
      },
      ORDER_COMPLETED: {
        typeClass: 'completed',
        iconName: 'check-circle',
        badgeColor: '#7c3aed',
        badgeBg: '#f5f3ff',
        borderColor: '#ddd6fe'
      }
    };

    const config = configMap[notif.notificationType] || configMap.ORDER_ACCEPTED;

    const toast = document.createElement('div');
    toast.className = `order-notification-toast ${config.typeClass}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('data-id', notif.id);

    const bookingRef = notif.bookingId || '';

    toast.innerHTML = `
      <div class="toast-indicator" style="background:${config.badgeColor};"></div>
      <div class="toast-icon-box" style="background:${config.badgeBg}; color:${config.badgeColor};">
        <i data-lucide="${config.iconName}" class="lucide-sm"></i>
      </div>
      <div class="toast-content">
        <div class="toast-header-row">
          <strong class="toast-title">${this._escape(notif.title)}</strong>
          <span class="toast-time">Just now</span>
        </div>
        <p class="toast-message">${this._escape(notif.message)}</p>
        ${bookingRef ? `
          <div class="toast-footer-row">
            <span class="toast-booking-pill">
              <i data-lucide="tag" class="lucide-xs"></i> Booking #${this._escape(bookingRef)}
            </span>
          </div>
        ` : ''}
      </div>
      <button class="toast-close-btn" aria-label="Close notification" title="Dismiss">
        &times;
      </button>
      <div class="toast-progress-bar" style="background:${config.badgeColor};"></div>
    `;

    container.appendChild(toast);
    this.activePopups.set(notif.id, toast);

    // Refresh icons
    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') {
      window.refreshIcons();
    }

    // Auto-dismiss timer & pause on hover
    let remainingTime = POPUP_DURATION_MS;
    let startTime = Date.now();
    let dismissTimer = null;

    const progressBar = toast.querySelector('.toast-progress-bar');
    if (progressBar) {
      progressBar.style.transition = `width ${remainingTime}ms linear`;
      requestAnimationFrame(() => {
        progressBar.style.width = '0%';
      });
    }

    const removeToast = () => {
      if (!toast.parentNode) return;
      toast.classList.add('dismissing');
      setTimeout(() => {
        try { toast.remove(); } catch (e) {}
        this.activePopups.delete(notif.id);
      }, 300);
    };

    const startTimer = () => {
      startTime = Date.now();
      dismissTimer = setTimeout(removeToast, remainingTime);
    };

    const pauseTimer = () => {
      clearTimeout(dismissTimer);
      remainingTime -= (Date.now() - startTime);
      if (progressBar) {
        const computedWidth = window.getComputedStyle(progressBar).width;
        progressBar.style.transition = 'none';
        progressBar.style.width = computedWidth;
      }
    };

    const resumeTimer = () => {
      if (remainingTime > 0) {
        if (progressBar) {
          progressBar.style.transition = `width ${remainingTime}ms linear`;
          progressBar.style.width = '0%';
        }
        startTimer();
      } else {
        removeToast();
      }
    };

    startTimer();

    toast.addEventListener('mouseenter', pauseTimer);
    toast.addEventListener('mouseleave', resumeTimer);

    // Close button
    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        clearTimeout(dismissTimer);
        removeToast();
      };
    }

    // Click toast opens notification center / bookings
    toast.onclick = () => {
      const bellBtn = document.getElementById('notification-bell-btn');
      if (bellBtn) bellBtn.click();
    };
  },

  // ============================================================================
  // PHASE 6: NOTIFICATION CENTER (BELL & DROPDOWN)
  // ============================================================================
  getNotifications() {
    const user = AuthService.getUser?.() || StorageService.getCurrentUser?.();
    const userId = user?.id || null;
    return StorageService.getNotifications(userId);
  },

  getUnreadCount() {
    const notifications = this.getNotifications();
    return notifications.filter(n => !n.isRead).length;
  },

  updateBadge() {
    if (typeof document === 'undefined') return;
    const badge = document.getElementById('notification-unread-badge');
    if (!badge) return;

    const count = this.getUnreadCount();
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  },

  toggleDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
      dropdown.classList.remove('open');
    } else {
      this.renderDropdownContent();
      dropdown.classList.add('open');
    }
  },

  renderDropdownContent() {
    if (typeof document === 'undefined') return;
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    const notifications = this.getNotifications();
    const unreadCount = notifications.filter(n => !n.isRead).length;

    dropdown.innerHTML = `
      <div class="notif-dropdown-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <h4 style="margin:0;font-size:0.95rem;font-weight:700;color:var(--text-primary);">Notifications</h4>
          ${unreadCount > 0 ? `<span class="notif-unread-count-pill">${unreadCount} new</span>` : ''}
        </div>
        ${unreadCount > 0 ? `
          <button class="notif-mark-all-btn" id="notif-mark-all-read-btn">
            Mark all read
          </button>
        ` : ''}
      </div>

      <div class="notif-dropdown-list">
        ${notifications.length === 0 ? `
          <div class="notif-empty-state">
            <div class="notif-empty-icon">
              <i data-lucide="bell-off" class="lucide-md"></i>
            </div>
            <h5>No notifications yet</h5>
            <p>You'll see real-time updates when a worker accepts, arrives, or completes your order.</p>
          </div>
        ` : `
          ${notifications.map(n => this._renderNotificationItem(n)).join('')}
        `}
      </div>
    `;

    // Attach mark all read handler
    const markAllBtn = dropdown.querySelector('#notif-mark-all-read-btn');
    if (markAllBtn) {
      markAllBtn.onclick = async (e) => {
        e.stopPropagation();
        const user = AuthService.getUser?.() || StorageService.getCurrentUser?.();
        await StorageService.markAllNotificationsRead(user?.id);
        this.updateBadge();
        this.renderDropdownContent();
      };
    }

    // Attach individual mark as read handlers
    dropdown.querySelectorAll('.notif-item').forEach(el => {
      const id = el.getAttribute('data-id');
      el.onclick = async () => {
        const user = AuthService.getUser?.() || StorageService.getCurrentUser?.();
        await StorageService.markNotificationRead(id, user?.id);
        this.updateBadge();
        this.renderDropdownContent();
      };
    });

    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') {
      window.refreshIcons();
    }
  },

  _renderNotificationItem(n) {
    const configMap = {
      ORDER_ACCEPTED: { icon: 'check-circle', color: '#10b981', bg: '#ecfdf5', label: 'Order Accepted' },
      WORKER_ARRIVED: { icon: 'map-pin', color: '#2563eb', bg: '#eff6ff', label: 'Worker Arrived' },
      ORDER_COMPLETED: { icon: 'check-circle', color: '#7c3aed', bg: '#f5f3ff', label: 'Order Completed' }
    };
    const c = configMap[n.notificationType] || configMap.ORDER_ACCEPTED;
    const timeFormatted = this._formatRelativeTime(n.createdAt);

    return `
      <div class="notif-item ${n.isRead ? 'read' : 'unread'}" data-id="${this._escape(n.id)}">
        <div class="notif-item-icon" style="background:${c.bg};color:${c.color};">
          <i data-lucide="${c.icon}" class="lucide-xs"></i>
        </div>
        <div class="notif-item-content">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
            <span class="notif-item-title">${this._escape(n.title)}</span>
            <span class="notif-item-time">${timeFormatted}</span>
          </div>
          <p class="notif-item-message">${this._escape(n.message)}</p>
          <div class="notif-item-meta">
            ${n.bookingId ? `<span class="notif-booking-tag">#${this._escape(n.bookingId)}</span>` : ''}
            ${!n.isRead ? '<span class="notif-unread-dot" title="Unread"></span>' : ''}
          </div>
        </div>
      </div>
    `;
  },

  _formatRelativeTime(isoString) {
    if (!isoString) return 'Just now';
    try {
      const now = Date.now();
      const past = new Date(isoString).getTime();
      const diffSec = Math.floor((now - past) / 1000);

      if (diffSec < 45) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      const days = Math.floor(diffSec / 86400);
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days}d ago`;
      return new Date(isoString).toLocaleDateString();
    } catch (e) {
      return 'Recently';
    }
  },

  _escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
