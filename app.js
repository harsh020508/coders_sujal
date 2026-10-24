import { StorageService } from './storage.js';
import { CATEGORIES } from './data.js';
import { CustomerFrontend } from './customer.js';
import { WorkerFrontend } from './worker.js';

function isActionableBooking(b) {
  if (!b || b.status !== 'Pending') return false;
  if (Array.isArray(b.counterOfferHistory) && b.counterOfferHistory.length > 0) {
    const lastOffer = b.counterOfferHistory[b.counterOfferHistory.length - 1];
    if (lastOffer && lastOffer.sender === 'worker') {
      return false;
    }
  }
  return true;
}

export const App = {
  init() {
    this.applyTheme(StorageService.getTheme());
    this.initCrossTabSync();
    this.render();
  },

  initCrossTabSync() {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (e) => {
      this.handleStorageEvent(e);
    });
  },

  handleStorageEvent(e) {
    if (!e || !e.key) return;

    if (e.key === 'localkaam_theme') {
      const newTheme = e.newValue || 'light';
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.setAttribute('data-theme', newTheme);
      }
      return;
    }

    const relevantKeys = [
      'localkaam_bookings',
      'localkaam_workers',
      'localkaam_reviews',
      'localkaam_complaints',
      'localkaam_selected_worker_id',
      'localkaam_customer_locality'
    ];

    if (!relevantKeys.includes(e.key)) return;

    // Preserve user input and active modal dialog state
    if (typeof document !== 'undefined') {
      if (document.querySelector('.modal-overlay')) {
        return; // Active modal open
      }
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return; // User is actively typing
      }
    }

    // Refresh active view cleanly without full-page reloads
    const currentRole = StorageService.getCurrentRole();
    if (currentRole === 'customer') {
      const viewContainer = document.getElementById('app-view-container');
      if (viewContainer) {
        CustomerFrontend.render(viewContainer);
      }
    } else if (currentRole === 'worker') {
      const viewContainer = document.getElementById('app-view-container');
      if (viewContainer) {
        WorkerFrontend.render(viewContainer);
      }
    } else if (currentRole === 'role-select') {
      const root = document.getElementById('app');
      if (root) {
        root.innerHTML = this.renderRoleSelectionPage();
        this.attachRoleSelectionEvents(root);
      }
    }
  },

  applyTheme(theme) {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', theme);
    }
    StorageService.setTheme(theme);
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
  },

  renderLandingPage() {
    const theme = StorageService.getTheme();
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
            <a class="nav-link" href="#impact">Social Impact</a>
          </nav>
          <div class="nav-actions">
            <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
            <button class="btn btn-primary" id="get-started-btn">Get Started</button>
            <button class="btn btn-outline btn-sm" id="reset-demo-btn" title="Reset Demo Data">🔄 Reset</button>
          </div>
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
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Compare & Agree Fair Price</h3>
              <p style="color: var(--text-secondary); font-size: 0.95rem;">Compare rates side by side, review skills, and propose your price or accept standard hourly estimates before booking.</p>
            </div>
            <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <div style="font-size: 2rem; font-weight: 800; color: var(--accent-primary); margin-bottom: 1rem;">03</div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Book, Track & Review</h3>
              <p style="color: var(--text-secondary); font-size: 0.95rem;">Track job status live, complete work seamlessly, leave ratings, and report issues with complete transparency.</p>
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
              <p style="color: var(--text-secondary); font-size: 0.9rem;">Simulated verification badges and authentic post-completion ratings to ensure safety and reliability.</p>
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
            <p>© 2026 LocalKaam Inc. Hyperlocal Blue-Collar Services Marketplace MVP. Built for hackathon demonstration.</p>
          </div>
        </footer>
      </div>
    `;
  },

  renderRoleSelectionPage() {
    const theme = StorageService.getTheme();
    const workers = StorageService.getWorkers();
    const validWorkerIds = new Set(workers.map(w => w.id));
    const allBookings = StorageService.getBookings();
    const actionableCount = allBookings.filter(b => b && validWorkerIds.has(b.workerId) && isActionableBooking(b)).length;

    return `
      <div class="app-container">
        <header class="navbar">
          <div class="nav-brand" id="nav-back-home">
            <div class="nav-logo">LK</div>
            <div class="nav-title">Local<span>Kaam</span></div>
          </div>
          <div class="nav-actions">
            <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
          </div>
        </header>

        <div class="role-selection-wrapper">
          <h1 style="font-size: 2.5rem; font-weight: 800; text-align: center; margin-bottom: 0.5rem;">How would you like to use LocalKaam?</h1>
          <p style="color: var(--text-secondary); font-size: 1.1rem; text-align: center;">Choose the experience that works for you. You can switch roles anytime in this demo.</p>

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
              ${actionableCount > 0 ? `<div style="margin-bottom: 0.75rem; font-size: 0.85rem; font-weight: 600; color: var(--accent-primary);">🔔 ${actionableCount} actionable request${actionableCount > 1 ? 's' : ''} awaiting response</div>` : ''}
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
    const theme = StorageService.getTheme();
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
          <div class="nav-actions">
            <button class="btn btn-outline btn-sm" id="switch-role-btn">Switch Role</button>
            <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
            <button class="btn btn-outline btn-sm" id="reset-demo-btn" title="Reset Demo Data">🔄 Reset</button>
          </div>
        </header>

        <div id="app-view-container" style="flex: 1; display: flex; flex-direction: column;"></div>
      </div>
    `;
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

    const themeBtn = root.querySelector('#theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = StorageService.getTheme();
        this.applyTheme(cur === 'dark' ? 'light' : 'dark');
        this.render();
      });
    }

    const resetBtn = root.querySelector('#reset-demo-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all demo data and restore initial seeded state?')) {
          StorageService.resetDemoData();
        }
      });
    }

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
      const workers = StorageService.getWorkers();
      const validWorkerIds = new Set(workers.map(w => w.id));
      const allBookings = StorageService.getBookings();
      const currentWorkerId = StorageService.getSelectedWorkerId();
      
      const currentHasActionable = allBookings.some(b => b && b.workerId === currentWorkerId && isActionableBooking(b));

      // Select worker with newest actionable request only if currently selected worker has no actionable requests
      if (!currentHasActionable) {
        const actionableBookings = allBookings.filter(b => b && validWorkerIds.has(b.workerId) && isActionableBooking(b));
        if (actionableBookings.length > 0) {
          const sortedActionable = [...actionableBookings].sort((a, b) => {
            const timeA = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
          });
          const targetWorkerId = sortedActionable[0]?.workerId;
          // Validate worker ID before setting selection
          if (targetWorkerId && validWorkerIds.has(targetWorkerId)) {
            StorageService.setSelectedWorkerId(targetWorkerId);
          }
        }
      }

      StorageService.setCurrentRole('worker');
      this.render();
    });

    const themeBtn = root.querySelector('#theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = StorageService.getTheme();
        this.applyTheme(cur === 'dark' ? 'light' : 'dark');
        this.render();
      });
    }
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

    const themeBtn = root.querySelector('#theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = StorageService.getTheme();
        this.applyTheme(cur === 'dark' ? 'light' : 'dark');
        this.render();
      });
    }

    const resetBtn = root.querySelector('#reset-demo-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all demo data and restore initial seeded state?')) {
          StorageService.resetDemoData();
        }
      });
    }
  }
};
