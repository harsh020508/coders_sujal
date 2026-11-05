import { StorageService } from './storage.js';
import { BookingService } from './bookings.js';
import { CATEGORIES, LOCALITIES } from './data.js';
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

      <!-- Metrics Grid -->
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

  renderEarningsView(completedJobs, totalEarnings) {
    return `
      <div class="dashboard-header">
        <div>
          <h1>Earnings &amp; Completed Jobs (${completedJobs.length})</h1>
          <p>Direct 100% payouts with zero platform commission deductions.</p>
        </div>
      </div>

      <div class="metric-card accent" style="max-width: 320px; margin-bottom: 1.5rem;">
        <span>Verified Total Direct Earnings</span>
        <h2>₹${totalEarnings}</h2>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Task &amp; Customer</th>
              <th>Completion Date</th>
              <th>Agreed Payout</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${completedJobs.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">No completed jobs yet. Keep providing great service!</td></tr>
            ` : completedJobs.map(b => `
              <tr>
                <td><strong>${esc(b.id)}</strong></td>
                <td>
                  <strong>${esc(b.serviceTask)}</strong><br>
                  <small style="color: var(--text-secondary);">${esc(b.customerName)} · 📍 ${esc(b.address)}</small>
                </td>
                <td>${new Date(b.completedAt || b.createdAt).toLocaleDateString()}</td>
                <td><strong style="color: var(--accent-primary); font-size: 1rem;">₹${b.agreedPrice}</strong></td>
                <td><span class="badge badge-completed">✓ Completed</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
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
        if (view === 'overview') {
          mainContent.innerHTML = this.renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings);
        } else if (view === 'requests') {
          mainContent.innerHTML = this.renderRequestsView(worker, bookings);
        } else if (view === 'active-jobs') {
          mainContent.innerHTML = this.renderActiveJobsView(worker, bookings);
        } else if (view === 'schedule') {
          mainContent.innerHTML = this.renderScheduleView(worker);
          this.attachScheduleEvents(container, worker);
        } else if (view === 'earnings') {
          mainContent.innerHTML = this.renderEarningsView(completedJobs, totalEarnings);
        } else if (view === 'profile') {
          mainContent.innerHTML = this.renderProfileView(worker);
          this.attachProfileEvents(container, worker);
        }
        this.attachActionEvents(container);
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

  attachActionEvents(container) {
    container.querySelectorAll('.accept-request-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.acceptBooking(b, true) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Booking ${bookingId} confirmed!`, 'success');
        this.render(container);
      };
    });

    container.querySelectorAll('.reject-request-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.rejectBooking(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Booking ${bookingId} rejected.`, 'info');
        this.render(container);
      };
    });

    container.querySelectorAll('.counter-request-btn').forEach(btn => {
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

  attachScheduleEvents(container, worker) {
    const toggleOnline = container.querySelector('#toggle-online-status');
    if (toggleOnline) {
      toggleOnline.onclick = () => {
        worker.available = !worker.available;
        let workers = StorageService.getWorkers();
        workers = workers.map(w => w.id === worker.id ? worker : w);
        StorageService.saveWorkers(workers);
        Toast.show(`Online status: ${worker.available ? 'Online' : 'Offline'}`, 'info');
        this.render(container);
      };
    }

    const togglePause = container.querySelector('#toggle-pause-bookings');
    if (togglePause) {
      togglePause.onclick = () => {
        worker.pauseNewBookings = !worker.pauseNewBookings;
        let workers = StorageService.getWorkers();
        workers = workers.map(w => w.id === worker.id ? worker : w);
        StorageService.saveWorkers(workers);
        Toast.show(`Booking status: ${worker.pauseNewBookings ? 'Paused' : 'Active'}`, 'info');
        this.render(container);
      };
    }

    const saveSchedule = container.querySelector('#save-schedule-settings');
    if (saveSchedule) {
      saveSchedule.onclick = () => {
        worker.workingHours = {
          start: container.querySelector('#work-start').value,
          end: container.querySelector('#work-end').value
        };
        let workers = StorageService.getWorkers();
        workers = workers.map(w => w.id === worker.id ? worker : w);
        StorageService.saveWorkers(workers);
        Toast.show('Schedule saved successfully!', 'success');
      };
    }
  },

  attachProfileEvents(container, worker) {
    const form = container.querySelector('#worker-full-profile-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        worker.name = container.querySelector('#wp-name').value;
        worker.phone = container.querySelector('#wp-phone').value;
        worker.bio = container.querySelector('#wp-bio').value;
        worker.pastExperience = container.querySelector('#wp-experience').value;
        worker.certifications = container.querySelector('#wp-certifications').value;
        worker.baseLocality = container.querySelector('#wp-locality').value;
        worker.serviceArea = container.querySelector('#wp-area').value;
        worker.serviceRadius = parseFloat(container.querySelector('#wp-radius').value) || 10;

        let workers = StorageService.getWorkers();
        workers = workers.map(w => w.id === worker.id ? worker : w);
        StorageService.saveWorkers(workers);
        Toast.show('Profile updated successfully!', 'success');
        this.render(container);
      };
    }
  }
};
