import { StorageService } from './storage.js';
import { CATEGORIES } from './data.js';
import { CustomerFrontend } from './customer.js';
import { WorkerFrontend } from './worker.js';
import { Toast } from './toast.js';

export const App = {
  init() {
    this.applyTheme(StorageService.getTheme());
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
            <a class="nav-link" href="#problem">The Problem</a>
            <a class="nav-link" href="#services">Services</a>
            <a class="nav-link" href="#usps">Why Us</a>
            <a class="nav-link" href="#comparison">Competitors</a>
            <a class="nav-link" href="#how-it-works">How It Works</a>
            <a class="nav-link" href="#tech-stack">Tech Stack</a>
          </nav>
          <div class="nav-actions">
            <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
            <button class="btn btn-primary" id="get-started-btn">Try Demo</button>
          </div>
        </header>

        <!-- 1. Hero Section -->
        <section class="landing-hero">
          <div class="hero-content">
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: var(--accent-light); color: var(--accent-primary); padding: 0.35rem 0.85rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1.25rem;">
              <span>🏆 Hackathon MVP Winner</span> • Hyperlocal Services Marketplace
            </div>
            <h1>Local help.<br>Fair prices.<br><span>Right around the corner.</span></h1>
            <p>Traditional home-service aggregators charge exorbitant commissions, inflate prices, and disconnect households from neighborhood experts. LocalKaam connects you directly with vetted local plumbers, electricians, carpenters, and cleaners with transparent pricing and real-time appointment booking.</p>
            <div class="hero-cta">
              <button class="btn btn-primary" id="hero-find-pro-btn" style="padding: 0.85rem 1.75rem; font-size: 1.05rem;">Try Demo (Customer & Worker)</button>
              <button class="btn btn-outline" id="hero-explore-btn" style="padding: 0.85rem 1.75rem; font-size: 1.05rem;">Explore Features</button>
            </div>
          </div>
          <div class="hero-visual">
            <div style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--accent-primary); display: flex; align-items: center; gap: 0.5rem;">
              <span>⚡ Live Ecosystem Preview</span>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9rem;">Real-time matching across Mumbai localities with transparent ETA and direct price negotiation.</p>
            <div class="stats-grid">
              <div class="stat-card">
                <h3>~25m</h3>
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
                <h3>10+</h3>
                <p>Essential Categories</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. Problem and Solution -->
        <section class="section-container" id="problem" style="background: var(--bg-secondary); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
          <h2 class="section-title">The Real-World Problem vs. LocalKaam</h2>
          <p class="section-subtitle">Why urban households and local blue-collar professionals need a decentralized hyperlocal marketplace.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; max-width: 1100px; margin: 0 auto;">
            <div style="background: var(--bg-card); border: 2px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius); padding: 2rem; box-shadow: var(--shadow-sm);">
              <div style="font-size: 1.25rem; font-weight: 700; color: var(--danger); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                ❌ Traditional Aggregator Pain Points
              </div>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 1rem; color: var(--text-secondary); font-size: 0.95rem;">
                <li>• <strong>Opaque Commissions:</strong> Platforms take 25–40% cuts, squeezing workers' earnings.</li>
                <li>• <strong>Inflated Pricing:</strong> Customers pay heavy markups due to middleman fees.</li>
                <li>• <strong>Impersonal Matching:</strong> Workers are assigned algorithmically from far away with long ETAs.</li>
                <li>• <strong>Rigid Rules:</strong> Zero room for direct price discussion or bespoke task negotiation.</li>
              </ul>
            </div>

            <div style="background: var(--bg-card); border: 2px solid var(--accent-primary); border-radius: var(--radius); padding: 2rem; box-shadow: var(--shadow-md);">
              <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent-primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                ✅ The LocalKaam Solution
              </div>
              <ul style="list-style: none; display: flex; flex-direction: column; gap: 1rem; color: var(--text-primary); font-size: 0.95rem;">
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
              <div class="category-card" data-category="${esc(c.id)}">
                <div class="category-icon">${esc(c.icon)}</div>
                <h3>${esc(c.name)}</h3>
                <p>${esc(c.description)}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- 3. Unique Selling Points (USPs) -->
        <section class="section-container" id="usps" style="background: var(--bg-secondary); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
          <h2 class="section-title">Why Choose LocalKaam?</h2>
          <p class="section-subtitle">Four core pillars that set our platform apart from conventional gig apps.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; max-width: 1200px; margin: 0 auto;">
            <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <div style="font-size: 2rem; margin-bottom: 1rem;">💬</div>
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Transparent Negotiation</h3>
              <p style="color: var(--text-secondary); font-size: 0.9rem;">Direct price offers and counter-offers between households and professionals with complete history tracking.</p>
            </div>
            <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <div style="font-size: 2rem; margin-bottom: 1rem;">📍</div>
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Hyperlocal Matching Grid</h3>
              <p style="color: var(--text-secondary); font-size: 0.9rem;">Haversine distance calculations and service radius limits ensuring experts arrive within ~25 minutes.</p>
            </div>
            <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <div style="font-size: 2rem; margin-bottom: 1rem;">🛡️</div>
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Verified Trust & Reviews</h3>
              <p style="color: var(--text-secondary); font-size: 0.9rem;">Strict reviews tied exclusively to completed jobs and verified badges to maintain absolute safety.</p>
            </div>
            <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <div style="font-size: 2rem; margin-bottom: 1rem;">🛠️</div>
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Worker Empowerment</h3>
              <p style="color: var(--text-secondary); font-size: 0.9rem;">Multi-step onboarding allowing workers to configure service-specific pricing, schedules, and online status.</p>
            </div>
          </div>
        </section>

        <!-- 4. Competitor Comparison Table -->
        <section class="section-container" id="comparison">
          <h2 class="section-title">Competitor Comparison</h2>
          <p class="section-subtitle">How LocalKaam stacks up against traditional service platforms.</p>
          <div class="table-container" style="max-width: 1050px; margin: 0 auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th style="color: var(--accent-primary);">LocalKaam (Ours)</th>
                  <th>Urban Company</th>
                  <th>Housejoy</th>
                  <th>Justdial Local</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Direct Price Negotiation</strong></td>
                  <td><span style="color: var(--success); font-weight: 700;">✓ Supported</span> (Counter-offers)</td>
                  <td>❌ Fixed pricing only</td>
                  <td>❌ Fixed pricing only</td>
                  <td>⚠️ Manual phone haggling</td>
                </tr>
                <tr>
                  <td><strong>Worker Commission Cut</strong></td>
                  <td><span style="color: var(--success); font-weight: 700;">0%</span> (Direct Payouts)</td>
                  <td>❌ 20% – 35% cut</td>
                  <td>❌ 25% cut</td>
                  <td>Free listing (Unverified)</td>
                </tr>
                <tr>
                  <td><strong>Hyperlocal Distance & ETA</strong></td>
                  <td><span style="color: var(--success); font-weight: 700;">✓ Real-time</span> (~25 min ETA)</td>
                  <td>⚠️ Centralised dispatch</td>
                  <td>⚠️ Centralised dispatch</td>
                  <td>❌ Not provided</td>
                </tr>
                <tr>
                  <td><strong>Live Job Lifecycle Tracking</strong></td>
                  <td><span style="color: var(--success); font-weight: 700;">✓ Full state machine</span></td>
                  <td>✓ App tracking</td>
                  <td>⚠️ Basic status</td>
                  <td>❌ None</td>
                </tr>
                <tr>
                  <td><strong>Technology Stack</strong></td>
                  <td>Node.js, SQLite, Vanilla JS</td>
                  <td>React Native, Java, AWS</td>
                  <td>PHP, MySQL, AWS</td>
                  <td>Legacy directory engine</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- 5. How It Works -->
        <section class="section-container" id="how-it-works" style="background: var(--bg-secondary); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
          <h2 class="section-title">How LocalKaam Works in 3 Steps</h2>
          <p class="section-subtitle">A seamless workflow designed for households and neighborhood professionals.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; max-width: 1000px; margin: 0 auto;">
            <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <div style="font-size: 2rem; font-weight: 800; color: var(--accent-primary); margin-bottom: 1rem;">01</div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Discover Nearby Experts</h3>
              <p style="color: var(--text-secondary); font-size: 0.95rem;">Select your Mumbai locality and service category. Our matching engine surfaces online professionals nearby.</p>
            </div>
            <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <div style="font-size: 2rem; font-weight: 800; color: var(--accent-primary); margin-bottom: 1rem;">02</div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Book & Agree on Price</h3>
              <p style="color: var(--text-secondary); font-size: 0.95rem;">Choose an appointment slot, describe the task, and submit your request or optional price offer.</p>
            </div>
            <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius); border: 1px solid var(--border-color);">
              <div style="font-size: 2rem; font-weight: 800; color: var(--accent-primary); margin-bottom: 1rem;">03</div>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Track, Complete & Review</h3>
              <p style="color: var(--text-secondary); font-size: 0.95rem;">Track job progress live from confirmed to completed, generate digital receipts, and leave ratings.</p>
            </div>
          </div>
        </section>

        <!-- 8. Technology Stack -->
        <section class="section-container" id="tech-stack">
          <h2 class="section-title">Production Technology Stack</h2>
          <p class="section-subtitle">Modern, lightweight, reliable architecture built for speed and hackathon demonstration.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; max-width: 1000px; margin: 0 auto;">
            <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border-color); text-align: center;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🟢</div>
              <h3 style="font-weight: 700; margin-bottom: 0.25rem;">Node.js & Express</h3>
              <p style="color: var(--text-secondary); font-size: 0.85rem;">Unified backend server</p>
            </div>
            <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border-color); text-align: center;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🗄️</div>
              <h3 style="font-weight: 700; margin-bottom: 0.25rem;">SQLite & Supabase</h3>
              <p style="color: var(--text-secondary); font-size: 0.85rem;">Relational persistence</p>
            </div>
            <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border-color); text-align: center;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚡</div>
              <h3 style="font-weight: 700; margin-bottom: 0.25rem;">Server-Sent Events</h3>
              <p style="color: var(--text-secondary); font-size: 0.85rem;">Real-time cross-device sync</p>
            </div>
            <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border-color); text-align: center;">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">💻</div>
              <h3 style="font-weight: 700; margin-bottom: 0.25rem;">Vanilla ES6+ & CSS3</h3>
              <p style="color: var(--text-secondary); font-size: 0.85rem;">High-performance frontend</p>
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
