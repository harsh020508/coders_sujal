import { StorageService } from './storage.js';
import { BookingService } from './bookings.js';
import { CATEGORIES, LOCALITIES, COMPLAINT_CATEGORIES } from './data.js';
import { WorkerFeedback, WorkerEarnings } from './worker_new_features.js';
import { Toast } from './toast.js';
import { AuthService } from './authService.js';
import { esc } from './utils.js';

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
      const myWorker = workers.find(w =>
        (w.user_id && w.user_id === authProfile.id) ||
        w.id === `w_${authProfile.id.substring(0, 8)}` ||
        (authProfile.phone && w.phone === authProfile.phone)
      );
      if (myWorker) {
        currentWorkerId = myWorker.id;
        StorageService.setSelectedWorkerId(myWorker.id);
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

    const pendingRequests = bookings.filter(b => b.status === 'Pending confirmation');
    const activeJobs = bookings.filter(b => !['Pending confirmation', 'Job completed', 'Cancelled', 'Disputed'].includes(b.status));
    const completedJobs = bookings.filter(b => b.status === 'Job completed');
    const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

    const view = this.currentView || 'overview';
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
            <button class="btn btn-outline btn-xs" id="create-new-worker-btn" style="margin-top: 8px; width: 100%; border-radius: 6px; font-size: 0.75rem;">
              + Register New Worker
            </button>
          </div>

          <div class="sidebar-section-label" style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; margin-bottom: 8px;">NAVIGATION</div>
          <div class="sidebar-nav-list">
            <div class="sidebar-item ${view === 'overview' ? 'active dash-active' : ''}" data-view="overview">
              <span style="font-size: 1.15rem;">🏠</span>
              <span>Dashboard</span>
            </div>
            <div class="sidebar-item ${view === 'earnings' ? 'active dash-active' : ''}" data-view="earnings">
              <span style="font-size: 1.15rem;">💰</span>
              <span>Earnings &amp; Income</span>
            </div>
            <div class="sidebar-item ${view === 'active-jobs' ? 'active dash-active' : ''}" data-view="active-jobs">
              <span style="font-size: 1.15rem;">⚡</span>
              <span>Active Projects</span>
              ${activeJobs.length > 0 ? `<span class="sidebar-badge" style="background:#ea580c;color:#fff;">${activeJobs.length}</span>` : ''}
            </div>
            <div class="sidebar-item ${view === 'requests' ? 'active dash-active' : ''}" data-view="requests">
              <span style="font-size: 1.15rem;">📥</span>
              <span>Incoming Requests</span>
              ${pendingRequests.length > 0 ? `<span class="sidebar-badge" style="background:#ef4444;color:#fff;">${pendingRequests.length}</span>` : ''}
            </div>
            <div class="sidebar-item ${view === 'clients' ? 'active dash-active' : ''}" data-view="clients">
              <span style="font-size: 1.15rem;">👥</span>
              <span>Clients Directory</span>
            </div>
            <div class="sidebar-item ${view === 'services' ? 'active dash-active' : ''}" data-view="services">
              <span style="font-size: 1.15rem;">🛠️</span>
              <span>Services &amp; Rates</span>
            </div>
            <div class="sidebar-item ${view === 'schedule' ? 'active dash-active' : ''}" data-view="schedule">
              <span style="font-size: 1.15rem;">📅</span>
              <span>Schedule &amp; Hours</span>
            </div>
            <div class="sidebar-item ${view === 'feedback' ? 'active dash-active' : ''}" data-view="feedback">
              <span style="font-size: 1.15rem;">⭐</span>
              <span>Reviews &amp; Ratings</span>
            </div>
            <div class="sidebar-item ${view === 'support' ? 'active dash-active' : ''}" data-view="support">
              <span style="font-size: 1.15rem;">🎧</span>
              <span>Support &amp; Helpline</span>
            </div>
            <div class="sidebar-item ${view === 'profile' ? 'active dash-active' : ''}" data-view="profile">
              <span style="font-size: 1.15rem;">👤</span>
              <span>My Profile</span>
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
  },

  renderMainContent(view, worker, pendingRequests, activeJobs, completedJobs, totalEarnings, bookings) {
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
        return this.renderRequestsView(worker, bookings);
      case 'clients':
        return this.renderClientsView(worker, bookings);
      case 'services':
        return this.renderServicesView(worker);
      case 'schedule':
        return this.renderScheduleView(worker);
      case 'feedback':
        return this.renderFeedbackView(worker);
      case 'support':
      case 'help-centre':
        return this.renderHelpCentreView(worker);
      case 'profile':
        return this.renderProfileView(worker);
      default:
        return this.renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings, bookings);
    }
  },

  // ------------------------------------------------------------------------
  // 1. HIGH-UTILITY WORKER DASHBOARD (Clean, Actionable, Not Cluttered)
  // ------------------------------------------------------------------------
  renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings, bookings) {
    const isOnline = worker.available && !worker.pauseNewBookings;
    const firstName = worker.name.split(' ')[0] || 'Worker';
    const nextJob = activeJobs[0];

    return `
      <div class="dash-wrapper">
        <!-- Top Operational Bar -->
        <div class="dash-top-bar">
          <div class="dash-welcome">
            <h1>Welcome back, ${esc(firstName)} 👋</h1>
            <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 4px 0 0 0;">
              📍 <strong>${esc(worker.serviceArea || worker.baseLocality?.toUpperCase() || 'Mumbai')}</strong>
              &nbsp;·&nbsp;
              ${worker.ratingAverage || 4.9} ★ Pro Rating
            </p>
          </div>
          <div class="dash-top-actions">
            <!-- Big Useful Online / Offline Toggle Switch -->
            <button class="btn ${isOnline ? 'btn-primary' : 'btn-outline'} btn-sm" id="quick-toggle-online" style="border-radius: 999px; padding: 8px 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.9rem;">${isOnline ? '🟢' : '🔴'}</span>
              <span>${isOnline ? 'You Are Online & Discoverable' : 'Offline / Taking a Break'}</span>
            </button>
            <button class="btn btn-outline btn-sm" id="jump-to-earnings-btn" style="border-radius: 999px; padding: 8px 16px;">
              💰 ₹${totalEarnings.toLocaleString('en-IN')}
            </button>
          </div>
        </div>

        <!-- Next Scheduled Appointment Urgent Banner (If an active job exists) -->
        ${nextJob ? `
          <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 1.5px solid #fed7aa; border-radius: 14px; padding: 14px 18px; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.8rem;">⚡</span>
              <div>
                <strong style="color: #9a3412; font-size: 0.95rem;">Active Job In Progress: ${esc(nextJob.serviceTask)}</strong>
                <div style="font-size: 0.85rem; color: #7c2d12; margin-top: 2px;">
                  Customer: <strong>${esc(nextJob.customerName)}</strong> (${esc(nextJob.customerPhone)}) · 📍 ${esc(nextJob.address)} · Slot: ${esc(nextJob.appointmentDate)} @ ${esc(nextJob.appointmentTime)}
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="badge" style="background: #ea580c; color: #fff; font-weight: 700;">₹${nextJob.agreedPrice}</span>
              <a href="tel:${esc(nextJob.customerPhone)}" class="btn btn-outline btn-xs" style="background:#fff;">📞 Call</a>
              <button class="btn btn-primary btn-xs" id="quick-next-job-btn" data-id="${esc(nextJob.id)}">Update Status →</button>
            </div>
          </div>
        ` : ''}

        <!-- 4 Real, High-Utility Worker Metric Cards -->
        <div class="dash-hero-stats">
          <div class="dash-hero-card accent-earnings">
            <div class="dash-hero-top">
              <span class="dash-hero-label">Verified Total Income</span>
              <span class="dash-hero-icon" style="color: #ea580c;">₹</span>
            </div>
            <h2 class="dash-hero-val" style="color: #ea580c;">₹${totalEarnings.toLocaleString('en-IN')}</h2>
            <div class="dash-hero-sub">
              <span style="color: var(--success); font-weight: 700;">✓ 100% Direct Payouts</span> · 0% commission
            </div>
          </div>

          <div class="dash-hero-card">
            <div class="dash-hero-top">
              <span class="dash-hero-label">Jobs Completed</span>
              <span class="dash-hero-icon" style="color: #10b981;">✅</span>
            </div>
            <h2 class="dash-hero-val">${completedJobs.length}</h2>
            <div class="dash-hero-sub">
              <span>Avg ₹${Math.round(totalEarnings / (completedJobs.length || 1))} / completed job</span>
            </div>
          </div>

          <div class="dash-hero-card" style="${pendingRequests.length > 0 ? 'border-color: rgba(239, 68, 68, 0.4);' : ''}">
            <div class="dash-hero-top">
              <span class="dash-hero-label">Incoming Requests</span>
              <span class="dash-hero-icon" style="color: #f59e0b;">📥</span>
            </div>
            <h2 class="dash-hero-val" style="${pendingRequests.length > 0 ? 'color: #ef4444;' : ''}">
              ${pendingRequests.length}
            </h2>
            <div class="dash-hero-sub">
              ${pendingRequests.length > 0 ? `<span style="color: #ef4444; font-weight: 700;">Action required immediately</span>` : 'All requests responded'}
            </div>
          </div>

          <div class="dash-hero-card">
            <div class="dash-hero-top">
              <span class="dash-hero-label">Customer Rating</span>
              <span class="dash-hero-icon" style="color: #f59e0b;">⭐</span>
            </div>
            <h2 class="dash-hero-val">${(worker.ratingAverage || 4.9).toFixed(1)} ★</h2>
            <div class="dash-hero-sub">
              <span style="color: var(--text-muted);">${worker.ratingCount || 18} verified customer reviews</span>
            </div>
          </div>
        </div>

        <!-- The SINGLE, Purposeful & Beautiful Work & Income Trend Graph -->
        <div class="dash-single-chart-card">
          <div class="dash-chart-top-bar">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                Income &amp; Performance Trend
              </h3>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin: 3px 0 0;">
                Track monthly revenue milestones and job volume growth
              </p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <div class="dash-chart-toggle-group">
                <button class="dash-chart-toggle-btn ${this.chartMode === 'earnings' ? 'active' : ''}" id="toggle-chart-earnings">
                  Revenue (₹)
                </button>
                <button class="dash-chart-toggle-btn ${this.chartMode === 'jobs' ? 'active' : ''}" id="toggle-chart-jobs">
                  Completed Jobs
                </button>
              </div>
            </div>
          </div>

          <div class="dash-chart-flex">
            <!-- Clean Interactive SVG Vector Graph -->
            <div style="width: 100%; height: 220px; position: relative;">
              ${this.renderUsefulChartSVG(this.chartMode)}
            </div>

            <!-- Revenue Breakdown by Service Category (High Practical Utility) -->
            <div class="dash-chart-breakdown">
              <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
                Earnings by Specialty
              </div>

              <div class="dash-cat-item">
                <div class="dash-cat-top">
                  <span>Electrical Wiring &amp; Repair</span>
                  <strong>65% (₹${Math.round(totalEarnings * 0.65).toLocaleString('en-IN')})</strong>
                </div>
                <div class="dash-cat-bar">
                  <div class="dash-cat-fill" style="width: 65%; background: #ea580c;"></div>
                </div>
              </div>

              <div class="dash-cat-item">
                <div class="dash-cat-top">
                  <span>Appliance &amp; AC Servicing</span>
                  <strong>25% (₹${Math.round(totalEarnings * 0.25).toLocaleString('en-IN')})</strong>
                </div>
                <div class="dash-cat-bar">
                  <div class="dash-cat-fill" style="width: 25%; background: #f59e0b;"></div>
                </div>
              </div>

              <div class="dash-cat-item">
                <div class="dash-cat-top">
                  <span>Inspection &amp; Fixtures</span>
                  <strong>10% (₹${Math.round(totalEarnings * 0.10).toLocaleString('en-IN')})</strong>
                </div>
                <div class="dash-cat-bar">
                  <div class="dash-cat-fill" style="width: 10%; background: #10b981;"></div>
                </div>
              </div>

              <div style="background: var(--bg-secondary); padding: 10px 12px; border-radius: 8px; margin-top: 6px; font-size: 0.8rem; color: var(--text-secondary);">
                💡 <strong>LocalKaam Guarantee:</strong> 100% of customer payment is credited directly to your bank account with zero cuts.
              </div>
            </div>
          </div>
        </div>

        <!-- The Core Work Center: 2 Actionable Columns -->
        <div class="dash-operations-grid">
          <!-- Column 1: Incoming Booking Requests (Needing Immediate Action) -->
          <div class="dash-op-card">
            <div class="dash-op-header">
              <h3>
                <span>📥</span> Incoming Requests
                ${pendingRequests.length > 0 ? `<span class="dash-urgent-pill">${pendingRequests.length} Pending</span>` : ''}
              </h3>
              <button class="btn btn-outline btn-xs" id="quick-see-all-requests">Manage All →</button>
            </div>

            ${pendingRequests.length === 0 ? `
              <div class="empty-state" style="padding: 2.5rem 1rem;">
                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🎉</div>
                <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.25rem;">You are all caught up!</h4>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0;">New customer requests in your area will appear here instantly.</p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${pendingRequests.map(b => `
                  <div class="request-card" style="padding: 1.15rem; border-radius: 12px; background: var(--bg-secondary); border: 1.5px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                      <div>
                        <strong style="font-size: 1rem; color: var(--text-primary);">${esc(b.serviceTask)}</strong>
                        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                          👤 <strong>${esc(b.customerName)}</strong> (${esc(b.customerPhone)})
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                          📍 ${esc(b.address)} (${esc(b.locality?.toUpperCase() || 'MUMBAI')})
                        </div>
                      </div>
                      <div style="text-align: right;">
                        <span style="font-size: 1.1rem; font-weight: 800; color: #ea580c;">₹${b.agreedPrice || ((b.basePrice || 350) + (b.visitingCharge || 100))}</span>
                        ${b.customerOffer ? `<div style="font-size: 0.72rem; color: var(--success); font-weight: 600;">Customer Offer</div>` : `<div style="font-size: 0.72rem; color: var(--text-muted);">Standard Base</div>`}
                      </div>
                    </div>

                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 8px 0; background: var(--bg-card); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-light);">
                      <strong>Scope:</strong> ${esc(b.jobDescription || 'Standard service requested')}
                    </p>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 0.82rem;">
                      <span style="color: var(--text-muted);">⏰ Slot: <strong>${esc(b.appointmentDate)} @ ${esc(b.appointmentTime)}</strong></span>
                      <div style="display: flex; gap: 6px;">
                        <button class="btn btn-primary btn-sm accept-request-btn" data-id="${esc(b.id)}">✓ Accept (₹${b.agreedPrice})</button>
                        <button class="btn btn-outline btn-sm counter-request-btn" data-id="${esc(b.id)}" data-current="${b.agreedPrice}">Counter</button>
                        <button class="btn btn-danger btn-sm reject-request-btn" data-id="${esc(b.id)}">Decline</button>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- Column 2: Active Projects Tracker (Lifecycle Progress) -->
          <div class="dash-op-card">
            <div class="dash-op-header">
              <h3>
                <span>⚡</span> Active Projects &amp; Jobs
                ${activeJobs.length > 0 ? `<span class="sidebar-badge" style="background:#ea580c;color:#fff;">${activeJobs.length}</span>` : ''}
              </h3>
              <button class="btn btn-outline btn-xs" id="quick-see-all-jobs">Manage All →</button>
            </div>

            ${activeJobs.length === 0 ? `
              <div class="empty-state" style="padding: 2.5rem 1rem;">
                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">⚡</div>
                <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.25rem;">No jobs currently in progress</h4>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0;">When you accept incoming requests, they move here for stage-by-stage lifecycle management.</p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${activeJobs.map(b => {
                  const stepIndex = ['Confirmed', 'Accepted'].includes(b.status) ? 1
                    : b.status === 'Worker en route' ? 2
                    : b.status === 'Worker arrived' ? 3
                    : b.status === 'Job in progress' ? 4 : 5;

                  return `
                    <div style="padding: 1.15rem; border-radius: 12px; background: var(--bg-secondary); border: 1.5px solid var(--border-color);">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <div>
                          <strong style="font-size: 1rem; color: var(--text-primary);">${esc(b.serviceTask)}</strong>
                          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                            Customer: <strong>${esc(b.customerName)}</strong> · 📍 ${esc(b.address)}
                          </div>
                        </div>
                        <span class="badge" style="background: #ea580c; color: #fff; font-size: 0.85rem; font-weight: 800;">₹${b.agreedPrice}</span>
                      </div>

                      <!-- 5-Step Progress Stepper -->
                      <div class="dash-job-stepper">
                        <span class="dash-job-step ${stepIndex >= 1 ? 'done' : ''}">1. Confirmed</span>
                        <span>›</span>
                        <span class="dash-job-step ${stepIndex === 2 ? 'current' : stepIndex > 2 ? 'done' : ''}">2. On Way</span>
                        <span>›</span>
                        <span class="dash-job-step ${stepIndex === 3 ? 'current' : stepIndex > 3 ? 'done' : ''}">3. Arrived</span>
                        <span>›</span>
                        <span class="dash-job-step ${stepIndex === 4 ? 'current' : stepIndex > 4 ? 'done' : ''}">4. Working</span>
                        <span>›</span>
                        <span class="dash-job-step ${stepIndex === 5 ? 'done' : ''}">5. Done</span>
                      </div>

                      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; flex-wrap: wrap; gap: 8px;">
                        <div style="display: flex; gap: 6px;">
                          <a href="tel:${esc(b.customerPhone)}" class="btn btn-outline btn-xs" style="text-decoration: none;">📞 Call Customer</a>
                          <a href="https://wa.me/${esc(b.customerPhone.replace(/[^0-9]/g, ''))}" target="_blank" class="btn btn-outline btn-xs" style="text-decoration: none;">💬 WhatsApp</a>
                        </div>
                        <div style="display: flex; gap: 6px;">
                          ${['Confirmed', 'Accepted'].includes(b.status) ? `
                            <button class="btn btn-primary btn-sm enroute-job-btn" data-id="${esc(b.id)}">🚗 I'm On My Way</button>
                          ` : ''}
                          ${b.status === 'Worker en route' ? `
                            <button class="btn btn-primary btn-sm arrived-job-btn" data-id="${esc(b.id)}">📍 Confirm Arrival</button>
                          ` : ''}
                          ${b.status === 'Worker arrived' ? `
                            <button class="btn btn-primary btn-sm start-job-btn" data-id="${esc(b.id)}">▶️ Start Working</button>
                          ` : ''}
                          ${b.status === 'Job in progress' ? `
                            <button class="btn btn-success btn-sm complete-job-btn" data-id="${esc(b.id)}">✅ Complete Job (Get ₹${b.agreedPrice})</button>
                          ` : ''}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  },

  // ------------------------------------------------------------------------
  // SINGLE HIGH-UTILITY VECTOR GRAPH (Responsive, Clean, Purposeful)
  // ------------------------------------------------------------------------
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

    let filteredTxs = transactions;
    if (this.txSearchQuery) {
      const q = this.txSearchQuery.toLowerCase();
      filteredTxs = filteredTxs.filter(t =>
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.bookingId && t.bookingId.toLowerCase().includes(q)) ||
        (t.service && t.service.toLowerCase().includes(q))
      );
    }
    if (this.txStatusFilter !== 'all') {
      filteredTxs = filteredTxs.filter(t => t.status.toLowerCase() === this.txStatusFilter.toLowerCase());
    }

    const pendingEscrow = earnings.pendingPayments * 650;

    return `
      <div class="dash-wrapper">
        <div class="dash-top-bar">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin: 0;">Earnings &amp; Payouts</h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 4px 0 0 0;">
              Zero commission deductions · 100% direct payouts to your UPI &amp; Bank.
            </p>
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" id="export-earnings-csv">
              📥 Export CSV Statement
            </button>
            <button class="btn btn-primary btn-sm" id="request-payout-btn">
              💳 Request Instant Payout
            </button>
          </div>
        </div>

        <!-- 4 Financial Summary Cards -->
        <div class="dash-income-kpis">
          <div class="dash-income-kpi-card accent">
            <span>Verified Total Direct Earnings</span>
            <h2 style="color: #ea580c;">₹${earnings.totalEarnings.toLocaleString('en-IN')}</h2>
            <small style="color: #ea580c; font-weight: 700;">100% Direct to You · 0% Fee</small>
          </div>
          <div class="dash-income-kpi-card">
            <span>Received Bank Payouts</span>
            <h2>₹${earnings.netEarnings.toLocaleString('en-IN')}</h2>
            <small style="color: var(--success); font-weight: 700;">✓ Settled to UPI/Bank</small>
          </div>
          <div class="dash-income-kpi-card">
            <span>In Escrow (To Be Released)</span>
            <h2>₹${pendingEscrow.toLocaleString('en-IN')}</h2>
            <small style="color: var(--text-muted);">${earnings.pendingPayments} active jobs underway</small>
          </div>
          <div class="dash-income-kpi-card">
            <span>Average Ticket Value</span>
            <h2>₹${Math.round(earnings.avgPerJob).toLocaleString('en-IN')}</h2>
            <small style="color: var(--text-muted);">${earnings.completedJobs.length} completed jobs</small>
          </div>
        </div>

        <!-- Monthly Bar Breakdown (Clean & Simple) -->
        <div class="dash-card" style="margin-bottom: 2rem;">
          <div class="dash-card-header">
            <div>
              <h3>Monthly Payout History</h3>
              <p class="dash-card-sub">Completed payouts vs pending escrow releases</p>
            </div>
            <div class="dash-card-legend">
              <span class="dash-legend-item">
                <span class="dash-legend-dot" style="background: #ea580c;"></span> Settled Payout
              </span>
              <span class="dash-legend-item">
                <span class="dash-legend-dot" style="background: rgba(239, 68, 68, 0.4);"></span> In Escrow
              </span>
            </div>
          </div>
          <div style="width: 100%; height: 200px;">
            ${this.renderIncomeBarSVG()}
          </div>
        </div>

        <!-- Searchable Transactions Ledger -->
        <div class="dash-card">
          <div class="dash-card-header" style="flex-wrap: wrap; gap: 1rem;">
            <div>
              <h3>Verified Transactions Ledger</h3>
              <p class="dash-card-sub">Complete itemized payout receipts and customer payment records</p>
            </div>
            <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
              <input type="text" id="tx-search-input" class="form-control" placeholder="Search ID or service..." value="${esc(this.txSearchQuery)}" style="width: 200px; font-size: 0.82rem; padding: 6px 12px; border-radius: 8px;">
              <select id="tx-status-filter" class="form-select" style="font-size: 0.82rem; padding: 6px 12px; border-radius: 8px;">
                <option value="all" ${this.txStatusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                <option value="paid" ${this.txStatusFilter === 'paid' ? 'selected' : ''}>Paid / Settled</option>
                <option value="pending" ${this.txStatusFilter === 'pending' ? 'selected' : ''}>Pending Escrow</option>
              </select>
            </div>
          </div>

          <div class="table-container" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Booking Ref</th>
                  <th>Service Task</th>
                  <th>Date</th>
                  <th>Gross Price</th>
                  <th>Platform Fee</th>
                  <th>Net Payout</th>
                  <th>Status</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                ${filteredTxs.length === 0 ? `
                  <tr>
                    <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                      No matching transactions found. Completed appointments generate receipts here.
                    </td>
                  </tr>
                ` : filteredTxs.map(t => `
                  <tr>
                    <td><strong>${esc(t.id)}</strong></td>
                    <td><small style="color: var(--text-muted);">${esc(t.bookingId)}</small></td>
                    <td><strong>${esc(t.service)}</strong></td>
                    <td>${new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>₹${t.amount.toLocaleString('en-IN')}</td>
                    <td><span style="color: var(--success); font-weight: 700;">₹0 (0%)</span></td>
                    <td><strong style="color: #ea580c; font-size: 0.95rem;">₹${t.amount.toLocaleString('en-IN')}</strong></td>
                    <td>
                      <span class="badge ${t.status === 'Paid' ? 'badge-completed' : 'badge-pending'}">
                        ${t.status === 'Paid' ? '✓ Settled' : '⏳ In Escrow'}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-outline btn-xs view-receipt-btn" data-id="${esc(t.id)}" data-service="${esc(t.service)}" data-amount="${t.amount}">
                        Receipt
                      </button>
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
    const active = bookings.filter(b => !['Pending confirmation', 'Job completed', 'Cancelled', 'Disputed'].includes(b.status));
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
                        ${['Confirmed', 'Accepted'].includes(b.status) ? `<button class="btn btn-outline btn-xs enroute-job-btn" data-id="${esc(b.id)}">🚗 En Route</button>` : ''}
                        ${b.status === 'Worker en route' ? `<button class="btn btn-outline btn-xs arrived-job-btn" data-id="${esc(b.id)}">📍 Arrived</button>` : ''}
                        ${b.status === 'Worker arrived' ? `<button class="btn btn-primary btn-xs start-job-btn" data-id="${esc(b.id)}">▶️ Start Job</button>` : ''}
                        ${b.status === 'Job in progress' ? `<button class="btn btn-success btn-xs complete-job-btn" data-id="${esc(b.id)}">✅ Complete Job</button>` : ''}
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
    const pending = bookings.filter(b => b.status === 'Pending confirmation');
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
                    <td><strong>${esc(b.serviceTask)}</strong><br><small style="color: var(--text-secondary);">${esc(b.jobDescription)}</small></td>
                    <td>${esc(b.appointmentDate)} @ ${esc(b.appointmentTime)}</td>
                    <td>
                      <div>Standard: ₹${(b.basePrice || 350) + (b.visitingCharge || 100)}</div>
                      ${b.customerOffer ? `<strong style="color: #ea580c; font-size: 0.95rem;">Offer: ₹${b.customerOffer}</strong>` : ''}
                    </td>
                    <td>
                      <div style="display: flex; gap: 4px;">
                        <button class="btn btn-primary btn-xs accept-request-btn" data-id="${esc(b.id)}">Accept</button>
                        <button class="btn btn-outline btn-xs counter-request-btn" data-id="${esc(b.id)}" data-current="${b.customerOffer || ((b.basePrice || 350) + (b.visitingCharge || 100))}">Counter</button>
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
                        <a href="tel:${esc(c.phone)}" class="btn btn-outline btn-xs" style="text-decoration: none;">📞 Call</a>
                        <a href="https://wa.me/${esc(c.phone.replace(/[^0-9]/g, ''))}" target="_blank" class="btn btn-outline btn-xs" style="text-decoration: none;">💬 WhatsApp</a>
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

  renderServicesView(worker) {
    const specialities = worker.specialities || {};
    const specEntries = Object.entries(specialities);

    return `
      <div class="dash-wrapper">
        <div class="dash-top-bar">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; margin: 0;">Services &amp; Pricing Tiers</h1>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">Set starting rates, hourly charges, and visiting fees.</p>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
          ${specEntries.map(([catKey, info]) => {
            const catObj = CATEGORIES.find(c => c.id === catKey);
            return `
              <div class="dash-card">
                <div class="dash-card-header">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.75rem;">${catObj?.icon || '🛠️'}</span>
                    <div>
                      <h3>${esc(catObj?.name || catKey.toUpperCase())}</h3>
                      <p class="dash-card-sub">${info.pricingMethod || 'Hourly'} Pricing</p>
                    </div>
                  </div>
                  <span class="badge badge-accepted">Active</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin: 12px 0; font-size: 0.88rem;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Starting Rate:</span>
                    <strong>₹${info.startingPrice || 350}/hr</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Visiting Charge:</span>
                    <strong>₹${info.visitingCharge || 100}</strong>
                  </div>
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
      </div>
    `;
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
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem;">
          <div class="dash-card">
            <h3>Discovery &amp; Availability</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-secondary); border-radius: 12px; margin: 1rem 0;">
              <div>
                <strong>Online Status</strong>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin: 2px 0 0;">Visible to customer searches</p>
              </div>
              <button class="btn ${isOnline ? 'btn-primary' : 'btn-outline'} btn-sm" id="toggle-online-status">
                ${isOnline ? '🟢 Online' : '🔴 Offline'}
              </button>
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
        </div>
      </div>
    `;
  },

  renderFeedbackView(worker) {
    return WorkerFeedback.renderFeedbackSection(worker);
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
            Step 1 — Basic Profile Information
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
            Step 2 — Select Specialities &amp; Services
          </h3>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem;" id="speciality-checkboxes">
            ${CATEGORIES.map(c => `
              <label style="display: flex; align-items: center; gap: 0.6rem; background: var(--bg-secondary); padding: 0.65rem 0.85rem; border-radius: 8px; border: 1.5px solid var(--border-color); cursor: pointer; transition: all 0.15s ease;">
                <input type="checkbox" name="speciality" value="${esc(c.id)}" style="width: 16px; height: 16px;" ${c.id === 'electrician' ? 'checked' : ''}>
                <div>
                  <div style="font-weight: 600; font-size: 0.85rem;">${esc(c.icon)} ${esc(c.name)}</div>
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
          profileCompleted: false,
          specialities: {}
        };
        workers.push(newW);
        StorageService.saveWorkers(workers);
        StorageService.setSelectedWorkerId(newW.id);
        this.render(container);
      };
    }

    // Sidebar navigation clicks
    container.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        this.currentView = view;
        container.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active', 'dash-active'));
        item.classList.add('active', 'dash-active');

        const workers = StorageService.getWorkers();
        const worker = workers.find(w => w.id === StorageService.getSelectedWorkerId()) || workers[0];
        const allBookings = StorageService.getBookings();
        const bookings = allBookings.filter(b => b.workerId === worker.id);
        const pendingRequests = bookings.filter(b => b.status === 'Pending confirmation');
        const activeJobs = bookings.filter(b => !['Pending confirmation', 'Job completed', 'Cancelled', 'Disputed'].includes(b.status));
        const completedJobs = bookings.filter(b => b.status === 'Job completed');
        const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

        const mainContent = container.querySelector('#worker-main-content');
        if (mainContent) {
          mainContent.innerHTML = this.renderMainContent(view, worker, pendingRequests, activeJobs, completedJobs, totalEarnings, bookings);
          this.attachViewEvents(view, container, worker);
        }
      });
    });

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
        this.render(container);
      };
    }

    const workers = StorageService.getWorkers();
    const worker = workers.find(w => w.id === StorageService.getSelectedWorkerId()) || workers[0];
    this.attachViewEvents(this.currentView || 'overview', container, worker);
    this.attachActionEvents(container);
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
      default:
        break;
    }
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
        this.render(container);
      };
    }

    const seeAllJobs = container.querySelector('#quick-see-all-jobs');
    if (seeAllJobs) {
      seeAllJobs.onclick = () => {
        this.currentView = 'active-jobs';
        this.render(container);
      };
    }

    const nextJobBtn = container.querySelector('#quick-next-job-btn');
    if (nextJobBtn) {
      nextJobBtn.onclick = () => {
        this.currentView = 'active-jobs';
        this.render(container);
      };
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

  attachActionEvents(container) {
    // 1. Accept Request
    container.querySelectorAll('.accept-request-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.acceptBooking(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Booking accepted! Moved to Active Projects.`, 'success');
        this.render(container);
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
        this.render(container);
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
        this.render(container);
      };
    });

    // 5. Arrived
    container.querySelectorAll('.arrived-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.setArrived(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Status: Arrived at location.`, 'info');
        this.render(container);
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
        this.render(container);
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
        this.render(container);
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
  }
};

if (typeof window !== 'undefined') {
  window.WorkerFrontend = WorkerFrontend;
}
