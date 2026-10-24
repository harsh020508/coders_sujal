import { StorageService } from './storage.js';
import { CATEGORIES } from './data.js';
import { CustomerFrontend } from './customer.js';
import { WorkerFrontend } from './worker.js';
import { Toast } from './toast.js';
import { AuthModal } from './authModal.js';
import { AuthService } from './authService.js';
import { esc } from './utils.js';

export const App = {
  init() {
    this.applyTheme(StorageService.getTheme());
    
    // Handle initial URL hash or history state
    const hash = window.location.hash.replace('#', '');
    if (['landing', 'role-select', 'customer', 'worker'].includes(hash)) {
      StorageService.setCurrentRole(hash);
    }

    this.render();

    // Handle browser back/forward navigation smoothly without exiting app
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', (e) => {
        if (e.state && e.state.role) {
          StorageService.setCurrentRole(e.state.role);
        } else {
          const h = window.location.hash.replace('#', '');
          if (['landing', 'role-select', 'customer', 'worker'].includes(h)) {
            StorageService.setCurrentRole(h);
          }
        }
        this.render();
      });
    }

    // Initialize storage sync in background
    StorageService.init(() => {
      this.render();
    });

    // Listen to live data changes across tabs/devices
    StorageService.onChange(() => {
      this.render();
    });
  },

  navigateToRole(role) {
    StorageService.setCurrentRole(role);
    try {
      if (window.history && window.history.pushState) {
        window.history.pushState({ role }, '', `#${role}`);
      }
    } catch (e) {}
    this.render();
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
            viewContainer.innerHTML = `<div style="padding: 3rem; text-align: center;"><p style="color: red;">Error loading customer view: ${esc(custErr.message)}</p><button class="btn btn-primary" onclick="localStorage.clear(); window.location.reload();">Reset & Reload</button></div>`;
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
            viewContainer.innerHTML = `<div style="padding: 3rem; text-align: center;"><p style="color: red;">Error loading worker view: ${esc(workErr.message)}</p><button class="btn btn-primary" onclick="localStorage.clear(); window.location.reload();">Reset & Reload</button></div>`;
          }
        }
        this.attachShellEvents(root);
      }
    } catch (err) {
      console.error('App render fatal error:', err);
      root.innerHTML = `<div style="padding: 3rem; text-align: center; font-family: Inter, sans-serif;"><h2>LocalKaam</h2><p>Something went wrong rendering this view.</p><button onclick="localStorage.clear(); window.location.reload();" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #0284c7; color: white; border: none; border-radius: 8px; cursor: pointer;">Reset & Reload App</button></div>`;
    }
  },

  renderLandingPage() {
    const theme = StorageService.getTheme();
    return `
      <div class="app-container" style="background-color: var(--bg-primary); color: var(--text-primary);">
        <!-- Top Navigation Bar -->
        <header class="navbar">
          <div class="nav-brand" id="nav-home-logo">
            <div class="nav-logo">LK</div>
            <div class="nav-title">LocalKaam</div>
          </div>
          <nav class="nav-links">
            <a class="nav-link" href="#problem">The Problem</a>
            <a class="nav-link" href="#services">Services</a>
            <a class="nav-link" href="#usps">Why Us</a>
            <a class="nav-link" href="#comparison">Competitors</a>
            <a class="nav-link" href="#how-it-works">How It Works</a>
          </nav>
          <div class="nav-actions">
            <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
            <button class="btn btn-primary" id="get-started-btn">Get Started</button>
          </div>
        </header>

        <!-- Hero Section -->
        <section class="landing-hero" style="padding: 80px 24px; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; width: 100%;">
          <div class="hero-content" style="text-align: left; align-items: flex-start; width: 100%;">
            <div style="display: inline-flex; align-items: center; gap: 8px; background: var(--color-highlighter-yellow); color: var(--color-forest-ink); padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 24px; border: 1px solid var(--border-color);">
              <span>⭐ Verified Local Experts</span> • Hyperlocal Marketplace
            </div>
            <h1 style="font-size: 52px; font-weight: 800; line-height: 1.05; letter-spacing: 0.03em; font-family: 'Bricolage Grotesque', sans-serif; margin-bottom: 24px; color: var(--text-primary);">
              Local help.<br>Fair prices.<br><span style="background-color: var(--color-highlighter-yellow); color: #1a3300; padding: 0 8px; border-radius: 4px;">Right around</span> the corner.
            </h1>
            <p style="font-size: 17px; color: var(--text-secondary); margin-bottom: 32px; line-height: 1.6;">
              Traditional home-service aggregators charge exorbitant commissions and squeeze workers. LocalKaam connects you directly with vetted local plumbers, electricians, carpenters, and cleaners with transparent pricing.
            </p>
            <div class="hero-cta" style="display: flex; gap: 16px; flex-wrap: wrap;">
              <button class="btn btn-primary" id="hero-find-pro-btn">Get Started (Customer & Worker) →</button>
              <button class="btn btn-outline" id="hero-explore-btn">Explore Features</button>
            </div>
          </div>
          <div class="hero-visual" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 32px; box-shadow: var(--shadow-subtle-2); text-align: left; width: 100%;">
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <span>⚡ Live Ecosystem Preview</span>
            </div>
            <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.5;">
              Direct peer matching across Mumbai localities with zero algorithmic surge markups and zero platform tax.
            </p>
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
              <div class="stat-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 16px; border-radius: 12px;">
                <span style="font-size: 11px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; color: var(--text-secondary);">Avg Worker ETA</span>
                <h3 style="font-size: 28px; font-weight: 800; font-family: 'Bricolage Grotesque', sans-serif; color: var(--text-primary); margin-top: 4px;">~25m</h3>
              </div>
              <div class="stat-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 16px; border-radius: 12px;">
                <span style="font-size: 11px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; color: var(--text-secondary);">Hidden Fee</span>
                <h3 style="font-size: 28px; font-weight: 800; font-family: 'Bricolage Grotesque', sans-serif; color: var(--text-primary); margin-top: 4px;">₹0</h3>
              </div>
            </div>
          </div>
        </section>

        <!-- Problem and Solution -->
        <section class="section-container" id="problem" style="background: var(--bg-primary); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
          <h2 class="section-title">The Real-World Problem vs. LocalKaam</h2>
          <p class="section-subtitle">Why urban households and local blue-collar professionals need a decentralized hyperlocal marketplace.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; max-width: 1100px; margin: 0 auto;">
            <div style="background: var(--bg-card); border: 2px solid #ba1a1a; border-radius: 16px; padding: 32px; box-shadow: var(--shadow-subtle);">
              <h3 style="font-size: 20px; font-weight: 800; color: #ba1a1a; margin-bottom: 16px;">❌ Traditional Aggregator Pain Points</h3>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px; color: var(--text-secondary); font-size: 15px;">
                <li>• <strong>Opaque Commissions:</strong> Platforms take 25–40% cuts, squeezing workers' earnings.</li>
                <li>• <strong>Inflated Pricing:</strong> Customers pay heavy markups due to middleman fees.</li>
                <li>• <strong>Impersonal Matching:</strong> Workers are assigned algorithmically from far away with long ETAs.</li>
                <li>• <strong>Rigid Rules:</strong> Zero room for direct price discussion or bespoke task negotiation.</li>
              </ul>
            </div>

            <div style="background: var(--bg-card); border: 2px solid var(--border-color); border-radius: 16px; padding: 32px; box-shadow: var(--shadow-subtle-2);">
              <h3 style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-bottom: 16px;">✅ The LocalKaam Solution</h3>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 12px; color: var(--text-primary); font-size: 15px;">
                <li>• <strong>Direct Payouts:</strong> Workers set their own rates and retain 100% of agreed earnings.</li>
                <li>• <strong>Hyperlocal Radius:</strong> Matches professionals residing within your neighborhood.</li>
                <li>• <strong>Counter-Offers:</strong> Built-in negotiation allows counter-offers and transparent agreements.</li>
                <li>• <strong>Verified Trust:</strong> Real post-completion reviews and status tracking.</li>
              </ul>
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

        <!-- USPs -->
        <section class="section-container" id="usps" style="background: var(--bg-primary); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
          <h2 class="section-title">Why Choose LocalKaam?</h2>
          <p class="section-subtitle">Four core pillars that set our platform apart from conventional gig apps.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; max-width: 1200px; margin: 0 auto;">
            <div style="background: var(--bg-card); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="font-size: 32px; margin-bottom: 12px;">💬</div>
              <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Transparent Negotiation</h3>
              <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.5;">Direct price offers and counter-offers between households and professionals with complete history tracking.</p>
            </div>
            <div style="background: var(--bg-card); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="font-size: 32px; margin-bottom: 12px;">📍</div>
              <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Hyperlocal Matching Grid</h3>
              <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.5;">Haversine distance calculations and service radius limits ensuring experts arrive within ~25 minutes.</p>
            </div>
            <div style="background: var(--bg-card); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="font-size: 32px; margin-bottom: 12px;">🛡️</div>
              <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Verified Trust & Reviews</h3>
              <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.5;">Strict reviews tied exclusively to completed jobs and verified badges to maintain absolute safety.</p>
            </div>
            <div style="background: var(--bg-card); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="font-size: 32px; margin-bottom: 12px;">🛠️</div>
              <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Worker Empowerment</h3>
              <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.5;">Multi-step onboarding allowing workers to configure service-specific pricing, schedules, and online status.</p>
            </div>
          </div>
        </section>

        <!-- Competitor Comparison -->
        <section class="section-container" id="comparison">
          <h2 class="section-title">Competitor Comparison</h2>
          <p class="section-subtitle">How LocalKaam stacks up against traditional service platforms.</p>
          <div class="table-container" style="max-width: 1050px; margin: 0 auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th style="color: var(--text-primary);">LocalKaam (Ours)</th>
                  <th>Urban Company</th>
                  <th>Housejoy</th>
                  <th>Justdial Local</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Direct Price Negotiation</strong></td>
                  <td><span style="color: #10b981; font-weight: 700;">✓ Supported</span> (Counter-offers)</td>
                  <td>❌ Fixed pricing only</td>
                  <td>❌ Fixed pricing only</td>
                  <td>⚠️ Manual phone haggling</td>
                </tr>
                <tr>
                  <td><strong>Worker Commission Cut</strong></td>
                  <td><span style="color: #10b981; font-weight: 700;">0%</span> (Direct Payouts)</td>
                  <td>❌ 20% – 35% cut</td>
                  <td>❌ 25% cut</td>
                  <td>Free listing (Unverified)</td>
                </tr>
                <tr>
                  <td><strong>Hyperlocal Distance & ETA</strong></td>
                  <td><span style="color: #10b981; font-weight: 700;">✓ Real-time</span> (~25 min ETA)</td>
                  <td>⚠️ Centralised dispatch</td>
                  <td>⚠️ Centralised dispatch</td>
                  <td>❌ Not provided</td>
                </tr>
                <tr>
                  <td><strong>Live Job Lifecycle Tracking</strong></td>
                  <td><span style="color: #10b981; font-weight: 700;">✓ Full state machine</span></td>
                  <td>✓ App tracking</td>
                  <td>⚠️ Basic status</td>
                  <td>❌ None</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- How It Works -->
        <section class="section-container" id="how-it-works" style="background: var(--bg-primary); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
          <h2 class="section-title">How LocalKaam Works in 3 Steps</h2>
          <p class="section-subtitle">A seamless workflow designed for households and neighborhood professionals.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px; max-width: 1000px; margin: 0 auto;">
            <div style="background: var(--bg-card); padding: 32px; border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="font-size: 28px; font-weight: 800; color: var(--text-primary); margin-bottom: 12px;">01</div>
              <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Discover Nearby Experts</h3>
              <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.5;">Select your Mumbai locality and service category. Our matching engine surfaces online professionals nearby.</p>
            </div>
            <div style="background: var(--bg-card); padding: 32px; border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="font-size: 28px; font-weight: 800; color: var(--text-primary); margin-bottom: 12px;">02</div>
              <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Book & Agree on Price</h3>
              <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.5;">Choose an appointment slot, describe the task, and submit your request or optional price offer.</p>
            </div>
            <div style="background: var(--bg-card); padding: 32px; border-radius: 12px; border: 1px solid var(--border-color);">
              <div style="font-size: 28px; font-weight: 800; color: var(--text-primary); margin-bottom: 12px;">03</div>
              <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Track, Complete & Review</h3>
              <p style="color: var(--text-secondary); font-size: 14px; line-height: 1.5;">Track job progress live from confirmed to completed, generate digital receipts, and leave ratings.</p>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="footer">
          <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="nav-logo" style="width: 32px; height: 32px; font-size: 0.85rem;">LK</div>
              <span style="font-weight: 700; font-size: 18px; color: var(--text-primary);">LocalKaam</span>
            </div>
            <p style="font-size: 14px; color: var(--text-secondary);">© 2026 LocalKaam Inc. Hyperlocal Blue-Collar Services Marketplace. All rights reserved.</p>
          </div>
        </footer>
      </div>
    `;
  },

  renderRoleSelectionPage() {
    const theme = StorageService.getTheme();
    return `
      <div class="app-container" style="background-color: var(--bg-primary); color: var(--text-primary);">
        <header class="navbar">
          <div class="nav-brand" id="nav-back-home">
            <div class="nav-logo">LK</div>
            <div class="nav-title">LocalKaam</div>
          </div>
          <div class="nav-actions">
            <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
          </div>
        </header>

        <div class="role-selection-wrapper">
          <h1 style="font-size: 40px; font-weight: 800; margin-bottom: 12px; font-family: 'Bricolage Grotesque', sans-serif;">How would you like to use LocalKaam?</h1>
          <p style="color: var(--text-secondary); font-size: 18px; margin-bottom: 32px;">Choose the experience that works for you. You can switch roles anytime.</p>

          <div class="role-cards">
            <!-- Customer Card -->
            <div class="role-card" id="select-customer-role">
              <div class="role-icon">🏠</div>
              <h3>Continue as Customer</h3>
              <p>Find trusted local professionals, compare rates, book services, negotiate prices, and track your jobs.</p>
              <button class="btn btn-primary" style="width: 100%; padding: 14px;">Continue as Customer</button>
            </div>

            <!-- Worker Card -->
            <div class="role-card" id="select-worker-role">
              <div class="role-icon">🛠️</div>
              <h3>Continue as Worker</h3>
              <p>Showcase your skills, set your own hourly rates, manage booking requests, counter offers, and track earnings.</p>
              <button class="btn btn-primary" style="width: 100%; padding: 14px;">Continue as Worker</button>
            </div>
          </div>

          <div style="margin-top: 40px;">
            <button class="btn btn-outline" id="back-to-home-link">← Back to Landing Page</button>
          </div>
        </div>
      </div>
    `;
  },

  renderAppShell(activeRole) {
    const theme = StorageService.getTheme();
    const profile = AuthService.getProfile();
    const userName = profile ? (profile.full_name || profile.email || 'User') : 'User';

    return `
      <div class="app-container">
        <header class="navbar">
          <div class="nav-brand" id="nav-brand-dashboard">
            <div class="nav-logo">LK</div>
            <div class="nav-title">LocalKaam</div>
          </div>
          <div class="nav-links">
            <span class="role-badge" style="background: var(--accent-light); color: var(--text-primary); font-weight: 700;">
              Role: ${activeRole === 'customer' ? '🏠 Customer' : '🛠️ Worker'} (${esc(userName)})
            </span>
          </div>
          <div class="nav-actions">
            <button class="btn btn-outline btn-sm" id="switch-role-btn">Switch Role</button>
            <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
            <button class="btn btn-outline btn-sm" id="reset-demo-btn" title="Reset Data">🔄 Reset</button>
          </div>
        </header>

        <div id="app-view-container" style="flex: 1; display: flex; flex-direction: column;"></div>
      </div>
    `;
  },

  attachLandingEvents(root) {
    root.querySelector('#nav-home-logo')?.addEventListener('click', () => {
      this.navigateToRole('landing');
    });
    root.querySelector('#get-started-btn')?.addEventListener('click', () => {
      this.navigateToRole('role-select');
    });
    root.querySelector('#hero-find-pro-btn')?.addEventListener('click', () => {
      this.navigateToRole('role-select');
    });
    root.querySelector('#hero-explore-btn')?.addEventListener('click', () => {
      const el = root.querySelector('#usps');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
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
        if (confirm('Reset all app data and restore initial seeded state?')) {
          StorageService.resetDemoData();
        }
      });
    }

    root.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const profile = AuthService.getProfile();
        if (profile && profile.role === 'customer') {
          this.navigateToRole('customer');
          CustomerFrontend.currentCategory = card.getAttribute('data-category');
          this.render();
        } else {
          AuthModal.show('customer', () => {
            this.navigateToRole('customer');
            CustomerFrontend.currentCategory = card.getAttribute('data-category');
            this.render();
          });
        }
      });
    });
  },

  attachRoleSelectionEvents(root) {
    root.querySelector('#nav-back-home')?.addEventListener('click', () => {
      this.navigateToRole('landing');
    });
    root.querySelector('#back-to-home-link')?.addEventListener('click', () => {
      this.navigateToRole('landing');
    });
    root.querySelector('#select-customer-role')?.addEventListener('click', () => {
      const profile = AuthService.getProfile();
      if (profile && profile.role === 'customer') {
        this.navigateToRole('customer');
      } else {
        AuthModal.show('customer', () => {
          this.navigateToRole('customer');
        });
      }
    });
    root.querySelector('#select-worker-role')?.addEventListener('click', () => {
      const profile = AuthService.getProfile();
      if (profile && profile.role === 'worker') {
        this.navigateToRole('worker');
      } else {
        AuthModal.show('worker', () => {
          this.navigateToRole('worker');
        });
      }
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
      this.navigateToRole('landing');
    });
    root.querySelector('#switch-role-btn')?.addEventListener('click', () => {
      this.navigateToRole('role-select');
    });

    const themeBtn = root.querySelector('#theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const curTheme = StorageService.getTheme();
        this.applyTheme(curTheme === 'dark' ? 'light' : 'dark');
        this.render();
      });
    }

    const resetBtn = root.querySelector('#reset-demo-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all app data and restore initial seeded state?')) {
          StorageService.resetDemoData();
        }
      });
    }
  }
};
