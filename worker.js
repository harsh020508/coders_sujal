import { StorageService } from './storage.js';
import { BookingService } from './bookings.js';
import { CATEGORIES, LOCALITIES } from './data.js';
import { Toast } from './toast.js';

function isActionableForWorker(b) {
  if (!b || b.status !== 'Pending') return false;
  if (Array.isArray(b.counterOfferHistory) && b.counterOfferHistory.length > 0) {
    const lastOffer = b.counterOfferHistory[b.counterOfferHistory.length - 1];
    if (lastOffer && lastOffer.sender === 'worker') {
      return false; // Awaiting customer response to counter-offer
    }
  }
  return true;
}

function sortBookingsNewestFirst(list) {
  return [...list].sort((a, b) => {
    const timeA = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });
}

export const WorkerFrontend = {
  currentView: 'overview', // overview, requests, schedule, earnings, profile

  render(container) {
    const workers = StorageService.getWorkers();
    const allBookings = StorageService.getBookings();
    const currentWorkerId = StorageService.getSelectedWorkerId();
    const worker = workers.find(w => w.id === currentWorkerId) || workers[0];
    
    // Sort worker bookings newest first safely without mutating stored array
    const bookings = sortBookingsNewestFirst(allBookings.filter(b => b && b.workerId === worker.id));

    // Get authentic customer reviews for this worker
    const allReviews = StorageService.getReviews();
    const workerReviews = Array.isArray(allReviews) ? allReviews.filter(r => r && r.workerId === worker.id) : [];

    // Calculate metrics
    const pendingRequests = bookings.filter(b => b.status === 'Pending');
    const acceptedBookings = bookings.filter(b => b.status === 'Accepted');
    const inProgressJobs = bookings.filter(b => b.status === 'In Progress');
    const completedJobs = bookings.filter(b => b.status === 'Completed');
    
    // Earnings = sum of agreed prices for completed jobs
    const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Worker Sidebar -->
        <div class="sidebar">
          <div style="padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 0.5rem;">
            <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.35rem;">Select Demo Worker Profile:</label>
            <select id="worker-profile-select" class="form-select" style="font-size: 0.85rem; padding: 0.5rem;">
              ${workers.map(w => {
                const actionableCount = allBookings.filter(b => b && b.workerId === w.id && isActionableForWorker(b)).length;
                const countBadge = actionableCount > 0 ? ` [🔔 ${actionableCount} new request${actionableCount > 1 ? 's' : ''}]` : '';
                return `<option value="${w.id}" ${w.id === worker.id ? 'selected' : ''}>${w.name} (${w.category})${countBadge}</option>`;
              }).join('')}
            </select>
          </div>

          <div class="sidebar-item ${this.currentView === 'overview' ? 'active' : ''}" data-view="overview">
            <span>📊</span> Dashboard Overview
          </div>
          <div class="sidebar-item ${this.currentView === 'requests' ? 'active' : ''}" data-view="requests">
            <span>📥</span> Booking Requests (${pendingRequests.length})
          </div>
          <div class="sidebar-item ${this.currentView === 'schedule' ? 'active' : ''}" data-view="schedule">
            <span>⏰</span> Schedule & Availability
          </div>
          <div class="sidebar-item ${this.currentView === 'earnings' ? 'active' : ''}" data-view="earnings">
            <span>💰</span> Earnings & Reviews (${completedJobs.length})
          </div>
          <div class="sidebar-item ${this.currentView === 'profile' ? 'active' : ''}" data-view="profile">
            <span>👤</span> My Profile & Rates
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="main-content" id="worker-main-content">
          ${this.renderCurrentSubView(worker, pendingRequests, acceptedBookings, inProgressJobs, completedJobs, totalEarnings, workerReviews, bookings)}
        </div>
      </div>
    `;

    this.attachEvents(container);
  },

  renderCurrentSubView(worker, pendingRequests, acceptedBookings, inProgressJobs, completedJobs, totalEarnings, workerReviews, bookings) {
    if (this.currentView === 'requests') {
      return this.renderRequestsView(worker, bookings);
    } else if (this.currentView === 'schedule') {
      return this.renderScheduleView(worker);
    } else if (this.currentView === 'earnings') {
      return this.renderEarningsView(worker, completedJobs, totalEarnings, workerReviews);
    } else if (this.currentView === 'profile') {
      return this.renderProfileView(worker, workerReviews);
    }
    return this.renderOverviewView(worker, pendingRequests, acceptedBookings, inProgressJobs, completedJobs, totalEarnings, workerReviews);
  },

  renderOverviewView(worker, pendingRequests, acceptedBookings, inProgressJobs, completedJobs, totalEarnings, workerReviews = []) {
    const activeList = [...acceptedBookings, ...inProgressJobs];
    return `
      <div class="dashboard-header">
        <div>
          <h1>Welcome back, ${worker.name}! 👋</h1>
          <p>Category: <strong>${worker.category.toUpperCase()}</strong> • Base: ${worker.baseLocality.toUpperCase()} • Rate: ₹${worker.hourlyRate}/hr • Rating: ⭐ <strong>${worker.ratingAverage || 0}</strong> (${worker.ratingCount || 0} reviews)</p>
        </div>
        <div>
          <span class="badge ${worker.available ? 'badge-verified' : 'badge-rejected'}" style="font-size: 0.95rem; padding: 0.5rem 1rem;">
            ${worker.available ? '🟢 Available for Bookings' : '🔴 Currently Unavailable'}
          </span>
        </div>
      </div>

      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card accent">
          <span>Total Earnings</span>
          <h2>₹${totalEarnings}</h2>
        </div>
        <div class="metric-card">
          <span>New Requests</span>
          <h2>${pendingRequests.length}</h2>
        </div>
        <div class="metric-card">
          <span>Accepted / Upcoming</span>
          <h2>${acceptedBookings.length}</h2>
        </div>
        <div class="metric-card">
          <span>Jobs Completed</span>
          <h2>${completedJobs.length}</h2>
        </div>
      </div>

      <!-- Active / Pending Requests Section -->
      <div style="margin-bottom: 2.5rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Incoming Pending Requests (${pendingRequests.length})</h3>
        ${pendingRequests.length === 0 ? `
          <div style="padding: 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); text-align: center; color: var(--text-secondary);">
            No pending booking requests right now. Check back soon or ensure you are set to Available!
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${pendingRequests.map(b => {
              const isAwaitingCustomer = Array.isArray(b.counterOfferHistory) &&
                b.counterOfferHistory.length > 0 &&
                b.counterOfferHistory[b.counterOfferHistory.length - 1].sender === 'worker';
              const lastWorkerCounter = isAwaitingCustomer ? b.counterOfferHistory[b.counterOfferHistory.length - 1] : null;

              return `
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${b.service} (${b.id})</h4>
                  <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Customer: <strong>${b.customerName}</strong> • Address: ${b.address} (${b.locality.toUpperCase()})</p>
                  <p style="font-size: 0.9rem;">Description: ${b.jobDescription}</p>
                  <p style="margin-top: 0.5rem; font-size: 0.95rem;">
                    Original Estimate: <strong>₹${b.originalEstimate}</strong> (${b.estimatedHours} hrs @ ₹${worker.hourlyRate}/hr)
                    ${b.customerOffer ? `<br><span style="color: var(--accent-primary); font-weight: 600;">Customer Offered: ₹${b.customerOffer}</span>` : ''}
                    ${isAwaitingCustomer ? `<br><span style="color: var(--accent-primary); font-weight: 600;">Your Counter-Offer: ₹${lastWorkerCounter.amount} (${lastWorkerCounter.note || 'Awaiting customer response'})</span>` : ''}
                  </p>
                </div>
                <div style="display: flex; gap: 0.75rem; align-items: center;">
                  ${isAwaitingCustomer ? `
                    <span class="badge" style="background: var(--accent-light); color: var(--accent-primary); padding: 0.5rem 0.75rem; font-weight: 600;">
                      ⏳ Awaiting Customer Response (Countered ₹${lastWorkerCounter.amount})
                    </span>
                    <button class="btn btn-danger btn-sm reject-request-btn" data-id="${b.id}">Cancel</button>
                  ` : `
                    <button class="btn btn-primary btn-sm accept-request-btn" data-id="${b.id}">Accept (₹${b.customerOffer || b.originalEstimate})</button>
                    <button class="btn btn-outline btn-sm counter-request-btn" data-id="${b.id}">Counter Offer</button>
                    <button class="btn btn-danger btn-sm reject-request-btn" data-id="${b.id}">Reject</button>
                  `}
                </div>
              </div>
            `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- In Progress & Accepted Jobs -->
      <div style="margin-bottom: 2.5rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Active & Accepted Jobs</h3>
        ${activeList.length === 0 ? `
          <div style="padding: 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); text-align: center; color: var(--text-secondary);">
            No active jobs in progress.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${activeList.map(b => `
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${b.service} (${b.id}) <span class="badge badge-${b.status.toLowerCase().replace(' ', '-')}">${b.status}</span></h4>
                  <p style="color: var(--text-secondary); font-size: 0.9rem;">Customer: ${b.customerName} (${b.customerPhone}) • Address: ${b.address}</p>
                  <p style="margin-top: 0.5rem; font-weight: 600;">Agreed Price: ₹${b.agreedPrice}</p>
                </div>
                <div style="display: flex; gap: 0.75rem;">
                  ${b.status === 'Accepted' ? `<button class="btn btn-primary btn-sm start-job-btn" data-id="${b.id}">Start Job</button>` : ''}
                  ${b.status === 'In Progress' ? `<button class="btn btn-primary btn-sm complete-job-btn" data-id="${b.id}" style="background: var(--success);">Mark Completed</button>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Recent Customer Reviews Section -->
      ${workerReviews.length > 0 ? `
        <div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Recent Customer Feedback</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            ${workerReviews.slice(0, 2).map(r => {
              const stars = '⭐'.repeat(Math.max(1, Math.min(5, parseInt(r.rating) || 5)));
              const dateStr = r.timestamp && !isNaN(new Date(r.timestamp).getTime())
                ? new Date(r.timestamp).toLocaleDateString()
                : 'Recent';
              return `
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1.25rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                    <strong>${r.customerName || 'Customer'}</strong>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</span>
                  </div>
                  <div style="margin-bottom: 0.35rem;">${stars} (${r.rating || 5}/5)</div>
                  <p style="font-size: 0.9rem; color: var(--text-secondary); font-style: italic;">"${r.comment || 'No comment provided.'}"</p>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;
  },

  renderRequestsView(worker, bookings) {
    const pending = bookings.filter(b => b.status === 'Pending');
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
              <th>ID & Date</th>
              <th>Service & Customer</th>
              <th>Description & Locality</th>
              <th>Estimate & Offer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pending.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No pending requests.</td></tr>
            ` : pending.map(b => {
              const createdDisplay = b.createdAt && !isNaN(new Date(b.createdAt).getTime())
                ? new Date(b.createdAt).toLocaleDateString()
                : 'Recent';
              const isAwaitingCustomer = Array.isArray(b.counterOfferHistory) &&
                b.counterOfferHistory.length > 0 &&
                b.counterOfferHistory[b.counterOfferHistory.length - 1].sender === 'worker';
              const lastWorkerCounter = isAwaitingCustomer ? b.counterOfferHistory[b.counterOfferHistory.length - 1] : null;

              return `
              <tr>
                <td><strong>${b.id}</strong><br><small>${createdDisplay}</small></td>
                <td><strong>${b.service}</strong><br>${b.customerName} (${b.customerPhone})</td>
                <td>${b.jobDescription}<br><small>${b.locality.toUpperCase()}</small></td>
                <td>
                  Original: ₹${b.originalEstimate}<br>
                  ${b.customerOffer ? `<strong style="color: var(--accent-primary);">Offer: ₹${b.customerOffer}</strong>` : 'No offer'}
                  ${isAwaitingCustomer ? `<br><span class="badge" style="background: var(--accent-light); color: var(--accent-primary); font-size: 0.72rem; margin-top: 4px; display: inline-block;">Counter: ₹${lastWorkerCounter.amount}</span>` : ''}
                </td>
                <td>
                  ${isAwaitingCustomer ? `
                    <span class="badge" style="background: var(--accent-light); color: var(--accent-primary); font-size: 0.8rem; display: inline-block; margin-bottom: 4px;">
                      ⏳ Awaiting Customer
                    </span><br>
                    <button class="btn btn-danger btn-sm reject-request-btn" data-id="${b.id}">Cancel</button>
                  ` : `
                    <button class="btn btn-primary btn-sm accept-request-btn" data-id="${b.id}">Accept</button>
                    <button class="btn btn-outline btn-sm counter-request-btn" data-id="${b.id}">Counter</button>
                    <button class="btn btn-danger btn-sm reject-request-btn" data-id="${b.id}">Reject</button>
                  `}
                </td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderScheduleView(worker) {
    return `
      <div class="dashboard-header">
        <div>
          <h1>Schedule & Availability</h1>
          <p>Manage your working hours and toggle your availability status.</p>
        </div>
      </div>

      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 2rem; max-width: 600px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 700;">Live Availability Status</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">When offline, you will not receive instant booking requests.</p>
          </div>
          <button class="btn ${worker.available ? 'btn-primary' : 'btn-outline'}" id="toggle-availability-btn" style="background-color: ${worker.available ? 'var(--success)' : 'var(--danger)'}; border-color: transparent; color: white;">
            ${worker.available ? '🟢 Available Now' : '🔴 Unavailable'}
          </button>
        </div>

        <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem;">Working Hours</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Start Time</label>
            <input type="time" id="work-start" class="form-control" value="${worker.workingHours.start}">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">End Time</label>
            <input type="time" id="work-end" class="form-control" value="${worker.workingHours.end}">
          </div>
        </div>
        <button class="btn btn-primary" id="save-schedule-btn">Save Schedule Settings</button>
      </div>
    `;
  },

  renderEarningsView(worker, completedJobs, totalEarnings, workerReviews = []) {
    return `
      <div class="dashboard-header">
        <div>
          <h1>Earnings & Work History</h1>
          <p>Review completed jobs, customer feedback, and total earnings.</p>
        </div>
      </div>

      <div class="metric-card accent" style="max-width: 350px; margin-bottom: 2rem;">
        <span>Total Verified Earnings</span>
        <h2>₹${totalEarnings}</h2>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Service & Customer</th>
              <th>Completed Date</th>
              <th>Agreed Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${completedJobs.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No completed jobs yet.</td></tr>
            ` : completedJobs.map(b => {
              const compDate = (b.completedAt || b.createdAt);
              const dateDisplay = compDate && !isNaN(new Date(compDate).getTime())
                ? new Date(compDate).toLocaleDateString()
                : 'Recent';
              return `
              <tr>
                <td><strong>${b.id}</strong></td>
                <td>${b.service}<br><small>${b.customerName}</small></td>
                <td>${dateDisplay}</td>
                <td><strong>₹${b.agreedPrice}</strong></td>
                <td><span class="badge badge-completed">Completed</span></td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Customer Reviews & Feedback -->
      <div style="margin-top: 3rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700;">Customer Reviews & Feedback (${workerReviews.length})</h3>
          <div style="font-size: 1rem; font-weight: 600; color: var(--accent-primary);">
            Overall Rating: ⭐ ${worker.ratingAverage || 0} (${worker.ratingCount || 0} reviews)
          </div>
        </div>

        ${workerReviews.length === 0 ? `
          <div style="padding: 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); text-align: center; color: var(--text-secondary);">
            No customer reviews yet. Reviews will appear here once customers complete and review services.
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
            ${workerReviews.map(r => {
              const stars = '⭐'.repeat(Math.max(1, Math.min(5, parseInt(r.rating) || 5)));
              const dateStr = r.timestamp && !isNaN(new Date(r.timestamp).getTime())
                ? new Date(r.timestamp).toLocaleDateString()
                : 'Recent';
              return `
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${r.customerName || 'Customer'}</strong>
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">${dateStr}</span>
                  </div>
                  <div>${stars} (${r.rating || 5}/5)</div>
                  <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.25rem; font-style: italic;">
                    "${r.comment || 'No comment provided.'}"
                  </p>
                  ${r.bookingId ? `<small style="color: var(--text-secondary); font-size: 0.75rem;">Booking: ${r.bookingId}</small>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  renderProfileView(worker, workerReviews = []) {
    return `
      <div class="dashboard-header">
        <div>
          <h1>Worker Profile & Rates</h1>
          <p>Update your skills, hourly rate, base locality, and service radius.</p>
        </div>
      </div>

      <form id="worker-profile-form" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 2rem; max-width: 700px; display: flex; flex-direction: column; gap: 1.25rem;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Full Name</label>
            <input type="text" id="p-name" class="form-control" value="${worker.name}" required>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Hourly Rate (₹)</label>
            <input type="number" id="p-rate" class="form-control" value="${worker.hourlyRate}" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Base Locality</label>
            <select id="p-locality" class="form-select">
              ${LOCALITIES.map(l => `<option value="${l.id}" ${l.id === worker.baseLocality ? 'selected' : ''}>${l.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Service Radius (km)</label>
            <input type="number" id="p-radius" class="form-control" value="${worker.serviceRadius}" min="1" max="50" required>
          </div>
        </div>

        <div>
          <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Skills (Comma separated)</label>
          <input type="text" id="p-skills" class="form-control" value="${worker.skills.join(', ')}" required>
        </div>

        <div>
          <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Bio / Description</label>
          <textarea id="p-bio" class="form-control" rows="3">${worker.bio || ''}</textarea>
        </div>

        <button type="submit" class="btn btn-primary" style="align-self: flex-start;">Save Profile Updates</button>
      </form>

      ${workerReviews.length > 0 ? `
        <div style="margin-top: 2rem; max-width: 700px;">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.75rem;">Customer Feedback Received (${workerReviews.length})</h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${workerReviews.map(r => `
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <strong>${r.customerName || 'Customer'}</strong>
                  <span>⭐ ${r.rating || 5}/5</span>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-secondary); font-style: italic;">"${r.comment || 'No comment provided.'}"</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  },

  attachEvents(container) {
    const profileSelect = container.querySelector('#worker-profile-select');
    if (profileSelect) {
      profileSelect.addEventListener('change', (e) => {
        StorageService.setSelectedWorkerId(e.target.value);
        Toast.show(`Switched worker profile`, 'info');
        this.render(container);
      });
    }

    container.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        this.currentView = view;
        container.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const workers = StorageService.getWorkers();
        const allBookings = StorageService.getBookings();
        const currentWorkerId = StorageService.getSelectedWorkerId();
        const worker = workers.find(w => w.id === currentWorkerId) || workers[0];
        const bookings = sortBookingsNewestFirst(allBookings.filter(b => b && b.workerId === worker.id));
        const allReviews = StorageService.getReviews();
        const workerReviews = Array.isArray(allReviews) ? allReviews.filter(r => r && r.workerId === worker.id) : [];

        const pendingRequests = bookings.filter(b => b.status === 'Pending');
        const acceptedBookings = bookings.filter(b => b.status === 'Accepted');
        const inProgressJobs = bookings.filter(b => b.status === 'In Progress');
        const completedJobs = bookings.filter(b => b.status === 'Completed');
        const totalEarnings = completedJobs.reduce((sum, b) => sum + (b.agreedPrice || 0), 0);

        const mainContent = container.querySelector('#worker-main-content');
        if (view === 'overview') {
          mainContent.innerHTML = this.renderOverviewView(worker, pendingRequests, acceptedBookings, inProgressJobs, completedJobs, totalEarnings, workerReviews);
        } else if (view === 'requests') {
          mainContent.innerHTML = this.renderRequestsView(worker, bookings);
        } else if (view === 'schedule') {
          mainContent.innerHTML = this.renderScheduleView(worker);
          this.attachScheduleEvents(container, worker);
        } else if (view === 'earnings') {
          mainContent.innerHTML = this.renderEarningsView(worker, completedJobs, totalEarnings, workerReviews);
        } else if (view === 'profile') {
          mainContent.innerHTML = this.renderProfileView(worker, workerReviews);
          this.attachProfileEvents(container, worker);
        }
        this.attachActionEvents(container);
      });
    });

    const workers = StorageService.getWorkers();
    const currentWorkerId = StorageService.getSelectedWorkerId();
    const worker = workers.find(w => w.id === currentWorkerId) || workers[0];
    if (this.currentView === 'schedule') {
      this.attachScheduleEvents(container, worker);
    } else if (this.currentView === 'profile') {
      this.attachProfileEvents(container, worker);
    }
    this.attachActionEvents(container);
  },

  attachActionEvents(container) {
    container.querySelectorAll('.accept-request-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        const targetBooking = bookings.find(b => b.id === bookingId);
        if (targetBooking && Array.isArray(targetBooking.counterOfferHistory) && targetBooking.counterOfferHistory.length > 0) {
          const last = targetBooking.counterOfferHistory[targetBooking.counterOfferHistory.length - 1];
          if (last && last.sender === 'worker') {
            Toast.show('Cannot accept while awaiting customer response to your counter-offer.', 'warning');
            return;
          }
        }
        bookings = bookings.map(b => b.id === bookingId ? BookingService.acceptBooking(b, true) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Booking ${bookingId} accepted successfully!`, 'success');
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
        let bookings = StorageService.getBookings();
        const targetBooking = bookings.find(b => b.id === bookingId);
        if (targetBooking && Array.isArray(targetBooking.counterOfferHistory) && targetBooking.counterOfferHistory.length > 0) {
          const last = targetBooking.counterOfferHistory[targetBooking.counterOfferHistory.length - 1];
          if (last && last.sender === 'worker') {
            Toast.show('You have already sent a counter-offer for this booking. Awaiting customer response.', 'warning');
            return;
          }
        }
        const amount = prompt('Enter counter offer amount (₹):');
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return;
        const note = prompt('Add optional note for customer (e.g. "Parts cost extra"):') || 'Worker counter-offer';

        bookings = bookings.map(b => b.id === bookingId ? BookingService.workerCounterOffer(b, amount, note) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Counter offer of ₹${amount} sent to customer!`, 'success');
        this.render(container);
      };
    });

    container.querySelectorAll('.start-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.startJob(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Job ${bookingId} started! Status is now In Progress.`, 'info');
        this.render(container);
      };
    });

    container.querySelectorAll('.complete-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.completeJob(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Job ${bookingId} marked Completed! Earnings updated.`, 'success');
        this.render(container);
      };
    });
  },

  attachScheduleEvents(container, worker) {
    const toggleBtn = container.querySelector('#toggle-availability-btn');
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        worker.available = !worker.available;
        let workers = StorageService.getWorkers();
        workers = workers.map(w => w.id === worker.id ? worker : w);
        StorageService.saveWorkers(workers);
        Toast.show(`Availability status updated to ${worker.available ? 'Available' : 'Unavailable'}`, 'info');
        this.render(container);
      };
    }

    const saveScheduleBtn = container.querySelector('#save-schedule-btn');
    if (saveScheduleBtn) {
      saveScheduleBtn.onclick = () => {
        worker.workingHours = {
          start: container.querySelector('#work-start').value,
          end: container.querySelector('#work-end').value
        };
        let workers = StorageService.getWorkers();
        workers = workers.map(w => w.id === worker.id ? worker : w);
        StorageService.saveWorkers(workers);
        Toast.show('Schedule settings saved successfully!', 'success');
      };
    }
  },

  attachProfileEvents(container, worker) {
    const form = container.querySelector('#worker-profile-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        worker.name = container.querySelector('#p-name').value;
        worker.hourlyRate = parseFloat(container.querySelector('#p-rate').value) || worker.hourlyRate;
        worker.baseLocality = container.querySelector('#p-locality').value;
        worker.serviceRadius = parseFloat(container.querySelector('#p-radius').value) || worker.serviceRadius;
        worker.skills = container.querySelector('#p-skills').value.split(',').map(s => s.trim()).filter(Boolean);
        worker.bio = container.querySelector('#p-bio').value;

        let workers = StorageService.getWorkers();
        workers = workers.map(w => w.id === worker.id ? worker : w);
        StorageService.saveWorkers(workers);
        Toast.show('Worker profile updated successfully!', 'success');
        this.render(container);
      };
    }
  }
};
