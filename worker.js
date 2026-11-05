import { StorageService } from './storage.js';
import { BookingService } from './bookings.js';
import { CATEGORIES, LOCALITIES } from './data.js';
import { WorkerFeedback } from './worker_new_features.js';
import { WorkerEarnings } from './worker_new_features.js';
import { Toast } from './toast.js';
import { AuthService } from './authService.js';
import { esc } from './utils.js';

export const WorkerFrontend = {
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

    const bookings = StorageService.getBookings().filter(b => b.workerId === worker.id);

    const pendingRequests = bookings.filter(b => b.status === 'Pending confirmation');
    const activeJobs = bookings.filter(b => !['Pending confirmation', 'Job completed', 'Cancelled', 'Disputed'].includes(b.status));
    const completedJobs = bookings.filter(b => b.status === 'Job completed');
    const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

    // Determine current view from URL hash or sidebar state
    const currentView = window.location.hash.slice(1) || 'overview';
    const isOnline = worker.available && !worker.pauseNewBookings;

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Worker Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-worker-profile-box">
            <label>Active Profile</label>
            <select id="worker-profile-select" class="form-select">
              ${workers.map(w => `<option value="${esc(w.id)}" ${w.id === worker.id ? 'selected' : ''}>${esc(w.name)} (${Object.keys(w.specialities || {}).join(', ') || 'Pro'})</option>`).join('')}
            </select>
            <button class="btn btn-outline btn-xs" id="create-new-worker-btn">
              + Register New Worker
            </button>
          </div>

          <div class="sidebar-section-label">Worker Menu</div>
          <div class="sidebar-nav-list">
            <div class="sidebar-item active" data-view="overview">
              <span>📊</span>
              <span>Dashboard</span>
            </div>
            <div class="sidebar-item" data-view="requests">
              <span>📥</span>
              <span>Requests</span>
              <span class="sidebar-badge">${pendingRequests.length}</span>
            </div>
            <div class="sidebar-item" data-view="active-jobs">
              <span>⚡</span>
              <span>Active Jobs</span>
              <span class="sidebar-badge">${activeJobs.length}</span>
            </div>
            <div class="sidebar-item" data-view="schedule">
              <span>⏰</span>
              <span>Availability</span>
            </div>
            <div class="sidebar-item" data-view="earnings">
              <span>💰</span>
              <span>Earnings</span>
            </div>
            <div class="sidebar-item" data-view="profile">
              <span>👤</span>
              <span>My Profile</span>
            </div>
            <div class="sidebar-item" data-view="feedback">
              <span>⭐</span>
              <span>Reviews & Ratings</span>
            </div>
            <div class="sidebar-item" data-view="help-centre">
              <span>❓</span>
              <span>Help Centre</span>
            </div>
            <div class="sidebar-item" data-view="complaints">
              <span>⚠️</span>
              <span>Complaints</span>
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="main-content" id="worker-main-content">
          ${this.renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings)}
        </main>
      </div>
    `;

    this.attachEvents(container);
  },

  renderMainContent(view, worker, pendingRequests, activeJobs, completedJobs, totalEarnings, bookings) {
    const allBookings = bookings || StorageService.getBookings().filter(b => b.workerId === worker.id);
    switch (view) {
      case 'overview':
        return this.renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings);
      case 'requests':
        return this.renderRequestsView(worker, allBookings);
      case 'active-jobs':
        return this.renderActiveJobsView(worker, allBookings);
      case 'schedule':
        return this.renderScheduleView(worker);
      case 'earnings':
        return this.renderEarningsDashboardView(worker.id);
      case 'profile':
        return this.renderProfileView(worker);
      case 'feedback':
        return this.renderFeedbackView(worker);
      case 'help-centre':
        return this.renderHelpCentreView();
      case 'complaints':
        return this.renderComplaintsView();
      default:
        return this.renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings);
    }
  },

  renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings) {
    const isOnline = worker.available && !worker.pauseNewBookings;
    return `
      <div class="dashboard-header">
        <div>
          <h1>Welcome, ${esc(worker.name)}! 👋</h1>
          <p>
            Service Area: <strong>${esc(worker.serviceArea || worker.baseLocality?.toUpperCase() || 'Mumbai')}</strong>
            &nbsp;·&nbsp;
            Status: <span style="font-weight: 700; color: ${isOnline ? 'var(--success)' : 'var(--danger)'}; display: inline-flex; align-items: center; gap: 4px;">
              <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
              ${isOnline ? 'Online & Discoverable' : 'Offline / Paused'}
            </span>
          </p>
        </div>
        <div>
          <button class="btn ${isOnline ? 'btn-primary' : 'btn-outline'} btn-sm" id="quick-toggle-online">
            ${isOnline ? '🟢 You Are Online' : '🔴 Go Online'}
          </button>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card accent">
          <span>Verified Total Earnings</span>
          <h2>₹${totalEarnings}</h2>
        </div>
        <div class="metric-card">
          <span>Incoming Requests</span>
          <h2>${pendingRequests.length}</h2>
        </div>
        <div class="metric-card">
          <span>Active Jobs</span>
          <h2>${activeJobs.length}</h2>
        </div>
        <div class="metric-card">
          <span>Completed Jobs</span>
          <h2>${completedJobs.length}</h2>
        </div>
      </div>

      <!-- Pending Requests Section -->
      <div style="margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800;">
            Incoming Booking Requests (${pendingRequests.length})
          </h3>
        </div>

        ${pendingRequests.length === 0 ? `
          <div class="empty-state" style="padding: 2rem 1rem;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">📥</div>
            <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem;">No pending booking requests</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Make sure your status is set to online and discoverable.</p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${pendingRequests.map(b => `
              <div class="request-card">
                <div style="flex: 1; min-width: 240px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
                    <span class="badge badge-pending">${esc(b.serviceCategory?.toUpperCase())}</span>
                    <strong style="font-size: 1.05rem;">${esc(b.serviceTask)}</strong>
                    <small style="color: var(--text-muted); font-size: 0.75rem;">(${esc(b.id)})</small>
                  </div>
                  <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 4px;">
                    Customer: <strong>${esc(b.customerName)}</strong> (${esc(b.customerPhone)}) · 📍 ${esc(b.address)} (${esc(b.locality?.toUpperCase())})
                  </p>
                  <p style="font-size: 0.85rem; color: var(--text-primary); margin-bottom: 6px;">
                    <strong>Scope:</strong> ${esc(b.jobDescription)}
                  </p>
                  <div style="font-size: 0.85rem;">
                    Slot: <strong>${esc(b.appointmentDate)} @ ${esc(b.appointmentTime)}</strong>
                    &nbsp;·&nbsp;
                    Base + Visit: ₹${(b.basePrice || 350) + (b.visitingCharge || 100)}
                    ${b.customerOffer ? `<br><span style="color: var(--accent-primary); font-weight: 700;">💬 Customer Offered: ₹${b.customerOffer}</span>` : ''}
                  </div>
                </div>
                <div class="request-card-actions">
                  <button class="btn btn-primary btn-sm accept-request-btn" data-id="${esc(b.id)}">
                    Accept (₹${b.customerOffer || ((b.basePrice || 350) + (b.visitingCharge || 100))})
                  </button>
                  <button class="btn btn-outline btn-sm counter-request-btn" data-id="${esc(b.id)}" data-current="${b.customerOffer || ((b.basePrice || 350) + (b.visitingCharge || 100))}">
                    Counter Offer
                  </button>
                  <button class="btn btn-danger btn-sm reject-request-btn" data-id="${esc(b.id)}">
                    Reject
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
          <h3 style="font-size: 1.15rem; font-weight: 800;">
            Active Job Lifecycle Controls (${activeJobs.length})
          </h3>
        </div>

        ${activeJobs.length === 0 ? `
          <div class="empty-state" style="padding: 2rem 1rem;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚡</div>
            <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem;">No active jobs in progress</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Accepted jobs will appear here for step-by-step lifecycle management.</p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${activeJobs.map(b => `
              <div class="content-card">
                <div class="content-card-header">
                  <div>
                    <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 2px;">
                      ${esc(b.serviceTask)} <small style="color: var(--text-muted); font-size: 0.75rem;">(${esc(b.id)})</small>
                    </h4>
                    <p style="color: var(--text-secondary); font-size: 0.85rem;">
                      Customer: <strong>${esc(b.customerName)}</strong> (${esc(b.customerPhone)}) · 📍 ${esc(b.address)}
                    </p>
                    <p style="margin-top: 4px; font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">
                      Confirmed Price: ₹${b.agreedPrice} · Slot: ${esc(b.appointmentDate)} @ ${esc(b.appointmentTime)}
                    </p>
                  </div>
                  <span class="badge badge-accepted">${esc(b.status)}</span>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                  ${b.status === 'Confirmed' ? `
                    <button class="btn btn-outline btn-sm enroute-job-btn" data-id="${esc(b.id)}">🚗 I'm On My Way</button>
                  ` : ''}
                  ${b.status === 'Worker en route' ? `
                    <button class="btn btn-outline btn-sm arrived-job-btn" data-id="${esc(b.id)}">📍 Confirm Arrival</button>
                  ` : ''}
                  ${['Confirmed', 'Worker en route', 'Worker arrived'].includes(b.status) ? `
                    <button class="btn btn-primary btn-sm start-job-btn" data-id="${esc(b.id)}">▶️ Start Job</button>
                  ` : ''}
                  ${b.status === 'Job in progress' ? `
                    <button class="btn btn-success btn-sm complete-job-btn" data-id="${esc(b.id)}">✅ Complete Job</button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  },

  renderEarningsDashboardView(workerId) {
    const data = WorkerEarnings.renderEarningsDashboard(workerId);
    const { stats, insights, transactions, earnings, mostProfitable } = data;

    const statsHtml = stats.map(s => `
      <div class="metric-card accent" style="max-width: 350px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
        <span>${s.label}</span>
        <h2>${s.value}</h2>
      </div>
    `).join('');

    const insightsHtml = insights.map(i => `
      <div class="metric-card" style="margin-bottom: 1rem;">
        <span>${i.label}</span>
        <h2>${i.value}</h2>
      </div>
    `).join('');

    const transactionsHtml = transactions.length > 0 ? `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Transaction ID</th> <th>Booking ID</th> <th>Service</th> <th>Date</th> <th>Amount</th> <th>Platform Fee</th> <th>Net Amount</th> <th>Status</th> <th>Payment Method</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td>${t.id}</td>
                <td>${t.bookingId}</td>
                <td>${t.service}</td>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.amount.toFixed(2)}</td>
                <td>${t.platformFee.toFixed(2)}</td>
                <td>${(t.amount - t.platformFee).toFixed(2)}</td>
                <td>${t.status}</td>
                <td>${t.paymentMethod}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<p>No transactions yet.</p>';

    // CSV Export button
    const csvExportBtn = `
      <button class="csv-export-btn btn btn-outline" style="margin-bottom: 1rem; padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="window.WorkerFrontend.exportCSV(\'${workerId}\')">
        Export to CSV
      </button>
    `;

    return `
      <div class="dashboard-header">
        <div>
          <h1>Earnings & Completed Jobs</h1>
          <p>Track earnings from verified completed appointments.</p>
        </div>
      </div>

      ${statsHtml}

      ${csvExportBtn}

      ${insightsHtml}

      ${transactionsHtml}
    `;
  },

  exportCSV(workerId) {
    const transactions = WorkerFeedback.getTransactionsForWorker(workerId);
    WorkerEarnings.exportToCSV(transactions);
    Toast.show('CSV export initiated!', 'success');
  },

  renderRequestsView(worker, bookings) {
    const pending = bookings.filter(b => b.status === 'Pending confirmation');
    return `
      <div class="dashboard-header">
        <div>
          <h1>Booking Requests (${pending.length})</h1>
          <p>Review incoming customer job requests, accept fair prices, or send counter-offers.</p>
        </div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID &amp; Date</th>
              <th>Service &amp; Customer</th>
              <th>Task &amp; Address</th>
              <th>Pricing Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pending.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">No pending requests at this time.</td></tr>
            ` : pending.map(b => `
              <tr>
                <td>
                  <strong>${esc(b.id)}</strong><br>
                  <small style="color: var(--text-muted);">${new Date(b.createdAt).toLocaleDateString()}</small>
                </td>
                <td>
                  <strong>${esc(b.serviceCategory?.toUpperCase())}</strong><br>
                  <span style="font-size: 0.85rem;">${esc(b.customerName)} (${esc(b.customerPhone)})</span>
                </td>
                <td>
                  <div style="font-size: 0.85rem; font-weight: 600;">${esc(b.serviceTask)}</div>
                  <small style="color: var(--text-secondary);">${esc(b.jobDescription)}</small><br>
                  <small style="color: var(--text-muted);">📍 ${esc(b.address)} (${esc(b.locality?.toUpperCase())})</small>
                </td>
                <td>
                  <div style="font-size: 0.85rem;">Standard: ₹${(b.basePrice || 350) + (b.visitingCharge || 100)}</div>
                  ${b.customerOffer ? `<strong style="color: var(--accent-primary); font-size: 0.9rem;">Customer Offer: ₹${b.customerOffer}</strong>` : ''}
                </td>
                <td>
                  <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                    <button class="btn btn-primary btn-xs accept-request-btn" data-id="${esc(b.id)}">Accept</button>
                    <button class="btn btn-outline btn-xs counter-request-btn" data-id="${esc(b.id)}" data-current="${b.customerOffer || ((b.basePrice || 350) + (b.visitingCharge || 100))}">Counter</button>
                    <button class="btn btn-danger btn-xs reject-request-btn" data-id="${esc(b.id)}">Reject</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderActiveJobsView(worker, bookings) {
    const active = bookings.filter(b => !['Pending confirmation', 'Job completed', 'Cancelled', 'Disputed'].includes(b.status));
    return `
      <div class="dashboard-header">
        <div>
          <h1>Active Jobs Management (${active.length})</h1>
          <p>Real-time lifecycle state transitions: en route → arrived → in progress → completed.</p>
        </div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Task &amp; Customer</th>
              <th>Appointment Slot</th>
              <th>Agreed Price</th>
              <th>Status</th>
              <th>Lifecycle Actions</th>
            </tr>
          </thead>
          <tbody>
            ${active.length === 0 ? `
              <tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">No active jobs right now.</td></tr>
            ` : active.map(b => `
              <tr>
                <td><strong>${esc(b.id)}</strong></td>
                <td>
                  <strong>${esc(b.serviceTask)}</strong><br>
                  <small style="color: var(--text-secondary);">${esc(b.customerName)} · 📍 ${esc(b.address)}</small>
                </td>
                <td>${esc(b.appointmentDate)} @ ${esc(b.appointmentTime)}</td>
                <td><strong style="color: var(--text-primary); font-size: 0.95rem;">₹${b.agreedPrice}</strong></td>
                <td><span class="badge badge-accepted">${esc(b.status)}</span></td>
                <td>
                  <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                    ${b.status === 'Confirmed' ? `<button class="btn btn-outline btn-xs enroute-job-btn" data-id="${esc(b.id)}">🚗 En Route</button>` : ''}
                    ${b.status === 'Worker en route' ? `<button class="btn btn-outline btn-xs arrived-job-btn" data-id="${esc(b.id)}">📍 Arrived</button>` : ''}
                    ${['Confirmed', 'Worker en route', 'Worker arrived'].includes(b.status) ? `<button class="btn btn-primary btn-xs start-job-btn" data-id="${esc(b.id)}">▶️ Start</button>` : ''}
                    ${b.status === 'Job in progress' ? `<button class="btn btn-success btn-xs complete-job-btn" data-id="${esc(b.id)}">✅ Complete</button>` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderScheduleView(worker) {
    const isOnline = worker.available && !worker.pauseNewBookings;
    return `
      <div class="dashboard-header">
        <div>
          <h1>Availability &amp; Service Status</h1>
          <p>Control your online discovery status and daily working hours.</p>
        </div>
      </div>

      <div style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: var(--radius-cards); padding: clamp(20px, 3vw, 32px); max-width: 650px; display: flex; flex-direction: column; gap: 1.5rem; box-shadow: var(--shadow-card);">
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 2px;">Online Discovery Status</h3>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">When offline, your profile will not appear in customer searches.</p>
          </div>
          <button class="btn ${isOnline ? 'btn-primary' : 'btn-outline'} btn-sm" id="toggle-online-status">
            ${isOnline ? '🟢 You Are Online' : '🔴 You Are Offline'}
          </button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 2px;">Pause New Bookings</h3>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">Temporarily pause new requests while you finish existing jobs.</p>
          </div>
          <button class="btn ${worker.pauseNewBookings ? 'btn-danger' : 'btn-outline'} btn-sm" id="toggle-pause-bookings">
            ${worker.pauseNewBookings ? '⏸️ Bookings Paused' : '▶️ Accepting Requests'}
          </button>
        </div>

        <div>
          <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.75rem;">Daily Working Hours</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
            <div>
              <label class="form-label">Shift Start Time</label>
              <input type="time" id="work-start" class="form-control" value="${esc(worker.workingHours?.start || '09:00')}">
            </div>
            <div>
              <label class="form-label">Shift End Time</label>
              <input type="time" id="work-end" class="form-control" value="${esc(worker.workingHours?.end || '19:00')}">
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="save-schedule-settings">Save Schedule</button>
        </div>
      </div>
    `;
  },

  renderFeedbackView(worker) {
    return WorkerFeedback.renderFeedbackSection(worker);
  },



  renderProfileView(worker) {
    return `
      <div class="dashboard-header">
        <div>
          <h1>Profile &amp; Specialities</h1>
          <p>Update your public bio, service areas, past portfolio, and certifications.</p>
        </div>
      </div>

      <form id="worker-full-profile-form" style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: var(--radius-cards); padding: clamp(20px, 3vw, 32px); max-width: 800px; display: flex; flex-direction: column; gap: 1.25rem; box-shadow: var(--shadow-card);">
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
            <label class="form-label">Past Experience / Portfolio <small style="color: var(--text-muted);">(Optional)</small></label>
            <textarea id="wp-experience" class="form-control" rows="2" placeholder="e.g. Worked with L&T contractors for 4 years...">${esc(worker.pastExperience || '')}</textarea>
          </div>
          <div>
            <label class="form-label">Certifications / Licenses <small style="color: var(--text-muted);">(Optional)</small></label>
            <input type="text" id="wp-certifications" class="form-control" value="${esc(worker.certifications || '')}" placeholder="e.g. ITI Certified, Electrical License Grade A">
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
            <label class="form-label">Service Area Description</label>
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
    `;
  },

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
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin: -0.5rem 0 0;">
            Select one or more categories you provide services for:
          </p>

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

  showCounterModal(bookingId, currentEstimate, container) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 460px;">
        <button class="modal-close" id="close-modal" aria-label="Close modal">×</button>
        <h2 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 0.25rem;">Propose Counter Offer</h2>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Current booking rate: <strong>₹${currentEstimate}</strong>. Propose your revised amount and note.
        </p>

        <form id="counter-offer-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label class="form-label">Proposed Amount (₹)</label>
            <input type="number" id="counter-amount" class="form-control" value="${currentEstimate}" min="100" max="25000" step="50" required autofocus>
          </div>
          <div>
            <label class="form-label">Note for Customer (Reason)</label>
            <input type="text" id="counter-note" class="form-control" placeholder="e.g. High floor / complex wiring / parts cost" value="Adjusted rate based on work complexity">
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

    modal.querySelector('#counter-offer-form').onsubmit = (e) => {
      e.preventDefault();
      const amount = modal.querySelector('#counter-amount').value;
      const note = modal.querySelector('#counter-note').value || 'Worker counter-offer';

      let bookings = StorageService.getBookings();
      bookings = bookings.map(b => b.id === bookingId ? BookingService.workerCounterOffer(b, amount, note) : b);
      StorageService.saveBookings(bookings);

      modal.remove();
      Toast.show(`Counter offer of ₹${amount} sent to customer!`, 'success');
      this.render(container);
    };
    return colors[status] || '#6b7280';
  },

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

    container.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        container.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const workers = StorageService.getWorkers();
        const worker = workers.find(w => w.id === StorageService.getSelectedWorkerId()) || workers[0];
        const bookings = StorageService.getBookings().filter(b => b.workerId === worker.id);
        const pendingRequests = bookings.filter(b => b.status === 'Pending confirmation');
        const activeJobs = bookings.filter(b => !['Pending confirmation', 'Job completed', 'Cancelled', 'Disputed'].includes(b.status));
        const completedJobs = bookings.filter(b => b.status === 'Job completed');
        const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

        const mainContent = container.querySelector('#worker-main-content');
        mainContent.innerHTML = this.renderMainContent(view, worker, pendingRequests, activeJobs, completedJobs, totalEarnings);
        this.attachViewEvents(view, container, worker);
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
          Toast.show(`Status updated: ${worker.available ? 'Online' : 'Offline'}`, 'info');
          this.render(container);
        }
      };
    }

    this.attachActionEvents(container);
  },

  attachViewEvents(view, container, worker) {
    switch (view) {
      case 'schedule':
        this.attachScheduleEvents(container, worker);
        break;
      case 'profile':
        this.attachProfileEvents(container, worker);
        break;
      case 'earnings':
        this.attachEarningsEvents(container, worker);
        break;
      case 'feedback':
        this.attachFeedbackEvents(container, worker);
        break;
      case 'help-centre':
        this.attachHelpCentreEvents(container, worker);
        break;
      case 'complaints':
        this.attachComplaintEvents(container, worker);
        break;
      default:
        this.attachActionEvents(container);
        break;
    }
  },

  attachEarningsEvents(container, worker) {
    // Earnings events are handled via inline onclick for CSV export
  },

  attachFeedbackEvents(container, worker) {
    container.querySelectorAll('.respond-review-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        const currentAmount = btn.getAttribute('data-current') || 450;
        this.showCounterModal(bookingId, currentAmount, container);
      };
    });

    container.querySelectorAll('.enroute-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.setEnRoute(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Status updated: En route to customer.`, 'info');
        this.render(container);
      };
    });

    container.querySelectorAll('.arrived-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.setArrived(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Status updated: Arrived at location.`, 'info');
        this.render(container);
      };
    });

    container.querySelectorAll('.start-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.startJob(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Job ${bookingId} in progress!`, 'success');
        this.render(container);
      };
    });

    container.querySelectorAll('.complete-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.completeJob(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Job ${bookingId} completed! Invoice ready.`, 'success');
        this.render(container);
      };
    });
  },

  attachHelpCentreEvents(container, worker) {
    // Category selector
    const categorySelect = container.querySelector('#help-category-select');
    if (categorySelect) {
      categorySelect.addEventListener('change', () => {
        this.renderHelpCategoryContent(categorySelect.value, container);
      });
    }

    // Support ticket form
    const ticketForm = container.querySelector('#support-ticket-form');
    if (ticketForm) {
      ticketForm.onsubmit = (e) => {
        e.preventDefault();
        const subject = container.querySelector('#ticket-subject').value;
        const description = container.querySelector('#ticket-description').value;
        const bookingId = container.querySelector('#ticket-booking-id').value;

        if (!subject.trim() || !description.trim()) {
          Toast.show('Please fill in all required fields', 'error');
          return;
        }

        const ticket = {
          id: `TKT-${Date.now()}`,
          bookingId: bookingId || null,
          workerId: worker.id,
          customerId: null,
          customerName: worker.name,
          category: categorySelect.value,
          subject: subject,
          description: description,
          status: 'Open',
          priority: 'Medium',
          response: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const tickets = StorageService.getSupportTickets();
        tickets.push(ticket);
        StorageService.saveSupportTickets(tickets);
        Toast.show('Support ticket submitted!', 'success');
        ticketForm.reset();
        this.renderHelpCentreContent(container, worker);
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

  renderHelpCategoryContent(category, container) {
    const contentDiv = container.querySelector('#help-centre-content');
    const faqs = this.getFAQsForCategory(category);
    if (!contentDiv) return;

    contentDiv.innerHTML = `
      <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">${category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
      ${faqs.map(faq => `
        <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1rem;">
          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">${esc(faq.q)}</h4>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">${esc(faq.a)}</p>
        </div>
      `).join('')}
      <button class="btn btn-primary btn-sm" onclick="document.getElementById('ticket-booking-id').value=''; document.querySelector('#support-ticket-form').scrollIntoView()">Submit Ticket for This Category</button>
    `;
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

  getFAQsForCategory(category) {
    const faqs = {
      booking: [
        { q: 'How do I book a service?', a: 'Go to the home page, select your service category, choose a worker, pick a date/time, and confirm your booking.' },
        { q: 'Can I schedule a booking for later?', a: 'Yes, you can select a future date and time slot during booking.' },
        { q: 'What if I need to change my booking?', a: 'You can reschedule or cancel from your bookings page. Contact the worker directly for last-minute changes.' }
      ],
      payment: [
        { q: 'What payment methods are accepted?', a: 'We accept UPI, credit/debit cards, net banking, and wallet payments.' },
        { q: 'When am I charged?', a: 'Payment is captured when the worker accepts your booking. Refunds are processed per our cancellation policy.' },
        { q: 'How do I get a refund?', a: 'Refunds are issued automatically for cancellations within the free window. For disputes, contact support.' }
      ],
      late_no_show: [
        { q: 'What if my worker is late?', a: 'You can track the worker in real-time. If they are more than 15 minutes late, contact support for a refund or reschedule.' },
        { q: 'What if the worker does not show up?', a: 'You will receive a full refund and can rebook with another worker. File a complaint for priority handling.' }
      ],
      cancellation: [
        { q: 'Can I cancel a booking?', a: 'Yes, you can cancel from your bookings page. Free cancellation is available up to 2 hours before the scheduled time.' },
        { q: 'What is the cancellation fee?', a: 'No fee if cancelled 2+ hours before. 50% fee if cancelled within 2 hours. No refund if worker has already arrived.' }
      ],
      quality: [
        { q: 'The work quality was poor. What can I do?', a: 'File a complaint with photos. We will investigate and may offer a redo or partial refund.' },
        { q: 'Can I request a different worker?', a: 'Yes, if you are unsatisfied, contact support to reassign the job to another available worker.' }
      ],
      account: [
        { q: 'How do I update my profile?', a: 'Go to Settings > Profile to update your name, phone, address, and preferences.' },
        { q: 'How do I delete my account?', a: 'Contact support with your request. Account deletion is permanent and cannot be undone.' }
      ],
      safety: [
        { q: 'What safety measures are in place?', a: 'All workers are verified with ID checks. You can share live location with trusted contacts during service.' },
        { q: 'How do I report a safety issue?', a: 'Use the emergency button in the app or call 112. Then file a complaint with "Safety" category.' }
      ],
      general: [
        { q: 'What areas do you serve?', a: 'We currently serve Mumbai and surrounding areas. Check the app for your locality.' },
        { q: 'What are your operating hours?', a: 'Most services are available 8 AM - 10 PM. Emergency services may have extended hours.' }
      ]
    };
    return faqs[category] || faqs.general;
  },

  renderHelpCentreView() {
    return `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 2rem; max-width: 800px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <h2 style="font-size: 1.5rem; font-weight: 700;">Help Centre</h2>
          <select id="help-category-select" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
            <option value="booking">Booking Assistance</option>
            <option value="payment">Payment & Pricing</option>
            <option value="late_no_show">Late Arrival / No-Show</option>
            <option value="cancellation">Cancellation & Rescheduling</option>
            <option value="quality">Service Quality</option>
            <option value="account">Account & Profile</option>
            <option value="safety">Safety Concerns</option>
            <option value="general">General Queries</option>
          </select>
        </div>

        <div id="help-centre-content">
          <p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Select a category above to view help articles and submit tickets.</p>
        </div>

        <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border-color);">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Submit Support Ticket</h3>
          <form id="support-ticket-form" style="display: flex; flex-direction: column; gap: 1rem; max-width: 500px;">
            <input type="hidden" id="ticket-booking-id">
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Subject</label>
              <input type="text" id="ticket-subject" class="form-control" placeholder="Describe your issue" required>
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Description</label>
              <textarea id="ticket-description" class="form-control" rows="3" placeholder="Provide details..."></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 1rem;">
              <button type="button" class="btn btn-outline" onclick="this.form.reset(); this.closest('form').reset()">Cancel</button>
              <button type="submit" class="btn btn-primary">Submit Ticket</button>
            </div>
          </form>
        </div>
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
  }
};