import { StorageService } from './storage.js';
import { BookingService } from './bookings.js';
import { CATEGORIES, LOCALITIES, COMPLAINT_CATEGORIES, REQUIRED_VERIFICATION_DOCUMENTS } from './data.js';
import { WorkerFeedback, WorkerEarnings } from './worker_new_features.js';
import { Toast } from './toast.js';
import { AuthService } from './authService.js';
import { esc } from './utils.js';
import { i18n, t } from './i18n.js';

export const WorkerFrontend = {
  currentView: 'overview',
  chartMode: 'earnings', // 'earnings' | 'jobs'
  timeFilter: 'all',
  txSearchQuery: '',
  txStatusFilter: 'all',

  render(container) {
    const workers = StorageService.getWorkers();
    const authProfile = AuthService.getProfile();
    let currentWorkerId = StorageService.getSelectedWorkerId();

    if (authProfile && authProfile.role === 'worker') {
      const authId = String(authProfile.id || '');
      const partial = authId ? authId.substring(0, 8) : '';
      const myWorker = workers.find(w =>
        (w.user_id && String(w.user_id) === authId) ||
        (w.userId && String(w.userId) === authId) ||
        (partial && w.id === `w_${partial}`) ||
        (authProfile.phone && w.phone && w.phone === authProfile.phone && AuthService.isGuest())
      );
      if (myWorker) {
        currentWorkerId = myWorker.id;
        StorageService.setSelectedWorkerId(myWorker.id);
      } else if (AuthService.isAuthenticated() && !AuthService.isGuest() && authId) {
        // Real (e.g. Google) worker with no local entry yet: force onboarding
        // instead of showing another sample worker's jobs.
        this.renderOnboarding(container, null);
        return;
      }
    }

    let worker = workers.find(w => w.id === currentWorkerId) || workers[0];

    // If profile is incomplete, force onboarding
    if (!worker || !worker.profileCompleted) {
      this.renderOnboarding(container, worker);
      return;
    }

    const allBookings = StorageService.getBookings();
    const bookings = allBookings.filter(b => b.workerId === worker.id);

    // Treat both historical status spellings as pending so accepted jobs
    // reliably move out of Requests and into Active Jobs.
    const pendingRequests = bookings.filter(b => ['Pending confirmation', 'Pending'].includes(b.status));
    const activeJobs = bookings.filter(b => !['Pending confirmation', 'Pending', 'Job completed', 'Cancelled', 'Disputed'].includes(b.status));
    const completedJobs = bookings.filter(b => b.status === 'Job completed');
    const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

    const view = this.currentView || this.activeView || 'overview';
    const isOnline = worker.available && !worker.pauseNewBookings;

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Clean Modern Sidebar -->
        <aside class="sidebar" id="worker-sidebar">
          <div class="sidebar-worker-profile-box" style="padding-bottom: 14px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color);">
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">ACTIVE PROFESSIONAL</div>
            <select id="worker-profile-select" class="form-select" style="margin-top: 6px; font-size: 0.85rem; padding: 6px 10px; border-radius: 8px; width: 100%; font-weight: 600;">
              ${workers.map(w => `<option value="${esc(w.id)}" ${w.id === worker.id ? 'selected' : ''}>${esc(w.name)} (${Object.keys(w.specialities || {}).join(', ') || 'Pro'})</option>`).join('')}
            </select>
            <button class="btn btn-outline btn-xs" id="create-new-worker-btn">
              <i data-lucide="user-plus" class="lucide-xs"></i> Register New Worker
            </button>
          </div>

          <div class="sidebar-section-label" style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; margin-bottom: 8px;">NAVIGATION</div>
          <div class="sidebar-nav-list">
            <div class="sidebar-item ${view === 'overview' ? 'active dash-active' : ''}" data-view="overview">
              <i data-lucide="layout-grid" class="lucide-xs"></i>
              <span>Dashboard</span>
            </div>
            <div class="sidebar-item ${view === 'requests' ? 'active dash-active' : ''}" data-view="requests">
              <i data-lucide="inbox" class="lucide-xs"></i>
              <span>Requests</span>
              <span class="sidebar-badge">${pendingRequests.length}</span>
            </div>
            <div class="sidebar-item ${view === 'active-jobs' ? 'active dash-active' : ''}" data-view="active-jobs">
              <i data-lucide="briefcase" class="lucide-xs"></i>
              <span>Active Jobs</span>
              <span class="sidebar-badge">${activeJobs.length}</span>
            </div>
            <div class="sidebar-item ${view === 'clients' ? 'active dash-active' : ''}" data-view="clients">
              <i data-lucide="users" class="lucide-xs"></i>
              <span>Clients</span>
            </div>
            <div class="sidebar-item ${view === 'services' ? 'active dash-active' : ''}" data-view="services">
              <i data-lucide="wrench" class="lucide-xs"></i>
              <span>My Services</span>
            </div>
            <div class="sidebar-item ${view === 'schedule' ? 'active dash-active' : ''}" data-view="schedule">
              <i data-lucide="clock" class="lucide-xs"></i>
              <span>Availability</span>
            </div>
            <div class="sidebar-item ${view === 'earnings' ? 'active dash-active' : ''}" data-view="earnings">
              <i data-lucide="wallet" class="lucide-xs"></i>
              <span>Earnings</span>
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="main-content" id="worker-main-content">
          ${this.renderMainContent(view, worker, pendingRequests, activeJobs, completedJobs, totalEarnings, bookings)}
        </main>
      </div>
    `;

    this.attachEvents(container);
    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
  },

  renderMainContent(view, worker, pendingRequests, activeJobs, completedJobs, totalEarnings, bookings) {
    const allBookings = bookings || StorageService.getBookings().filter(b => b.workerId === worker.id);
    switch (view) {
      case 'overview':
        return this.renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings, bookings);
      case 'earnings':
      case 'transactions':
        return this.renderEarningsDashboardView(worker.id);
      case 'active-jobs':
      case 'projects':
        return this.renderActiveJobsView(worker, bookings);
      case 'requests':
        return this.renderRequestsView(worker, allBookings);
      case 'clients':
        return this.renderClientsView(worker, allBookings);
      case 'services':
        return this.renderServicesView(worker);
      case 'schedule':
        return this.renderScheduleView(worker);
      case 'feedback':
        return this.renderFeedbackView(worker);
      case 'support':
      case 'help-centre':
        return this.renderHelpCentreView(worker);
      case 'complaints':
        return this.renderComplaintsView();
      case 'profile':
        return this.renderProfileView(worker);
      default:
        return this.renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings, bookings);
    }
  },

  isAwaitingCustomerCounter(booking) {
    if (!booking || !Array.isArray(booking.counterOfferHistory) || booking.counterOfferHistory.length === 0) return false;
    return booking.counterOfferHistory[booking.counterOfferHistory.length - 1].sender === 'worker';
  },

  // ------------------------------------------------------------------------
  // 1. HIGH-UTILITY WORKER DASHBOARD (Clean, Actionable, Not Cluttered)
  // ------------------------------------------------------------------------
  renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings) {
    const isOnline = worker.available && !worker.pauseNewBookings;
    const isVerified = worker.verificationStatus === 'Verified';

    return `
      <div class="dashboard-header ui-section__head" style="margin-bottom:20px;flex-wrap:wrap;">
        <div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <h1 style="margin:0;font-size:var(--fs-2xl);color:var(--ink);">Welcome, ${esc(worker.name)}</h1>
            ${isVerified ? `
              <span class="ui-badge ui-badge--ok"><i data-lucide="badge-check" class="lucide-xs"></i> Verified Pro</span>
            ` : `
              <span class="ui-badge ui-badge--warn"><i data-lucide="clock" class="lucide-xs"></i> Verification Pending</span>
            `}
          </div>
          <p class="ui-muted" style="margin:6px 0 0;font-size:var(--fs-sm);">
            Service Area: <strong>${esc(worker.serviceArea || worker.baseLocality?.toUpperCase() || 'Mumbai')}</strong>
            &nbsp;·&nbsp;
            Status: <span style="font-weight: 700; color: ${isOnline ? 'var(--ok)' : 'var(--bad)'}; display: inline-flex; align-items: center; gap: 4px;">
              <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
              ${isOnline ? 'Online & Discoverable' : 'Offline / Paused'}
            </span>
          </p>
        </div>
        <div>
          <button class="ui-btn ${isOnline ? 'ui-btn--accent' : 'ui-btn--secondary'} ui-btn--sm" id="quick-toggle-online" role="switch" aria-checked="${isOnline ? 'true' : 'false'}">
            <i data-lucide="power" class="lucide-xs"></i> ${isOnline ? 'Online (Accepting Jobs)' : 'Offline (Click to Go Online)'}
          </button>
        </div>
      </div>

      <!-- Stat Tiles per Section 6.6 -->
      <div class="metrics-grid ui-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:24px;">
        <div class="ui-card ui-stat" style="border-left:4px solid var(--peacock-500);">
          <span class="ui-stat__label">Total Earnings</span>
          <div class="ui-stat__value" style="color:var(--peacock-700);">₹${totalEarnings}</div>
        </div>
        <div class="ui-card ui-stat">
          <span class="ui-stat__label">Incoming Requests</span>
          <div class="ui-stat__value">${pendingRequests.length}</div>
        </div>
        <div class="ui-card ui-stat">
          <span class="ui-stat__label">Active Jobs</span>
          <div class="ui-stat__value">${activeJobs.length}</div>
        </div>
        <div class="ui-card ui-stat">
          <span class="ui-stat__label">Rating</span>
          <div class="ui-stat__value" style="display:flex;align-items:center;gap:4px;">
            <i data-lucide="star" class="lucide-sm" style="color:var(--marigold-500);fill:var(--marigold-500);"></i>
            <span>${Number(worker.ratingAverage || 4.8).toFixed(1)}</span>
          </div>
        </div>
      </div>

      <!-- Verification Stepper: Signature Feature from Section 6.7 -->
      <div class="ui-card ui-card--pad" style="margin-bottom: 24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <h3 style="font-size:1.1rem;font-weight:700;margin:0;color:var(--ink);">Your Verification</h3>
            <p class="ui-muted" style="font-size:var(--fs-xs);margin:2px 0 0;">Transparent security milestones for customer trust</p>
          </div>
          <span class="ui-badge ${isVerified ? 'ui-badge--ok' : 'ui-badge--warn'}">
            <i data-lucide="${isVerified ? 'badge-check' : 'clock'}" class="lucide-xs"></i>
            ${isVerified ? 'Profile Verified' : 'In Review'}
          </span>
        </div>

        <ol class="ui-steps">
          <li class="ui-step is-done">
            <span class="ui-step__dot"><i data-lucide="check" class="lucide-xs"></i></span>
            <div>
              <div class="ui-step__title">Phone Verified</div>
              <div class="ui-step__sub">${esc(worker.phone || '+91 98211 44551')} confirmed via OTP</div>
            </div>
          </li>
          <li class="ui-step is-done">
            <span class="ui-step__dot"><i data-lucide="check" class="lucide-xs"></i></span>
            <div>
              <div class="ui-step__title">Government ID Checked</div>
              <div class="ui-step__sub">Official identity documentation confirmed</div>
            </div>
          </li>
          <li class="ui-step ${isVerified ? 'is-done' : 'is-active'}">
            <span class="ui-step__dot"><i data-lucide="${isVerified ? 'check' : 'clock'}" class="lucide-xs"></i></span>
            <div>
              <div class="ui-step__title">Trade Skill Review</div>
              <div class="ui-step__sub">${isVerified ? 'Trade competence verified' : 'In progress by verification team'}</div>
            </div>
          </li>
          <li class="ui-step ${isVerified ? 'is-done' : ''}">
            <span class="ui-step__dot"><i data-lucide="${isVerified ? 'check' : 'badge-check'}" class="lucide-xs"></i></span>
            <div>
              <div class="ui-step__title">Verified Pro Seal</div>
              <div class="ui-step__sub">${isVerified ? 'Live on marketplace with trust ring' : 'Awaiting final activation'}</div>
            </div>
          </li>
        </ol>
      </div>

      <!-- Pending Requests Section -->
      <div style="margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color:var(--ink);">
            Incoming Requests (${pendingRequests.length})
          </h3>
        </div>

        ${pendingRequests.length === 0 ? `
          <div class="ui-empty ui-card ui-card--pad" style="padding: 2.5rem 1rem;">
            <div class="ui-empty__icon"><i data-lucide="inbox" class="lucide-md"></i></div>
            <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem; color:var(--ink);">No requests yet</h4>
            <p class="ui-muted" style="font-size: 0.85rem; margin: 0;">Keep your availability on and new requests will show up here.</p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${pendingRequests.map(b => `
              <div class="ui-card ui-card--pad request-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div style="flex: 1; min-width: 240px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                    <span class="ui-badge ui-badge--info">${esc(b.serviceCategory?.toUpperCase())}</span>
                    <strong style="font-size: 1.05rem; color:var(--ink);">${esc(b.serviceTask)}</strong>
                    <small class="ui-muted" style="font-size: 0.75rem;">(${esc(b.id)})</small>
                  </div>
                  <p class="ui-muted" style="font-size: 0.85rem; margin-bottom: 4px;">
                    Customer: <strong style="color:var(--ink);">${esc(b.customerName)}</strong> (${esc(b.customerPhone)}) · 📍 ${esc(b.address)} (${esc(b.locality?.toUpperCase())})
                  </p>
                  <p style="font-size: 0.85rem; color: var(--ink); margin-bottom: 6px;">
                    <strong>Scope:</strong> ${esc(b.jobDescription)}
                  </p>
                  <div style="font-size: 0.85rem; color:var(--muted);">
                    Slot: <strong style="color:var(--ink);">${esc(b.appointmentDate)} @ ${esc(b.appointmentTime)}</strong>
                    &nbsp;·&nbsp;
                    Base + Visit: ₹${(b.basePrice || 350) + (b.visitingCharge || 100)}
                    ${b.customerOffer ? `<br><span style="color: var(--peacock-600); font-weight: 700;">💬 Customer Offered: ₹${b.customerOffer}</span>` : ''}
                  </div>
                </div>
                <div class="request-card-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
                  ${this.isAwaitingCustomerCounter(b) ? `
                    <span class="ui-badge ui-badge--warn" title="You sent a counter-offer. The customer must accept it before the job becomes active.">⏳ Counter sent — waiting for customer (₹${b.agreedPrice})</span>
                  ` : `
                    <button class="ui-btn ui-btn--accent ui-btn--sm accept-request-btn" data-id="${esc(b.id)}">
                      Accept Job (₹${b.customerOffer || ((b.basePrice || 350) + (b.visitingCharge || 100))})
                    </button>
                    <button class="ui-btn ui-btn--secondary ui-btn--sm counter-request-btn" data-id="${esc(b.id)}" data-current="${b.customerOffer || ((b.basePrice || 350) + (b.visitingCharge || 100))}">
                      Counter Offer
                    </button>
                  `}
                  <button class="ui-btn ui-btn--danger ui-btn--sm reject-request-btn" data-id="${esc(b.id)}">
                    Decline
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Active Job Controls Section -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color:var(--ink);">
            Active Job Lifecycle Controls (${activeJobs.length})
          </h3>
        </div>

        ${activeJobs.length === 0 ? `
          <div class="ui-empty ui-card ui-card--pad" style="padding: 2.5rem 1rem;">
            <div class="ui-empty__icon"><i data-lucide="briefcase" class="lucide-md"></i></div>
            <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem; color:var(--ink);">No active jobs in progress</h4>
            <p class="ui-muted" style="font-size: 0.85rem; margin: 0;">Accepted jobs will appear here for step-by-step lifecycle management.</p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${activeJobs.map(b => `
              <div class="ui-card ui-card--pad content-card">
                <div class="content-card-header" style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;">
                  <div>
                    <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 2px; color:var(--ink);">
                      ${esc(b.serviceTask)} <small class="ui-muted" style="font-size: 0.75rem;">(${esc(b.id)})</small>
                    </h4>
                    <p class="ui-muted" style="font-size: 0.85rem; margin:2px 0;">
                      Customer: <strong style="color:var(--ink);">${esc(b.customerName)}</strong> (${esc(b.customerPhone)}) · 📍 ${esc(b.address)}
                    </p>
                    <p style="margin-top: 4px; font-weight: 700; color: var(--ink); font-size: 0.9rem;">
                      Confirmed Price: ₹${b.agreedPrice} · Slot: ${esc(b.appointmentDate)} @ ${esc(b.appointmentTime)}
                    </p>
                  </div>
                  <span class="ui-badge ui-badge--ok">${esc(b.status)}</span>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem;">
                  ${b.status === 'Confirmed' ? `
                    <button class="ui-btn ui-btn--secondary ui-btn--sm enroute-job-btn" data-id="${esc(b.id)}"><i data-lucide="truck" class="lucide-xs"></i> I'm On My Way</button>
                  ` : ''}
                  ${b.status === 'Worker en route' ? `
                    <button class="ui-btn ui-btn--secondary ui-btn--sm verify-otp-btn" data-id="${esc(b.id)}"><i data-lucide="shield-check" class="lucide-xs"></i> Verify Customer OTP</button>
                  ` : ''}
                  ${['Confirmed', 'Worker en route', 'Worker arrived'].includes(b.status) ? `
                    <button class="ui-btn ui-btn--accent ui-btn--sm start-job-btn" data-id="${esc(b.id)}"><i data-lucide="play" class="lucide-xs"></i> Start Job</button>
                  ` : ''}
                  ${b.status === 'Job in progress' ? `
                    <button class="ui-btn ui-btn--accent ui-btn--sm complete-job-btn" data-id="${esc(b.id)}"><i data-lucide="circle-check" class="lucide-xs"></i> Complete Job</button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  },

  renderUsefulChartSVG(mode = 'earnings') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Realistic monthly earnings (in thousands) or job counts
    const earningsData = [8.5, 11.2, 9.8, 14.5, 12.0, 16.8, 15.2, 18.0, 21.5, 19.8, 22.4, 24.0];
    const jobsData     = [12, 16, 14, 21, 18, 24, 22, 26, 31, 28, 32, 35];

    const data = mode === 'earnings' ? earningsData : jobsData;
    const maxVal = mode === 'earnings' ? 25 : 40;

    // SVG dimensions: 540x190
    // X coordinates: 40 to 520 (step 43.6)
    const points = data.map((val, i) => {
      const x = 40 + i * 43.6;
      const y = 170 - (val / maxVal) * 140;
      return { x, y, val, month: months[i] };
    });

    const pathD = points.reduce((acc, p, i, a) => {
      if (i === 0) return `M ${p.x},${p.y}`;
      const prev = a[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `${acc} C ${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x},170 L ${points[0].x},170 Z`;

    const highlightPoint = points[points.length - 1]; // Latest month

    return `
      <svg viewBox="0 0 540 190" style="width: 100%; height: 100%; overflow: visible;" id="useful-trend-svg">
        <defs>
          <linearGradient id="usefulGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ea580c" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#ea580c" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Horizontal Guides -->
        <g stroke="var(--border-light, #f1f3f5)" stroke-dasharray="3,3" stroke-width="1">
          <line x1="35" y1="30" x2="525" y2="30" />
          <line x1="35" y1="65" x2="525" y2="65" />
          <line x1="35" y1="100" x2="525" y2="100" />
          <line x1="35" y1="135" x2="525" y2="135" />
          <line x1="35" y1="170" x2="525" y2="170" />
        </g>

        <!-- Y Axis Labels -->
        <g font-size="9" fill="var(--text-muted, #9ca3af)" font-family="Inter, sans-serif" text-anchor="end">
          <text x="30" y="33">${mode === 'earnings' ? '₹25k' : '40'}</text>
          <text x="30" y="68">${mode === 'earnings' ? '₹20k' : '30'}</text>
          <text x="30" y="103">${mode === 'earnings' ? '₹15k' : '20'}</text>
          <text x="30" y="138">${mode === 'earnings' ? '₹10k' : '10'}</text>
          <text x="30" y="173">0</text>
        </g>

        <!-- Area fill under line -->
        <path d="${areaD}" fill="url(#usefulGrad)" />

        <!-- Main Trend Line -->
        <path d="${pathD}" fill="none" stroke="#ea580c" stroke-width="2.8" stroke-linecap="round" />

        <!-- Data dots -->
        ${points.map((p, idx) => `
          <circle cx="${p.x}" cy="${p.y}" r="${idx === points.length - 1 ? 5 : 3}" fill="${idx === points.length - 1 ? '#ea580c' : '#ffffff'}" stroke="#ea580c" stroke-width="2" />
        `).join('')}

        <!-- X Axis Month Labels -->
        <g font-size="9.5" fill="var(--text-muted, #9ca3af)" font-family="Inter, sans-serif" text-anchor="middle">
          ${points.map((p, idx) => `
            <text x="${p.x}" y="184" ${idx === points.length - 1 ? 'font-weight="700" fill="var(--text-primary)"' : ''}>${p.month}</text>
          `).join('')}
        </g>
      </svg>

      <!-- Active Floating Milestone Tooltip -->
      <div class="dash-tooltip-box" style="left: 96%; top: ${highlightPoint.y}px;">
        <div style="font-weight: 700; color: #fff;">${highlightPoint.month}: ${mode === 'earnings' ? `₹${highlightPoint.val}k` : `${highlightPoint.val} Jobs`}</div>
        <div style="font-size: 0.7rem; color: #fed7aa;">Highest milestone reached!</div>
      </div>
    `;
  },

  // ------------------------------------------------------------------------
  // 2. WORKER INCOME & PAYOUT DASHBOARD
  // ------------------------------------------------------------------------
  renderEarningsDashboardView(workerId) {
    const data = WorkerEarnings.renderEarningsDashboard(workerId);
    const { stats, insights, transactions, earnings, mostProfitable } = data;
    const worker = StorageService.getWorkers().find(w => w.id === workerId);

    const totalGross = Number(earnings?.totalEarnings || 0);
    const netTakeHome = Number(earnings?.netEarnings || (totalGross * 0.85));
    const platformFeeTotal = totalGross - netTakeHome;
    const completedJobsList = earnings?.completedJobs || [];
    const totalJobsCount = completedJobsList.length;
    const avgJob = totalJobsCount > 0 ? (totalGross / totalJobsCount) : Number(earnings?.avgPerJob || 0);
    const thisMonth = Number(earnings?.monthEarnings || 0);
    const thisWeek = Number(earnings?.weekEarnings || 0);
    const today = Number(earnings?.todayEarnings || 0);

    // Calculate 7-day trend
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const dayEarnings = [0, 0, 0, 0, 0, 0, 0];
    completedJobsList.forEach(job => {
      const d = new Date(job.completedAt || job.createdAt || Date.now());
      const dayIdx = (d.getDay() + 6) % 7; // Mon=0, Sun=6
      dayEarnings[dayIdx] += Number(job.agreedPrice || 0);
    });

    const sumDays = dayEarnings.reduce((a, b) => a + b, 0);
    if (sumDays === 0 && totalGross > 0) {
      const todayIdx = (now.getDay() + 6) % 7;
      dayEarnings[todayIdx] = totalGross;
    }

    const maxDayVal = Math.max(...dayEarnings, 1200);

    // Service category breakdown
    const categoryTotals = {};
    completedJobsList.forEach(b => {
      const cat = b.serviceCategory || (worker?.category) || 'General Service';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(b.agreedPrice || 0);
    });
    if (Object.keys(categoryTotals).length === 0 && worker) {
      const defaultCat = worker.category ? (worker.category.charAt(0).toUpperCase() + worker.category.slice(1)) : 'Home Services';
      categoryTotals[defaultCat] = totalGross;
    }

    const totalCatRevenue = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;
    const categoryColors = ['#1a3300', '#0284c7', '#d97706', '#16a34a', '#9333ea'];

    const ratingVal = (worker?.ratingAverage || 4.9).toFixed(1);

    return `
      <div class="earnings-dashboard-wrapper" style="display:flex;flex-direction:column;gap:1.5rem;padding-bottom:2rem;">
        
        <!-- Header & Action Toolbar -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;border-bottom:1px solid var(--border-color);padding-bottom:1.25rem;">
          <div>
            <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(26,51,0,0.08);color:var(--text-primary);padding:3px 10px;border-radius:9999px;font-size:0.75rem;font-weight:700;margin-bottom:6px;border:1px solid rgba(0,0,0,0.06);">
              🟢 Direct Payouts Active &bull; Zero Platform Surcharge
            </div>
            <h1 style="font-size:clamp(1.5rem,2.5vw,2rem);font-weight:800;margin:0 0 4px 0;letter-spacing:-0.02em;">Income &amp; Performance Analytics</h1>
            <p style="color:var(--text-secondary);font-size:0.9rem;margin:0;">Verified revenue, completed appointments, take-home earnings, and payout ledger.</p>
          </div>
          <div style="display:flex;gap:0.75rem;align-items:center;">
            <button class="btn btn-outline" style="display:inline-flex;align-items:center;gap:6px;padding:0.6rem 1rem;font-weight:600;font-size:0.85rem;" onclick="window.WorkerFrontend.exportCSV('${workerId}')">
              <span>📥</span> Export CSV Report
            </button>
          </div>
        </div>

        <!-- 4 Key Metric Cards (Clean Responsive Grid) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;">
          <!-- Net Revenue -->
          <div class="metric-card" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
              <span style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">Total Take-Home</span>
              <span style="width:36px;height:36px;border-radius:50%;background:#e0f2fe;color:#0284c7;display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;">💰</span>
            </div>
            <div style="font-size:1.85rem;font-weight:800;color:var(--text-primary);letter-spacing:-0.03em;">₹${Math.round(netTakeHome).toLocaleString('en-IN')}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;display:flex;align-items:center;gap:4px;">
              <span>Gross: ₹${Math.round(totalGross).toLocaleString('en-IN')}</span> &bull; <span>100% Payout Rate</span>
            </div>
          </div>

          <!-- This Month -->
          <div class="metric-card" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
              <span style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">This Month</span>
              <span style="width:36px;height:36px;border-radius:50%;background:#fef3c7;color:#d97706;display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;">📅</span>
            </div>
            <div style="font-size:1.85rem;font-weight:800;color:var(--text-primary);letter-spacing:-0.03em;">₹${Math.round(thisMonth).toLocaleString('en-IN')}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;">
              ${totalJobsCount} verified jobs completed
            </div>
          </div>

          <!-- Average Ticket -->
          <div class="metric-card" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
              <span style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">Avg. Ticket Value</span>
              <span style="width:36px;height:36px;border-radius:50%;background:#dcfce7;color:#16a34a;display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;">⚡</span>
            </div>
            <div style="font-size:1.85rem;font-weight:800;color:var(--text-primary);letter-spacing:-0.03em;">₹${Math.round(avgJob).toLocaleString('en-IN')}</div>
            <div style="font-size:0.75rem;color:#16a34a;font-weight:600;margin-top:0.5rem;">
              +12% vs Mumbai locality avg
            </div>
          </div>

          <!-- Quality Score -->
          <div class="metric-card" style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
              <span style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;">Client Rating</span>
              <span style="width:36px;height:36px;border-radius:50%;background:#f3e8ff;color:#9333ea;display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;">⭐</span>
            </div>
            <div style="font-size:1.85rem;font-weight:800;color:var(--text-primary);letter-spacing:-0.03em;">${ratingVal} <span style="font-size:1.1rem;color:#f59e0b;">★</span></div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;">
              100% on-time arrival rate
            </div>
          </div>
        </div>

        <!-- Analytical Charts Row (2 Columns: 7-Day Trend + Revenue Split) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1.5rem;">
          
          <!-- Chart 1: 7-Day Revenue Velocity (SVG Bar Chart) -->
          <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
              <div>
                <h3 style="font-size:1.05rem;font-weight:700;margin:0 0 2px 0;">7-Day Earnings Trend</h3>
                <p style="font-size:0.8rem;color:var(--text-secondary);margin:0;">Daily breakdown of verified completed service jobs</p>
              </div>
              <span style="font-size:0.75rem;font-weight:700;color:var(--color-forest-ink,#1a3300);background:var(--color-highlighter-yellow,#ffe95c);padding:2px 8px;border-radius:4px;">Weekly Velocity</span>
            </div>

            <!-- SVG Responsive Bar Chart -->
            <div style="width:100%;overflow-x:auto;">
              <svg viewBox="0 0 520 200" width="100%" height="190" style="display:block;min-width:320px;">
                <defs>
                  <linearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#1a3300" />
                    <stop offset="100%" stop-color="#2d5a00" />
                  </linearGradient>
                  <linearGradient id="barGradStandard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#0284c7" />
                    <stop offset="100%" stop-color="#38bdf8" />
                  </linearGradient>
                </defs>

                <!-- Guideline Lines -->
                <line x1="40" y1="30" x2="500" y2="30" stroke="var(--border-color)" stroke-dasharray="3,3" opacity="0.6"/>
                <text x="32" y="34" font-size="10" font-family="Inter,sans-serif" fill="var(--text-muted)" text-anchor="end">₹${Math.round(maxDayVal)}</text>
                
                <line x1="40" y1="95" x2="500" y2="95" stroke="var(--border-color)" stroke-dasharray="3,3" opacity="0.6"/>
                <text x="32" y="99" font-size="10" font-family="Inter,sans-serif" fill="var(--text-muted)" text-anchor="end">₹${Math.round(maxDayVal / 2)}</text>

                <line x1="40" y1="160" x2="500" y2="160" stroke="var(--border-color)" stroke-width="1.5"/>
                <text x="32" y="164" font-size="10" font-family="Inter,sans-serif" fill="var(--text-muted)" text-anchor="end">₹0</text>

                <!-- Dynamic Daily Bars -->
                ${dayNames.map((day, idx) => {
                  const val = dayEarnings[idx];
                  const barH = val > 0 ? Math.max((val / maxDayVal) * 125, 12) : 6;
                  const x = 55 + idx * 64;
                  const y = 160 - barH;
                  const isToday = ((now.getDay() + 6) % 7) === idx;
                  const fill = isToday ? 'url(#barGradActive)' : (val > 0 ? 'url(#barGradStandard)' : 'rgba(0,0,0,0.06)');

                  return `
                    <g style="cursor:pointer;">
                      <title>${day}: ₹${val.toFixed(2)}</title>
                      <rect x="${x}" y="${y}" width="38" height="${barH}" rx="6" fill="${fill}">
                        <animate attributeName="height" from="0" to="${barH}" dur="0.5s" fill="freeze" />
                        <animate attributeName="y" from="160" to="${y}" dur="0.5s" fill="freeze" />
                      </rect>
                      ${val > 0 ? `<text x="${x + 19}" y="${y - 6}" font-size="10" font-family="Inter,sans-serif" font-weight="700" fill="var(--text-primary)" text-anchor="middle">₹${Math.round(val)}</text>` : ''}
                      <text x="${x + 19}" y="180" font-size="11" font-family="Inter,sans-serif" font-weight="${isToday ? '800' : '600'}" fill="${isToday ? 'var(--text-primary)' : 'var(--text-secondary)'}" text-anchor="middle">${day}</text>
                    </g>
                  `;
                }).join('')}
              </svg>
            </div>
          </div>

          <!-- Chart 2: Category Revenue Breakdown & Payout Health -->
          <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:1.5rem;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
                <div>
                  <h3 style="font-size:1.05rem;font-weight:700;margin:0 0 2px 0;">Revenue by Service Type</h3>
                  <p style="font-size:0.8rem;color:var(--text-secondary);margin:0;">Where your primary income is generated</p>
                </div>
                <span style="font-size:0.8rem;font-weight:700;color:var(--text-primary);background:var(--bg-secondary);padding:3px 8px;border-radius:6px;">Distribution</span>
              </div>

              <!-- Category Progress Bars -->
              <div style="display:flex;flex-direction:column;gap:1rem;margin-bottom:1.5rem;">
                ${Object.entries(categoryTotals).map(([cat, amount], i) => {
                  const pct = Math.round((amount / totalCatRevenue) * 100);
                  const color = categoryColors[i % categoryColors.length];
                  return `
                    <div>
                      <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px;">
                        <span style="font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
                          <span style="width:8px;height:8px;border-radius:50%;background:${color};"></span>
                          ${cat}
                        </span>
                        <span style="font-weight:700;color:var(--text-primary);">₹${Math.round(amount).toLocaleString('en-IN')} (${pct}%)</span>
                      </div>
                      <div style="height:8px;border-radius:9999px;background:var(--bg-secondary);overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${color};border-radius:9999px;transition:width 0.6s ease;"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Payout Health Box -->
            <div style="background:rgba(2,132,199,0.06);border:1px solid rgba(2,132,199,0.2);border-radius:8px;padding:0.9rem;display:flex;align-items:center;gap:0.75rem;">
              <span style="font-size:1.5rem;">🛡️</span>
              <div style="font-size:0.8rem;color:var(--text-secondary);line-height:1.4;">
                <strong style="color:var(--text-primary);display:block;margin-bottom:2px;">LocalKaam 85% Take-Home Promise</strong>
                Zero hidden booking cuts. 100% of customer tips and verified extras transfer straight to your bank UPI.
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Transactions & Settlement Ledger -->
        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <h3 style="font-size:1.1rem;font-weight:800;margin:0 0 2px 0;">Settlement &amp; Job Transactions</h3>
              <p style="font-size:0.8rem;color:var(--text-secondary);margin:0;">Detailed ledger of verified completed appointments</p>
            </div>
            <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted);background:var(--bg-secondary);padding:4px 10px;border-radius:9999px;">
              ${transactions.length} Total Records
            </span>
          </div>

          ${transactions.length > 0 ? `
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:0.875rem;text-align:left;">
                <thead>
                  <tr style="border-bottom:2px solid var(--border-color);color:var(--text-secondary);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">
                    <th style="padding:0.75rem 0.5rem;">Reference</th>
                    <th style="padding:0.75rem 0.5rem;">Service Task</th>
                    <th style="padding:0.75rem 0.5rem;">Date</th>
                    <th style="padding:0.75rem 0.5rem;text-align:right;">Gross</th>
                    <th style="padding:0.75rem 0.5rem;text-align:right;">Platform Fee</th>
                    <th style="padding:0.75rem 0.5rem;text-align:right;">Net Payout</th>
                    <th style="padding:0.75rem 0.5rem;text-align:center;">Payment</th>
                    <th style="padding:0.75rem 0.5rem;text-align:center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactions.map((t, idx) => {
                    const isPaid = (t.status || '').toLowerCase() === 'paid';
                    const netAmt = t.amount - t.platformFee;
                    return `
                      <tr style="border-bottom:1px solid var(--border-color);transition:background 0.15s;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='transparent'">
                        <td style="padding:0.85rem 0.5rem;font-family:'JetBrains Mono',monospace;font-size:0.8rem;color:var(--text-muted);">${t.id || ('TXN-' + idx)}</td>
                        <td style="padding:0.85rem 0.5rem;font-weight:600;color:var(--text-primary);">${t.service || 'Service Job'}</td>
                        <td style="padding:0.85rem 0.5rem;color:var(--text-secondary);font-size:0.8rem;">${new Date(t.date || Date.now()).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</td>
                        <td style="padding:0.85rem 0.5rem;text-align:right;color:var(--text-secondary);">₹${Number(t.amount || 0).toFixed(2)}</td>
                        <td style="padding:0.85rem 0.5rem;text-align:right;color:var(--text-muted);font-size:0.8rem;">-₹${Number(t.platformFee || 0).toFixed(2)}</td>
                        <td style="padding:0.85rem 0.5rem;text-align:right;font-weight:800;color:#16a34a;">₹${Number(netAmt).toFixed(2)}</td>
                        <td style="padding:0.85rem 0.5rem;text-align:center;font-size:0.8rem;color:var(--text-secondary);">${t.paymentMethod || 'UPI Direct'}</td>
                        <td style="padding:0.85rem 0.5rem;text-align:center;">
                          <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:0.75rem;font-weight:700;${isPaid ? 'background:#dcfce7;color:#166534;' : 'background:#fef3c7;color:#92400e;'}">
                            ${isPaid ? '✓ Paid' : '⏳ Pending'}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding:3rem 1rem;text-align:center;color:var(--text-muted);">
              <div style="font-size:2.5rem;margin-bottom:0.75rem;">📊</div>
              <h4 style="font-size:1rem;font-weight:700;color:var(--text-primary);margin:0 0 4px 0;">No Transaction History Yet</h4>
              <p style="font-size:0.85rem;margin:0;">Completed and verified service jobs will automatically populate your live earnings ledger here.</p>
            </div>
          `}
        </div>

      </div>
    `;
  },

  renderIncomeBarSVG() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const settledHeights = [85, 45, 20, 110, 55, 30, 25, 60, 95, 90, 95, 20];
    const escrowHeights  = [18, 10, 5, 20, 12, 8, 5, 12, 18, 16, 18, 5];

    return `
      <svg viewBox="0 0 540 180" style="width: 100%; height: 100%; overflow: visible;">
        <g stroke="var(--border-light, #f1f3f5)" stroke-dasharray="3,3" stroke-width="1">
          <line x1="35" y1="20" x2="525" y2="20" />
          <line x1="35" y1="60" x2="525" y2="60" />
          <line x1="35" y1="100" x2="525" y2="100" />
          <line x1="35" y1="140" x2="525" y2="140" />
          <line x1="35" y1="160" x2="525" y2="160" />
        </g>
        <g font-size="9" fill="var(--text-muted, #9ca3af)" font-family="Inter, sans-serif" text-anchor="end">
          <text x="30" y="24">₹25k</text>
          <text x="30" y="64">₹15k</text>
          <text x="30" y="104">₹10k</text>
          <text x="30" y="144">₹5k</text>
          <text x="30" y="164">0</text>
        </g>
        <g>
          ${months.map((m, i) => {
            const x = 45 + i * 40;
            const sH = settledHeights[i];
            const eH = escrowHeights[i];
            const sY = 160 - sH;
            const eY = sY - eH;
            return `
              <rect x="${x - 1}" y="20" width="18" height="140" rx="3" fill="rgba(234, 88, 12, 0.04)" />
              <rect x="${x}" y="${eY}" width="16" height="${eH}" rx="2" fill="rgba(239, 68, 68, 0.35)" />
              <rect x="${x}" y="${sY}" width="16" height="${sH}" rx="3" fill="#ea580c" />
              <text x="${x + 8}" y="174" font-size="9.5" fill="var(--text-muted, #9ca3af)" text-anchor="middle">${m}</text>
            `;
          }).join('')}
        </g>
      </svg>
    `;
  },

  // ------------------------------------------------------------------------
  // 3. OTHER CORE VIEWS (CLEAN & ERROR-FREE)
  // ------------------------------------------------------------------------
  renderActiveJobsView(worker, bookings) {
    const active = bookings.filter(b => !['Pending confirmation', 'Pending', 'Job completed', 'Cancelled', 'Disputed'].includes(b.status));
    return `
      <div class="dash-wrapper">
        <div class="dash-top-bar">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; margin: 0;">Active Projects &amp; Jobs (${active.length})</h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">Step-by-step job progress: On My Way ➔ Arrived ➔ Start ➔ Complete</p>
          </div>
        </div>
        <div class="dash-card">
          <div class="table-container" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Service Task</th>
                  <th>Customer &amp; Location</th>
                  <th>Appointment Slot</th>
                  <th>Agreed Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${active.length === 0 ? `
                  <tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No active jobs in progress. Accepted booking requests appear here.</td></tr>
                ` : active.map(b => `
                  <tr>
                    <td><strong>${esc(b.id)}</strong></td>
                    <td><strong>${esc(b.serviceTask)}</strong></td>
                    <td>
                      <strong>${esc(b.customerName)}</strong> (${esc(b.customerPhone)})<br>
                      <small style="color: var(--text-muted);">📍 ${esc(b.address)}</small>
                    </td>
                    <td>${esc(b.appointmentDate)} @ ${esc(b.appointmentTime)}</td>
                    <td><strong style="color: #ea580c; font-size: 1rem;">₹${b.agreedPrice}</strong></td>
                    <td><span class="badge badge-accepted">${esc(b.status)}</span></td>
                    <td>
                      <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        ${['Confirmed', 'Accepted'].includes(b.status) ? `<button class="btn btn-outline btn-xs enroute-job-btn" data-id="${esc(b.id)}"><i data-lucide="truck" class="lucide-xs"></i> En Route</button>` : ''}
                        ${b.status === 'Worker en route' ? `<button class="btn btn-outline btn-xs verify-otp-btn" data-id="${esc(b.id)}"><i data-lucide="shield-check" class="lucide-xs"></i> Verify OTP</button>` : ''}
                        ${b.status === 'Worker arrived' ? `<button class="btn btn-primary btn-xs start-job-btn" data-id="${esc(b.id)}"><i data-lucide="play" class="lucide-xs"></i> Start Job</button>` : ''}
                        ${b.status === 'Job in progress' ? `<button class="btn btn-success btn-xs complete-job-btn" data-id="${esc(b.id)}"><i data-lucide="check-circle" class="lucide-xs"></i> Complete Job</button>` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  renderRequestsView(worker, bookings) {
    const pending = bookings.filter(b => ['Pending confirmation', 'Pending'].includes(b.status));
    return `
      <div class="dash-wrapper">
        <div class="dash-top-bar">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; margin: 0;">Incoming Booking Requests (${pending.length})</h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">Review new job requests from customers and accept or propose counter rates.</p>
          </div>
        </div>
        <div class="dash-card">
          <div class="table-container" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Customer Info</th>
                  <th>Service Task</th>
                  <th>Slot Requested</th>
                  <th>Pricing Offer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${pending.length === 0 ? `
                  <tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No pending booking requests at this time.</td></tr>
                ` : pending.map(b => `
                  <tr>
                    <td><strong>${esc(b.id)}</strong><br><small style="color: var(--text-muted);">${new Date(b.createdAt).toLocaleDateString()}</small></td>
                    <td><strong>${esc(b.customerName)}</strong> (${esc(b.customerPhone)})<br><small style="color: var(--text-muted);">📍 ${esc(b.address)}</small></td>
                    <td>
                      <strong>${esc(b.serviceTask)}</strong><br><small style="color: var(--text-secondary);">${esc(b.jobDescription)}</small>
                      ${b.photoUrl ? `
                        <div class="booking-ai-preview" style="margin-top: 8px;">
                          <img src="${esc(b.photoUrl)}" alt="Job photo" loading="lazy">
                          <div class="ai-info">
                            ${b.aiDiagnosis ? `
                              <h5>🤖 AI Diagnosis: ${esc(b.aiDiagnosis.issue || 'Identified')}</h5>
                              <p>
                                <span class="diagnosis-urgency-badge urgency-${esc(b.aiDiagnosis.urgency || 'medium')}" style="font-size: 0.68rem; padding: 2px 8px;">
                                  ${esc((b.aiDiagnosis.urgency || 'medium').toUpperCase())}
                                </span>
                                ${b.aiDiagnosis.estimated_duration_minutes ? ` · ~${b.aiDiagnosis.estimated_duration_minutes} min` : ''}
                              </p>
                              ${b.aiDiagnosis.safety_warning ? `<p style="color: var(--color-danger); font-weight: 700; margin-top: 4px;">⚠️ ${esc(b.aiDiagnosis.safety_warning)}</p>` : ''}
                              ${Array.isArray(b.aiDiagnosis.likely_materials) && b.aiDiagnosis.likely_materials.length ? `
                                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
                                  <span style="font-size:0.72rem;color:var(--text-muted);font-weight:700;">Materials:</span>
                                  ${b.aiDiagnosis.likely_materials.map(m => `<span class="material-chip" style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:9999px;padding:2px 8px;font-size:0.7rem;font-weight:600;">${esc(m)}</span>`).join('')}
                                </div>
                              ` : ''}
                            ` : `<h5>📸 Photo attached</h5>`}
                          </div>
                        </div>
                      ` : ''}
                    </td>
                    <td>${esc(b.appointmentDate)} @ ${esc(b.appointmentTime)}</td>
                    <td>
                      <div>Standard: ₹${(b.basePrice || 350) + (b.visitingCharge || 100)}</div>
                      ${b.customerOffer ? `<strong style="color: #ea580c; font-size: 0.95rem;">Offer: ₹${b.customerOffer}</strong>` : ''}
                      ${b.aiDiagnosis && b.aiDiagnosis.price_min ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">AI est: ₹${b.aiDiagnosis.price_min}–₹${b.aiDiagnosis.price_max}</div>` : ''}
                    </td>
                    <td>
                      <div style="display: flex; gap: 4px;">
                        ${this.isAwaitingCustomerCounter(b) ? `
                          <span class="badge badge-pending" title="You sent a counter-offer. The customer must accept it before the job becomes active.">⏳ Waiting for customer (₹${b.agreedPrice})</span>
                        ` : `
                          <button class="btn btn-primary btn-xs accept-request-btn" data-id="${esc(b.id)}">Accept</button>
                          <button class="btn btn-outline btn-xs counter-request-btn" data-id="${esc(b.id)}" data-current="${b.customerOffer || ((b.basePrice || 350) + (b.visitingCharge || 100))}">Counter</button>
                        `}
                        <button class="btn btn-danger btn-xs reject-request-btn" data-id="${esc(b.id)}">Decline</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  renderClientsView(worker, bookings) {
    const clientMap = {};
    bookings.forEach(b => {
      const key = b.customerPhone || b.customerName;
      if (!clientMap[key]) {
        clientMap[key] = {
          name: b.customerName || 'Customer',
          phone: b.customerPhone || 'N/A',
          locality: b.locality || worker.baseLocality,
          address: b.address || 'Mumbai',
          count: 0,
          total: 0,
          lastService: b.appointmentDate || b.createdAt
        };
      }
      clientMap[key].count += 1;
      clientMap[key].total += (b.agreedPrice || 0);
    });

    const clientsList = Object.values(clientMap);

    return `
      <div class="dash-wrapper">
        <div class="dash-top-bar">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; margin: 0;">Clients Directory (${clientsList.length})</h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">Direct customer records, appointment history, and communication.</p>
          </div>
        </div>
        <div class="dash-card">
          <div class="table-container" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Phone</th>
                  <th>Locality &amp; Address</th>
                  <th>Total Jobs</th>
                  <th>Total Spent</th>
                  <th>Direct Contact</th>
                </tr>
              </thead>
              <tbody>
                ${clientsList.length === 0 ? `
                  <tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No client records yet.</td></tr>
                ` : clientsList.map(c => `
                  <tr>
                    <td><strong>${esc(c.name)}</strong></td>
                    <td>${esc(c.phone)}</td>
                    <td>${esc(c.locality?.toUpperCase() || 'MUMBAI')}<br><small style="color: var(--text-muted);">${esc(c.address)}</small></td>
                    <td><span class="badge" style="background: var(--bg-secondary);">${c.count} bookings</span></td>
                    <td><strong>₹${c.total.toLocaleString('en-IN')}</strong></td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        <a href="tel:${esc(c.phone)}" class="btn btn-outline btn-xs" style="text-decoration: none;"><i data-lucide="phone" class="lucide-xs"></i> Call</a>
                        <a href="https://wa.me/${esc(c.phone.replace(/[^0-9]/g, ''))}" target="_blank" class="btn btn-outline btn-xs" style="text-decoration: none;"><i data-lucide="message-circle" class="lucide-xs"></i> WhatsApp</a>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // Effective specialities: fall back to category/hourlyRate/skills when the
  // stored object is empty (Supabase rows only carry category + hourly_rate).
  getEffectiveSpecialities(worker) {
    const specialities = worker.specialities || {};
    if (specialities && Object.keys(specialities).length) return specialities;
    const fallbackKey = worker.category || 'general';
    return {
      [fallbackKey]: {
        tasks: (Array.isArray(worker.skills) && worker.skills.length ? worker.skills : ['General Repair']),
        pricingMethod: 'hourly',
        startingPrice: Number(worker.hourlyRate || worker.hourly_rate) || 350,
        visitingCharge: 100,
        estDuration: '1-2 hours',
        experience: Number(worker.experience) || 1
      }
    };
  },

  renderServicesView(worker) {
    const specialities = this.getEffectiveSpecialities(worker);
    const specEntries = Object.entries(specialities);
    const hasOwn = Boolean(worker.specialities && Object.keys(worker.specialities).length);
    const availableCats = CATEGORIES.filter(c => !specialities[c.id]);

    return `
      <div class="dash-wrapper">
        <div class="dash-top-bar">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; margin: 0;">Services &amp; Pricing Tiers</h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">Set starting rates, hourly charges, and visiting fees.${hasOwn ? '' : ' Saving will store these as your own services.'}</p>
          </div>
        </div>
        ${specEntries.length === 0 ? `
          <div class="ui-empty ui-card ui-card--pad" style="padding: 2.5rem 1rem; text-align: center;">
            <div class="ui-empty__icon"><i data-lucide="wrench" class="lucide-md"></i></div>
            <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem;">No services yet</h4>
            <p class="ui-muted" style="font-size: 0.85rem; margin: 0;">Add a service below to start receiving bookings.</p>
          </div>
        ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
          ${specEntries.map(([catKey, info]) => {
            const catObj = CATEGORIES.find(c => c.id === catKey);
            return `
              <div class="dash-card">
                <div class="dash-card-header">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="display:inline-flex;align-items:center;gap:8px;"><i data-lucide="${catObj?.lucideIcon || 'wrench'}" class="lucide-sm"></i></span>
                    <div>
                      <h3>${esc(catObj?.name || catKey.toUpperCase())}</h3>
                      <p class="dash-card-sub">${info.pricingMethod || 'Hourly'} Pricing</p>
                    </div>
                  </div>
                  <span class="badge badge-accepted">Active</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0;">
                  <div>
                    <label class="form-label">Starting rate (₹/hr)</label>
                    <input type="number" class="form-control service-start-input" data-cat="${esc(catKey)}" value="${info.startingPrice || 350}" min="50" max="10000">
                  </div>
                  <div>
                    <label class="form-label">Visiting charge (₹)</label>
                    <input type="number" class="form-control service-visit-input" data-cat="${esc(catKey)}" value="${info.visitingCharge || 100}" min="0" max="5000">
                  </div>
                </div>
                <div style="display: flex; justify-content: flex-end;">
                  <button type="button" class="btn btn-primary btn-sm save-service-btn" data-cat="${esc(catKey)}">Save</button>
                </div>
                <div style="margin-top: 10px; border-top: 1px solid var(--border-light); padding-top: 10px;">
                  <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">ACTIVE TASKS:</span>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                    ${(info.tasks || ['General Repair']).map(t => `<span class="badge" style="background: var(--bg-secondary);">${esc(t)}</span>`).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        `}
        <div class="dash-card" style="margin-top: 1.5rem;">
          <h3 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 8px;">Add a service</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px;">Choose a category and set your rates to receive bookings for it.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; align-items: end;">
            <div>
              <label class="form-label">Category</label>
              <select id="new-service-category" class="form-select">
                ${availableCats.length ? availableCats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('') : '<option value="">All categories added</option>'}
              </select>
            </div>
            <div>
              <label class="form-label">Starting rate (₹/hr)</label>
              <input id="new-service-start" type="number" class="form-control" value="350" min="50" max="10000">
            </div>
            <div>
              <label class="form-label">Visiting charge (₹)</label>
              <input id="new-service-visit" type="number" class="form-control" value="100" min="0" max="5000">
            </div>
            <div>
              <button type="button" class="btn btn-primary btn-sm" id="add-service-btn" ${availableCats.length ? '' : 'disabled'} style="width: 100%;">Add service</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  attachServicesEvents(container, worker) {
    container.querySelectorAll('.save-service-btn').forEach(btn => {
      btn.onclick = () => {
        const cat = btn.getAttribute('data-cat');
        const startEl = container.querySelector(`.service-start-input[data-cat="${CSS.escape(cat)}"]`);
        const visitEl = container.querySelector(`.service-visit-input[data-cat="${CSS.escape(cat)}"]`);
        const startingPrice = Math.max(50, Math.min(10000, parseFloat(startEl?.value) || 350));
        const visitingCharge = Math.max(0, Math.min(5000, parseFloat(visitEl?.value) || 0));
        const workers = StorageService.getWorkers();
        const target = workers.find(w => w.id === worker.id);
        if (!target) return;
        target.specialities = { ...(target.specialities || {}), ...(this.getEffectiveSpecialities(target)) };
        target.specialities[cat] = {
          ...(target.specialities[cat] || {}),
          pricingMethod: 'hourly',
          startingPrice,
          visitingCharge
        };
        if (!Object.keys(target.specialities).length) {
          target.specialities[cat] = { tasks: ['General Repair'], pricingMethod: 'hourly', startingPrice, visitingCharge };
        }
        if (cat && !target.skills) target.skills = [];
        if (target.category !== cat) target.category = target.category || cat;
        StorageService.saveWorkers(workers);
        StorageService.setSelectedWorkerId(target.id);
        Toast.show('Service pricing saved.', 'success');
        if (container && container.isConnected) this.render(container);
      };
    });

    container.querySelector('#add-service-btn')?.addEventListener('click', () => {
      const cat = container.querySelector('#new-service-category')?.value;
      if (!cat) { Toast.show('All categories are already added.', 'info'); return; }
      const startingPrice = Math.max(50, Math.min(10000, parseFloat(container.querySelector('#new-service-start')?.value) || 350));
      const visitingCharge = Math.max(0, Math.min(5000, parseFloat(container.querySelector('#new-service-visit')?.value) || 0));
      const catObj = CATEGORIES.find(c => c.id === cat);
      const workers = StorageService.getWorkers();
      const target = workers.find(w => w.id === worker.id);
      if (!target) return;
      target.specialities = { ...(target.specialities || {}), ...(this.getEffectiveSpecialities(target)) };
      target.specialities[cat] = {
        tasks: catObj ? catObj.subcategories : ['General Repair'],
        pricingMethod: 'hourly',
        startingPrice,
        visitingCharge,
        estDuration: '1-2 hours',
        experience: 5
      };
      if (!target.skills) target.skills = [];
      if (!target.skills.includes(cat)) target.skills = [...target.skills, cat];
      if (!target.category) target.category = cat;
      StorageService.saveWorkers(workers);
      StorageService.setSelectedWorkerId(target.id);
      Toast.show(`${catObj?.name || cat} service added.`, 'success');
      if (container && container.isConnected) this.render(container);
    });
  },

  renderScheduleView(worker) {
    const isOnline = worker.available && !worker.pauseNewBookings;

    return `
      <div class="dash-wrapper">
        <div class="dash-top-bar">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; margin: 0;">Schedule &amp; Working Hours</h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">Set daily shifts, temporary breaks, and coverage radius.</p>
          </div>
          <button class="btn ${isOnline ? 'btn-primary' : 'btn-outline'} btn-sm" id="toggle-online-status">
            <i data-lucide="power" class="lucide-xs"></i> ${isOnline ? 'You Are Online' : 'You Are Offline'}
          </button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 2px;">Pause New Bookings</h3>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">Temporarily pause new requests while you finish existing jobs.</p>
          </div>
          <button class="btn ${worker.pauseNewBookings ? 'btn-danger' : 'btn-outline'} btn-sm" id="toggle-pause-bookings">
            <i data-lucide="pause-circle" class="lucide-xs"></i> ${worker.pauseNewBookings ? 'Bookings Paused' : 'Accepting Requests'}
          </button>
        </div>

        <div>
          <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.75rem;">Daily Working Hours</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
            <div>
              <label class="form-label">Shift Start Time</label>
              <input type="time" id="work-start" class="form-control" value="${esc(worker.workingHours?.start || '09:00')}">
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-secondary); border-radius: 12px;">
              <div>
                <strong>Pause New Bookings</strong>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin: 2px 0 0;">Temporarily finish current jobs</p>
              </div>
              <button class="btn ${worker.pauseNewBookings ? 'btn-danger' : 'btn-outline'} btn-sm" id="toggle-pause-bookings">
                ${worker.pauseNewBookings ? '⏸️ Paused' : '▶️ Active'}
              </button>
            </div>
          </div>

          <div class="dash-card">
            <h3>Working Shifts &amp; Area</h3>
            <form id="schedule-settings-form" style="display: flex; flex-direction: column; gap: 1rem;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                  <label class="form-label">Shift Start Time</label>
                  <input type="time" id="work-start" class="form-control" value="${esc(worker.workingHours?.start || '09:00')}">
                </div>
                <div>
                  <label class="form-label">Shift End Time</label>
                  <input type="time" id="work-end" class="form-control" value="${esc(worker.workingHours?.end || '19:00')}">
                </div>
              </div>
              <div>
                <label class="form-label">Service Area Description</label>
                <input type="text" id="sched-area" class="form-control" value="${esc(worker.serviceArea || 'Andheri, Bandra & Juhu')}">
              </div>
              <div>
                <label class="form-label">Service Radius (km): <strong id="radius-val">${worker.serviceRadius || 10} km</strong></label>
                <input type="range" id="sched-radius" min="2" max="40" value="${worker.serviceRadius || 10}" style="width: 100%;">
              </div>
              <button type="submit" class="btn btn-primary btn-sm" style="margin-top: 0.5rem;">Save Schedule</button>
            </form>
          </div>

          <!-- Worker Location Picker -->
          <div class="worker-location-picker">
            <h3>📍 Set My Location</h3>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px;">
              Your live GPS location helps customers find you on the map. Drag the marker or use the button below.
            </p>
            <div class="worker-location-map" id="worker-loc-map"></div>
            <div class="worker-location-coords" id="worker-loc-coords">
              ${worker.lat && worker.lng
                ? `<span>📍 Lat: <strong>${Number(worker.lat).toFixed(5)}</strong>, Lng: <strong>${Number(worker.lng).toFixed(5)}</strong></span>`
                : `<span style="color:var(--color-warning);">⚠️ Location not set — you won't appear on customer maps</span>`
              }
            </div>
            <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
              <button class="btn btn-primary btn-sm" id="use-my-location-btn">
                <i data-lucide="navigation" class="lucide-xs"></i> Use My Current Location
              </button>
              <button class="btn btn-outline btn-sm" id="save-worker-location-btn">
                <i data-lucide="save" class="lucide-xs"></i> Save Location
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderFeedbackView(worker) {
    return WorkerFeedback.renderFeedbackSection(worker);
  },



  renderProfileView(worker) {
    return `
      <div class="dash-wrapper">
        <div class="dash-top-bar">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; margin: 0;">My Professional Profile</h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">Update your bio, certifications, and service locality.</p>
          </div>
        </div>

        <form id="worker-full-profile-form" class="dash-card" style="max-width: 800px; display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <div>
              <label class="form-label">Full Name</label>
              <input type="text" id="wp-name" class="form-control" value="${esc(worker.name)}" required>
            </div>
            <div>
              <label class="form-label">Phone Number</label>
              <input type="text" id="wp-phone" class="form-control" value="${esc(worker.phone || '+91 98211 44551')}" required>
            </div>
          </div>

          <div>
            <label class="form-label">Professional Bio</label>
            <textarea id="wp-bio" class="form-control" rows="3" required>${esc(worker.bio || '')}</textarea>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            <div>
              <label class="form-label">Past Experience</label>
              <textarea id="wp-experience" class="form-control" rows="2">${esc(worker.pastExperience || '')}</textarea>
            </div>
            <div>
              <label class="form-label">Certifications / ITI License</label>
              <input type="text" id="wp-certifications" class="form-control" value="${esc(worker.certifications || '')}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
            <div>
              <label class="form-label">Base Locality</label>
              <select id="wp-locality" class="form-select">
                ${LOCALITIES.map(l => `<option value="${esc(l.id)}" ${l.id === worker.baseLocality ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">Service Area</label>
              <input type="text" id="wp-area" class="form-control" value="${esc(worker.serviceArea || '')}" required>
            </div>
            <div>
              <label class="form-label">Service Radius (km)</label>
              <input type="number" id="wp-radius" class="form-control" value="${worker.serviceRadius || 10}" min="1" max="50" required>
            </div>
          </div>

          <div style="padding-top: 0.5rem;">
            <button type="submit" class="btn btn-primary btn-sm">Save Profile Updates</button>
          </div>
        </form>
      </div>
    `;
  },

  // ------------------------------------------------------------------------
  // ONBOARDING VIEW
  // ------------------------------------------------------------------------
  renderOnboarding(container, worker) {
    container.innerHTML = `
      <div class="role-selection-wrapper" style="max-width: 680px; margin: 0 auto; padding: 2rem 1rem;">
        <h1 style="font-size: clamp(1.6rem, 3.5vw, 2.2rem); font-weight: 800; margin-bottom: 0.5rem; text-align: center;">
          Worker Professional Onboarding
        </h1>
        <p style="color: var(--text-secondary); text-align: center; margin-bottom: 1.5rem; font-size: 0.95rem;">
          Complete your profile and specialities to go online and receive customer bookings.
        </p>

        <form id="onboarding-form" style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: var(--radius-xl); padding: clamp(20px, 3.5vw, 36px); display: flex; flex-direction: column; gap: 1.25rem; box-shadow: var(--shadow-card); width: 100%;">
          <h3 style="font-size: 1.1rem; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
            <i data-lucide="user" class="lucide-sm"></i> Step 1 — Basic Profile Information
          </h3>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <label class="form-label">Full Name</label>
              <input type="text" id="ob-name" class="form-control" value="${esc(worker?.name || '')}" placeholder="e.g. Rajesh Kumar" required>
            </div>
            <div>
              <label class="form-label">Phone Number</label>
              <input type="text" id="ob-phone" class="form-control" value="${esc(worker?.phone || '+91 98200 11223')}" required>
            </div>
          </div>

          <div>
            <label class="form-label">Professional Bio</label>
            <textarea id="ob-bio" class="form-control" rows="2" placeholder="Describe your experience and reliability..." required>${esc(worker?.bio || 'Experienced and reliable local service professional in Mumbai.')}</textarea>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div>
              <label class="form-label">Past Experience <small style="color: var(--text-muted);">(Optional)</small></label>
              <textarea id="ob-experience" class="form-control" rows="2" placeholder="e.g. 4 years with residential repairs...">${esc(worker?.pastExperience || '')}</textarea>
            </div>
            <div>
              <label class="form-label">Certifications <small style="color: var(--text-muted);">(Optional)</small></label>
              <input type="text" id="ob-certifications" class="form-control" value="${esc(worker?.certifications || '')}" placeholder="e.g. ITI Certified Electrician">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem;">
            <div>
              <label class="form-label">Base Locality</label>
              <select id="ob-locality" class="form-select">
                ${LOCALITIES.map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">Service Area</label>
              <input type="text" id="ob-area" class="form-control" value="Andheri, Bandra & Juhu" required>
            </div>
            <div>
              <label class="form-label">Radius (km)</label>
              <input type="number" id="ob-radius" class="form-control" value="10" min="1" max="50" required>
            </div>
          </div>

          <h3 style="font-size: 1.1rem; font-weight: 800; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-top: 0.5rem;">
            <i data-lucide="wrench" class="lucide-sm"></i> Step 2 — Select Specialities &amp; Services
          </h3>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem;" id="speciality-checkboxes">
            ${CATEGORIES.map(c => `
              <label style="display: flex; align-items: center; gap: 0.6rem; background: var(--bg-secondary); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1.5px solid var(--border-color); cursor: pointer; transition: all 0.15s ease;">
                <input type="checkbox" name="speciality" value="${esc(c.id)}" style="width: 16px; height: 16px;" ${c.id === 'electrician' ? 'checked' : ''}>
                <div>
                  <div style="font-weight: 600; font-size: 0.85rem;"><i data-lucide="${esc(c.lucideIcon || 'wrench')}" class="lucide-xs"></i> ${esc(c.name)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">From ₹350</div>
                </div>
              </label>
            `).join('')}
          </div>

          <button type="submit" class="btn btn-primary btn-full" style="margin-top: 1rem; padding: 12px; font-size: 1rem;">
            Complete Onboarding &amp; Go Online →
          </button>
        </form>
      </div>
    `;

    container.querySelector('#onboarding-form').onsubmit = (e) => {
      e.preventDefault();
      const name = container.querySelector('#ob-name').value;
      const phone = container.querySelector('#ob-phone').value;
      const bio = container.querySelector('#ob-bio').value;
      const pastExperience = container.querySelector('#ob-experience').value;
      const certifications = container.querySelector('#ob-certifications').value;
      const baseLocality = container.querySelector('#ob-locality').value;
      const serviceArea = container.querySelector('#ob-area').value;
      const serviceRadius = parseFloat(container.querySelector('#ob-radius').value) || 10;

      const selectedSpecs = {};
      container.querySelectorAll('input[name="speciality"]:checked').forEach(chk => {
        const catId = chk.value;
        const catObj = CATEGORIES.find(c => c.id === catId);
        selectedSpecs[catId] = {
          tasks: catObj ? catObj.subcategories : ['General Repair'],
          pricingMethod: 'hourly',
          startingPrice: 350,
          visitingCharge: 100,
          estDuration: '1-2 hours',
          experience: 5
        };
      });

      if (Object.keys(selectedSpecs).length === 0) {
        Toast.show('Please select at least one speciality category.', 'error');
        return;
      }

      const workers = StorageService.getWorkers();
      let targetWorker = workers.find(w => w.id === worker?.id);
      if (!targetWorker) {
        targetWorker = {
          id: `w-${Date.now()}`,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          ratingAverage: 5.0,
          ratingCount: 1,
          verificationStatus: 'Verified'
        };
        workers.push(targetWorker);
      }

      targetWorker.name = name;
      targetWorker.phone = phone;
      targetWorker.bio = bio;
      targetWorker.pastExperience = pastExperience;
      targetWorker.certifications = certifications;
      targetWorker.baseLocality = baseLocality;
      targetWorker.serviceArea = serviceArea;
      targetWorker.serviceRadius = serviceRadius;
      targetWorker.specialities = selectedSpecs;
      targetWorker.skills = Object.keys(selectedSpecs);
      targetWorker.profileCompleted = true;
      targetWorker.available = true;
      targetWorker.pauseNewBookings = false;
      targetWorker.verificationStatus = 'Verified';
      targetWorker.ratingAverage = targetWorker.ratingAverage || 5.0;
      targetWorker.ratingCount = targetWorker.ratingCount || 1;

      StorageService.saveWorkers(workers);
      StorageService.setSelectedWorkerId(targetWorker.id);
      Toast.show('Onboarding completed! You are now online.', 'success');
      this.render(container);
    };
  },

  // ------------------------------------------------------------------------
  // EVENT ATTACHMENTS & CONTROLLERS
  // ------------------------------------------------------------------------
  attachEvents(container) {
    const profileSelect = container.querySelector('#worker-profile-select');
    if (profileSelect) {
      profileSelect.addEventListener('change', (e) => {
        StorageService.setSelectedWorkerId(e.target.value);
        Toast.show('Switched worker profile', 'info');
        this.render(container);
      });
    }

    const createNewBtn = container.querySelector('#create-new-worker-btn');
    if (createNewBtn) {
      createNewBtn.onclick = () => {
        const workers = StorageService.getWorkers();
        const newW = {
          id: `w-${Date.now()}`,
          name: 'New Professional',
          profileCompleted: true,
          specialities: {},
          verificationStatus: 'Pending',
          available: true
        };
        workers.push(newW);
        StorageService.saveWorkers(workers);
        StorageService.setSelectedWorkerId(newW.id);
        this.render(container);
        this.showSetupModal(newW, 1, () => this.render(container));
      };
    }

    // Sidebar navigation clicks
    container.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        this.currentView = view;
        this.activeView = view;
        container.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active', 'dash-active'));
        item.classList.add('active', 'dash-active');

        const workers = StorageService.getWorkers();
        const worker = workers.find(w => w.id === StorageService.getSelectedWorkerId()) || workers[0];
        const allBookings = StorageService.getBookings();
        const bookings = allBookings.filter(b => b.workerId === worker.id);
        const pendingRequests = bookings.filter(b => ['Pending confirmation', 'Pending'].includes(b.status));
        const activeJobs = bookings.filter(b => !['Pending confirmation', 'Pending', 'Job completed', 'Cancelled', 'Disputed'].includes(b.status));
        const completedJobs = bookings.filter(b => b.status === 'Job completed');
        const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

        const mainContent = container.querySelector('#worker-main-content');
        if (mainContent) {
          mainContent.innerHTML = this.renderMainContent(view, worker, pendingRequests, activeJobs, completedJobs, totalEarnings, bookings);
          this.attachViewEvents(view, container, worker);
        if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
        }
      });
    });

    const selectWorkerManageDocsBtn = container.querySelector('#select-worker-manage-docs-btn');
    if (selectWorkerManageDocsBtn) {
      selectWorkerManageDocsBtn.onclick = () => {
        const workers = StorageService.getWorkers();
        const worker = workers.find(w => w.id === StorageService.getSelectedWorkerId()) || workers[0];
        this.showSetupModal(worker, 2, () => this.render(container));
      };
    }

    const openProfileSetupBtn = container.querySelector('#open-profile-setup-btn');
    if (openProfileSetupBtn) {
      openProfileSetupBtn.onclick = () => {
        const workers = StorageService.getWorkers();
        const worker = workers.find(w => w.id === StorageService.getSelectedWorkerId()) || workers[0];
        this.showSetupModal(worker, 1, () => this.render(container));
      };
    }

    const quickToggle = container.querySelector('#quick-toggle-online');
    if (quickToggle) {
      quickToggle.onclick = () => {
        const workers = StorageService.getWorkers();
        const worker = workers.find(w => w.id === StorageService.getSelectedWorkerId());
        if (worker) {
          worker.available = !(worker.available && !worker.pauseNewBookings);
          worker.pauseNewBookings = false;
          StorageService.saveWorkers(workers);
          Toast.show(`Status updated: ${worker.available ? '🟢 Online & Discoverable' : '🔴 Offline / Break'}`, 'info');
          this.render(container);
        }
      };
    }

    const jumpEarnings = container.querySelector('#jump-to-earnings-btn');
    if (jumpEarnings) {
      jumpEarnings.onclick = () => {
        this.currentView = 'earnings';
        this.activeView = 'earnings';
        this.render(container);
      };
    }

    const workers = StorageService.getWorkers();
    const worker = workers.find(w => w.id === StorageService.getSelectedWorkerId()) || workers[0];
    this.attachViewEvents(this.currentView || 'overview', container, worker);
    this.attachActionEvents(container);
        if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
  },

  attachViewEvents(view, container, worker) {
    this.attachActionEvents(container);

    switch (view) {
      case 'overview':
        this.attachOverviewEvents(container, worker);
        break;
      case 'earnings':
      case 'transactions':
        this.attachEarningsEvents(container, worker);
        break;
      case 'services':
        this.attachServicesEvents(container, worker);
        break;
      case 'schedule':
        this.attachScheduleEvents(container, worker);
        break;
      case 'profile':
        this.attachProfileEvents(container, worker);
        break;
      case 'feedback':
        this.attachFeedbackEvents(container, worker);
        break;
      case 'support':
      case 'help-centre':
        this.attachHelpCentreEvents(container, worker);
        break;
      case 'complaints':
        this.attachComplaintEvents(container, worker);
        break;
      default:
        break;
    }
  },

  attachEarningsEvents(container, worker) {
    const csvBtn = container.querySelector('#export-earnings-csv');
    if (csvBtn) {
      csvBtn.onclick = () => {
        this.exportCSV(worker.id);
      };
    }

    const payoutBtn = container.querySelector('#request-payout-btn');
    if (payoutBtn) {
      payoutBtn.onclick = () => {
        this.showPayoutModal(worker);
      };
    }

    const txSearch = container.querySelector('#tx-search-input');
    if (txSearch) {
      txSearch.addEventListener('input', (e) => {
        this.txSearchQuery = e.target.value;
        const mainContent = container.querySelector('#worker-main-content');
        if (mainContent) {
          mainContent.innerHTML = this.renderEarningsDashboardView(worker.id);
          this.attachEarningsEvents(container, worker);
        }
      });
    }

    const txStatus = container.querySelector('#tx-status-filter');
    if (txStatus) {
      txStatus.addEventListener('change', (e) => {
        this.txStatusFilter = e.target.value;
        const mainContent = container.querySelector('#worker-main-content');
        if (mainContent) {
          mainContent.innerHTML = this.renderEarningsDashboardView(worker.id);
          this.attachEarningsEvents(container, worker);
        }
      });
    }

    container.querySelectorAll('.view-receipt-btn').forEach(btn => {
      btn.onclick = () => {
        const txId = btn.getAttribute('data-id');
        const srv = btn.getAttribute('data-service');
        const amt = btn.getAttribute('data-amount');
        this.showReceiptModal(txId, srv, amt, worker);
      };
    });
  },

  attachScheduleEvents(container, worker) {
    const onlineBtn = container.querySelector('#toggle-online-status');
    if (onlineBtn) {
      onlineBtn.onclick = () => {
        const workers = StorageService.getWorkers();
        const w = workers.find(item => item.id === worker.id);
        if (w) {
          w.available = !w.available;
          StorageService.saveWorkers(workers);
          Toast.show(`Discovery status: ${w.available ? 'Online' : 'Offline'}`, 'info');
          this.render(container);
        }
      };
    }

    const pauseBtn = container.querySelector('#toggle-pause-bookings');
    if (pauseBtn) {
      pauseBtn.onclick = () => {
        const workers = StorageService.getWorkers();
        const w = workers.find(item => item.id === worker.id);
        if (w) {
          w.pauseNewBookings = !w.pauseNewBookings;
          StorageService.saveWorkers(workers);
          Toast.show(`New bookings: ${w.pauseNewBookings ? 'Paused' : 'Active'}`, 'info');
          this.render(container);
        }
      };
    }

    const radiusSlider = container.querySelector('#sched-radius');
    const radiusVal = container.querySelector('#radius-val');
    if (radiusSlider && radiusVal) {
      radiusSlider.oninput = () => {
        radiusVal.innerText = `${radiusSlider.value} km`;
      };
    }

    const schedForm = container.querySelector('#schedule-settings-form');
    if (schedForm) {
      schedForm.onsubmit = (e) => {
        e.preventDefault();
        const workers = StorageService.getWorkers();
        const w = workers.find(item => item.id === worker.id);
        if (w) {
          w.workingHours = {
            start: container.querySelector('#work-start').value,
            end: container.querySelector('#work-end').value
          };
          w.serviceArea = container.querySelector('#sched-area').value;
          w.serviceRadius = parseFloat(container.querySelector('#sched-radius').value);
          StorageService.saveWorkers(workers);
          Toast.show('Working shifts & coverage radius updated!', 'success');
        }
      };
    }

    // ---- Worker Location Picker (Leaflet map with draggable marker) ----
    const locMapEl = container.querySelector('#worker-loc-map');
    if (locMapEl && typeof L !== 'undefined') {
      const MUMBAI = [19.0760, 72.8777];
      const initLat = worker.lat || MUMBAI[0];
      const initLng = worker.lng || MUMBAI[1];

      // Fix Leaflet default icon paths for CDN
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const locMap = L.map(locMapEl).setView([initLat, initLng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(locMap);

      const locMarker = L.marker([initLat, initLng], { draggable: true }).addTo(locMap);
      locMarker.bindPopup('📍 Drag me to set your location').openPopup();

      // Store reference for cleanup
      this._workerLocMap = locMap;
      this._workerLocMarker = locMarker;

      const updateCoordsDisplay = (lat, lng) => {
        const coordsEl = container.querySelector('#worker-loc-coords');
        if (coordsEl) {
          coordsEl.innerHTML = `<span>📍 Lat: <strong>${Number(lat).toFixed(5)}</strong>, Lng: <strong>${Number(lng).toFixed(5)}</strong></span>`;
        }
      };

      locMarker.on('dragend', () => {
        const pos = locMarker.getLatLng();
        updateCoordsDisplay(pos.lat, pos.lng);
      });

      // Use My Current Location button
      const useLocBtn = container.querySelector('#use-my-location-btn');
      if (useLocBtn) {
        useLocBtn.onclick = () => {
          if (!navigator.geolocation) {
            Toast.show('Geolocation not supported by your browser', 'error');
            return;
          }
          useLocBtn.disabled = true;
          useLocBtn.textContent = '📡 Getting location...';
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              locMarker.setLatLng([lat, lng]);
              locMap.setView([lat, lng], 15);
              updateCoordsDisplay(lat, lng);
              useLocBtn.disabled = false;
              useLocBtn.innerHTML = '<i data-lucide="navigation" class="lucide-xs"></i> Use My Current Location';
              if (typeof window.refreshIcons === 'function') window.refreshIcons();
              Toast.show('📍 Location captured!', 'success');
            },
            (err) => {
              useLocBtn.disabled = false;
              useLocBtn.innerHTML = '<i data-lucide="navigation" class="lucide-xs"></i> Use My Current Location';
              if (typeof window.refreshIcons === 'function') window.refreshIcons();
              Toast.show(`Location error: ${err.message}`, 'error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        };
      }

      // Save Location button
      const saveLocBtn = container.querySelector('#save-worker-location-btn');
      if (saveLocBtn) {
        saveLocBtn.onclick = () => {
          const pos = locMarker.getLatLng();
          const workers = StorageService.getWorkers();
          const w = workers.find(item => item.id === worker.id);
          if (w) {
            w.lat = pos.lat;
            w.lng = pos.lng;
            w.location = { type: 'Point', coordinates: [pos.lng, pos.lat] };
            StorageService.saveWorkers(workers);

            // Also POST to server
            fetch(`/api/workers/${worker.id}/location`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat: pos.lat, lng: pos.lng })
            }).catch(() => {});

            Toast.show('📍 Location saved! You are now visible on the customer map.', 'success');
          }
        };
      }

      // Fix Leaflet rendering when tab becomes visible
      setTimeout(() => locMap.invalidateSize(), 300);
    }
  },

  attachProfileEvents(container, worker) {
    const profForm = container.querySelector('#worker-full-profile-form');
    if (profForm) {
      profForm.onsubmit = (e) => {
        e.preventDefault();
        const workers = StorageService.getWorkers();
        const w = workers.find(item => item.id === worker.id);
        if (w) {
          w.name = container.querySelector('#wp-name').value;
          w.phone = container.querySelector('#wp-phone').value;
          w.bio = container.querySelector('#wp-bio').value;
          w.pastExperience = container.querySelector('#wp-experience').value;
          w.certifications = container.querySelector('#wp-certifications').value;
          w.baseLocality = container.querySelector('#wp-locality').value;
          w.serviceArea = container.querySelector('#wp-area').value;
          w.serviceRadius = parseFloat(container.querySelector('#wp-radius').value) || 10;
          StorageService.saveWorkers(workers);
          Toast.show('Profile updated successfully!', 'success');
          this.render(container);
        }
      };
    }
  },

  attachFeedbackEvents(container, worker) {
    container.querySelectorAll('.respond-review-btn').forEach(btn => {
      btn.onclick = () => {
        const reviewId = btn.getAttribute('data-review-id');
        this.showReviewResponseModal(reviewId);
      };
    });
  },

  attachHelpCentreEvents(container, worker) {
    const ticketForm = container.querySelector('#worker-support-ticket-form');
    if (ticketForm) {
      ticketForm.onsubmit = (e) => {
        e.preventDefault();
        const subject = container.querySelector('#supp-subject').value;
        const desc = container.querySelector('#supp-desc').value;

        const tickets = StorageService.getSupportTickets();
        tickets.push({
          id: `TKT-${Date.now()}`,
          workerId: worker.id,
          subject,
          description: desc,
          status: 'Open',
          createdAt: new Date().toISOString()
        });
        StorageService.saveSupportTickets(tickets);
        Toast.show('Support ticket submitted!', 'success');
        ticketForm.reset();
      };
    }
  },

  attachComplaintEvents(container, worker) {
    // Complaint filter
    const filterSelect = container.querySelector('#complaint-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', () => {
        this.filterComplaints(filterSelect.value, container);
      });
    }

    // New complaint form
    const complaintForm = container.querySelector('#new-complaint-form');
    if (complaintForm) {
      complaintForm.onsubmit = (e) => {
        e.preventDefault();
        const category = container.querySelector('#complaint-category').value;
        const bookingId = container.querySelector('#complaint-booking-id').value;
        const details = container.querySelector('#complaint-details').value;

        if (!bookingId.trim() || !details.trim()) {
          Toast.show('Please fill in all required fields', 'error');
          return;
        }

        const complaint = {
          id: `CMP-${Date.now()}`,
          bookingId: bookingId,
          workerId: worker.id,
          customerId: null,
          customerName: worker.name,
          category: category,
          issue: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          details: details,
          status: 'Open',
          createdAt: new Date().toISOString()
        };

        const complaints = StorageService.getComplaints();
        complaints.push(complaint);
        StorageService.saveComplaints(complaints);
        Toast.show('Complaint submitted!', 'success');
        complaintForm.reset();
        this.filterComplaints('all', container);
      };
    }
  },

  filterComplaints(filter, container) {
    const complaints = StorageService.getComplaints();
    const listDiv = container.querySelector('#complaints-list');
    if (!listDiv) return;

    let filtered = complaints;
    if (filter !== 'all') {
      filtered = complaints.filter(c => c.status.toLowerCase() === filter);
    }

    listDiv.innerHTML = filtered.length === 0 ? `
      <p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No complaints found.</p>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 500px; overflow-y: auto;">
        ${filtered.map(c => `
          <div key="${c.id}" style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
              <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${esc(c.issue)}</h4>
              <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.25rem;">${esc(c.details || 'No details provided')}</p>
              <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.25rem;">${new Date(c.createdAt).toLocaleDateString()} • Status: <span class="badge" style="background: ${this.getStatusColor(c.status)};">${esc(c.status)}</span></p>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">
              ${c.workerResponse ? `<strong>Worker Response:</strong> ${esc(c.workerResponse)}<br>` : ''}
              ${c.resolution_notes ? `<strong>Resolution:</strong> ${esc(c.resolution_notes)}<br>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderComplaintsView() {
    const complaints = StorageService.getComplaints();
    return `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 2rem; max-width: 800px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <h2 style="font-size: 1.5rem; font-weight: 700;">My Complaints</h2>
          <select id="complaint-filter" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
            <option value="all">All Complaints</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div id="complaints-list">
          ${complaints.length === 0 ? `
            <p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No complaints yet.</p>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 500px; overflow-y: auto;">
              ${complaints.map(c => `
                <div key="${c.id}" style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
                  <div style="flex: 1; min-width: 200px;">
                    <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${esc(c.issue)}</h4>
                    <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.25rem;">${esc(c.details || 'No details provided')}</p>
                    <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.25rem;">${new Date(c.createdAt).toLocaleDateString()} • Status: <span class="badge" style="background: ${this.getStatusColor(c.status)};">${esc(c.status)}</span></p>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">
                    ${c.workerResponse ? `<strong>Worker Response:</strong> ${esc(c.workerResponse)}<br>` : ''}
                    ${c.resolution_notes ? `<strong>Resolution:</strong> ${esc(c.resolution_notes)}<br>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border-color);">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Submit New Complaint</h3>
          <form id="new-complaint-form" style="display: flex; flex-direction: column; gap: 1rem; max-width: 500px;">
            <input type="hidden" id="complaint-booking-id">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
              <div>
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Category</label>
                <select id="complaint-category" class="form-select">
                  <option value="did_not_arrive">Worker did not arrive</option>
                  <option value="arrived_late">Worker arrived late</option>
                  <option value="poor_quality">Poor-quality work</option>
                  <option value="incomplete_service">Incomplete service</option>
                  <option value="unexpected_charges">Unexpected or excessive charges</option>
                  <option value="unprofessional">Unprofessional behaviour</option>
                  <option value="payment_issue">Payment-related issue</option>
                  <option value="misconduct_safety">Misconduct or safety concern</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Booking ID</label>
                <input type="text" id="complaint-booking-id" class="form-control" placeholder="e.g. BKG-12345" required>
              </div>
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Complaint Details</label>
              <textarea id="complaint-details" class="form-control" rows="3" placeholder="Describe the incident..."></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 1rem;">
              <button type="button" class="btn btn-outline" onclick="this.form.reset()">Cancel</button>
              <button type="submit" class="btn btn-primary">Submit Complaint</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  attachActionEvents(container) {
    // 1. Accept Request
    container.querySelectorAll('.accept-request-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        const before = StorageService.getBookings().find(b => b.id === bookingId);
        // Navigate to Active Jobs *before* saving so the storage-change
        // re-render (and our own render) lands on the active list.
        this.currentView = 'active-jobs';
        this.activeView = 'active-jobs';
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.acceptBooking(b) : b);
        const after = bookings.find(b => b.id === bookingId);
        if (!after || after.status === before?.status) {
          // No-op (e.g. waiting on a customer counter acceptance)
          Toast.show('This job is waiting for the customer to accept your counter-offer.', 'warning');
        } else {
          Toast.show(`Booking accepted! Moved to Active Projects.`, 'success');
          // OTP was already issued when the customer booked; this is a
          // no-op check that it exists (never sent by SMS).
          this.generateArrivalOtp(bookingId, container);
        }
        StorageService.saveBookings(bookings);
        // App re-renders on storage change, detaching this container.
        // Only re-render directly when the container is still in the DOM
        // (standalone/test renders without the app shell).
        if (container && container.isConnected) this.render(container);
      };
    });

    // 2. Reject Request
    container.querySelectorAll('.reject-request-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.rejectBooking(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Booking declined.`, 'info');
        if (container && container.isConnected) this.render(container);
      };
    });

    // 3. Counter Offer
    container.querySelectorAll('.counter-request-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        const currentAmount = btn.getAttribute('data-current') || 450;
        this.showCounterModal(bookingId, currentAmount, container);
      };
    });

    // 4. En Route
    container.querySelectorAll('.enroute-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.setEnRoute(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Status: En route to customer.`, 'info');
        if (container && container.isConnected) this.render(container);
      };
    });

        // 5. Verify Customer OTP (Arrival)
    container.querySelectorAll('.verify-otp-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        this.showOtpVerifyModal(bookingId, container);
      };
    });

    // 6. Start Job
    container.querySelectorAll('.start-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.startJob(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Job in progress!`, 'success');
        if (container && container.isConnected) this.render(container);
      };
    });

    // 7. Complete Job
    container.querySelectorAll('.complete-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => {
          if (b.id === bookingId) {
            const comp = BookingService.completeJob(b);
            comp.paymentConfirmed = true;
            return comp;
          }
          return b;
        });
        StorageService.saveBookings(bookings);
        Toast.show(`🎉 Job completed! Verified earnings credited.`, 'success');
        if (container && container.isConnected) this.render(container);
      };
    });
  },

  // ------------------------------------------------------------------------
  // MODALS & ACTIONS
  // ------------------------------------------------------------------------
  exportCSV(workerId) {
    const transactions = WorkerFeedback.getTransactionsForWorker(workerId);
    WorkerEarnings.exportToCSV(transactions);
    Toast.show('Statement CSV downloaded successfully!', 'success');
  },

  showCounterModal(bookingId, currentEstimate, container) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 460px;">
        <button class="modal-close" id="close-modal" aria-label="Close modal">×</button>
        <h2 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 0.25rem;">Propose Counter Offer</h2>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Current booking rate: <strong>₹${currentEstimate}</strong>. Propose your revised amount.
        </p>

        <!-- Quick preset buttons -->
        <div style="display: flex; gap: 8px; margin-bottom: 1rem;">
          <button type="button" class="btn btn-outline btn-xs preset-chip" data-add="100">+₹100</button>
          <button type="button" class="btn btn-outline btn-xs preset-chip" data-add="200">+₹200</button>
          <button type="button" class="btn btn-outline btn-xs preset-chip" data-add="350">+₹350</button>
        </div>

        <form id="counter-offer-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label class="form-label">Proposed Amount (₹)</label>
            <input type="number" id="counter-amount" class="form-control" value="${currentEstimate}" min="100" max="25000" step="50" required autofocus>
          </div>
          <div>
            <label class="form-label">Note for Customer (Reason)</label>
            <input type="text" id="counter-note" class="form-control" placeholder="e.g. Higher floor or specialized parts needed" value="Rate adjusted based on job complexity">
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-outline btn-sm" id="cancel-counter-btn">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Send Counter Offer →</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#cancel-counter-btn').onclick = () => modal.remove();

    const amtInput = modal.querySelector('#counter-amount');
    modal.querySelectorAll('.preset-chip').forEach(chip => {
      chip.onclick = () => {
        const add = parseFloat(chip.getAttribute('data-add'));
        amtInput.value = parseFloat(currentEstimate) + add;
      };
    });

    modal.querySelector('#counter-offer-form').onsubmit = (e) => {
      e.preventDefault();
      const amount = parseFloat(amtInput.value);
      const note = modal.querySelector('#counter-note').value;

      let bookings = StorageService.getBookings();
      bookings = bookings.map(b => b.id === bookingId ? BookingService.workerCounterOffer(b, amount, note) : b);
      StorageService.saveBookings(bookings);
      modal.remove();
      Toast.show(`Counter offer of ₹${amount} sent to customer!`, 'success');
      this.render(container);
    };
  },

  showPayoutModal(worker) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 480px;">
        <button class="modal-close" id="close-payout-modal">×</button>
        <h2 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 0.25rem;">Request Instant Payout</h2>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Instant settlement to your bank account or UPI with <strong>0% platform commission</strong>.
        </p>
        <form id="payout-request-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label class="form-label">Transfer Method</label>
            <select id="payout-method" class="form-select">
              <option value="upi">UPI (Instant 24/7 Credit)</option>
              <option value="neft">Bank Account Direct Transfer (IMPS/NEFT)</option>
            </select>
          </div>
          <div>
            <label class="form-label">UPI ID / Bank A/C &amp; IFSC</label>
            <input type="text" id="payout-details" class="form-control" value="9820011223@upi" required>
          </div>
          <div>
            <label class="form-label">Payout Amount (₹)</label>
            <input type="number" id="payout-amount" class="form-control" value="2500" min="100" max="100000" required>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
            <button type="button" class="btn btn-outline btn-sm" id="cancel-payout-btn">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Confirm &amp; Withdraw ₹</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-payout-modal').onclick = () => modal.remove();
    modal.querySelector('#cancel-payout-btn').onclick = () => modal.remove();

    modal.querySelector('#payout-request-form').onsubmit = (e) => {
      e.preventDefault();
      const amt = modal.querySelector('#payout-amount').value;
      modal.remove();
      Toast.show(`Payout of ₹${amt} requested! Credited in 5-10 minutes.`, 'success');
    };
  },

  showReceiptModal(txId, service, amount, worker) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 440px;">
        <button class="modal-close" id="close-receipt-modal">×</button>
        <div style="text-align: center; margin-bottom: 1rem;">
          <div style="font-size: 2.2rem; margin-bottom: 4px;">🧾</div>
          <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0;">Verified Payment Receipt</h2>
          <small style="color: var(--text-muted);">${txId}</small>
        </div>
        <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: 12px; font-size: 0.88rem; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Service:</span>
            <strong>${esc(service)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Professional:</span>
            <span>${esc(worker.name)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Customer Agreed Price:</span>
            <strong>₹${amount}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Platform Commission:</span>
            <span style="color: var(--success); font-weight: 700;">₹0 (0% Commission)</span>
          </div>
          <div style="border-top: 1px dashed var(--border-color); padding-top: 8px; display: flex; justify-content: space-between; font-size: 1rem;">
            <strong>Net Direct Payout:</strong>
            <strong style="color: #ea580c;">₹${amount}</strong>
          </div>
        </div>
        <div style="margin-top: 1.25rem;">
          <button class="btn btn-primary btn-sm" id="ok-receipt-btn" style="width: 100%;">Close Receipt</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-receipt-modal').onclick = () => modal.remove();
    modal.querySelector('#ok-receipt-btn').onclick = () => modal.remove();
  },

  /**
   * generateArrivalOtp — called after worker accepts a booking.
   * The OTP was already created in-app when the customer booked, so
   * there's nothing to send (no SMS, no server call — server.js isn't
   * running on Vercel). Just remind the worker to ask for the code.
   */
  async generateArrivalOtp(bookingId, container) {
    Toast.show('Customer OTP is ready in their app — ask for it when you reach home.', 'info');
  },

  /**
   * showOtpVerifyModal — displays the 6-digit OTP input modal for the worker.
   * On submit, sends POST /api/bookings/:id/verify-arrival.
   */
  showOtpVerifyModal(bookingId, container) {
    const existing = document.getElementById('otp-verify-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'otp-verify-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;';

    overlay.innerHTML = `
      <div style="background:var(--bg-card);border-radius:16px;padding:2rem;max-width:440px;width:100%;box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,0.25);position:relative;overflow:hidden;">
        <button id="otp-modal-close" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted);">✕</button>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.25rem;">
          <div style="width:48px;height:48px;border-radius:12px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">🔐</div>
          <div>
            <h3 style="margin:0;font-size:1.15rem;font-weight:800;">Verify Customer OTP</h3>
            <p style="margin:0;font-size:0.82rem;color:var(--text-muted);">Booking: ${bookingId}</p>
          </div>
        </div>
        <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:1.25rem;line-height:1.5;">
          Ask your customer for the <strong>6-digit OTP</strong> shown in their app. Enter it below to confirm your arrival.
        </p>
        <div id="otp-modal-error" style="display:none;padding:0.65rem 1rem;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;font-size:0.85rem;margin-bottom:1rem;"></div>
        <div style="width:100%;box-sizing:border-box;margin-bottom:1.25rem;">
          <input id="otp-input-field"
            type="text"
            inputmode="numeric"
            pattern="[0-9]{6}"
            maxlength="6"
            placeholder="000000"
            style="width:100%;min-width:0;max-width:100%;box-sizing:border-box;display:block;font-size:1.75rem;font-weight:800;letter-spacing:0.35em;text-indent:0.35em;text-align:center;border:2px solid var(--border-color);border-radius:12px;padding:0.65rem 0.5rem;font-family:'JetBrains Mono',monospace;outline:none;background:var(--bg-card);color:var(--text-primary);transition:border-color 0.2s,box-shadow 0.2s;"
            autocomplete="one-time-code"
          >
        </div>
        <div style="width:100%;box-sizing:border-box;display:flex;gap:0.75rem;">
          <button id="otp-submit-btn" class="ui-btn ui-btn--accent" style="width:100%;min-width:0;box-sizing:border-box;font-size:1rem;font-weight:700;padding:0.75rem 1rem;justify-content:center;border-radius:10px;display:flex;align-items:center;cursor:pointer;">
            ✅ Verify & Confirm Arrival
          </button>
        </div>
        <p style="font-size:0.75rem;color:var(--text-muted);margin-top:1rem;text-align:center;">
          Never ask the customer to show you their screen or share the OTP via chat.
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#otp-input-field');
    const submitBtn = overlay.querySelector('#otp-submit-btn');
    const errorDiv = overlay.querySelector('#otp-modal-error');
    const closeBtn = overlay.querySelector('#otp-modal-close');

    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
      if (input.value.length === 6) input.style.borderColor = '#16a34a';
      else input.style.borderColor = 'var(--border-color)';
    });

    closeBtn.onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const showError = (msg) => {
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
      input.style.borderColor = '#dc2626';
    };

    submitBtn.onclick = async () => {
      const otp = input.value.trim();
      if (!/^\d{6}$/.test(otp)) {
        showError('Please enter a valid 6-digit OTP.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying…';
      errorDiv.style.display = 'none';

      try {
        // In-app OTP (Uber/Ola-style): verify against the code stored on
        // the booking. Works on Vercel where server.js isn't running —
        // the old server-only call caused "Network error" there.
        // Fall back to the server endpoint only for legacy bookings
        // that have no in-app code.
        const { StorageService } = await import('./storage.js');
        const { verifyArrivalOtp } = await import('./bookings.js');
        let bookings = StorageService.getBookings();
        const booking = bookings.find(b => b.id === bookingId);

        if (booking?.arrivalOtp) {
          const result = verifyArrivalOtp(booking, otp);
          if (!result.ok) {
            const remaining = result.attemptsRemaining ?? '';
            showError(result.error + (remaining !== '' ? ` (${remaining} attempt${remaining !== 1 ? 's' : ''} left)` : ''));
            StorageService.saveBookings(bookings);
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ Verify & Confirm Arrival';
            return;
          }
          overlay.remove();
          Toast.show('OTP verified! Arrival confirmed ✅', 'success');
          bookings = bookings.map(b => b.id === bookingId ? { ...booking, status: 'Worker arrived' } : b);
          StorageService.saveBookings(bookings);
          if (container && container.isConnected) this.render(container);
          return;
        }

        const { AuthService } = await import('./authService.js');
        const session = AuthService.getSession();
        if (!session?.access_token) {
          showError('Authentication error. Please sign in again.');
          submitBtn.disabled = false;
          submitBtn.textContent = '✅ Verify & Confirm Arrival';
          return;
        }
        const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/verify-arrival`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ otp })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          overlay.remove();
          Toast.show('OTP verified! Arrival confirmed ✅', 'success');
          bookings = bookings.map(b => b.id === bookingId ? { ...b, status: 'Worker arrived' } : b);
          StorageService.saveBookings(bookings);
          if (container && container.isConnected) this.render(container);
        } else {
          showError(data.error || 'Verification failed. Please try again.');
          submitBtn.disabled = false;
          submitBtn.textContent = '✅ Verify & Confirm Arrival';
        }
      } catch (err) {
        showError('Verification failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Verify & Confirm Arrival';
      }
    };

    input.focus();
  },

  showReviewResponseModal(reviewId) {
    const reviews = StorageService.getReviews();
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 480px;">
        <button class="modal-close" id="close-review-modal">×</button>
        <h2 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 0.25rem;">Respond to Customer Review</h2>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">
          Customer rated: <strong>${review.overallRating} ⭐</strong> — "${esc(review.comment || 'Great service')}"
        </p>
        <form id="review-response-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label class="form-label">Your Response</label>
            <textarea id="review-response-text" class="form-control" rows="4" placeholder="Thank you for your feedback! It was a pleasure serving you..." required></textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-outline btn-sm" id="cancel-review-btn">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Post Response</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-review-modal').onclick = () => modal.remove();
    modal.querySelector('#cancel-review-btn').onclick = () => modal.remove();

    modal.querySelector('#review-response-form').onsubmit = (e) => {
      e.preventDefault();
      const resp = modal.querySelector('#review-response-text').value;
      const updated = reviews.map(r => r.id === reviewId ? { ...r, workerResponse: resp } : r);
      StorageService.saveReviews(updated);
      modal.remove();
      Toast.show('Response published successfully!', 'success');
      const root = document.getElementById('app-view-container');
      if (root) this.render(root);
    };
  },

  getStatusColor(status) {
    switch (status) {
      case 'Job completed':
      case 'Resolved':
      case 'Paid':
        return '#10b981';
      case 'Pending confirmation':
      case 'Open':
      case 'Pending':
        return '#f59e0b';
      case 'Cancelled':
      case 'Disputed':
      case 'Failed':
        return '#ef4444';
      default:
        return '#3b82f6';
    }

    const saveAndGotoDocsBtn = container.querySelector('#save-and-goto-docs-btn');
    if (saveAndGotoDocsBtn) {
      saveAndGotoDocsBtn.onclick = (e) => {
        e.preventDefault();
        saveProfileData();
        Toast.show('Profile saved! Continuing to Manage Documents.', 'success');
        this.activeView = 'manage-documents';
        this.render(container);
      };
    }

    const gotoStep2Btn = container.querySelector('#goto-step2-manage-docs-btn');
    if (gotoStep2Btn) {
      gotoStep2Btn.onclick = () => {
        this.activeView = 'manage-documents';
        this.render(container);
      };
    }
  },

  attachVerificationEvents(container, worker) {
    // 1. Trigger file upload click
    container.querySelectorAll('.trigger-upload-btn, .replace-doc-btn').forEach(btn => {
      btn.onclick = () => {
        const type = btn.getAttribute('data-type');
        const fileInput = container.querySelector(`#file-input-${type}`);
        if (fileInput) fileInput.click();
      };
    });

    // 2. Handle file selection
    container.querySelectorAll('.doc-file-input').forEach(input => {
      input.onchange = (e) => {
        const type = input.getAttribute('data-type');
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const workers = StorageService.getWorkers();
          const target = workers.find(w => w.id === worker.id) || worker;
          if (!target.documents) target.documents = {};

          const fileSizeStr = file.size > 1024 * 1024 
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
            : `${Math.round(file.size / 1024)} KB`;

          target.documents[type] = {
            type,
            title: file.name,
            fileName: file.name,
            fileSize: fileSizeStr,
            uploadedAt: new Date().toISOString(),
            status: 'Verified',
            dataUrl: event.target.result
          };
          target.verificationStatus = 'Verified';

          StorageService.saveWorkers(workers);
          Toast.show(`Document "${file.name}" uploaded and verified successfully!`, 'success');
          this.render(container);
        };
        reader.readAsDataURL(file);
      };
    });

    // 3. Auto-fill demo document
    container.querySelectorAll('.autofill-demo-doc-btn').forEach(btn => {
      btn.onclick = () => {
        const type = btn.getAttribute('data-type');
        const fileName = btn.getAttribute('data-file') || `${type}_verified.pdf`;
        const title = btn.getAttribute('data-title') || type;

        const workers = StorageService.getWorkers();
        const target = workers.find(w => w.id === worker.id) || worker;
        if (!target.documents) target.documents = {};

        target.documents[type] = {
          type,
          title,
          fileName,
          fileSize: '1.2 MB',
          uploadedAt: new Date().toISOString(),
          status: 'Verified'
        };
        target.verificationStatus = 'Verified';

        StorageService.saveWorkers(workers);
        Toast.show(`Sample document "${fileName}" verified successfully!`, 'success');
        this.render(container);
      };
    });

    // 4. Remove document
    container.querySelectorAll('.remove-doc-btn').forEach(btn => {
      btn.onclick = () => {
        const type = btn.getAttribute('data-type');
        if (confirm('Are you sure you want to remove this verified document?')) {
          const workers = StorageService.getWorkers();
          const target = workers.find(w => w.id === worker.id) || worker;
          if (target.documents && target.documents[type]) {
            delete target.documents[type];
            StorageService.saveWorkers(workers);
            Toast.show('Document removed.', 'info');
            this.render(container);
          }
        }
      };
    });

    // 5. Preview document modal
    container.querySelectorAll('.preview-doc-btn').forEach(btn => {
      btn.onclick = () => {
        const type = btn.getAttribute('data-type');
        const doc = worker.documents && worker.documents[type];
        if (!doc) return;

        this.showDocumentPreviewModal(doc, worker);
      };
    });

    // 6. Navigation buttons
    const backToProfileBtns = container.querySelectorAll('#back-to-profile-step-btn, #bottom-back-profile-btn');
    backToProfileBtns.forEach(btn => {
      btn.onclick = () => {
        this.activeView = 'profile';
        this.render(container);
      };
    });

    const gotoOverviewBtn = container.querySelector('#bottom-goto-overview-btn');
    if (gotoOverviewBtn) {
      gotoOverviewBtn.onclick = () => {
        this.activeView = 'overview';
        this.render(container);
      };
    }
  },

  showDocumentPreviewModal(doc, worker) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '1200';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 600px;">
        <button class="modal-close" id="close-doc-preview-modal">×</button>
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="font-size: 2rem;">🛡️</div>
          <div>
            <h3 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.15rem;">${esc(doc.title || doc.fileName)}</h3>
            <span class="badge" style="background: #10b981; color: white; font-size: 0.75rem;">✓ Verified Credential</span>
          </div>
        </div>

        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; font-size: 0.9rem; display: flex; flex-direction: column; gap: 0.6rem;">
          <div><strong>Worker Name:</strong> ${esc(worker.name)}</div>
          <div><strong>File Name:</strong> ${esc(doc.fileName)}</div>
          <div><strong>File Size:</strong> ${esc(doc.fileSize || '1.2 MB')}</div>
          <div><strong>Verification Date:</strong> ${new Date(doc.uploadedAt || Date.now()).toLocaleString()}</div>
          <div><strong>Status:</strong> <span style="color: #10b981; font-weight: 700;">✓ Verified & Validated</span></div>
        </div>

        ${doc.dataUrl ? `
          <div style="text-align: center; margin-bottom: 1.5rem; max-height: 350px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem;">
            ${doc.dataUrl.startsWith('data:image/') ? `
              <img src="${doc.dataUrl}" alt="Document Preview" style="max-width: 100%; border-radius: 4px;">
            ` : `
              <embed src="${doc.dataUrl}" type="application/pdf" width="100%" height="300px" />
            `}
          </div>
        ` : `
          <div style="text-align: center; padding: 2rem; background: var(--bg-primary); border-radius: 8px; margin-bottom: 1.5rem;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📄</div>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0;">Verified digital certificate file attached and on record.</p>
          </div>
        `}

        <div style="display: flex; justify-content: flex-end;">
          <button class="btn btn-primary" id="close-preview-btn">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-doc-preview-modal').onclick = () => modal.remove();
    modal.querySelector('#close-preview-btn').onclick = () => modal.remove();
  },

  showSetupModal(worker, initialStep = 1, onComplete) {
    if (typeof document === 'undefined') return;

    let currentStep = initialStep;
    const existing = document.getElementById('worker-setup-modal-overlay');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'worker-setup-modal-overlay';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '1050';

    const renderModalStep = () => {
      const workers = StorageService.getWorkers();
      const authProfile = AuthService.getProfile();
      let currentWorker = workers.find(w => w.id === worker.id) || worker;

      if (authProfile && authProfile.role === 'worker' && authProfile.full_name) {
        if (!currentWorker.name || currentWorker.name === 'New Professional' || currentWorker.name === 'Ramesh Kumar') {
          currentWorker.name = authProfile.full_name;
          if (authProfile.phone) currentWorker.phone = authProfile.phone;
          let workersList = StorageService.getWorkers().map(w => w.id === currentWorker.id ? currentWorker : w);
          StorageService.saveWorkers(workersList);
        }
      }

      const docs = currentWorker.documents || {};
      const reqDocs = REQUIRED_VERIFICATION_DOCUMENTS;
      const uploadedCount = reqDocs.filter(d => docs[d.type]).length;
      const isFullyVerified = uploadedCount >= 3;

      modal.innerHTML = `
        <div class="modal-card" style="max-width: 820px; width: 95%; max-height: 90vh; overflow-y: auto; padding: 2rem; position: relative;">
          <button class="modal-close" id="close-setup-modal" title="Close Window">×</button>

          <!-- Modal Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="font-size: 2rem; background: var(--color-highlighter-yellow); width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color);">🛠️</div>
              <div>
                <h2 style="font-size: 1.4rem; font-weight: 800; margin: 0; font-family: 'Bricolage Grotesque', sans-serif;">Worker Profile & Document Verification</h2>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0.2rem 0 0 0;">Configuring details & verification for <strong>${esc(currentWorker.name)}</strong></p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="badge" style="background: ${isFullyVerified ? '#10b981' : '#f59e0b'}; color: white; font-size: 0.75rem; padding: 4px 10px; border-radius: 999px;">
                ${isFullyVerified ? '🛡️ Verified Pro Active' : '⏳ Verification In Progress'}
              </span>
            </div>
          </div>

          <!-- Stepper Tab Bar -->
          <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: var(--bg-primary); padding: 6px; border-radius: 12px; border: 1px solid var(--border-color);">
            <button type="button" class="btn ${currentStep === 1 ? 'btn-primary' : 'btn-outline'} btn-sm" id="modal-tab-step1" style="flex: 1; border-radius: 8px; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem;">
              <span>1️⃣</span> <strong>Step 1: Profile & Specialities</strong>
            </button>
            <button type="button" class="btn ${currentStep === 2 ? 'btn-primary' : 'btn-outline'} btn-sm" id="modal-tab-step2" style="flex: 1; border-radius: 8px; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6rem;">
              <span>2️⃣</span> <strong>Step 2: Manage Documents & KYC</strong>
              <span style="font-size: 0.75rem; opacity: 0.9;">(${uploadedCount}/${reqDocs.length})</span>
            </button>
          </div>

          ${currentStep === 1 ? `
            <!-- Step 1: Profile & Specialities Form -->
            <form id="modal-profile-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Full Name</label>
                  <input type="text" id="m-wp-name" class="form-control" value="${esc(currentWorker.name)}" required>
                </div>
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Phone Number</label>
                  <input type="text" id="m-wp-phone" class="form-control" value="${esc(currentWorker.phone || '')}" required>
                </div>
              </div>

              <div>
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Professional Bio</label>
                <textarea id="m-wp-bio" class="form-control" rows="2" required>${esc(currentWorker.bio || '')}</textarea>
              </div>

              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Past Experience / Portfolio <small style="color: var(--text-secondary);">(Optional)</small></label>
                  <textarea id="m-wp-experience" class="form-control" rows="2" placeholder="e.g. 5+ years experience in Mumbai residential electricals">${esc(currentWorker.pastExperience || '')}</textarea>
                </div>
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Certifications / Licenses <small style="color: var(--text-secondary);">(Optional)</small></label>
                  <input type="text" id="m-wp-certifications" class="form-control" value="${esc(currentWorker.certifications || '')}" placeholder="e.g. ITI Certified, Electrical License">
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Base Locality</label>
                  <select id="m-wp-locality" class="form-select">
                    ${LOCALITIES.map(l => `<option value="${esc(l.id)}" ${l.id === currentWorker.baseLocality ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Service Area Description</label>
                  <input type="text" id="m-wp-area" class="form-control" value="${esc(currentWorker.serviceArea || '')}" required>
                </div>
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Service Radius (km)</label>
                  <input type="number" id="m-wp-radius" class="form-control" value="${currentWorker.serviceRadius || 10}" min="1" max="50" required>
                </div>
              </div>

              <!-- Specialities Checklist -->
              <div style="border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
                <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem;">Service Specialities & Categories</h4>
                <p style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.75rem;">Check trade categories you are skilled to service:</p>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
                  ${CATEGORIES.map(c => {
                    const isChecked = Boolean(currentWorker.specialities && currentWorker.specialities[c.id]);
                    return `
                      <label style="display: flex; align-items: center; gap: 0.65rem; background: var(--bg-primary); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;">
                        <input type="checkbox" name="m-wp-speciality" value="${esc(c.id)}" ${isChecked ? 'checked' : ''} style="width: 17px; height: 17px;">
                        <div>
                          <div style="font-weight: 600; font-size: 0.85rem;">${esc(c.icon)} ${esc(c.name)}</div>
                          <div style="font-size: 0.7rem; color: var(--text-secondary);">Available for bookings</div>
                        </div>
                      </label>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Step 1 Footer -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
                <button type="button" class="btn btn-outline" id="m-close-modal-btn">Skip to Dashboard</button>
                <button type="submit" class="btn btn-primary" id="m-save-goto-step2-btn" style="background: #047857; border-color: #047857; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem;">
                  <span>Save & Continue to Manage Documents</span>
                  <span>→</span>
                </button>
              </div>
            </form>
          ` : `
            <!-- Step 2: Manage Documents & Verification -->
            <div>
              <!-- Trust Status Overview Banner -->
              <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(2, 132, 199, 0.08) 100%); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius); padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                  <div>
                    <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0.25rem;">
                      ${isFullyVerified ? '✓ All Verification Requirements Met!' : 'Verification in Progress'}
                    </h3>
                    <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">
                      ${isFullyVerified ? 'Your identity, local Mumbai address, and trade skills are verified. Customers book with 100% confidence.' : 'Upload the remaining required documents to unlock maximum search visibility.'}
                    </p>
                  </div>
                  <div style="text-align: right; min-width: 130px;">
                    <div style="font-size: 1.75rem; font-weight: 800; color: #047857;">${uploadedCount} / ${reqDocs.length}</div>
                    <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">Uploaded</span>
                  </div>
                </div>
              </div>

              <!-- Documents List Grid -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                ${reqDocs.map(docMeta => {
                  const doc = docs[docMeta.type];
                  const isUploaded = Boolean(doc);
                  return `
                    <div class="verification-card" style="background: var(--bg-card); border: 1px solid ${isUploaded ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-color)'}; border-radius: var(--radius); padding: 1.15rem; display: flex; flex-direction: column; justify-content: space-between;">
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                          <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.5rem;">${docMeta.icon}</span>
                            <div>
                              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.1rem;">${esc(docMeta.title)}</h4>
                              <span style="font-size: 0.7rem; color: var(--text-secondary);">${docMeta.required ? '<span style="color: #dc2626; font-weight: 600;">* Mandatory</span>' : '<span style="color: var(--text-secondary);">Optional Evidence</span>'}</span>
                            </div>
                          </div>
                          <span class="badge" style="background: ${isUploaded ? '#10b981' : 'var(--bg-primary)'}; color: ${isUploaded ? 'white' : 'var(--text-secondary)'}; font-size: 0.7rem; border: 1px solid ${isUploaded ? 'transparent' : 'var(--border-color)'};">
                            ${isUploaded ? '✓ Verified' : 'Action Required'}
                          </span>
                        </div>

                        <p style="color: var(--text-secondary); font-size: 0.8rem; line-height: 1.4; margin-bottom: 0.85rem;">
                          ${esc(docMeta.subtitle)}
                        </p>

                        ${isUploaded ? `
                          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem 0.85rem; margin-bottom: 0.85rem;">
                            <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem;">
                              <span style="color: #10b981; font-weight: 700;">📄</span>
                              <strong style="font-size: 0.8rem; word-break: break-all;">${esc(doc.fileName || docMeta.title)}</strong>
                            </div>
                            <div style="font-size: 0.7rem; color: var(--text-secondary);">
                              Size: ${esc(doc.fileSize || '1.2 MB')} • Uploaded: ${new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}
                            </div>
                          </div>
                        ` : `
                          <div style="border: 2px dashed var(--border-color); border-radius: 6px; padding: 0.85rem; text-align: center; margin-bottom: 0.85rem; background: var(--bg-primary);">
                            <div style="font-size: 1.25rem; margin-bottom: 0.25rem;">📤</div>
                            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary);">Upload Document Copy</div>
                            <div style="font-size: 0.7rem; color: var(--text-secondary);">Supports PDF, PNG, JPG (Max 5MB)</div>
                          </div>
                        `}
                      </div>

                      <div>
                        <input type="file" id="modal-file-input-${docMeta.type}" class="modal-doc-file-input" data-type="${docMeta.type}" accept="image/*,application/pdf" style="display: none;">
                        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                          ${isUploaded ? `
                            <button type="button" class="btn btn-outline btn-sm modal-preview-doc-btn" data-type="${docMeta.type}" style="flex: 1; font-size: 0.75rem; padding: 4px 8px;">
                              👁️ Preview
                            </button>
                            <button type="button" class="btn btn-outline btn-sm modal-replace-doc-btn" data-type="${docMeta.type}" style="font-size: 0.75rem; padding: 4px 8px;">
                              🔄 Replace
                            </button>
                            <button type="button" class="btn btn-outline btn-sm modal-remove-doc-btn" data-type="${docMeta.type}" style="color: #dc2626; font-size: 0.75rem; padding: 4px 8px;" title="Remove Document">
                              🗑️
                            </button>
                          ` : `
                            <button type="button" class="btn btn-primary btn-sm modal-trigger-upload-btn" data-type="${docMeta.type}" style="flex: 1; font-size: 0.75rem; padding: 4px 8px;">
                              📁 Upload File
                            </button>
                            <button type="button" class="btn btn-outline btn-sm modal-autofill-demo-doc-btn" data-type="${docMeta.type}" data-title="${esc(docMeta.title)}" data-file="${esc(docMeta.demoFileName)}" style="font-size: 0.75rem; padding: 4px 8px;" title="Instantly test with sample document">
                              ⚡ Demo Upload
                            </button>
                          `}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Step 2 Footer -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
                <button type="button" class="btn btn-outline" id="m-back-to-step1-btn">← Back to Profile</button>
                <button type="button" class="btn btn-primary" id="m-finish-dashboard-btn" style="background: #10b981; border-color: #10b981; padding: 0.65rem 1.5rem; font-weight: 700;">
                  ✓ Complete & Enter Dashboard →
                </button>
              </div>
            </div>
          `}
        </div>
      `;

      // Attach event listeners for current modal state
      const closeSetupBtn = modal.querySelector('#close-setup-modal');
      if (closeSetupBtn) {
        closeSetupBtn.onclick = () => {
          modal.remove();
          if (onComplete) onComplete();
        };
      }

      const tab1 = modal.querySelector('#modal-tab-step1');
      if (tab1) {
        tab1.onclick = () => {
          currentStep = 1;
          renderModalStep();
        };
      }

      const tab2 = modal.querySelector('#modal-tab-step2');
      if (tab2) {
        tab2.onclick = () => {
          currentStep = 2;
          renderModalStep();
        };
      }

      if (currentStep === 1) {
        const form = modal.querySelector('#modal-profile-form');
        const saveModalProfile = () => {
          currentWorker.name = modal.querySelector('#m-wp-name')?.value?.trim() || currentWorker.name;
          currentWorker.phone = modal.querySelector('#m-wp-phone')?.value?.trim() || currentWorker.phone;
          currentWorker.bio = modal.querySelector('#m-wp-bio')?.value?.trim() || currentWorker.bio;
          currentWorker.pastExperience = modal.querySelector('#m-wp-experience')?.value?.trim() || currentWorker.pastExperience;
          currentWorker.certifications = modal.querySelector('#m-wp-certifications')?.value?.trim() || currentWorker.certifications;
          currentWorker.baseLocality = modal.querySelector('#m-wp-locality')?.value || currentWorker.baseLocality;
          currentWorker.serviceArea = modal.querySelector('#m-wp-area')?.value?.trim() || currentWorker.serviceArea;
          currentWorker.serviceRadius = parseFloat(modal.querySelector('#m-wp-radius')?.value) || currentWorker.serviceRadius || 10;

          // Sync with active auth profile
          const prof = AuthService.getProfile();
          if (prof) {
            prof.full_name = currentWorker.name;
            if (currentWorker.phone) prof.phone = currentWorker.phone;
            localStorage.setItem('localkaam_cached_profile', JSON.stringify(prof));
          }

          const updatedSpecialities = {};
          modal.querySelectorAll('input[name="m-wp-speciality"]:checked').forEach(chk => {
            const catId = chk.value;
            const catObj = CATEGORIES.find(c => c.id === catId);
            updatedSpecialities[catId] = (currentWorker.specialities && currentWorker.specialities[catId]) || {
              tasks: catObj ? catObj.subcategories : ['General Repair'],
              pricingMethod: 'hourly',
              startingPrice: 350,
              visitingCharge: 100,
              estDuration: '1-2 hours',
              experience: 5
            };
          });

          if (Object.keys(updatedSpecialities).length > 0) {
            currentWorker.specialities = updatedSpecialities;
            currentWorker.skills = Object.keys(updatedSpecialities);
          }

          let workersList = StorageService.getWorkers();
          workersList = workersList.map(w => w.id === currentWorker.id ? currentWorker : w);
          StorageService.saveWorkers(workersList);
        };

        if (form) {
          form.onsubmit = (e) => {
            e.preventDefault();
            saveModalProfile();
            Toast.show('Profile saved! Continuing to Manage Documents.', 'success');
            currentStep = 2;
            renderModalStep();
          };
        }

        const closeBtn = modal.querySelector('#m-close-modal-btn');
        if (closeBtn) {
          closeBtn.onclick = () => {
            modal.remove();
            if (onComplete) onComplete();
          };
        }
      } else {
        // Step 2 events
        const backBtn = modal.querySelector('#m-back-to-step1-btn');
        if (backBtn) {
          backBtn.onclick = () => {
            currentStep = 1;
            renderModalStep();
          };
        }

        const finishBtn = modal.querySelector('#m-finish-dashboard-btn');
        if (finishBtn) {
          finishBtn.onclick = () => {
            modal.remove();
            Toast.show('Worker setup and documents verified! Welcome to your dashboard.', 'success');
            if (onComplete) onComplete();
          };
        }

        modal.querySelectorAll('.modal-trigger-upload-btn, .modal-replace-doc-btn').forEach(btn => {
          btn.onclick = () => {
            const type = btn.getAttribute('data-type');
            const fileInput = modal.querySelector(`#modal-file-input-${type}`);
            if (fileInput) fileInput.click();
          };
        });

        modal.querySelectorAll('.modal-doc-file-input').forEach(input => {
          input.onchange = (e) => {
            const type = input.getAttribute('data-type');
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
              const workersList = StorageService.getWorkers();
              const target = workersList.find(w => w.id === currentWorker.id) || currentWorker;
              if (!target.documents) target.documents = {};

              const fileSizeStr = file.size > 1024 * 1024 
                ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
                : `${Math.round(file.size / 1024)} KB`;

              target.documents[type] = {
                type,
                title: file.name,
                fileName: file.name,
                fileSize: fileSizeStr,
                uploadedAt: new Date().toISOString(),
                status: 'Verified',
                dataUrl: event.target.result
              };
              target.verificationStatus = 'Verified';

              StorageService.saveWorkers(workersList);
              Toast.show(`Document "${file.name}" uploaded and verified successfully!`, 'success');
              renderModalStep();
            };
            reader.readAsDataURL(file);
          };
        });

        modal.querySelectorAll('.modal-autofill-demo-doc-btn').forEach(btn => {
          btn.onclick = () => {
            const type = btn.getAttribute('data-type');
            const fileName = btn.getAttribute('data-file') || `${type}_verified.pdf`;
            const title = btn.getAttribute('data-title') || type;

            const workersList = StorageService.getWorkers();
            const target = workersList.find(w => w.id === currentWorker.id) || currentWorker;
            if (!target.documents) target.documents = {};

            target.documents[type] = {
              type,
              title,
              fileName,
              fileSize: '1.2 MB',
              uploadedAt: new Date().toISOString(),
              status: 'Verified'
            };
            target.verificationStatus = 'Verified';

            StorageService.saveWorkers(workersList);
            Toast.show(`Sample document "${fileName}" verified successfully!`, 'success');
            renderModalStep();
          };
        });

        modal.querySelectorAll('.modal-remove-doc-btn').forEach(btn => {
          btn.onclick = () => {
            const type = btn.getAttribute('data-type');
            if (confirm('Are you sure you want to remove this verified document?')) {
              const workersList = StorageService.getWorkers();
              const target = workersList.find(w => w.id === currentWorker.id) || currentWorker;
              if (target.documents && target.documents[type]) {
                delete target.documents[type];
                StorageService.saveWorkers(workersList);
                Toast.show('Document removed.', 'info');
                renderModalStep();
              }
            }
          };
        });

        modal.querySelectorAll('.modal-preview-doc-btn').forEach(btn => {
          btn.onclick = () => {
            const type = btn.getAttribute('data-type');
            const doc = currentWorker.documents && currentWorker.documents[type];
            if (!doc) return;
            this.showDocumentPreviewModal(doc, currentWorker);
          };
        });
      }
    };

    renderModalStep();
    document.body.appendChild(modal);
  },

  attachOverviewEvents(container, worker) {
    // Chart toggle: Revenue vs Jobs
    const toggleEarnings = container.querySelector('#toggle-chart-earnings');
    const toggleJobs = container.querySelector('#toggle-chart-jobs');

    if (toggleEarnings && toggleJobs) {
      toggleEarnings.onclick = () => {
        this.chartMode = 'earnings';
        toggleEarnings.classList.add('active');
        toggleJobs.classList.remove('active');
        const chartBox = container.querySelector('#useful-trend-svg')?.parentElement;
        if (chartBox) {
          chartBox.innerHTML = this.renderUsefulChartSVG('earnings');
        }
      };

      toggleJobs.onclick = () => {
        this.chartMode = 'jobs';
        toggleJobs.classList.add('active');
        toggleEarnings.classList.remove('active');
        const chartBox = container.querySelector('#useful-trend-svg')?.parentElement;
        if (chartBox) {
          chartBox.innerHTML = this.renderUsefulChartSVG('jobs');
        }
      };
    }

    const seeAllReq = container.querySelector('#quick-see-all-requests');
    if (seeAllReq) {
      seeAllReq.onclick = () => {
        this.currentView = 'requests';
        this.activeView = 'requests';
        this.render(container);
      };
    }

    const seeAllJobs = container.querySelector('#quick-see-all-jobs');
    if (seeAllJobs) {
      seeAllJobs.onclick = () => {
        this.currentView = 'active-jobs';
        this.activeView = 'active-jobs';
        this.render(container);
      };
    }

    const nextJobBtn = container.querySelector('#quick-next-job-btn');
    if (nextJobBtn) {
      nextJobBtn.onclick = () => {
        this.currentView = 'active-jobs';
        this.activeView = 'active-jobs';
        this.render(container);
      };
    }
  },

  renderHelpCentreView(worker) {
    return `
      <div class="dash-wrapper">
        <div class="dash-top-bar">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; margin: 0;">Worker Support &amp; Emergency Helpline</h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">Direct phone helpline and ticket support for billing or job disputes.</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem;">
          <div class="dash-card">
            <h3>Emergency Helpline (24/7)</h3>
            <div style="padding: 1.25rem; background: var(--bg-secondary); border-radius: 12px; margin: 1rem 0;">
              <div style="font-size: 1.45rem; font-weight: 800; color: #ea580c;">📞 1800-419-KAAM</div>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin: 4px 0 0;">Free helpline in Hindi, Marathi &amp; English</p>
            </div>
            <a href="tel:18004195226" class="btn btn-primary btn-sm" style="text-decoration: none; text-align: center; display: inline-block;">Call Helpline</a>
          </div>

          <div class="dash-card">
            <h3>Submit Support Ticket</h3>
            <form id="worker-support-ticket-form" style="display: flex; flex-direction: column; gap: 0.85rem;">
              <div>
                <label class="form-label">Subject</label>
                <input type="text" id="supp-subject" class="form-control" placeholder="e.g. Payment inquiry or rescheduling" required>
              </div>
              <div>
                <label class="form-label">Description</label>
                <textarea id="supp-desc" class="form-control" rows="3" placeholder="Describe the inquiry..." required></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-sm">Submit Ticket</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }
};

if (typeof window !== 'undefined') {
  window.WorkerFrontend = WorkerFrontend;
}
