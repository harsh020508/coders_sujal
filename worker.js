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
      const myWorker = workers.find(w => (w.user_id && w.user_id === authProfile.id) || w.id === `w_${authProfile.id.substring(0, 8)}` || (authProfile.phone && w.phone === authProfile.phone));
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
        <div class="sidebar">
          <div style="padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 0.5rem;">
            <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.35rem;">Active Professional Profile:</label>
            <select id="worker-profile-select" class="form-select" style="font-size: 0.85rem; padding: 0.5rem;"> 
              ${workers.map(w => `<option value="${esc(w.id)}" ${w.id === worker.id ? 'selected' : ''}>${esc(w.name)} (${Object.keys(w.specialities || {}).join(', ')})</option>`).join('')} 
            </select>
            <button class="btn btn-outline btn-sm" id="create-new-worker-btn" style="width: 100%; margin-top: 0.5rem; font-size: 0.8rem;">+ Register New Worker</button>
          </div>

          <div class="sidebar-item ${currentView === 'overview' ? 'active' : ''}" data-view="overview">
            <span>📊</span> Dashboard Overview
          </div>
          <div class="sidebar-item ${currentView === 'requests' ? 'active' : ''}" data-view="requests">
            <span>📥</span> Booking Requests (${pendingRequests.length})
          </div>
          <div class="sidebar-item ${currentView === 'active-jobs' ? 'active' : ''}" data-view="active-jobs">
            <span>⚡</span> Active Jobs (${activeJobs.length})
          </div>
          <div class="sidebar-item ${currentView === 'schedule' ? 'active' : ''}" data-view="schedule">
            <span>⏰</span> Availability & Status
          </div>
          <div class="sidebar-item ${currentView === 'earnings' ? 'active' : ''}" data-view="earnings">
            <span>💰</span> Earnings & History (${completedJobs.length})
          </div>
          <div class="sidebar-item ${currentView === 'profile' ? 'active' : ''}" data-view="profile">
            <span>👤</span> Profile & Specialities
          </div>
          <div class="sidebar-item ${currentView === 'feedback' ? 'active' : ''}" data-view="feedback">
            <span>💬</span> Feedback & Reviews
          </div>
          <div class="sidebar-item ${currentView === 'help-centre' ? 'active' : ''}" data-view="help-centre">
            <span>❓</span> Help Centre
          </div>
          <div class="sidebar-item ${currentView === 'complaints' ? 'active' : ''}" data-view="complaints">
            <span>📋</span> Complaints
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="main-content" id="worker-main-content">
          ${this.renderMainContent(currentView, worker, pendingRequests, activeJobs, completedJobs, totalEarnings)}
        </div>
      </div>
    `;

    this.attachEvents(container);
  },

  renderMainContent(view, worker, pendingRequests, activeJobs, completedJobs, totalEarnings) {
    switch (view) {
      case 'overview':
        return this.renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings);
      case 'requests':
        return this.renderRequestsView(worker, bookings);
      case 'active-jobs':
        return this.renderActiveJobsView(worker, bookings);
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
          <h1>Welcome back, ${esc(worker.name)}! 👋</h1>
          <p>Service Area: <strong>${esc(worker.serviceArea || worker.baseLocality)}</strong> • Status: <span style="color: ${isOnline ? 'var(--success)' : 'var(--danger)'};">${isOnline ? '🟢 Online & Discoverable' : '🔴 Offline / Paused'}</span></p>
        </div>
        <div>
          <button class="btn ${isOnline ? 'btn-primary' : 'btn-outline'} btn-sm" id="quick-toggle-online">
            ${isOnline ? '🟢 Go Offline' : '🔴 Go Online'}
          </button>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card accent">
          <span>Total Verified Earnings</span>
          <h2>₹${totalEarnings}</h2>
        </div>
        <div class="metric-card">
          <span>New Requests</span>
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

      <div class="dashboard-header">
        <div>Earnings & Completed Jobs</div>
      </div>
      <div class="main-content" id="worker-main-content">
        ${this.renderEarningsDashboardView(worker.id)}
      </div>

      <div class="dashboard-header">
        <div>Feedback & Reviews</div>
      </div>
      <div class="main-content" id="worker-main-content">
        ${WorkerFeedback.renderFeedbackSection(worker)}
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
      <button class="csv-export-btn btn btn-outline" style="margin-bottom: 1rem; padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="window.WorkerFrontend.exportCSV(${workerId})">
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
          <h1>Booking Requests</h1>
          <p>Review incoming service requests, accept offers, or propose counter-offers.</p>
        </div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID & Date</th> <th>Service & Customer</th> <th>Problem & Address</th> <th>Pricing</th> <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pending.length === 0 ? ` 
              <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No pending requests.</td></tr> 
            ` : pending.map(b => `
              <tr>
                <td><strong>${esc(b.id)}</strong><br><small>${new Date(b.createdAt).toLocaleDateString()}</small></td>
                <td><strong>${esc(b.serviceCategory.toUpperCase())}</strong><br>${esc(b.customerName)} (${esc(b.customerPhone)})</td>
                <td>${esc(b.jobDescription)}<br><small>${esc(b.address)} (${esc(b.locality.toUpperCase())})</small></td>
                <td>Standard: ₹${b.basePrice + b.visitingCharge}<br>${b.customerOffer ? `<strong style="color: var(--accent-primary);">Offer: ₹${b.customerOffer}</strong>` : ''}</td>
                <td> 
                  <button class="btn btn-primary btn-sm accept-request-btn" data-id="${esc(b.id)}">Accept</button>
                  <button class="btn btn-outline btn-sm counter-request-btn" data-id="${esc(b.id)}">Counter</button>
                  <button class="btn btn-danger btn-sm reject-request-btn" data-id="${esc(b.id)}">Reject</button>
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
          <h1>Active Jobs Management</h1>
          <p>Manage appointment progress, transit status, and job completion.</p>
        </div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th> <th>Service & Customer</th> <th>Appointment Slot</th> <th>Status</th> <th>Lifecycle Actions</th>
            </tr>
          </thead>
          <tbody>
            ${active.length === 0 ? ` 
              <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No active jobs.</td></tr> 
            ` : active.map(b => `
              <tr>
                <td><strong>${esc(b.id)}</strong></td>
                <td>${esc(b.serviceTask)}<br>${esc(b.customerName)}</td>
                <td>${esc(b.appointmentDate)} @ ${esc(b.appointmentTime)}</td>
                <td><span class="badge badge-accepted">${esc(b.status)}</span></td>
                <td> 
                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${b.status === 'Confirmed' ? `<button class="btn btn-outline btn-sm enroute-job-btn" data-id="${esc(b.id)}">🚗 En Route</button>` : ''} 
                    ${b.status === 'Worker en route' ? `<button class="btn btn-outline btn-sm arrived-job-btn" data-id="${esc(b.id)}">📍 Arrived</button>` : ''} 
                    ${['Confirmed', 'Worker en route', 'Worker arrived'].includes(b.status) ? `<button class="btn btn-primary btn-sm start-job-btn" data-id="${esc(b.id)}">Start</button>` : ''} 
                    ${b.status === 'Job in progress' ? `<button class="btn btn-primary btn-sm complete-job-btn" data-id="${esc(b.id)}" style="background: var(--success);">Complete</button>` : ''} 
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
          <h1>Availability & Service Status</h1>
          <p>Control your online discovery status and working schedule.</p>
        </div>
      </div>

      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 2rem; max-width: 650px; display: flex; flex-direction: column; gap: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700;">Online Discovery Status</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">When offline, you will not show up in any customer search results.</p>
          </div>
          <button class="btn ${isOnline ? 'btn-primary' : 'btn-outline'}" id="toggle-online-status" style="background-color: ${isOnline ? 'var(--success)' : 'var(--danger)'; border-color: transparent; color: white;"> 
            ${isOnline ? '🟢 Online' : '🔴 Offline'} 
          </button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700;">Pause New Bookings</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">Temporarily stop receiving new requests while finishing existing jobs.</p>
          </div>
          <button class="btn ${worker.pauseNewBookings ? 'btn-danger' : 'btn-outline'}" id="toggle-pause-bookings">
            ${worker.pauseNewBookings ? '⏸️ Bookings Paused' : '▶️ Accepting Requests'}
          </button>
        </div>

        <div>
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem;">Working Hours</h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Start Time</label>
              <input type="time" id="work-start" class="form-control" value="${esc(worker.workingHours?.start || '09:00')}">
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">End Time</label>
              <input type="time" id="work-end" class="form-control" value="${esc(worker.workingHours?.end || '19:00')}">
            </div>
          </div>
          <button class="btn btn-primary" id="save-schedule-settings">Save Schedule</button>
        </div>
      </div>
    `;
  },

  renderFeedbackView(worker) {
    return WorkerFeedback.renderFeedbackSection(worker);
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
              <button type="button" class="btn btn-outline" onclick="this.form.reset(); hideTicketForm()">Cancel</button>
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
              <button type="button" class="btn btn-outline" onclick="hideComplaintForm()">Cancel</button>
              <button type="submit" class="btn btn-primary">Submit Complaint</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  getStatusColor(status) {
    const colors = {
      open: '#f87171',
      'in-progress': '#f6ad55',
      resolved: '#34d399'
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
        const reviewId = btn.getAttribute('data-review-id');
        if (worker) {
          WorkerFeedback.respondToReview(reviewId, worker.id);
        }
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