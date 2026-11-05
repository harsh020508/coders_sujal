import { StorageService } from './storage.js';
import { CATEGORIES } from './data.js';
import { CustomerFrontend } from './customer.js';
import { WorkerFrontend } from './worker.js';
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
import { SettingsPage } from './components/SettingsPage.js';
import { ProfileDropdown } from './components/ProfileDropdown.js';
import { i18n, t } from './i18n.js';

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

    // Handle initial URL hash or history state
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
      StorageService.setCurrentRole('landing');
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
      WorkerFrontend.currentView = 'overview';
      WorkerFrontend.activeView = 'overview';
      if (options.openSetupModal !== false) {
        WorkerFrontend.shouldOpenSetupModal = true;
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
      SettingsPage.sidebarController?.open();
      SettingsPage.sidebarController?.focusSearch();
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
          try {
            CustomerFrontend.render(viewContainer);
          } catch (custErr) {
            console.error('Customer frontend render error:', custErr);
            viewContainer.innerHTML = `<div style="padding: 3rem; text-align: center;"><p style="color: var(--color-danger);">Error loading customer view: ${esc(custErr.message)}</p><button class="btn btn-primary" onclick="localStorage.clear(); window.location.reload();">Reset &amp; Reload</button></div>`;
          }
        }
        this.attachShellEvents(root);
      } else if (role === 'worker') {
        root.innerHTML = this.renderAppShell('worker');
        const viewContainer = root.querySelector('#app-view-container');
        if (viewContainer) {
          try {
            WorkerFrontend.render(viewContainer);
          } catch (workErr) {
            console.error('Worker frontend render error:', workErr);
            viewContainer.innerHTML = `<div style="padding: 3rem; text-align: center;"><p style="color: var(--color-danger);">Error loading worker view: ${esc(workErr.message)}</p><button class="btn btn-primary" onclick="localStorage.clear(); window.location.reload();">Reset &amp; Reload</button></div>`;
          }
        }
        this.attachShellEvents(root);
      } else if (role === 'settings') {
        root.innerHTML = this.renderSettingsShell();
        this.attachShellEvents(root);
        const pending = this._pendingSettingsSection || null;
        this._pendingSettingsSection = null;
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
      } else {
        root.innerHTML = this.renderLandingPage();
        this.attachLandingEvents(root);
      }
    } catch (err) {
      console.error('App render fatal error:', err);
      root.innerHTML = `<div style="padding: 3rem; text-align: center; font-family: Inter, sans-serif;"><h2>LocalKaam</h2><p>Something went wrong rendering this view.</p><button onclick="localStorage.clear(); window.location.reload();" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #1a3300; color: white; border: none; border-radius: 8px; cursor: pointer;">Reset &amp; Reload App</button></div>`;
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
    return `
      <div class="app-container">
        ${this._mobileNavHTML(theme)}

        <!-- Top Navigation Bar -->
        <header class="navbar">
          <div class="nav-brand" id="nav-home-logo" role="button" tabindex="0">
            <div class="nav-logo">LK</div>
            <div class="nav-title">LocalKaam</div>
          </div>
          <nav class="nav-links" aria-label="Primary">
            <a class="nav-link" href="#problem">${t('nav_problem', 'Why us')}</a>
            <a class="nav-link" href="#services">${t('nav_services', 'Services')}</a>
            <a class="nav-link" href="#comparison">${t('nav_competitors', 'Comparison')}</a>
            <a class="nav-link" href="#how-it-works">${t('nav_how_it_works', 'How it works')}</a>
          </nav>
          <div class="nav-actions">
            <button class="theme-toggle" id="theme-toggle-btn" aria-label="Toggle theme">
              <i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" class="lucide-sm"></i>
            </button>
            <button class="btn btn-outline btn-sm" id="nav-signin-btn" style="display:inline-flex;align-items:center;gap:5px;">
              <i data-lucide="user" class="lucide-xs"></i> Sign in
            </button>
            <button class="btn btn-primary btn-sm" id="get-started-btn">
              Get started <i data-lucide="arrow-right" class="lucide-xs"></i>
            </button>
            <button class="nav-hamburger" id="nav-hamburger" aria-label="Open navigation menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </header>

        <!-- Hero Section -->
        <section class="landing-hero lk-hero-center">
          <p class="lk-eyebrow">Mumbai · Hyperlocal marketplace</p>
          <h1>
            Good help lives
            <br>on <span class="highlight">your street.</span>
          </h1>
          <p class="lk-lede">
            Tell us what needs fixing. We match you with verified plumbers,
            electricians, carpenters and more in your locality. They set
            their own prices and keep 100% — no commission, no surge fee.
          </p>
          <div class="hero-cta lk-cta-row">
            <button class="btn btn-primary btn-lg" id="hero-find-pro-btn">
              Find a professional <i data-lucide="arrow-right" class="lucide-sm"></i>
            </button>
            <button class="btn btn-outline btn-lg" id="hero-explore-btn">
              See how it works
            </button>
          </div>
          <div class="lk-trust lk-trust-center">
            <span><i data-lucide="shield-check" class="lucide-sm"></i> Verified pros</span>
            <span><i data-lucide="map-pin" class="lucide-sm"></i> ~25 min nearby</span>
            <span><i data-lucide="indian-rupee" class="lucide-sm"></i> 0% commission</span>
          </div>
        </section>

        <!-- Metrics -->
        <section class="lk-metrics stats-grid" aria-label="Marketplace facts">
          <div class="stat-card"><span class="stat-card-label">Service categories</span><h3>10+</h3></div>
          <div class="stat-card"><span class="stat-card-label">Platform commission</span><h3>0%</h3></div>
          <div class="stat-card"><span class="stat-card-label">Average arrival</span><h3>~25m</h3></div>
          <div class="stat-card"><span class="stat-card-label">Paid to pros</span><h3>100%</h3></div>
        </section>

        <!-- Services: earth-orbit of trades (names only, slowly rotating) -->
        <section class="section-container" id="services">
          <h2 class="section-title">${t('services_title', 'Ten trades, one neighbourhood.')}</h2>
          <p class="section-subtitle">Every pro is ID-verified and rated only on completed jobs. Tap a trade to see who is nearby.</p>
          ${(() => {
            const short = { electrician: 'Electrician', plumber: 'Plumber', carpenter: 'Carpenter', painter: 'Painter', ac_repair: 'AC Repair', appliance_repair: 'Appliances', cleaning: 'Cleaning', shifting: 'Shifting', pest_control: 'Pest Control', other: 'Handyman' };
            const rings = [
              { items: CATEGORIES.slice(0, 4), size: '58%', dur: '62s', r: 'repeat(0.29)' },
              { items: CATEGORIES.slice(4, 7), size: '80%', dur: '86s', r: 'repeat(0.40)' },
              { items: CATEGORIES.slice(7), size: '100%', dur: '112s', r: 'repeat(0.47)' }
            ];
            return `<div class="lk-orbit-wrap">
              <div class="lk-orbit" role="group" aria-label="Service trades in orbit">
                <div class="orbit-core"><span class="orbit-mark">LK</span><span class="orbit-core-label">10 trades</span></div>
                ${rings.map((ring, ri) => `
                  <div class="orbit-ring" style="width:${ring.size};height:${ring.size};animation-duration:${ring.dur};">
                    ${ring.items.map((c, ii) => {
                      const total = Math.max(1, ring.items.length);
                      const angle = (360 / total) * ii + (ri === 1 ? 35 : ri === 2 ? 70 : 0);
                      return `<button type="button" class="orbit-item" data-category="${esc(c.id)}" style="--a:${angle}deg;--r:calc(var(--orbit-size) * ${ring.r.replace('repeat(', '').replace(')', '')});animation-duration:${ring.dur};" aria-label="Book ${esc(c.name)} nearby"><span class="orbit-inner"><i data-lucide="${esc(c.lucideIcon || 'wrench')}" class="lucide-md"></i><em>${esc(short[c.id] || c.name)}</em></span></button>`;
                    }).join('')}
                  </div>
                `).join('')}
              </div>
              <p class="lk-orbit-hint">Orbits paused on hover — tap a trade to book</p>
            </div>`;
          })()}
        </section>

        <!-- Problem and Solution -->
        <section class="section-container" id="problem" style="border-top:1px solid var(--border-color);border-bottom:1px solid var(--border-color);">
          <h2 class="section-title">What aggregators get wrong</h2>
          <p class="section-subtitle">The old model takes a cut, then hides the person who does the work. We removed the middleman.</p>
          <div class="lk-vs">
            <div class="lk-vs-col">
              <h3><i data-lucide="x" class="lucide-md" style="color:var(--color-danger, #ba1a1a);"></i> On aggregator apps</h3>
              <ul>
                <li><i data-lucide="x" class="lucide-xs"></i><span><strong>25–40% commission</strong> comes out of the worker’s fee.</span></li>
                <li><i data-lucide="x" class="lucide-xs"></i><span><strong>Fixed menus</strong> with surge fees you cannot negotiate.</span></li>
                <li><i data-lucide="x" class="lucide-xs"></i><span><strong>Masked calls</strong> — you never speak to your pro directly.</span></li>
                <li><i data-lucide="x" class="lucide-xs"></i><span><strong>City-wide dispatch</strong> means long waits for a stranger.</span></li>
              </ul>
            </div>
            <div class="lk-vs-col is-ours">
              <h3><i data-lucide="check" class="lucide-md" style="color:var(--color-success, #10b981);"></i> On LocalKaam</h3>
              <ul>
                <li><i data-lucide="check" class="lucide-xs" style="color:var(--color-success, #10b981);"></i><span><strong>100% to the pro.</strong> They quote, you agree, they keep it.</span></li>
                <li><i data-lucide="check" class="lucide-xs" style="color:var(--color-success, #10b981);"></i><span><strong>Counter-offers built in</strong> for anything unusual.</span></li>
                <li><i data-lucide="check" class="lucide-xs" style="color:var(--color-success, #10b981);"></i><span><strong>Direct phone and chat</strong> from first message to invoice.</span></li>
                <li><i data-lucide="check" class="lucide-xs" style="color:var(--color-success, #10b981);"></i><span><strong>Your locality first.</strong> Neighbours arrive in minutes.</span></li>
              </ul>
            </div>
          </div>
        </section>

        <!-- USPs -->
        <section class="section-container" id="usps">
          <h2 class="section-title">Four things we kept simple</h2>
          <p class="section-subtitle">No dark patterns. Just a marketplace that shows you the price, the person, and the distance.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;max-width:1200px;margin:0 auto;">
            ${[
              { icon: 'messages-square', title: 'Prices agreed up front', desc: 'Quotes, counter-offers and a full history — nothing appears later on the bill.' },
              { icon: 'map-pin', title: 'Nearby, not generic', desc: 'Matching uses your locality and a real kilometre radius, so arrival times are honest.' },
              { icon: 'shield-check', title: 'Reviews you can trust', desc: 'Only completed jobs can be reviewed. No paid placements, no fake ratings.' },
              { icon: 'hand-coins', title: 'Pros keep it all', desc: 'Self-set rates, direct payment, zero deduction. Good trade attracts good professionals.' }
            ].map(u => `
              <div class="lk-step-card">
                <div class="lk-icon"><i data-lucide="${u.icon}" class="lucide-md"></i></div>
                <h3>${u.title}</h3>
                <p>${u.desc}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Competitor Comparison -->
        <section class="section-container" id="comparison" style="border-top:1px solid var(--border-color);border-bottom:1px solid var(--border-color);">
          <h2 class="section-title">How it compares</h2>
          <p class="section-subtitle">Same table, straight answers.</p>
          <div class="table-container" style="max-width:1050px;margin:0 auto;">
            <table class="data-table" style="min-width:620px;">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th class="is-ours">LocalKaam</th>
                  <th>Urban Company</th>
                  <th>Housejoy</th>
                  <th>Justdial</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Price negotiation</strong></td>
                  <td class="is-ours"><i data-lucide="check" class="lucide-xs"></i> In-app counter-offers</td>
                  <td><i data-lucide="minus" class="lucide-xs"></i> Fixed rates</td>
                  <td><i data-lucide="minus" class="lucide-xs"></i> Fixed rates</td>
                  <td><i data-lucide="minus" class="lucide-xs"></i> Unstructured haggling</td>
                </tr>
                <tr>
                  <td><strong>Commission</strong></td>
                  <td class="is-ours"><i data-lucide="check" class="lucide-xs"></i> 0% — direct to pro</td>
                  <td><i data-lucide="x" class="lucide-xs"></i> 20–35%</td>
                  <td><i data-lucide="x" class="lucide-xs"></i> 25%</td>
                  <td><i data-lucide="minus" class="lucide-xs"></i> Paid lead ads</td>
                </tr>
                <tr>
                  <td><strong>Arrival time</strong></td>
                  <td class="is-ours"><i data-lucide="check" class="lucide-xs"></i> ~25 min, hyperlocal</td>
                  <td><i data-lucide="minus" class="lucide-xs"></i> City-wide pool</td>
                  <td><i data-lucide="minus" class="lucide-xs"></i> City-wide pool</td>
                  <td><i data-lucide="x" class="lucide-xs"></i> No guarantee</td>
                </tr>
                <tr>
                  <td><strong>Job tracking</strong></td>
                  <td class="is-ours"><i data-lucide="check" class="lucide-xs"></i> Live status milestones</td>
                  <td><i data-lucide="check" class="lucide-xs"></i> App tracking</td>
                  <td><i data-lucide="minus" class="lucide-xs"></i> Basic SMS</td>
                  <td><i data-lucide="x" class="lucide-xs"></i> None</td>
                </tr>
                <tr>
                  <td><strong>Talking to your pro</strong></td>
                  <td class="is-ours"><i data-lucide="check" class="lucide-xs"></i> Direct phone &amp; chat</td>
                  <td><i data-lucide="x" class="lucide-xs"></i> Masked calls</td>
                  <td><i data-lucide="x" class="lucide-xs"></i> Masked calls</td>
                  <td><i data-lucide="minus" class="lucide-xs"></i> Directory listings</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- How It Works -->
        <section class="section-container" id="how-it-works">
          <h2 class="section-title">Three steps, no app-hopping</h2>
          <p class="section-subtitle">From “what do you need?” to “job done” in one place.</p>
          <div class="lk-steps" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;max-width:1050px;margin:0 auto;">
            ${[
              { n: 'Step 01', icon: 'search', title: 'Say what you need', desc: 'Choose your locality and trade. You see verified pros nearby with real ratings and transparent base rates.' },
              { n: 'Step 02', icon: 'calendar-check', title: 'Agree a time and a price', desc: 'Pick a slot, describe the work, and either accept the quote or send a counter-offer. Both sides confirm.' },
              { n: 'Step 03', icon: 'clipboard-check', title: 'Track, pay, review', desc: 'Follow accepted, on-the-way, in-progress and completed live. Get the invoice, pay direct, leave a review.' }
            ].map(s => `
              <div class="lk-step-card">
                <span class="lk-num">${s.n}</span>
                <div class="lk-icon"><i data-lucide="${s.icon}" class="lucide-md"></i></div>
                <h3>${s.title}</h3>
                <p>${s.desc}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- CTA -->
        <section class="lk-cta">
          <div class="lk-cta-inner">
            <div>
              <h2>Ready when you are.</h2>
              <p>Pick a trade and see who is available in your locality today. No account needed to browse.</p>
            </div>
            <button class="btn btn-lg" id="cta-find-pro-btn" style="background:var(--color-highlighter-yellow);color:#1a3300;border:none;">
              Find professionals <i data-lucide="arrow-right" class="lucide-sm"></i>
            </button>
          </div>
        </section>

        <!-- Footer -->
        <footer class="footer">
          <div style="max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="nav-logo" style="width:32px;height:32px;font-size:0.85rem;min-width:32px;">LK</div>
              <span style="font-weight:800;font-size:1.15rem;color:var(--text-primary);">LocalKaam</span>
            </div>
            <p style="margin:0;font-size:0.9rem;color:var(--text-secondary);max-width:52ch;line-height:1.6;">Hyperlocal marketplace for Mumbai’s blue-collar professionals. Direct prices, direct payment, zero commission.</p>
            <nav class="lk-footer-links" aria-label="Footer">
              <a href="#services">Services</a>
              <a href="#problem">Why us</a>
              <a href="#comparison">Comparison</a>
              <a href="#how-it-works">How it works</a>
            </nav>
            <div style="font-size:0.8rem;color:var(--text-muted);">© 2026 LocalKaam Inc. All rights reserved.</div>
          </div>
        </footer>
      </div>
    `;
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

    root.querySelector('#nav-home-logo')?.addEventListener('click', () => {
      this.navigateToRole('landing');
    });
    
    root.querySelector('#nav-signin-btn')?.addEventListener('click', () => {
      AuthModal.show('customer', (user, profile) => {
        const destRole = profile?.role || 'customer';
        this.navigateToRole(destRole);
      });
    });
    root.querySelector('#get-started-btn')?.addEventListener('click', () => {
      this.navigateToRole('role-select');
    });
    root.querySelector('#hero-find-pro-btn')?.addEventListener('click', () => {
      this.navigateToRole('role-select');
    });
    root.querySelector('#cta-find-pro-btn')?.addEventListener('click', () => {
      this.navigateToRole('role-select');
    });
    root.querySelector('#hero-explore-btn')?.addEventListener('click', () => {
      const el = root.querySelector('#how-it-works');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });

    
    const themeBtn = root.querySelector('#theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.toggleTheme();
        this.render();
      });
    }

    root.querySelectorAll('.orbit-item').forEach(card => {
      const handleClick = () => {
        const cat = card.getAttribute('data-category');
        const isAuthed = AuthService.isAuthenticated() && !AuthService.isGuest();
        if (isAuthed) {
          CustomerFrontend.currentCategory = cat;
          this.navigateToRole('customer');
        } else {
          AuthModal.show('customer', () => {
            CustomerFrontend.currentCategory = cat;
            this.navigateToRole('customer');
          });
        }
      };
      card.addEventListener('click', handleClick);
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
          WorkerFrontend.shouldOpenSetupModal = true;
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
