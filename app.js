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
    this.render();

    // Handle browser back/forward navigation
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
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
      <div class="flex flex-col w-full bg-[#fbf9f4] text-[#1b1c19] min-h-screen">
        <!-- STITCH STYLISH HEADER -->
        <header class="fixed top-0 left-0 right-0 z-50 pt-4 px-4 md:px-12 transition-all duration-300">
          <div class="h-16 max-w-7xl mx-auto px-4 bg-[#fcfaf5]/95 backdrop-blur-md rounded-xl border border-[#1a3300] shadow-[2px_2px_0px_#1a3300] flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 shrink-0 cursor-pointer" id="nav-home-logo">
              <div class="h-9 w-9 bg-[#1a3300] text-[#ffe95c] rounded-lg flex items-center justify-center font-extrabold text-lg shadow-sm">LK</div>
              <span class="font-extrabold text-xl tracking-tight text-[#1a3300] font-headline-sm">LocalKaam</span>
              <span class="hidden lg:inline-block text-xs bg-[#ffe95c] text-[#1a3300] px-2 py-0.5 rounded uppercase tracking-wider font-mono">Hyperlocal Services</span>
            </div>
            
            <nav class="hidden xl:flex items-center gap-2">
              <a class="text-sm font-semibold text-[#44483d] hover:text-[#1a3300] px-3 py-1 rounded transition-colors" href="#services">Services</a>
              <a class="text-sm font-semibold text-[#44483d] hover:text-[#1a3300] px-3 py-1 rounded transition-colors" href="#problem">The Problem</a>
              <a class="text-sm font-semibold text-[#44483d] hover:text-[#1a3300] px-3 py-1 rounded transition-colors" href="#usps">Why Us</a>
              <a class="text-sm font-semibold text-[#44483d] hover:text-[#1a3300] px-3 py-1 rounded transition-colors" href="#comparison">Competitors</a>
              <a class="text-sm font-semibold text-[#44483d] hover:text-[#1a3300] px-3 py-1 rounded transition-colors" href="#how-it-works">How It Works</a>
            </nav>

            <div class="flex items-center gap-3 shrink-0">
              <button class="theme-toggle" id="theme-toggle-btn">${theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
              <button class="btn btn-primary btn-sm shadow-[2px_2px_0px_#ffe95c]" id="get-started-btn">Get Started →</button>
            </div>
          </div>
        </header>

        <!-- MAIN CONTAINER -->
        <main class="w-full pt-28 bg-[#fbf9f4] max-w-7xl mx-auto px-4 md:px-12 pb-24">
          
          <!-- HERO SECTION -->
          <section class="relative pt-6 pb-16">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              <!-- Hero Left -->
              <div class="lg:col-span-7 space-y-6">
                <div class="inline-flex items-center gap-2 bg-[#ffe95c] text-[#1a3300] px-4 py-1.5 rounded-full shadow-[2px_2px_0px_#1a3300]">
                  <span class="font-bold text-xs uppercase tracking-wide">⭐ Verified Local Experts • Hyperlocal Services Marketplace</span>
                </div>

                <h1 class="text-5xl lg:text-6xl font-extrabold text-[#1a3300] tracking-tight leading-[1.08] font-headline-display">
                  Local help. <br/>
                  Fair prices. <br/>
                  <span class="relative inline-block bg-[#ffe95c] px-2 py-0.5 rounded text-[#1a3300] -rotate-1 shadow-[2px_2px_0px_#1a3300]">Right around</span> <br/>
                  the corner.
                </h1>

                <p class="text-lg text-[#1a3300]/90 max-w-xl font-normal leading-relaxed">
                  Traditional home-service aggregators charge exorbitant commissions and squeeze workers. LocalKaam connects you directly with vetted local plumbers, electricians, carpenters, and cleaners with transparent pricing.
                </p>

                <div class="flex flex-wrap items-center gap-4 pt-2">
                  <button class="btn btn-primary px-8 py-3.5 shadow-[3px_3px_0px_#ffe95c] text-base" id="hero-find-pro-btn">
                    <span>Get Started (Customer & Worker)</span>
                    <span>→</span>
                  </button>
                  <button class="btn btn-outline px-6 py-3.5 bg-[#fcfaf5] shadow-[2px_2px_0px_#1a3300] text-base" id="hero-explore-btn">
                    Explore Features
                  </button>
                </div>

                <div class="pt-4 flex items-center gap-3 text-xs text-[#44483d] font-mono">
                  <span class="inline-block w-2.5 h-2.5 rounded-full bg-[#d5f5c2] animate-pulse border border-[#1a3300]"></span>
                  <span>Bandra, Andheri, Powai, Dadar • 84 Active Technicians Dispatched Today</span>
                </div>
              </div>

              <!-- Hero Right: Sticky Note Preview -->
              <div class="lg:col-span-5 relative lg:pl-2">
                <div class="bg-[#d5f5c2] rounded-xl p-8 shadow-[4px_4px_0px_#1a3300] relative overflow-hidden animate-float-soft border-2 border-[#1a3300]">
                  <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#fcfaf5]/70 backdrop-blur-sm -rotate-2 opacity-90 shadow-sm pointer-events-none"></div>
                  
                  <div class="flex items-center justify-between pb-4">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">⚡</span>
                      <span class="font-bold text-lg text-[#1a3300]">Live Ecosystem Preview</span>
                    </div>
                    <span class="text-xs bg-[#1a3300] text-[#fcfaf5] px-2.5 py-0.5 rounded-full uppercase font-mono">Real-Time</span>
                  </div>

                  <p class="text-sm text-[#1a3300]/80 pb-6">
                    Direct peer matching across Mumbai localities with zero algorithmic surge markups and zero platform tax.
                  </p>

                  <div class="grid grid-cols-2 gap-4">
                    <div class="bg-[#fcfaf5] p-3.5 rounded-lg shadow-[2px_2px_0px_#1a3300]">
                      <span class="text-xs text-[#44483d] uppercase tracking-wider font-mono block">Avg Worker ETA</span>
                      <div class="text-3xl font-extrabold text-[#1a3300] mt-1 font-headline-md">~25m</div>
                      <span class="text-[11px] text-[#44483d] block mt-1">Haversine geo-radius</span>
                    </div>
                    <div class="bg-[#fcfaf5] p-3.5 rounded-lg shadow-[2px_2px_0px_#1a3300]">
                      <span class="text-xs text-[#44483d] uppercase tracking-wider font-mono block">Hidden Fee</span>
                      <div class="text-3xl font-extrabold text-[#1a3300] mt-1 font-headline-md">₹0</div>
                      <span class="text-[11px] text-[#44483d] block mt-1">No commission cut</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          <!-- PROBLEM AND SOLUTION SECTION -->
          <section class="py-16 border-t border-b border-[#c4c8b9] my-12" id="problem">
            <h2 class="text-4xl font-extrabold text-center mb-4 font-headline-lg">The Real-World Problem vs. LocalKaam</h2>
            <p class="text-center text-[#44483d] mb-12 max-w-xl mx-auto">Why urban households and local blue-collar professionals need a decentralized hyperlocal marketplace.</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div class="bg-[#fcfaf5] border-2 border-red-400 rounded-2xl p-8 shadow-[4px_4px_0px_rgba(239,68,68,0.4)]">
                <h3 class="text-xl font-extrabold text-red-600 mb-4 flex items-center gap-2">❌ Traditional Aggregator Pain Points</h3>
                <ul class="space-y-3 text-[#44483d]">
                  <li>• <strong>Opaque Commissions:</strong> Platforms take 25–40% cuts, squeezing workers' earnings.</li>
                  <li>• <strong>Inflated Pricing:</strong> Customers pay heavy markups due to middleman fees.</li>
                  <li>• <strong>Impersonal Matching:</strong> Workers are assigned algorithmically from far away with long ETAs.</li>
                  <li>• <strong>Rigid Rules:</strong> Zero room for direct price discussion or bespoke task negotiation.</li>
                </ul>
              </div>

              <div class="bg-[#fcfaf5] border-2 border-[#1a3300] rounded-2xl p-8 shadow-[4px_4px_0px_#1a3300]">
                <h3 class="text-xl font-extrabold text-[#1a3300] mb-4 flex items-center gap-2">✅ The LocalKaam Solution</h3>
                <ul class="space-y-3 text-[#1b1c19]">
                  <li>• <strong>Direct Payouts:</strong> Workers set their own rates and retain 100% of agreed earnings.</li>
                  <li>• <strong>Hyperlocal Radius:</strong> Matches professionals residing within your neighborhood.</li>
                  <li>• <strong>Counter-Offers:</strong> Built-in negotiation allows counter-offers and transparent agreements.</li>
                  <li>• <strong>Verified Trust:</strong> Real post-completion reviews and status tracking.</li>
                </ul>
              </div>
            </div>
          </section>

          <!-- SERVICE CATEGORIES -->
          <section class="py-16" id="services">
            <h2 class="text-4xl font-extrabold text-center mb-4 font-headline-lg">Essential Home Services</h2>
            <p class="text-center text-[#44483d] mb-12 max-w-xl mx-auto">Browse trustworthy blue-collar professionals ready to serve your household immediately or on schedule.</p>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
              ${CATEGORIES.map(c => `
                <div class="category-card bg-[#fcfaf5] border-2 border-[#c4c8b9] hover:border-[#1a3300] rounded-xl p-6 text-center cursor-pointer transition-all shadow-[2px_2px_0px_#c4c8b9] hover:shadow-[4px_4px_0px_#1a3300]" data-category="${esc(c.id)}">
                  <div class="text-4xl mb-3">${esc(c.icon)}</div>
                  <h3 class="font-bold text-lg mb-1 text-[#1a3300]">${esc(c.name)}</h3>
                  <p class="text-xs text-[#44483d]">${esc(c.description)}</p>
                </div>
              `).join('')}
            </div>
          </section>

          <!-- UNIQUE SELLING POINTS (USPs) -->
          <section class="py-16 border-t border-b border-[#c4c8b9] my-12" id="usps">
            <h2 class="text-4xl font-extrabold text-center mb-4 font-headline-lg">Why Choose LocalKaam?</h2>
            <p class="text-center text-[#44483d] mb-12 max-w-xl mx-auto">Four core pillars that set our platform apart from conventional gig apps.</p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="bg-[#fcfaf5] border-2 border-[#1a3300] rounded-xl p-6 shadow-[3px_3px_0px_#1a3300]">
                <div class="text-3xl mb-3">💬</div>
                <h3 class="font-bold text-lg mb-2 text-[#1a3300]">Transparent Negotiation</h3>
                <p class="text-sm text-[#44483d]">Direct price offers and counter-offers between households and professionals with complete history tracking.</p>
              </div>
              <div class="bg-[#fcfaf5] border-2 border-[#1a3300] rounded-xl p-6 shadow-[3px_3px_0px_#1a3300]">
                <div class="text-3xl mb-3">📍</div>
                <h3 class="font-bold text-lg mb-2 text-[#1a3300]">Hyperlocal Matching Grid</h3>
                <p class="text-sm text-[#44483d]">Haversine distance calculations and service radius limits ensuring experts arrive within ~25 minutes.</p>
              </div>
              <div class="bg-[#fcfaf5] border-2 border-[#1a3300] rounded-xl p-6 shadow-[3px_3px_0px_#1a3300]">
                <div class="text-3xl mb-3">🛡️</div>
                <h3 class="font-bold text-lg mb-2 text-[#1a3300]">Verified Trust & Reviews</h3>
                <p class="text-sm text-[#44483d]">Strict reviews tied exclusively to completed jobs and verified badges to maintain absolute safety.</p>
              </div>
              <div class="bg-[#fcfaf5] border-2 border-[#1a3300] rounded-xl p-6 shadow-[3px_3px_0px_#1a3300]">
                <div class="text-3xl mb-3">🛠️</div>
                <h3 class="font-bold text-lg mb-2 text-[#1a3300]">Worker Empowerment</h3>
                <p class="text-sm text-[#44483d]">Multi-step onboarding allowing workers to configure service-specific pricing, schedules, and online status.</p>
              </div>
            </div>
          </section>

          <!-- COMPETITOR COMPARISON -->
          <section class="py-16" id="comparison">
            <h2 class="text-4xl font-extrabold text-center mb-4 font-headline-lg">Competitor Comparison</h2>
            <p class="text-center text-[#44483d] mb-12 max-w-xl mx-auto">How LocalKaam stacks up against traditional service platforms.</p>
            
            <div class="table-container max-w-5xl mx-auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th style="color: #1a3300;">LocalKaam (Ours)</th>
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

          <!-- HOW IT WORKS -->
          <section class="py-16 border-t border-b border-[#c4c8b9] my-12" id="how-it-works">
            <h2 class="text-4xl font-extrabold text-center mb-4 font-headline-lg">How LocalKaam Works in 3 Steps</h2>
            <p class="text-center text-[#44483d] mb-12 max-w-xl mx-auto">A seamless workflow designed for households and neighborhood professionals.</p>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div class="bg-[#fcfaf5] border-2 border-[#1a3300] rounded-xl p-8 shadow-[3px_3px_0px_#1a3300]">
                <div class="text-3xl font-extrabold text-[#1a3300] mb-3">01</div>
                <h3 class="font-bold text-lg mb-2 text-[#1a3300]">Discover Nearby Experts</h3>
                <p class="text-sm text-[#44483d]">Select your Mumbai locality and service category. Our matching engine surfaces online professionals nearby.</p>
              </div>
              <div class="bg-[#fcfaf5] border-2 border-[#1a3300] rounded-xl p-8 shadow-[3px_3px_0px_#1a3300]">
                <div class="text-3xl font-extrabold text-[#1a3300] mb-3">02</div>
                <h3 class="font-bold text-lg mb-2 text-[#1a3300]">Book & Agree on Price</h3>
                <p class="text-sm text-[#44483d]">Choose an appointment slot, describe the task, and submit your request or optional price offer.</p>
              </div>
              <div class="bg-[#fcfaf5] border-2 border-[#1a3300] rounded-xl p-8 shadow-[3px_3px_0px_#1a3300]">
                <div class="text-3xl font-extrabold text-[#1a3300] mb-3">03</div>
                <h3 class="font-bold text-lg mb-2 text-[#1a3300]">Track, Complete & Review</h3>
                <p class="text-sm text-[#44483d]">Track job progress live from confirmed to completed, generate digital receipts, and leave ratings.</p>
              </div>
            </div>
          </section>

        </main>

        <!-- FOOTER -->
        <footer class="bg-[#fcfaf5] border-t border-[#1a3300] py-12 px-4 text-center text-[#44483d]">
          <div class="max-w-7xl mx-auto flex flex-col items-center gap-3">
            <div class="flex items-center gap-2">
              <div class="h-8 w-8 bg-[#1a3300] text-[#ffe95c] rounded-lg flex items-center justify-center font-extrabold text-sm">LK</div>
              <span class="font-bold text-lg text-[#1a3300]">LocalKaam</span>
            </div>
            <p class="text-sm">© 2026 LocalKaam Inc. Hyperlocal Blue-Collar Services Marketplace. All rights reserved.</p>
          </div>
        </footer>
      </div>
    `;
  },

  renderRoleSelectionPage() {
    const theme = StorageService.getTheme();
    return `
      <div class="flex flex-col w-full bg-[#fbf9f4] text-[#1b1c19] min-h-screen">
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
          <h1 class="text-4xl font-extrabold text-center mb-2 font-headline-lg">How would you like to use LocalKaam?</h1>
          <p class="text-center text-[#44483d] text-lg mb-8">Choose the experience that works for you. You can switch roles anytime.</p>

          <div class="role-cards">
            <!-- Customer Card -->
            <div class="role-card" id="select-customer-role">
              <div class="role-icon">🏠</div>
              <h3 class="text-2xl font-bold mb-2">Continue as Customer</h3>
              <p>Find trusted local professionals, compare rates, book services, negotiate prices, and track your jobs.</p>
              <button class="btn btn-primary w-full mt-4">Continue as Customer</button>
            </div>

            <!-- Worker Card -->
            <div class="role-card" id="select-worker-role">
              <div class="role-icon">🛠️</div>
              <h3 class="text-2xl font-bold mb-2">Continue as Worker</h3>
              <p>Showcase your skills, set your own hourly rates, manage booking requests, counter offers, and track earnings.</p>
              <button class="btn btn-primary w-full mt-4">Continue as Worker</button>
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
    const profile = AuthService.getProfile();
    const userName = profile ? (profile.full_name || profile.email || 'User') : 'User';

    return `
      <div class="app-container">
        <header class="navbar">
          <div class="nav-brand" id="nav-brand-dashboard">
            <div class="nav-logo">LK</div>
            <div class="nav-title">Local<span>Kaam</span></div>
          </div>
          <div class="nav-links">
            <span class="role-badge" style="background: var(--accent-light); color: var(--color-forest-ink); font-weight: 700;">
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
        if (confirm('Reset all app data and restore initial seeded state?')) {
          StorageService.resetDemoData();
        }
      });
    }

    root.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const profile = AuthService.getProfile();
        if (profile && profile.role === 'customer') {
          StorageService.setCurrentRole('customer');
          CustomerFrontend.currentCategory = card.getAttribute('data-category');
          this.render();
        } else {
          AuthModal.show('customer', () => {
            StorageService.setCurrentRole('customer');
            CustomerFrontend.currentCategory = card.getAttribute('data-category');
            this.render();
          });
        }
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
      const profile = AuthService.getProfile();
      if (profile && profile.role === 'customer') {
        StorageService.setCurrentRole('customer');
        this.render();
      } else {
        AuthModal.show('customer', () => {
          StorageService.setCurrentRole('customer');
          this.render();
        });
      }
    });
    root.querySelector('#select-worker-role')?.addEventListener('click', () => {
      const profile = AuthService.getProfile();
      if (profile && profile.role === 'worker') {
        StorageService.setCurrentRole('worker');
        this.render();
      } else {
        AuthModal.show('worker', () => {
          StorageService.setCurrentRole('worker');
          this.render();
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
