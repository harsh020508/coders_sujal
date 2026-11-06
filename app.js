import { StorageService } from './storage.js';
import { CATEGORIES } from './data.js';
import { Toast } from './toast.js';
import { AuthModal } from './authModal.js';
import { AuthService } from './authService.js';
import { NotificationService } from './notificationService.js';
import { esc } from './utils.js';
import { buildTaskIndex, searchTasks, catImage, icon } from './ui.js';
import { initScrollReveal, fadeSlide } from './transitions.js';
import { initMotion } from './animations/motion.js';
import { initScroll } from './animations/scroll.js';
import { refreshReveals } from './animations/reveal.js';
import { initPolish, bindFocusTraps } from './animations/feedback.js';
import { Settings } from './settingsService.js';
import { landingHTML } from './components/landing/Landing.js';
import { bindLanding } from './components/landing/bind.js';
import { ProfileDropdown } from './components/ProfileDropdown.js';
import { i18n, t } from './i18n.js';

// Role dashboards are large (customer ~110KB, worker ~170KB, settings
// ~100KB) and were parsed on every first load even for landing-page
// visitors. Load them on demand instead — landing paints immediately.
let _customerFrontend = null;
let _workerFrontend = null;
let _settingsPage = null;
async function loadCustomerFrontend() {
  if (!_customerFrontend) _customerFrontend = (await import('./customer.js')).CustomerFrontend;
  return _customerFrontend;
}
async function loadWorkerFrontend() {
  if (!_workerFrontend) _workerFrontend = (await import('./worker.js')).WorkerFrontend;
  return _workerFrontend;
}
async function loadSettingsPage() {
  if (!_settingsPage) _settingsPage = (await import('./components/SettingsPage.js')).SettingsPage;
  return _settingsPage;
}

const ROLES = ['landing', 'role-select', 'customer', 'worker', 'settings'];

