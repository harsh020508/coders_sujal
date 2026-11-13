// LocalKaam — PWA runtime glue
// 1. Registers the service worker (offline shell) on http://localhost & https.
// 2. Shows a dismissible "Install app" pill when the browser fires
//    beforeinstallprompt (Chromium/Android desktop & mobile).
// 3. Shows an offline banner when the network drops; live data resumes
//    automatically via NotificationService + StorageService when it returns.

import { Toast } from './toast.js';

const INSTALL_DISMISS_KEY = 'localkaam_install_dismissed';
const PILL_ID = 'lk-install-pill';
const BANNER_ID = 'lk-offline-banner';

export const PwaService = {
  deferredPrompt: null,
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.setupOfflineBanner();
  },

  async registerServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    // Only register in secure contexts where workers are allowed
    const { protocol, hostname } = window.location;
    const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
    if (protocol !== 'https:' && !isLocal) return;

    try {
      await navigator.serviceWorker.register('./sw.js', { scope: './' });
    } catch (e) {
      console.warn('[PWA] Service worker registration failed:', e && e.message);
    }
  },

  setupInstallPrompt() {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event;

      // Respect a previous dismissal for this browser session
      let dismissed = false;
      try { dismissed = sessionStorage.getItem(INSTALL_DISMISS_KEY) === '1'; } catch (e) {}
      if (!dismissed) this.showInstallPill();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.removeInstallPill();
      try { Toast.show('LocalKaam installed! Launch it from your home screen.', 'success'); } catch (e) {}
    });
  },

  showInstallPill() {
    if (typeof document === 'undefined' || document.getElementById(PILL_ID)) return;

    const pill = document.createElement('div');
    pill.id = PILL_ID;
    pill.className = 'lk-install-pill';
    pill.setAttribute('role', 'region');
    pill.setAttribute('aria-label', 'Install LocalKaam app');
    pill.innerHTML = `
      <div class="lk-install-pill-icon"><i data-lucide="download" class="lucide-sm"></i></div>
      <div class="lk-install-pill-copy">
        <strong>Install LocalKaam</strong>
        <span>Full-screen, faster loads, works offline</span>
      </div>
      <button type="button" class="lk-install-pill-btn">Install</button>
      <button type="button" class="lk-install-pill-close" aria-label="Dismiss install suggestion">&times;</button>
    `;

    document.body.appendChild(pill);

    const dismiss = () => {
      try { sessionStorage.setItem(INSTALL_DISMISS_KEY, '1'); } catch (e) {}
      this.removeInstallPill();
    };

    const installBtn = pill.querySelector('.lk-install-pill-btn');
    const closeBtn = pill.querySelector('.lk-install-pill-close');
    if (installBtn) {
      installBtn.onclick = async () => {
        if (!this.deferredPrompt) { dismiss(); return; }
        this.deferredPrompt.prompt();
        try {
          const choice = await this.deferredPrompt.userChoice;
          if (choice && choice.outcome === 'accepted') {
            try { Toast.show('Installing LocalKaam…', 'success'); } catch (e) {}
          }
          this.deferredPrompt = null;
        } catch (e) {}
        dismiss();
      };
    }
    if (closeBtn) closeBtn.onclick = (e) => { e.stopPropagation(); dismiss(); };

    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') {
      window.refreshIcons();
    }
  },

  removeInstallPill() {
    if (typeof document === 'undefined') return;
    const pill = document.getElementById(PILL_ID);
    if (pill) pill.remove();
  },

  setupOfflineBanner() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const update = () => {
      if (navigator.onLine) {
        this.hideOfflineBanner();
      } else {
        this.showOfflineBanner();
      }
    };

    window.addEventListener('online', () => {
      update();
      try { Toast.show('Back online — live updates resumed.', 'success'); } catch (e) {}
    });
    window.addEventListener('offline', update);
    // Cover the case where the page loaded while already offline
    update();
  },

  showOfflineBanner() {
    if (typeof document === 'undefined' || document.getElementById(BANNER_ID)) return;
    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'lk-offline-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `
      <i data-lucide="wifi-off" class="lucide-sm"></i>
      <span>You're offline — showing saved data. Live updates resume automatically.</span>
    `;
    document.body.appendChild(banner);
    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') {
      window.refreshIcons();
    }
  },

  hideOfflineBanner() {
    if (typeof document === 'undefined') return;
    const banner = document.getElementById(BANNER_ID);
    if (banner) banner.remove();
  }
};
