import { StorageService } from './storage.js';
import { CATEGORIES } from './data.js';
import { CustomerFrontend } from './customer.js';
import { WorkerFrontend } from './worker.js';
import { SupabaseService } from './supabaseClient.js';
import { AuthService } from './authService.js';
import { SupabaseSetupModal } from './supabaseSetupModal.js';
import { Toast } from './toast.js';

export const App = {
  init() {
    this.applyTheme(StorageService.getTheme());
    this.render();

    // Initialize Supabase sync and realtime listeners
    StorageService.init(() => {
      this.render();
    });

    // Re-render when auth changes
    AuthService.onAuthStateChange((event, session, user, profile) => {
      this.render();
    });

    // Re-render when underlying storage/realtime data updates
    StorageService.onChange((type) => {
      if (type === 'sync' || type === 'bookings' || type === 'workers') {
        const role = StorageService.getCurrentRole();
        if (role === 'customer' || role === 'worker') {
          this.render();
        }
      }
    });
  },

  applyTheme(theme) {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', theme);
    }
    StorageService.setTheme(theme);
  },

  renderNavActions(extraButtons = '') {
    const theme = StorageService.getTheme();
    const isLive = SupabaseService.isConfigured();
    const user = AuthService.getUser();
    const profile = AuthService.getProfile();

    const supabaseBtn = `
      <button class="btn btn-outline btn-sm supabase-setup-btn" title="Supabase Database & Auth Settings" style="border-color: ${isLive ? 'var(--success)' : 'var(--warning)'}; color: ${isLive ? 'var(--success)' : 'var(--warning)'}; display: flex; align-items: center; gap: 0.35rem; font-weight: 600; font-size: 0.82rem;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${isLive ? 'var(--success)' : 'var(--warning)'}; box-shadow: 0 0 6px ${isLive ? 'var(--success)' : 'var(--warning)'};"></span>
        ${isLive ? '⚡ Supabase Live' : '⚡ Connect Supabase'}
      </button>
    `;

    let authPill = '';
    if (user && profile) {
      const displayName = profile.full_name || profile.name || (user.email ? user.email.split('@')[0] : 'User');
      const displayRole = (profile.role || 'customer').toUpperCase();
      authPill = `
        <div class="user-auth-pill" style="display: flex; align-items: center; gap: 0.4rem; background: var(--accent-light); padding: 0.3rem 0.65rem; border-radius: 20px; border: 1px solid var(--border-color);">
          <span style="font-size: 0.85rem;">👤</span>
          <span style="font-size: 0.82rem; font-weight: 700; color: var(--accent-primary); max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
          <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: var(--bg-card); color: var(--text-primary);">${displayRole}</span>
          <button class="btn btn-outline btn-sm auth-signout-btn" style="padding: 2px 6px; font-size: 0.72rem; line-height: 1; border: none; color: var(--danger); cursor: pointer;" title="Sign Out">✕</button>
        </div>
      `;
    } else {
      authPill = `
        <button class="btn btn-outline btn-sm auth-open-modal-btn" style="font-weight: 600; font-size: 0.82rem;">
          🔑 Sign In
        </button>
      `;
    }

    return `
      <div class="nav-actions" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        ${supabaseBtn}
        ${authPill}
        ${extraButtons}
        <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
      </div>
    `;
  },

  render() {
    if (typeof document === 'undefined') return;
    const root = document.getElementById('app');
    if (!root) return;

    const role = StorageService.getCurrentRole();

    if (role === 'landing') {
      root.innerHTML = this.renderLandingPage();
      this.attachLandingEvents(root);
    } else if (role === 'role-select') {
      root.innerHTML = this.renderRoleSelectionPage();
      this.attachRoleSelectionEvents(root);
    } else if (role === 'customer') {
      root.innerHTML = this.renderAppShell('customer');
      const viewContainer = root.querySelector('#app-view-container');
      if (viewContainer) CustomerFrontend.render(viewContainer);
      this.attachShellEvents(root);
    } else if (role === 'worker') {
      root.innerHTML = this.renderAppShell('worker');
      const viewContainer = root.querySelector('#app-view-container');
      if (viewContainer) WorkerFrontend.render(viewContainer);
      this.attachShellEvents(root);
    }

    this.attachCommonNavEvents(root);
  },

  renderLandingPage() {
    const extraButtons = `
      <button class="btn btn-primary" id="get-started-btn">Get Started</button>
      <button class="btn btn-outline btn-sm" id="reset-demo-btn" title="Reset Demo Data">🔄 Reset</button>
    `;

    return `
      <div class="app-container">
        <!-- Navigation Bar -->
        <header class="navbar">
          <div class="nav-brand" id="nav-home-logo">
            <div class="nav-logo">LK</div>
            <div class="nav-title">Local<span>Kaam</span></div>
          </div>
          <nav class="nav-links">
            <a class="nav-link" href="#services">Services</a>
            <a class="nav-link" href="#how-it-works">How It Works</a>
            <a class="nav-link" href="#differentiators">Why Us</a>
            <a class="nav-link" href="#supabase-banner">Supabase Integration</a>
          </nav>
          ${this.renderNavActions(extraButtons)}
        </header>

        <!-- Hero Section -->
        <section class="landing-hero">
          <div class="hero-content">
            <h1>Local help.<br>Fair prices.<br><span>Right around the corner.</span></h1>
            <p>Connect instantly with trustworthy Mumbai plumbers, electricians, carpenters, cleaners, and cooks without opaque commissions or inflated pricing.</p>
            <div class="hero-cta">
              <button class="btn btn-primary" id="hero-find-pro-btn">Find a Professional</button>
              <button class="btn btn-outline" id="hero-join-worker-btn">Join as a Worker</button>
            </div>
          </div>
          <div class="hero-visual">
            <div style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: var(--accent-primary);">⚡ Hyperlocal Ecosystem</div>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.95rem;">Real-time matching across Andheri, Bandra, Powai, Juhu, Colaba & more with transparent ETA and rate negotiation.</p>
            <div class="stats-grid">
              <div class="stat-card">
                <h3>30m</h3>
                <p>Average Worker ETA</p>
              </div>
              <div class="stat-card">
                <h3>₹0</h3>
                <p>Hidden Commissions</p>
              </div>
              <div class="stat-card">
                <h3>100%</h3>
                <p>Direct Price Negotiation</p>
              </div>
              <div class="stat-card">
                <h3>7+</h3>
                <p>Essential Categories</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Supabase Feature Highlight Banner -->
        <section class="section-container" id="supabase-banner" style="padding-top: 1rem; padding-bottom: 1rem;">
          <div style="background: linear-gradient(135deg, rgba(2, 132, 199, 0.1), rgba(16, 185, 129, 0.1)); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1.5rem 2rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem;">
            <div style="flex: 1; min-width: 280px;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <span style="font-size: 1.3rem;">⚡</span>
                <span style="font-weight: 800; font-size: 1.15rem; color: var(--text-primary);">Integrated with Supabase Auth &amp; PostgreSQL</span>
                <span class="badge ${SupabaseService.isConfigured() ? 'badge-verified' : 'badge-pending'}" style="font-size: 0.75rem;">
                  ${SupabaseService.isConfigured() ? 'Active & Synced' : 'Ready to Connect'}
                </span>
              </div>
              <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">
                Real-time booking updates, role-based authorization (Customer vs Worker), PostgreSQL persistence, and secure Row Level Security (RLS).
              </p>
            </div>
            <div>
              <button class="btn btn-outline btn-sm supabase-setup-btn" style="padding: 0.6rem 1.25rem; font-weight: 600;">
                ⚙️ Open Supabase Settings &amp; Schema
              </button>
            </div>
          </div>
        </section>

        <!-- Service Categories -->
        <section class="section-container" id="services">
          <h2 class="section-title">Essential Home Services</h2>
          <p class="section-subtitle">Browse trustworthy blue-collar professionals ready to serve your household immediately or on schedule.</p>
          <div class="categories-grid">
            ${CATEGORIES.map(c => `
              <div class="category-card" data-category="${c.id}">
                <div class="category-icon">${c.icon}</div>
                <h3>${c.name}</h3>
                <p>${c.description}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- How It Works -->
        <section class="section-container" id="how-it-works" style="background: var(--bg-secondary); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
          <h2 class="section-title">How LocalKaam Works</h2>
          <p class="section-subtitle">Designed for simplicity, speed, and fairness for both households and local professionals.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; max-width: 1000px; margin: 0 auto;">
            <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <div style="font-size: 2rem; font-weight: 800; color: var(--accent-primary); margin-bottom: 1rem;">01</div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Discover Nearby Experts</h3>
              <p style="color: var(--text-secondary); font-size: 0.95rem;">Search by problem or category. Our hyperlocal matching engine surfaces professionals within your locality with calculated ETA.</p>
            </div>
            <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <div style="font-size: 2rem; font-weight: 800; color: var(--accent-primary); margin-bottom: 1rem;">02</div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Compare &amp; Agree Fair Price</h3>
              <p style="color: var(--text-secondary); font-size: 0.95rem;">Compare rates side by side, review skills, and propose your price or accept standard hourly estimates before booking.</p>
            </div>
            <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <div style="font-size: 2rem; font-weight: 800; color: var(--accent-primary); margin-bottom: 1rem;">03</div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Book, Track &amp; Review</h3>
              <p style="color: var(--text-secondary); font-size: 0.95rem;">Track job status live via Supabase Realtime, complete work seamlessly, leave ratings, and report issues with complete transparency.</p>
            </div>
          </div>
        </section>

        <!-- Product Differentiators -->
        <section class="section-container" id="differentiators">
          <h2 class="section-title">Built Different. Built Fair.</h2>
          <p class="section-subtitle">Why LocalKaam is revolutionizing blue-collar service marketplaces.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem;">
            <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--accent-primary);">Transparent Negotiation</h4>
              <p style="color: var(--text-secondary); font-size: 0.9rem;">Direct price offers and counter-offers between customer and worker without middleman markups.</p>
            </div>
            <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--accent-primary);">Hyperlocal Grid</h4>
              <p style="color: var(--text-secondary); font-size: 0.9rem;">Distance and service radius validation ensuring professionals arrive quickly from nearby neighborhoods.</p>
            </div>
            <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--accent-primary);">Verified Trust</h4>
              <p style="color: var(--text-secondary); font-size: 0.9rem;">Verified credentials and authentic post-completion ratings stored directly in Supabase PostgreSQL.</p>
            </div>
            <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--accent-primary);">Worker Empowerment</h4>
              <p style="color: var(--text-secondary); font-size: 0.9rem;">Workers set their own rates, manage schedules, and retain full earnings from local bookings.</p>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="footer">
          <div style="max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div class="nav-logo" style="width: 28px; height: 28px; font-size: 0.9rem;">LK</div>
              <span style="font-weight: 700; font-size: 1.1rem;">LocalKaam</span>
            </div>
            <p>© 2026 LocalKaam Inc. Hyperlocal Marketplace powered by Supabase Auth &amp; PostgreSQL Database.</p>
          </div>
        </footer>
      </div>
    `;
  },

  renderRoleSelectionPage() {
    return `
      <div class="app-container">
        <header class="navbar">
          <div class="nav-brand" id="nav-back-home">
            <div class="nav-logo">LK</div>
            <div class="nav-title">Local<span>Kaam</span></div>
          </div>
          ${this.renderNavActions()}
        </header>

        <div class="role-selection-wrapper">
          <h1 style="font-size: 2.5rem; font-weight: 800; text-align: center; margin-bottom: 0.5rem;">How would you like to use LocalKaam?</h1>
          <p style="color: var(--text-secondary); font-size: 1.1rem; text-align: center;">Choose the experience that works for you. You can switch roles anytime or sign in with your account.</p>

          <div class="role-cards">
            <!-- Customer Card -->
            <div class="role-card" id="select-customer-role">
              <div class="role-icon">🏠</div>
              <h3>Continue as Customer</h3>
              <p>Find trusted local professionals, compare rates, book services, negotiate prices, and track your jobs.</p>
              <button class="btn btn-primary" style="width: 100%;">Continue as Customer</button>
            </div>

            <!-- Worker Card -->
            <div class="role-card" id="select-worker-role">
              <div class="role-icon">🛠️</div>
              <h3>Continue as Worker</h3>
              <p>Showcase your skills, set your own hourly rates, manage booking requests, counter offers, and track earnings.</p>
              <button class="btn btn-primary" style="width: 100%;">Continue as Worker</button>
            </div>
          </div>

          <div style="margin-top: 3rem;">
            <button class="btn btn-outline" id="back-to-home-link">← Back to Landing Page</button>
          </div>
        </div>
      </div>
    `;
  },

  renderAppShell(activeRole) {
    const extraButtons = `
      <button class="btn btn-outline btn-sm" id="switch-role-btn">Switch Role</button>
      <button class="btn btn-outline btn-sm" id="reset-demo-btn" title="Reset Demo Data">🔄 Reset</button>
    `;

    return `
      <div class="app-container">
        <header class="navbar">
          <div class="nav-brand" id="nav-brand-dashboard">
            <div class="nav-logo">LK</div>
            <div class="nav-title">Local<span>Kaam</span></div>
          </div>
          <div class="nav-links">
            <span class="role-badge" style="background: var(--accent-light); color: var(--accent-primary); font-weight: 600;">
              Role: ${activeRole === 'customer' ? '🏠 Customer Frontend' : '🛠️ Worker Frontend'}
            </span>
          </div>
          ${this.renderNavActions(extraButtons)}
        </header>

        <div id="app-view-container" style="flex: 1; display: flex; flex-direction: column;"></div>
      </div>
    `;
  },

  attachCommonNavEvents(root) {
    // Supabase Setup modal opener
    root.querySelectorAll('.supabase-setup-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        SupabaseSetupModal.show(() => this.render());
      });
    });

    // Auth modal opener
    root.querySelectorAll('.auth-open-modal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        AuthService.showAuthModal(() => {
          const profile = AuthService.getProfile();
          if (profile && profile.role === 'worker') {
            StorageService.setCurrentRole('worker');
          } else if (profile && profile.role === 'customer') {
            StorageService.setCurrentRole('customer');
          }
          this.render();
        });
      });
    });

    // Sign out button
    root.querySelectorAll('.auth-signout-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await AuthService.signOut();
        Toast.show('Signed out successfully.', 'info');
        this.render();
      });
    });

    // Theme toggle
    const themeBtn = root.querySelector('#theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = StorageService.getTheme();
        this.applyTheme(cur === 'dark' ? 'light' : 'dark');
        this.render();
      });
    }

    // Reset demo button
    const resetBtn = root.querySelector('#reset-demo-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all demo data and restore initial seeded state?')) {
          StorageService.resetDemoData();
        }
      });
    }
  },

  attachLandingEvents(root) {
    root.querySelector('#nav-home-logo')?.addEventListener('click', () => {
      StorageService.setCurrentRole('landing');
      this.render();
    });
    root.querySelector('#get-started-btn')?.addEventListener('click', () => {
      StorageService.setCurrentRole('role-select');
      this.render();
    });
    root.querySelector('#hero-find-pro-btn')?.addEventListener('click', () => {
      StorageService.setCurrentRole('role-select');
      this.render();
    });
    root.querySelector('#hero-join-worker-btn')?.addEventListener('click', () => {
      StorageService.setCurrentRole('role-select');
      this.render();
    });

    root.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        StorageService.setCurrentRole('customer');
        CustomerFrontend.currentCategory = card.getAttribute('data-category');
        this.render();
      });
    });
  },

  attachRoleSelectionEvents(root) {
    root.querySelector('#nav-back-home')?.addEventListener('click', () => {
      StorageService.setCurrentRole('landing');
      this.render();
    });
    root.querySelector('#back-to-home-link')?.addEventListener('click', () => {
      StorageService.setCurrentRole('landing');
      this.render();
    });
    root.querySelector('#select-customer-role')?.addEventListener('click', () => {
      StorageService.setCurrentRole('customer');
      this.render();
    });
    root.querySelector('#select-worker-role')?.addEventListener('click', () => {
      StorageService.setCurrentRole('worker');
      this.render();
    });
  },

  attachShellEvents(root) {
    root.querySelector('#nav-brand-dashboard')?.addEventListener('click', () => {
      StorageService.setCurrentRole('landing');
      this.render();
    });
    root.querySelector('#switch-role-btn')?.addEventListener('click', () => {
      StorageService.setCurrentRole('role-select');
      this.render();
    });
  }
};
