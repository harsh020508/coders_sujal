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
            viewContainer.innerHTML = `<div style="padding: 3rem; text-align: center;"><p style="color: red;">Error loading customer view: ${esc(custErr.message)}</p><button class="btn btn-primary" onclick="localStorage.clear(); window.location.reload();">Reset &amp; Reload</button></div>`;
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
            viewContainer.innerHTML = `<div style="padding: 3rem; text-align: center;"><p style="color: red;">Error loading worker view: ${esc(workErr.message)}</p><button class="btn btn-primary" onclick="localStorage.clear(); window.location.reload();">Reset &amp; Reload</button></div>`;
          }
        }
        this.attachShellEvents(root);
      }
    } catch (err) {
      console.error('App render fatal error:', err);
      root.innerHTML = `<div style="padding: 3rem; text-align: center; font-family: Inter, sans-serif;"><h2>LocalKaam</h2><p>Something went wrong rendering this view.</p><button onclick="localStorage.clear(); window.location.reload();" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #1a3300; color: white; border: none; border-radius: 8px; cursor: pointer;">Reset &amp; Reload App</button></div>`;
    }
  },

  _mobileNavHTML(theme) {
    return `
      <div class="mobile-nav-overlay" id="mobile-nav-overlay"></div>
      <div class="mobile-nav-drawer" id="mobile-nav-drawer">
        <button class="mobile-nav-close" id="mobile-nav-close" aria-label="Close menu">✕ Close</button>
        <a class="nav-link" href="#problem">The Problem</a>
        <a class="nav-link" href="#services">Services</a>
        <a class="nav-link" href="#usps">Why Us</a>
        <a class="nav-link" href="#comparison">Competitors</a>
        <a class="nav-link" href="#how-it-works">How It Works</a>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color);display:flex;flex-direction:column;gap:8px;">
          <button class="theme-toggle" id="mobile-theme-toggle-btn" style="width:100%;justify-content:center;">${theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
          <button class="btn btn-primary btn-full" id="mobile-get-started-btn">Get Started →</button>
        </div>
      </div>
    `;
  },

  renderLandingPage() {
    const theme = StorageService.getTheme();
    return `
      <div class="app-container">
        ${this._mobileNavHTML(theme)}

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
            <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️' : '🌙'}</button>
            <button class="btn btn-primary btn-sm" id="get-started-btn">Get Started</button>
            <button class="nav-hamburger" id="nav-hamburger" aria-label="Open navigation menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </header>

        <!-- Hero Section -->
        <section class="landing-hero">
          <div class="hero-content">
            <div style="display:inline-flex;align-items:center;gap:8px;background:var(--color-highlighter-yellow);color:var(--color-forest-ink);padding:5px 14px;border-radius:9999px;font-size:12px;font-weight:700;margin-bottom:20px;border:1px solid rgba(0,0,0,0.08);letter-spacing:0.03em;">
              ⭐ Verified Local Experts &nbsp;•&nbsp; Hyperlocal Marketplace
            </div>
            <h1>
              Local help.<br>Fair prices.<br><span style="background-color:var(--color-highlighter-yellow);color:#1a3300;padding:2px 10px;border-radius:4px;">Right around</span> the corner.
            </h1>
            <p>
              Traditional home-service aggregators charge exorbitant commissions and squeeze workers. LocalKaam connects you directly with vetted local plumbers, electricians, carpenters, and cleaners — transparent pricing, no hidden fees.
            </p>
            <div class="hero-cta">
              <button class="btn btn-primary btn-lg" id="hero-find-pro-btn">Get Started →</button>
              <button class="btn btn-outline btn-lg" id="hero-explore-btn">Explore Features</button>
            </div>
          </div>
          <div class="hero-visual">
            <div style="font-size:1rem;font-weight:700;margin-bottom:10px;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
              ⚡ Live Ecosystem Preview
            </div>
            <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:16px;line-height:1.5;">
              Direct peer matching across Mumbai localities. Zero surge markups. Zero platform tax.
            </p>
            <div class="stats-grid">
              <div class="stat-card">
                <span style="font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Avg Worker ETA</span>
                <h3>~25m</h3>
              </div>
              <div class="stat-card">
                <span style="font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Hidden Fee</span>
                <h3>₹0</h3>
              </div>
              <div class="stat-card">
                <span style="font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Commission</span>
                <h3>0%</h3>
              </div>
              <div class="stat-card">
                <span style="font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);display:block;margin-bottom:4px;">Categories</span>
                <h3>10+</h3>
              </div>
            </div>
          </div>
        </section>

        <!-- Problem and Solution -->
        <section class="section-container" id="problem" style="border-top:1px solid var(--border-color);border-bottom:1px solid var(--border-color);">
          <h2 class="section-title">The Real-World Problem vs. LocalKaam</h2>
          <p class="section-subtitle">Why urban households and local blue-collar professionals need a decentralized hyperlocal marketplace.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;max-width:1050px;margin:0 auto;">
            <div style="background:var(--bg-card);border:2px solid #ba1a1a;border-radius:16px;padding:clamp(20px,3vw,32px);">
              <h3 style="font-size:clamp(0.95rem,2vw,1.1rem);font-weight:800;color:#ba1a1a;margin-bottom:16px;">❌ Traditional Aggregator Pain Points</h3>
              <ul style="list-style:none;display:flex;flex-direction:column;gap:12px;color:var(--text-secondary);font-size:0.9rem;line-height:1.6;">
                <li>• <strong>Opaque Commissions:</strong> Platforms take 25–40% cuts, squeezing workers' earnings.</li>
                <li>• <strong>Inflated Pricing:</strong> Customers pay heavy markups due to middleman fees.</li>
                <li>• <strong>Impersonal Matching:</strong> Workers assigned algorithmically from far away with long ETAs.</li>
                <li>• <strong>Rigid Rules:</strong> Zero room for direct price discussion or bespoke task negotiation.</li>
              </ul>
            </div>
            <div style="background:var(--bg-card);border:2px solid var(--accent-primary);border-radius:16px;padding:clamp(20px,3vw,32px);">
              <h3 style="font-size:clamp(0.95rem,2vw,1.1rem);font-weight:800;color:var(--text-primary);margin-bottom:16px;">✅ The LocalKaam Solution</h3>
              <ul style="list-style:none;display:flex;flex-direction:column;gap:12px;color:var(--text-primary);font-size:0.9rem;line-height:1.6;">
                <li>• <strong>Direct Payouts:</strong> Workers set their own rates and retain 100% of agreed earnings.</li>
                <li>• <strong>Hyperlocal Radius:</strong> Matches professionals residing within your neighborhood.</li>
                <li>• <strong>Counter-Offers:</strong> Built-in negotiation with counter-offers and transparent agreements.</li>
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
              <div class="category-card" data-category="${c.id}" role="button" tabindex="0">
                <div class="category-icon">${c.icon}</div>
                <h3>${c.name}</h3>
                <p>${c.description}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- USPs -->
        <section class="section-container" id="usps" style="border-top:1px solid var(--border-color);border-bottom:1px solid var(--border-color);">
          <h2 class="section-title">Why Choose LocalKaam?</h2>
          <p class="section-subtitle">Four core pillars that set our platform apart from conventional gig apps.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;max-width:1200px;margin:0 auto;">
            ${[
              { icon: '💬', title: 'Transparent Negotiation', desc: 'Direct price offers and counter-offers between households and professionals with complete history tracking.' },
              { icon: '📍', title: 'Hyperlocal Matching Grid', desc: 'Haversine distance calculations and service radius limits ensuring experts arrive within ~25 minutes.' },
              { icon: '🛡️', title: 'Verified Trust &amp; Reviews', desc: 'Strict reviews tied exclusively to completed jobs and verified badges to maintain absolute safety.' },
              { icon: '🛠️', title: 'Worker Empowerment', desc: 'Multi-step onboarding allowing workers to configure service-specific pricing, schedules, and online status.' }
            ].map(u => `
              <div style="background:var(--bg-card);padding:clamp(16px,2.5vw,24px);border-radius:14px;border:1.5px solid var(--border-color);transition:all 0.2s ease;">
                <div style="font-size:2rem;margin-bottom:12px;">${u.icon}</div>
                <h3 style="font-size:1rem;font-weight:700;margin-bottom:8px;color:var(--text-primary);">${u.title}</h3>
                <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.6;">${u.desc}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Competitor Comparison -->
        <section class="section-container" id="comparison">
          <h2 class="section-title">Competitor Comparison</h2>
          <p class="section-subtitle">How LocalKaam stacks up against traditional service platforms.</p>
          <div class="table-container" style="max-width:1050px;margin:0 auto;">
            <table class="data-table" style="min-width:600px;">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th style="background:rgba(255,233,92,0.12);color:var(--text-primary);">LocalKaam ✦</th>
                  <th>Urban Company</th>
                  <th>Housejoy</th>
                  <th>Justdial</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Price Negotiation</strong></td>
                  <td style="background:rgba(255,233,92,0.05);"><span style="color:#10b981;font-weight:700;">✓ Counter-offers</span></td>
                  <td>❌ Fixed only</td><td>❌ Fixed only</td><td>⚠️ Phone haggling</td>
                </tr>
                <tr>
                  <td><strong>Commission Cut</strong></td>
                  <td style="background:rgba(255,233,92,0.05);"><span style="color:#10b981;font-weight:700;">0% Direct</span></td>
                  <td>❌ 20–35%</td><td>❌ 25%</td><td>Free (Unverified)</td>
                </tr>
                <tr>
                  <td><strong>Hyperlocal ETA</strong></td>
                  <td style="background:rgba(255,233,92,0.05);"><span style="color:#10b981;font-weight:700;">✓ ~25 min</span></td>
                  <td>⚠️ Centralised</td><td>⚠️ Centralised</td><td>❌ None</td>
                </tr>
                <tr>
                  <td><strong>Live Job Tracking</strong></td>
                  <td style="background:rgba(255,233,92,0.05);"><span style="color:#10b981;font-weight:700;">✓ Full lifecycle</span></td>
                  <td>✓ App tracking</td><td>⚠️ Basic</td><td>❌ None</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- How It Works -->
        <section class="section-container" id="how-it-works" style="border-top:1px solid var(--border-color);border-bottom:1px solid var(--border-color);">
          <h2 class="section-title">How LocalKaam Works in 3 Steps</h2>
          <p class="section-subtitle">A seamless workflow designed for households and neighborhood professionals.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;max-width:1000px;margin:0 auto;">
            ${[
              { n: '01', title: 'Discover Nearby Experts', desc: 'Select your Mumbai locality and service category. Our matching engine surfaces online professionals nearby.' },
              { n: '02', title: 'Book &amp; Agree on Price', desc: 'Choose an appointment slot, describe the task, and submit your request or optional price offer.' },
              { n: '03', title: 'Track, Complete &amp; Review', desc: 'Track job progress live from confirmed to completed, generate digital receipts, and leave ratings.' }
            ].map(s => `
              <div style="background:var(--bg-card);padding:clamp(20px,3vw,32px);border-radius:14px;border:1.5px solid var(--border-color);transition:all 0.2s ease;">
                <div style="font-size:2rem;font-weight:800;color:var(--text-primary);margin-bottom:12px;opacity:0.5;font-family:'Bricolage Grotesque',sans-serif;">${s.n}</div>
                <h3 style="font-size:1rem;font-weight:700;margin-bottom:8px;color:var(--text-primary);">${s.title}</h3>
                <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.6;">${s.desc}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Footer -->
        <footer class="footer">
          <div style="max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:12px;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="nav-logo" style="width:30px;height:30px;font-size:0.8rem;min-width:30px;">LK</div>
              <span style="font-weight:700;font-size:1rem;color:var(--text-primary);">LocalKaam</span>
            </div>
            <p>© 2026 LocalKaam Inc. Hyperlocal Blue-Collar Services Marketplace. All rights reserved.</p>
            <p style="font-size:0.8rem;opacity:0.6;">Mumbai · Transparent Pricing · Worker-First Platform</p>
          </div>
        </footer>
      </div>
    `;
  },

  renderRoleSelectionPage() {
    const theme = StorageService.getTheme();
    return `
      <div class="app-container">
        ${this._mobileNavHTML(theme)}

        <header class="navbar">
          <div class="nav-brand" id="nav-back-home">
            <div class="nav-logo">LK</div>
            <div class="nav-title">LocalKaam</div>
          </div>
          <div class="nav-actions">
            <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️' : '🌙'}</button>
            <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </header>

        <div class="role-selection-wrapper">
          <h1 style="font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;margin-bottom:12px;font-family:'Bricolage Grotesque',sans-serif;">How would you like to use LocalKaam?</h1>
          <p style="color:var(--text-secondary);font-size:clamp(1rem,1.8vw,1.1rem);margin-bottom:32px;line-height:1.6;">Choose the experience that works for you. You can switch roles anytime.</p>

          <div class="role-cards">
            <!-- Customer Card -->
            <div class="role-card" id="select-customer-role">
              <div class="role-icon">🏠</div>
              <h3>Continue as Customer</h3>
              <p>Find trusted local professionals, compare rates, book services, negotiate prices, and track your jobs.</p>
              <button class="btn btn-primary btn-full" style="padding:14px;">Continue as Customer</button>
            </div>

            <!-- Worker Card -->
            <div class="role-card" id="select-worker-role">
              <div class="role-icon">🛠️</div>
              <h3>Continue as Worker</h3>
              <p>Showcase your skills, set your own hourly rates, manage booking requests, counter offers, and track earnings.</p>
              <button class="btn btn-primary btn-full" style="padding:14px;">Continue as Worker</button>
            </div>
          </div>

          <div style="margin-top:40px;">
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
    // Truncate long usernames for display
    const displayName = userName.length > 18 ? userName.substring(0, 15) + '…' : userName;

    return `
      <div class="app-container">
        <!-- Mobile Nav Overlay for dashboard (simple version) -->
        <div class="mobile-nav-overlay" id="mobile-nav-overlay"></div>
        <div class="mobile-nav-drawer" id="mobile-nav-drawer">
          <button class="mobile-nav-close" id="mobile-nav-close">✕ Close</button>
          <div style="padding:12px 0;border-bottom:1px solid var(--border-color);margin-bottom:12px;">
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px;">Logged in as</div>
            <div style="font-weight:700;font-size:0.95rem;">${esc(displayName)}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">Role: ${activeRole === 'customer' ? '🏠 Customer' : '🛠️ Worker'}</div>
          </div>
          <button class="btn btn-outline btn-full" id="mobile-switch-role-btn">⇄ Switch Role</button>
          <button class="theme-toggle" id="mobile-theme-toggle-btn" style="width:100%;justify-content:center;margin-top:8px;">${theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
          <button class="btn btn-outline btn-full" id="mobile-reset-btn" style="margin-top:8px;font-size:0.8rem;">🔄 Reset Demo Data</button>
        </div>

        <header class="navbar">
          <div class="nav-brand" id="nav-brand-dashboard">
            <div class="nav-logo">LK</div>
            <div class="nav-title">LocalKaam</div>
            <span class="role-badge-mobile">${activeRole === 'customer' ? '🏠 Customer' : '🛠️ Worker'}</span>
          </div>
          <div class="nav-links">
            <span class="role-badge" style="background:var(--accent-light);color:var(--text-primary);font-weight:700;font-size:0.8rem;">
              ${activeRole === 'customer' ? '🏠 Customer' : '🛠️ Worker'} &nbsp;·&nbsp; ${esc(displayName)}
            </span>
          </div>
          <div class="nav-actions">
            <button class="btn btn-outline btn-sm" id="switch-role-btn">⇄ Switch</button>
            <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️' : '🌙'}</button>
            <button class="btn btn-outline btn-sm" id="reset-demo-btn" title="Reset Demo Data" style="font-size:0.75rem;">🔄</button>
            <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu">
              <span></span><span></span><span></span>
            </button>
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
        const cur = StorageService.getTheme();
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

    root.querySelectorAll('.category-card').forEach(card => {
      const handleClick = () => {
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
      };
      card.addEventListener('click', handleClick);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); });
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
    this._attachMobileNav(root);

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