export const App = {
  _globalsBound: false,
  _activityBound: false,
  _pendingSettingsSection: null,
  _lastRole: null,

  init() {
    Settings.init();
    initMotion();
    initScroll();
    initPolish();
    bindFocusTraps();
    this._bindGlobalEvents();

    // Handle initial URL hash or history state.
    // Priority: explicit hash → authenticated profile role → landing.
    // This rescues an OAuth login whose hash was stripped while the
    // session finished exchanging after boot.
    let hash = (typeof window !== 'undefined' && window.location.hash) ? window.location.hash.replace('#', '') : '';
    if (hash === 'admin') {
      hash = 'landing';
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    if (ROLES.includes(hash)) {
      StorageService.setCurrentRole(hash);
    } else {
      const profileRole = (() => {
        try {
          const p = AuthService.getProfile();
          const r = p && (p.role || (p.user_metadata && p.user_metadata.role));
          return (r === 'worker' || r === 'customer') && AuthService.isAuthenticated() ? r : null;
        } catch (e) { return null; }
      })();
      StorageService.setCurrentRole(profileRole || 'landing');
    }

    this.render();

    // Handle browser back/forward navigation smoothly without exiting app
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', (e) => {
        if (e.state && e.state.role && ROLES.includes(e.state.role)) {
          StorageService.setCurrentRole(e.state.role);
        } else {
          let h = window.location.hash.replace('#', '');
          if (ROLES.includes(h)) {
            StorageService.setCurrentRole(h);
          } else {
            StorageService.setCurrentRole('landing');
          }
        }
        this.render();
      });
    }

    // Initialize storage sync in background
    StorageService.init(() => {
      NotificationService.init();
      this.render();
    });

    // Initialize notification service
    NotificationService.init();

    // Listen to live data changes across tabs/devices
    StorageService.onChange(() => {
      this.render();
    });
  },

  navigateToRole(role, options = {}) {
    if (!ROLES.includes(role)) {
      role = 'landing';
    }
    if (role === 'settings') {
      if (StorageService.getCurrentRole() !== 'settings') {
        this._lastRole = StorageService.getCurrentRole();
      }
      ProfileDropdown.close(false);
    }
    if (role === 'worker') {
      // Worker module loads lazily — stash intent, applied after import.
      this._pendingWorkerSetup = options.openSetupModal !== false;
      if (_workerFrontend) {
        _workerFrontend.currentView = 'overview';
        _workerFrontend.activeView = 'overview';
        if (options.openSetupModal !== false) _workerFrontend.shouldOpenSetupModal = true;
      }
    }
    StorageService.setCurrentRole(role);
    try {
      if (window.history && window.history.pushState) {
        window.history.pushState({ role }, '', `#${role}`);
      }
    } catch (e) {}
    NotificationService.setupUserSubscription();
    this.render();
  },

  navigateToSettings(section) {
    let target = section;
    if (!target) {
      try {
        target = localStorage.getItem('localkaam_settings_section') || 'general';
      } catch (e) {
        target = 'general';
      }
    }
    this._pendingSettingsSection = target;
    this.navigateToRole('settings');
  },

  getBackRole() {
    if (this._lastRole === 'customer' || this._lastRole === 'worker') return this._lastRole;
    const profile = AuthService.getProfile();
    const role = profile && (profile.role || (profile.user_metadata && profile.user_metadata.role));
    return role === 'worker' ? 'worker' : 'customer';
  },

  applyTheme(theme) {
    Settings.setTheme(theme);
    this.updateThemeButtons();
  },

  toggleTheme() {
    const next = Settings.getResolvedTheme() === 'dark' ? 'light' : 'dark';
    Settings.setTheme(next);
    this.updateThemeButtons();
  },

  updateThemeButtons() {
    if (typeof document === 'undefined') return;
    const dark = Settings.getResolvedTheme() === 'dark';
    document.querySelectorAll('#theme-toggle-btn').forEach((button) => {
      // Rebuild the icon node instead of textContent, which wiped the
      // lucide <i> placeholder and left emoji text in the navbar.
      button.innerHTML = `<i data-lucide="${dark ? 'sun' : 'moon'}" class="lucide-sm"></i>`;
      button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      button.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
    });
    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') {
      window.refreshIcons();
    }
  },

  updateProfileBadge() {
    const badge = document.getElementById('role-badge-text');
    if (!badge) return;
    const profile = AuthService.getProfile();
    const name = profile ? (profile.full_name || profile.email || 'User') : 'User';
    badge.textContent = name;
  },

  focusSettingsSearch() {
    if (StorageService.getCurrentRole() !== 'settings') return;
    try {
      _settingsPage?.sidebarController?.open();
      _settingsPage?.sidebarController?.focusSearch();
    } catch (e) {}
  },

  matchesShortcut(event, combo) {
    const parts = String(combo || '').toLowerCase().split('+').filter(Boolean);
    if (!parts.length) return false;
    const key = parts[parts.length - 1];
    const needCtrl = parts.includes('ctrl') || parts.includes('meta');
    const needShift = parts.includes('shift');
    const needAlt = parts.includes('alt');
    const hasCtrl = event.ctrlKey || event.metaKey;

    if (needCtrl !== hasCtrl || needShift !== event.shiftKey || needAlt !== event.altKey) return false;
    const eventKey = String(event.key || '').toLowerCase();
    if (key === ',') return event.code === 'Comma' || eventKey === ',';
    if (/^[a-z0-9]$/.test(key)) return eventKey === key;
    return eventKey === key;
  },

  handleGlobalKeydown(event) {
    if (event.defaultPrevented || event.repeat) return;
    if (typeof document !== 'undefined' && document.querySelector('dialog[open]')) return;
    if (!Settings.get('shortcuts.enabled', true)) return;

    const target = event.target;
    const typing = target && target.matches && (target.matches('input, textarea, select') || target.isContentEditable);
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
    if (typing && !hasModifier) return;

    const openKey = Settings.getShortcut('openSettings');
    if (openKey && this.matchesShortcut(event, openKey)) {
      event.preventDefault();
      this.navigateToSettings();
      return;
    }

    const searchKey = Settings.getShortcut('search');
    if (searchKey && this.matchesShortcut(event, searchKey)) {
      event.preventDefault();
      if (StorageService.getCurrentRole() === 'settings') {
        this.focusSettingsSearch();
      } else {
        this.navigateToSettings('general');
        window.setTimeout(() => this.focusSettingsSearch(), 140);
      }
      return;
    }

    const themeKey = Settings.getShortcut('toggleTheme');
    if (themeKey && this.matchesShortcut(event, themeKey)) {
      event.preventDefault();
      this.toggleTheme();
    }
  },

  _bindGlobalEvents() {
    if (this._globalsBound) return;
    this._globalsBound = true;

    window.addEventListener('locakaam:open-settings', (event) => {
      this.navigateToSettings(event.detail && event.detail.section);
    });

    window.addEventListener('locakaam:logout', () => {
      this.handleLogout();
    });

    window.addEventListener('locakaam:navigate-role', (event) => {
      const role = event.detail && event.detail.role;
      if (role) this.navigateToRole(role);
    });

    window.addEventListener('locakaam:profile-updated', () => {
      this.updateProfileBadge();
      ProfileDropdown.refresh();
    });

    window.addEventListener('locakaam:theme-changed', () => this.updateThemeButtons());
    window.addEventListener('locakaam:language-changed', () => { this.render(); });
    window.addEventListener('locakaam:session-timeout-changed', () => this.setupSessionTimeout());

    window.addEventListener('keydown', (event) => this.handleGlobalKeydown(event));

    try {
      AuthService.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          this.updateProfileBadge();
          ProfileDropdown.refresh();
          this.setupSessionTimeout();
          // If an auth session arrives while viewing landing (e.g. OAuth
          // exchange finished after boot), go straight to the dashboard.
          try {
            const current = StorageService.getCurrentRole();
            if ((current === 'landing' || current === 'role-select') && AuthService.isAuthenticated()) {
              const p = AuthService.getProfile();
              const r = p && (p.role || (p.user_metadata && p.user_metadata.role));
              if (r === 'worker' || r === 'customer') this.navigateToRole(r);
            }
          } catch (e) {}
        }
      });
    } catch (e) {}

    this.setupSessionTimeout();
  },

  handleLogout() {
    this._pendingSettingsSection = null;
    this._lastRole = null;
    StorageService.setCurrentRole('landing');
    try {
      if (window.history && window.history.pushState) {
        window.history.pushState({ role: 'landing' }, '', '#landing');
      }
    } catch (e) {}
    this.render();
    window.scrollTo(0, 0);
  },

  _bindActivityTracking() {
    if (this._activityBound) return;
    this._activityBound = true;
    ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'].forEach((name) => {
      document.addEventListener(name, () => {
        if (typeof this._armIdleTimer === 'function') this._armIdleTimer();
      }, { passive: true });
    });
  },

  setupSessionTimeout() {
    if (typeof window === 'undefined') return;
    this._bindActivityTracking();
    if (this._idleTimer) window.clearTimeout(this._idleTimer);
    this._armIdleTimer = null;

    const minutes = Number(Settings.get('security.sessionTimeout', 30));
    if (!minutes || !AuthService.isAuthenticated()) return;

    this._armIdleTimer = () => {
      if (this._idleTimer) window.clearTimeout(this._idleTimer);
      this._idleTimer = window.setTimeout(async () => {
        if (!AuthService.isAuthenticated()) return;
        await AuthService.signOut();
        Toast.show('You were signed out after a period of inactivity.', 'info');
        this.handleLogout();
      }, minutes * 60 * 1000);
    };
    this._armIdleTimer();
  },

  render() {
    if (typeof document === 'undefined') return;
    const root = document.getElementById('app');
    if (!root) return;

    let role = StorageService.getCurrentRole();
    if (!ROLES.includes(role)) {
      role = 'landing';
      StorageService.setCurrentRole('landing');
    }

    try {
      if (role === 'landing') {
        root.innerHTML = this.renderLandingPage();
        this.attachLandingEvents(root);
      } else if (role === 'role-select') {
        root.innerHTML = this.renderRoleSelectionPage();
        this.attachRoleSelectionEvents(root);
      } else if (role === 'customer') {
        root.innerHTML = this.renderAppShell('customer');
        const viewContainer = root.querySelector('#app-view-container');
        if (viewContainer) {
          viewContainer.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text-secondary);">Loading…</div>';
          loadCustomerFrontend().then((CustomerFrontend) => {
            // Role may have changed while the chunk loaded.
            if (StorageService.getCurrentRole() !== 'customer' || !viewContainer.isConnected) return;
            try {
              if (this._pendingCustomerCategory) {
                CustomerFrontend.currentCategory = this._pendingCustomerCategory;
                this._pendingCustomerCategory = null;
              }
              CustomerFrontend.render(viewContainer);
            } catch (custErr) {
              console.error('Customer frontend render error:', custErr);
              viewContainer.innerHTML = `<div style="padding: 3rem; text-align: center;"><p style="color: var(--color-danger);">Error loading customer view: ${esc(custErr.message)}</p><button class="btn btn-primary" onclick="window.location.reload();">Reload</button></div>`;
            }
          }).catch((custErr) => {
            if (StorageService.getCurrentRole() === 'customer') {
              viewContainer.innerHTML = `<div style="padding: 3rem; text-align: center;"><p style="color: var(--color-danger);">Error loading customer view: ${esc(custErr.message)}</p><button class="btn btn-primary" onclick="window.location.reload();">Reload</button></div>`;
            }
          });
        }
        this.attachShellEvents(root);
      } else if (role === 'worker') {
        root.innerHTML = this.renderAppShell('worker');
        const viewContainer = root.querySelector('#app-view-container');
        if (viewContainer) {
          viewContainer.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text-secondary);">Loading…</div>';
          loadWorkerFrontend().then((WorkerFrontend) => {
            if (StorageService.getCurrentRole() !== 'worker' || !viewContainer.isConnected) return;
            try {
              WorkerFrontend.currentView = 'overview';
              WorkerFrontend.activeView = 'overview';
              if (this._pendingWorkerSetup) WorkerFrontend.shouldOpenSetupModal = true;
              this._pendingWorkerSetup = false;
              WorkerFrontend.render(viewContainer);
            } catch (workErr) {
              console.error('Worker frontend render error:', workErr);
              viewContainer.innerHTML = `<div style="padding: 3rem; text-align: center;"><p style="color: var(--color-danger);">Error loading worker view: ${esc(workErr.message)}</p><button class="btn btn-primary" onclick="window.location.reload();">Reload</button></div>`;
            }
          }).catch((workErr) => {
            if (StorageService.getCurrentRole() === 'worker') {
              viewContainer.innerHTML = `<div style="padding: 3rem; text-align: center;"><p style="color: var(--color-danger);">Error loading worker view: ${esc(workErr.message)}</p><button class="btn btn-primary" onclick="window.location.reload();">Reload</button></div>`;
            }
          });
        }
        this.attachShellEvents(root);
      } else if (role === 'settings') {
        root.innerHTML = this.renderSettingsShell();
        this.attachShellEvents(root);
        const pending = this._pendingSettingsSection || null;
        this._pendingSettingsSection = null;
        loadSettingsPage().then((SettingsPage) => {
          if (StorageService.getCurrentRole() !== 'settings') return;
          try {
            SettingsPage.init(pending);
          } catch (settingsErr) {
            console.error('Settings render error:', settingsErr);
            const viewContainer = root.querySelector('#app-view-container');
            if (viewContainer) {
              viewContainer.innerHTML = '<div style="padding:3rem;text-align:center;"><p style="color:var(--text-secondary);">Settings could not be loaded.</p><button class="btn btn-outline" id="settings-retry">Try again</button></div>';
              viewContainer.querySelector('#settings-retry')?.addEventListener('click', () => window.location.reload());
            }
          }
        }).catch(() => {});
      } else {
        root.innerHTML = this.renderLandingPage();
        this.attachLandingEvents(root);
      }
    } catch (err) {
      console.error('App render fatal error:', err);
      root.innerHTML = `<div style="padding: 3rem; text-align: center; font-family: Inter, sans-serif;"><h2>LocalKaam</h2><p>Something went wrong rendering this view.</p><button onclick="window.location.reload();" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #1a3300; color: white; border: none; border-radius: 8px; cursor: pointer;">Reload App</button></div>`;
    }

    // Refresh Lucide vector icons
    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') {
      window.refreshIcons();
    }
    if (typeof window !== "undefined") {
      try {
        initScrollReveal(root, ".ui-cat,.ui-card,.ui-worker,.category-card,.feature-card,.step-card,.usp-card,.pricing-card");
      } catch (e) {}
      try { refreshReveals(root); } catch (e) {}
    }
  },

  _mobileNavHTML(theme) {
    return `
      <div class="mobile-nav-overlay" id="mobile-nav-overlay"></div>
      <div class="mobile-nav-drawer" id="mobile-nav-drawer">
        <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:1px solid var(--border-color);margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="nav-logo" style="width:32px;height:32px;font-size:0.85rem;">LK</div>
            <strong style="font-size:1.05rem;color:var(--text-primary);">LocalKaam</strong>
          </div>
          <button class="mobile-nav-close" id="mobile-nav-close" aria-label="Close menu">✕</button>
        </div>
        <a class="nav-link" href="#problem"><i data-lucide="help-circle" class="lucide-sm"></i> The Problem</a>
        <a class="nav-link" href="#services"><i data-lucide="grid" class="lucide-sm"></i> Services</a>
        <a class="nav-link" href="#usps"><i data-lucide="shield-check" class="lucide-sm"></i> Why Us</a>
        <a class="nav-link" href="#comparison"><i data-lucide="scale" class="lucide-sm"></i> Competitors</a>
        <a class="nav-link" href="#how-it-works"><i data-lucide="check-circle-2" class="lucide-sm"></i> How It Works</a>
        <div style="margin-top:auto;padding-top:16px;border-top:1px solid var(--border-color);display:flex;flex-direction:column;gap:10px;">
          <button class="theme-toggle" id="mobile-theme-toggle-btn" style="width:100%;justify-content:center;gap:8px;">
            <i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" class="lucide-sm"></i>
            ${theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button class="btn btn-outline btn-full" id="mobile-nav-signin-btn" style="justify-content:center;gap:6px;">
            <i data-lucide="user" class="lucide-xs"></i> Sign In / Register
          </button>
          <button class="btn btn-primary btn-full" id="mobile-get-started-btn" style="justify-content:center;">
            Get Started <i data-lucide="arrow-right" class="lucide-sm"></i>
          </button>
        </div>
      </div>
    `;
  },

  renderLandingPage() {
    const theme = Settings.getResolvedTheme();
    return landingHTML({ theme, t, CATEGORIES, esc });
  },

  renderRoleSelectionPage() {
    const theme = Settings.getResolvedTheme();
    return `
      <div class="app-container">
        ${this._mobileNavHTML(theme)}

        <header class="navbar">
          <div class="nav-brand" id="nav-back-home" role="button" tabindex="0">
            <div class="nav-logo">LK</div>
            <div class="nav-title">LocalKaam</div>
          </div>
          <div class="nav-actions">
            <button class="theme-toggle" id="theme-toggle-btn" aria-label="Toggle theme">
              <i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" class="lucide-sm"></i>
            </button>
            <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </header>

        <div class="role-selection-wrapper">
          <h1 style="font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;margin-bottom:12px;font-family:'Bricolage Grotesque',sans-serif;text-align:center;">
            How would you like to use LocalKaam?
          </h1>
          <p style="color:var(--text-secondary);font-size:clamp(1rem,1.8vw,1.1rem);margin-bottom:32px;line-height:1.6;text-align:center;max-width:600px;">
            Choose your experience. You can switch between customer and worker modes anytime.
          </p>

          <div class="role-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; max-width: 820px; margin: 0 auto;">
            <!-- Customer Card -->
            <div class="role-card" id="select-customer-role" role="button" tabindex="0">
              <div class="role-icon" style="display:flex;align-items:center;justify-content:center;">
                <i data-lucide="home" class="lucide-lg" style="color:var(--accent-primary);"></i>
              </div>
              <h3>I am a Customer</h3>
              <p>Find trusted neighborhood professionals, compare rates side-by-side, book appointments, negotiate prices, and track work progress live.</p>
              <ul style="list-style:none;margin:12px 0 20px;padding:0;display:flex;flex-direction:column;gap:8px;font-size:0.85rem;color:var(--text-secondary);text-align:left;">
                <li style="display:flex;align-items:center;gap:6px;"><i data-lucide="check" class="lucide-xs" style="color:#10b981;"></i> Browse 10+ home service categories</li>
                <li style="display:flex;align-items:center;gap:6px;"><i data-lucide="check" class="lucide-xs" style="color:#10b981;"></i> Direct price offers &amp; counter-offers</li>
                <li style="display:flex;align-items:center;gap:6px;"><i data-lucide="check" class="lucide-xs" style="color:#10b981;"></i> Instant digital invoice receipts</li>
              </ul>
              <button class="btn btn-primary btn-full" style="padding:14px;justify-content:center;">
                Continue as Customer <i data-lucide="arrow-right" class="lucide-sm"></i>
              </button>
            </div>

            <!-- Worker Card -->
            <div class="role-card" id="select-worker-role" role="button" tabindex="0">
              <div class="role-icon" style="display:flex;align-items:center;justify-content:center;">
                <i data-lucide="hammer" class="lucide-lg" style="color:var(--accent-primary);"></i>
              </div>
              <h3>I am a Service Professional</h3>
              <p>Set your own hourly &amp; fixed rates, accept direct customer requests, counter offers, manage appointments, and keep 100% of your earnings.</p>
              <ul style="list-style:none;margin:12px 0 20px;padding:0;display:flex;flex-direction:column;gap:8px;font-size:0.85rem;color:var(--text-secondary);text-align:left;">
                <li style="display:flex;align-items:center;gap:6px;"><i data-lucide="check" class="lucide-xs" style="color:#10b981;"></i> 0% platform commission deduction</li>
                <li style="display:flex;align-items:center;gap:6px;"><i data-lucide="check" class="lucide-xs" style="color:#10b981;"></i> Instant online / offline availability switch</li>
                <li style="display:flex;align-items:center;gap:6px;"><i data-lucide="check" class="lucide-xs" style="color:#10b981;"></i> Complete job lifecycle tracker</li>
              </ul>
              <button class="btn btn-primary btn-full" style="padding:14px;justify-content:center;">
                Continue as Worker <i data-lucide="arrow-right" class="lucide-sm"></i>
              </button>
            </div>
          </div>

          <div style="margin-top:36px;">
            <button class="btn btn-outline" id="back-to-home-link">
              <i data-lucide="arrow-left" class="lucide-sm"></i> Back to Landing Page
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderAppShell(activeRole) {
    const theme = Settings.getResolvedTheme();
    const profile = AuthService.getProfile();
    const userName = profile ? (profile.full_name || profile.email || 'User') : 'User';
    const displayName = userName.length > 18 ? userName.substring(0, 15) + '…' : userName;

    return `
      <div class="app-container">
        <!-- Mobile Nav Overlay for dashboard -->
        <div class="mobile-nav-overlay" id="mobile-nav-overlay"></div>
        <div class="mobile-nav-drawer" id="mobile-nav-drawer">
          <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:1px solid var(--border-color);margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="nav-logo" style="width:30px;height:30px;font-size:0.8rem;">LK</div>
              <strong style="color:var(--text-primary);">LocalKaam</strong>
            </div>
            <button class="mobile-nav-close" id="mobile-nav-close">✕</button>
          </div>
          <div style="padding:12px;background:var(--bg-secondary);border-radius:8px;margin-bottom:14px;">
            <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;">Logged in as</div>
            <div style="font-weight:700;font-size:0.95rem;margin-top:2px;">${esc(displayName)}</div>
            <div style="font-size:0.8rem;color:var(--accent-primary);margin-top:2px;font-weight:600;">
              Mode: ${activeRole === 'customer' ? 'Customer' : 'Worker'}
            </div>
          </div>
          <button class="btn btn-outline btn-full" id="mobile-switch-role-btn" style="justify-content:center;gap:6px;">
            <i data-lucide="arrow-left-right" class="lucide-xs"></i> Switch Mode
          </button>
          <button class="theme-toggle" id="mobile-theme-toggle-btn" style="width:100%;justify-content:center;margin-top:8px;gap:6px;">
            <i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" class="lucide-xs"></i>
            ${theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button class="btn btn-outline btn-full" id="mobile-reset-btn" style="margin-top:8px;font-size:0.8rem;justify-content:center;gap:6px;">
            <i data-lucide="rotate-cw" class="lucide-xs"></i> Reset Demo Data
          </button>
        </div>

        <header class="navbar">
          <div class="nav-brand" id="nav-brand-dashboard" role="button" tabindex="0">
            <div class="nav-logo">LK</div>
            <div class="nav-title">LocalKaam</div>
          </div>
          <div class="nav-links">
            <span class="role-badge" style="background:var(--accent-light);color:var(--text-primary);font-weight:700;font-size:0.8rem;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:9999px;">
              <i data-lucide="${activeRole === 'customer' ? 'home' : 'hammer'}" class="lucide-xs"></i>
              ${activeRole === 'customer' ? 'Customer' : 'Worker'} &nbsp;·&nbsp; ${esc(displayName)}
            </span>
          </div>
          <div class="nav-actions">
            ${activeRole === 'customer' ? `
              <div class="notification-bell-wrapper" id="notification-bell-wrapper">
                <button class="notification-bell-btn" id="notification-bell-btn" aria-label="Notifications" title="Notifications">
                  <i data-lucide="bell" class="lucide-sm"></i>
                  <span class="notification-badge hidden" id="notification-unread-badge">0</span>
                </button>
                <div class="notification-dropdown" id="notification-dropdown"></div>
              </div>
            ` : ''}
            <button class="btn btn-outline btn-sm" id="switch-role-btn" title="Switch Role Mode">
              <i data-lucide="arrow-left-right" class="lucide-xs"></i> Switch
            </button>
            <button class="theme-toggle" id="theme-toggle-btn" title="Toggle theme">
              <i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" class="lucide-xs"></i>
            </button>
            <button class="btn btn-outline btn-sm" id="reset-demo-btn" title="Reset Demo Data" style="font-size:0.75rem;">
              <i data-lucide="rotate-cw" class="lucide-xs"></i>
            </button>
            <div id="profile-menu-root" class="profile-menu-root"></div>
            <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </header>

        <div id="app-view-container" style="flex:1;display:flex;flex-direction:column;"></div>
      </div>
    `;
  },

  renderSettingsShell() {
    const theme = Settings.getResolvedTheme();
    const backRole = this.getBackRole();
    return `
      <div class="app-container settings-shell">
        <header class="navbar">
          <div class="nav-brand" id="nav-settings-brand" title="Back to ${backRole === 'worker' ? 'worker' : 'customer'} dashboard">
            <div class="nav-logo">LK</div>
            <div class="nav-title">LocalKaam</div>
          </div>
          <div class="nav-links">
            <span class="role-badge" style="background:var(--accent-light);color:var(--text-primary);font-weight:700;">Settings</span>
          </div>
          <div class="nav-actions">
            <button class="btn btn-outline btn-sm" id="settings-back-btn">← Back to dashboard</button>
            <button class="theme-toggle" id="theme-toggle-btn" title="Toggle theme">
              <i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" class="lucide-xs"></i>
            </button>
            <div id="profile-menu-root" class="profile-menu-root"></div>
          </div>
        </header>
        <div id="app-view-container" style="flex:1;display:flex;flex-direction:column;"></div>
      </div>
    `;
  },

  _attachMobileNav(root) {
    const hamburger = root.querySelector('#nav-hamburger');
    const overlay   = root.querySelector('#mobile-nav-overlay');
    const drawer    = root.querySelector('#mobile-nav-drawer');
    const closeBtn  = root.querySelector('#mobile-nav-close');

    const openDrawer  = () => { overlay?.classList.add('open'); drawer?.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const closeDrawer = () => { overlay?.classList.remove('open'); drawer?.classList.remove('open'); document.body.style.overflow = ''; };

    hamburger?.addEventListener('click', openDrawer);
    overlay?.addEventListener('click', closeDrawer);
    closeBtn?.addEventListener('click', closeDrawer);

    // Close on nav links
    drawer?.querySelectorAll('a.nav-link').forEach(a => a.addEventListener('click', closeDrawer));

    // Mobile theme toggle
    const mobileThemeBtn = root.querySelector('#mobile-theme-toggle-btn');
    if (mobileThemeBtn) {
      mobileThemeBtn.addEventListener('click', () => {
        // Resolve from Settings (source of truth, handles 'system') rather
        // than the legacy localkaam_theme key.
        const cur = Settings.getResolvedTheme();
        this.applyTheme(cur === 'dark' ? 'light' : 'dark');
        closeDrawer();
        this.render();
      });
    }

    // Mobile get started
    root.querySelector('#mobile-get-started-btn')?.addEventListener('click', () => {
      closeDrawer();
      this.navigateToRole('role-select');
    });

    // Mobile switch role
    root.querySelector('#mobile-switch-role-btn')?.addEventListener('click', () => {
      closeDrawer();
      this.navigateToRole('role-select');
    });

    // Mobile reset
    
    root.querySelector('#mobile-nav-signin-btn')?.addEventListener('click', () => {
      closeDrawer();
      AuthModal.show('customer', (user, profile) => {
        const destRole = profile?.role || 'customer';
        this.navigateToRole(destRole);
      });
    });

    root.querySelector('#mobile-logout-btn')?.addEventListener('click', async () => {
      closeDrawer();
      await AuthService.signOut();
      this.navigateToRole('landing');
    });

    root.querySelector('#mobile-reset-btn')?.addEventListener('click', () => {
      closeDrawer();
      if (confirm('Reset all app data and restore initial seeded state?')) {
        StorageService.resetDemoData();
      }
    });
  },

  attachLandingEvents(root) {
    this._attachMobileNav(root);
    bindLanding(root, {
      onCategory: (cat) => {
        const isAuthed = AuthService.isAuthenticated() && !AuthService.isGuest();
        if (isAuthed) {
          this._pendingCustomerCategory = cat;
          if (_customerFrontend) _customerFrontend.currentCategory = cat;
          this.navigateToRole('customer');
        } else {
          AuthModal.show('customer', () => {
            this._pendingCustomerCategory = cat;
            this.navigateToRole('customer');
          });
        }
      },
      onThemeToggle: () => { this.toggleTheme(); this.render(); },
      onGetStarted: () => this.navigateToRole('role-select'),
      onSignin: () => AuthModal.show('customer', (user, profile) => this.navigateToRole(profile?.role || 'customer')),
      onDemo: () => this.navigateToRole('role-select')
    });
  },

  attachRoleSelectionEvents(root) {
    this._attachMobileNav(root);

    root.querySelector('#nav-back-home')?.addEventListener('click', () => {
      this.navigateToRole('landing');
    });
    root.querySelector('#back-to-home-link')?.addEventListener('click', () => {
      this.navigateToRole('landing');
    });
    root.querySelector('#select-customer-role')?.addEventListener('click', () => {
      const isAuthed = AuthService.isAuthenticated() && !AuthService.isGuest();
      if (isAuthed) {
        this.navigateToRole('customer');
      } else {
        AuthModal.show('customer', () => {
          this.navigateToRole('customer');
        });
      }
    });
    root.querySelector('#select-worker-role')?.addEventListener('click', () => {
      const isAuthed = AuthService.isAuthenticated() && !AuthService.isGuest();
      if (isAuthed) {
        this.navigateToRole('worker');
      } else {
        AuthModal.show('worker', () => {
          this._pendingWorkerSetup = true;
          this.navigateToRole('worker');
        });
      }
    });

    
    const themeBtn = root.querySelector('#theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.toggleTheme();
        this.render();
      });
    }
  },

  attachShellEvents(root) {
    this._attachMobileNav(root);

    root.querySelector('#nav-brand-dashboard')?.addEventListener('click', () => {
      this.navigateToRole('landing');
    });
    root.querySelector('#nav-settings-brand')?.addEventListener('click', () => {
      this.navigateToRole(this.getBackRole());
    });
    root.querySelector('#settings-back-btn')?.addEventListener('click', () => {
      this.navigateToRole(this.getBackRole());
    });
    root.querySelector('#switch-role-btn')?.addEventListener('click', () => {
      this.navigateToRole('role-select');
    });

    const bellBtn = root.querySelector('#notification-bell-btn');
    if (bellBtn) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        NotificationService.toggleDropdown();
      });
      NotificationService.updateBadge();
    }
    root.querySelector('#shell-logout-btn')?.addEventListener('click', async () => {
      await AuthService.signOut();
      this.navigateToRole('landing');
    });

    const themeBtn = root.querySelector('#theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    const resetBtn = root.querySelector('#reset-demo-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all app data and restore initial seeded state?')) {
          StorageService.resetDemoData();
        }
      });
    }

    const profileRoot = root.querySelector('#profile-menu-root');
    if (profileRoot) ProfileDropdown.mount(profileRoot);

    this.updateThemeButtons();
    this.updateProfileBadge();
  }
};
