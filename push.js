// LocalKaam - Web Push Notifications & Browser Notification Manager

export const PushNotificationService = {
  permission: 'default',

  async init() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Browser does not support desktop notifications.');
      return false;
    }

    this.permission = Notification.permission;
    if (this.permission === 'default') {
      try {
        this.permission = await Notification.requestPermission();
      } catch (e) {
        console.warn('Error requesting notification permission:', e);
      }
    }

    return this.permission === 'granted';
  },

  async show(title, options = {}) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission !== 'granted') {
      const granted = await this.init();
      if (!granted) return;
    }

    try {
      const defaultOptions = {
        icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231a3300"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="%23ffe95c" font-family="sans-serif" font-weight="bold">LK</text></svg>',
        badge: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231a3300"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="%23ffe95c" font-family="sans-serif" font-weight="bold">LK</text></svg>',
        vibrate: [200, 100, 200],
        ...options
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, defaultOptions);
          return;
        }
      }

      // Fallback to standard browser Notification constructor
      new Notification(title, defaultOptions);
    } catch (err) {
      console.warn('Failed to show push notification:', err);
    }
  },

  notifyBookingCreated(booking, workerName) {
    this.show(`New Booking Request! (${booking.id})`, {
      body: `Customer ${booking.customerName} requested ${booking.serviceTask} for ₹${booking.agreedPrice}.`,
      tag: 'localkaam-booking-' + booking.id
    });
  },

  notifyBookingAccepted(booking) {
    this.show(`Booking Confirmed! (${booking.id})`, {
      body: `Your service request has been confirmed. Agreed amount: ₹${booking.agreedPrice}.`,
      tag: 'localkaam-confirmed-' + booking.id
    });
  },

  notifyWorkerEnRoute(booking) {
    this.show(`Worker En Route! 🚗`, {
      body: `Your professional for ${booking.serviceTask} is on the way to your location.`,
      tag: 'localkaam-enroute-' + booking.id
    });
  },

  notifyJobCompleted(booking) {
    this.show(`Job Completed! ✅`, {
      body: `Service ${booking.serviceTask} marked as completed. Tap to view invoice & review.`,
      tag: 'localkaam-completed-' + booking.id
    });
  }
};
