import { StorageService } from './storage.js';
import { BookingService } from './bookings.js';
import { CATEGORIES, LOCALITIES } from './data.js';
import { Toast } from './toast.js';

export const WorkerFrontend = {
  render(container) {
    const workers = StorageService.getWorkers();
    const currentWorkerId = StorageService.getSelectedWorkerId();
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
        <div class="sidebar">
          <div style="padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 0.5rem;">
            <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.35rem;">Active Professional Profile:</label>
            <select id="worker-profile-select" class="form-select" style="font-size: 0.85rem; padding: 0.5rem;">
              ${workers.map(w => `<option value="${w.id}" ${w.id === worker.id ? 'selected' : ''}>${w.name} (${Object.keys(w.specialities || {}).join(', ')})</option>`).join('')}
            </select>
            <button class="btn btn-outline btn-sm" id="create-new-worker-btn" style="width: 100%; margin-top: 0.5rem; font-size: 0.8rem;">+ Register New Worker</button>
          </div>

          <div class="sidebar-item active" data-view="overview">
            <span>📊</span> Dashboard Overview
          </div>
          <div class="sidebar-item" data-view="requests">
            <span>📥</span> Booking Requests (${pendingRequests.length})
          </div>
          <div class="sidebar-item" data-view="active-jobs">
            <span>⚡</span> Active Jobs (${activeJobs.length})
          </div>
          <div class="sidebar-item" data-view="schedule">
            <span>⏰</span> Availability & Status
          </div>
          <div class="sidebar-item" data-view="earnings">
            <span>💰</span> Earnings & History (${completedJobs.length})
          </div>
          <div class="sidebar-item" data-view="profile">
            <span>👤</span> Profile & Specialities
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="main-content" id="worker-main-content">
          ${this.renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings)}
        </div>
      </div>
    `;

    this.attachEvents(container);
  },

  renderOverviewView(worker, pendingRequests, activeJobs, completedJobs, totalEarnings) {
    return `
      <div class="dashboard-header">
        <div>
          <h1>Welcome back, ${worker.name}! 👋</h1>
          <p>Service Area: <strong>${worker.serviceArea || worker.baseLocality.toUpperCase()}</strong> • Status: <span style="color: ${worker.available && !worker.pauseNewBookings ? 'var(--success)' : 'var(--danger)'};">${worker.available && !worker.pauseNewBookings ? '🟢 Online & Discoverable' : '🔴 Offline / Paused'}</span></p>
        </div>
        <div>
          <button class="btn ${worker.available && !worker.pauseNewBookings ? 'btn-primary' : 'btn-outline'} btn-sm" id="quick-toggle-online">
            ${worker.available && !worker.pauseNewBookings ? '🟢 Go Offline' : '🔴 Go Online'}
          </button>
        </div>
      </div>

      <!-- Metrics Grid -->
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

      <!-- Pending Requests Section -->
      <div style="margin-bottom: 2.5rem;">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Incoming Booking Requests (${pendingRequests.length})</h3>
        ${pendingRequests.length === 0 ? `
          <div style="padding: 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); text-align: center; color: var(--text-secondary);">
            No pending booking requests right now. Ensure you are online and discoverable!
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${pendingRequests.map(b => `
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${b.serviceCategory.toUpperCase()} — ${b.serviceTask} (${b.id})</h4>
                  <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Customer: <strong>${b.customerName}</strong> (${b.customerPhone}) • Address: ${b.address} (${b.locality.toUpperCase()})</p>
                  <p style="font-size: 0.9rem;">Problem: ${b.jobDescription}</p>
                  <p style="margin-top: 0.5rem; font-size: 0.95rem;">
                    Date & Time: <strong>${b.appointmentDate} @ ${b.appointmentTime}</strong><br>
                    Estimated Amount: <strong>₹${b.basePrice + b.visitingCharge}</strong> (Base ₹${b.basePrice} + Visiting ₹${b.visitingCharge})
                    ${b.customerOffer ? `<br><span style="color: var(--accent-primary); font-weight: 600;">Customer Offered: ₹${b.customerOffer}</span>` : ''}
                  </p>
                </div>
                <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
                  <button class="btn btn-primary btn-sm accept-request-btn" data-id="${b.id}">Accept (₹${b.customerOffer || (b.basePrice + b.visitingCharge)})</button>
                  <button class="btn btn-outline btn-sm counter-request-btn" data-id="${b.id}">Counter Offer</button>
                  <button class="btn btn-danger btn-sm reject-request-btn" data-id="${b.id}">Reject</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Active Job Controls Section -->
      <div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Active Job Lifecycle Controls</h3>
        ${activeJobs.length === 0 ? `
          <div style="padding: 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); text-align: center; color: var(--text-secondary);">
            No active jobs in progress.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${activeJobs.map(b => `
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${b.serviceTask} (${b.id}) <span class="badge badge-accepted">${b.status}</span></h4>
                  <p style="color: var(--text-secondary); font-size: 0.9rem;">Customer: ${b.customerName} (${b.customerPhone}) • Address: ${b.address}</p>
                  <p style="margin-top: 0.5rem; font-weight: 600;">Confirmed Agreed Price: ₹${b.agreedPrice}</p>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  ${b.status === 'Confirmed' ? `<button class="btn btn-outline btn-sm enroute-job-btn" data-id="${b.id}">🚗 I'm On My Way</button>` : ''}
                  ${b.status === 'Worker en route' ? `<button class="btn btn-outline btn-sm arrived-job-btn" data-id="${b.id}">📍 Confirm Arrival</button>` : ''}
                  ${['Confirmed', 'Worker en route', 'Worker arrived'].includes(b.status) ? `<button class="btn btn-primary btn-sm start-job-btn" data-id="${b.id}">▶️ Start Job</button>` : ''}
                  ${b.status === 'Job in progress' ? `<button class="btn btn-primary btn-sm complete-job-btn" data-id="${b.id}" style="background: var(--success);">✅ Complete Job</button>` : ''}
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
              <th>Problem & Address</th>
              <th>Pricing</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pending.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No pending requests.</td></tr>
            ` : pending.map(b => `
              <tr>
                <td><strong>${b.id}</strong><br><small>${new Date(b.createdAt).toLocaleDateString()}</small></td>
                <td><strong>${b.serviceCategory.toUpperCase()}</strong><br>${b.customerName} (${b.customerPhone})</td>
                <td>${b.jobDescription}<br><small>${b.address} (${b.locality.toUpperCase()})</small></td>
                <td>Standard: ₹${b.basePrice + b.visitingCharge}<br>${b.customerOffer ? `<strong style="color: var(--accent-primary);">Offer: ₹${b.customerOffer}</strong>` : ''}</td>
                <td>
                  <button class="btn btn-primary btn-sm accept-request-btn" data-id="${b.id}">Accept</button>
                  <button class="btn btn-outline btn-sm counter-request-btn" data-id="${b.id}">Counter</button>
                  <button class="btn btn-danger btn-sm reject-request-btn" data-id="${b.id}">Reject</button>
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
              <th>ID</th>
              <th>Service & Customer</th>
              <th>Appointment Slot</th>
              <th>Status</th>
              <th>Lifecycle Actions</th>
            </tr>
          </thead>
          <tbody>
            ${active.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No active jobs.</td></tr>
            ` : active.map(b => `
              <tr>
                <td><strong>${b.id}</strong></td>
                <td>${b.serviceTask}<br>${b.customerName}</td>
                <td>${b.appointmentDate} @ ${b.appointmentTime}</td>
                <td><span class="badge badge-accepted">${b.status}</span></td>
                <td>
                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${b.status === 'Confirmed' ? `<button class="btn btn-outline btn-sm enroute-job-btn" data-id="${b.id}">🚗 En Route</button>` : ''}
                    ${b.status === 'Worker en route' ? `<button class="btn btn-outline btn-sm arrived-job-btn" data-id="${b.id}">📍 Arrived</button>` : ''}
                    ${['Confirmed', 'Worker en route', 'Worker arrived'].includes(b.status) ? `<button class="btn btn-primary btn-sm start-job-btn" data-id="${b.id}">Start</button>` : ''}
                    ${b.status === 'Job in progress' ? `<button class="btn btn-primary btn-sm complete-job-btn" data-id="${b.id}" style="background: var(--success);">Complete</button>` : ''}
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
            <p style="color: var(--text-secondary); font-size: 0.9rem;">When online, you appear in customer search results for your specialities.</p>
          </div>
          <button class="btn ${worker.available && !worker.pauseNewBookings ? 'btn-primary' : 'btn-outline'}" id="toggle-online-status" style="background-color: ${worker.available && !worker.pauseNewBookings ? 'var(--success)' : 'var(--danger)'}; border-color: transparent; color: white;">
            ${worker.available && !worker.pauseNewBookings ? '🟢 Online' : '🔴 Offline'}
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
              <input type="time" id="work-start" class="form-control" value="${worker.workingHours?.start || '09:00'}">
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">End Time</label>
              <input type="time" id="work-end" class="form-control" value="${worker.workingHours?.end || '19:00'}">
            </div>
          </div>
          <button class="btn btn-primary" id="save-schedule-settings">Save Schedule</button>
        </div>
      </div>
    `;
  },

  renderEarningsView(completedJobs, totalEarnings) {
    return `
      <div class="dashboard-header">
        <div>
          <h1>Earnings & Completed Jobs</h1>
          <p>Track earnings from verified completed appointments.</p>
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
              <th>Agreed Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${completedJobs.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No completed jobs yet.</td></tr>
            ` : completedJobs.map(b => `
              <tr>
                <td><strong>${b.id}</strong></td>
                <td>${b.serviceTask}<br><small>${b.customerName}</small></td>
                <td>${new Date(b.completedAt || b.createdAt).toLocaleDateString()}</td>
                <td><strong>₹${b.agreedPrice}</strong></td>
                <td><span class="badge badge-completed">Completed</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderProfileView(worker) {
    const specialitiesKeys = Object.keys(worker.specialities || {});
    return `
      <div class="dashboard-header">
        <div>
          <h1>Profile & Specialities</h1>
          <p>Manage your professional bio, service areas, and service-specific pricing.</p>
        </div>
      </div>

      <form id="worker-full-profile-form" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 2rem; max-width: 800px; display: flex; flex-direction: column; gap: 1.5rem;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Full Name</label>
            <input type="text" id="wp-name" class="form-control" value="${worker.name}" required>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Phone Number</label>
            <input type="text" id="wp-phone" class="form-control" value="${worker.phone || ''}" required>
          </div>
        </div>

        <div>
          <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Professional Bio</label>
          <textarea id="wp-bio" class="form-control" rows="3" required>${worker.bio || ''}</textarea>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Base Locality</label>
            <select id="wp-locality" class="form-select">
              ${LOCALITIES.map(l => `<option value="${l.id}" ${l.id === worker.baseLocality ? 'selected' : ''}>${l.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Service Area Description</label>
            <input type="text" id="wp-area" class="form-control" value="${worker.serviceArea || ''}" required>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Service Radius (km)</label>
            <input type="number" id="wp-radius" class="form-control" value="${worker.serviceRadius || 10}" min="1" max="50" required>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Configured Specialities & Service-Specific Pricing</h3>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${specialitiesKeys.map(sk => {
              const catObj = CATEGORIES.find(c => c.id === sk) || { name: sk };
              const info = worker.specialities[sk] || {};
              return `
                <div style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
                  <h4 style="font-size: 1rem; font-weight: 600; color: var(--accent-primary); margin-bottom: 0.5rem;">${catObj.name}</h4>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; font-size: 0.9rem;">
                    <div><strong>Starting Price:</strong> ₹${info.startingPrice || 350}</div>
                    <div><strong>Visiting Charge:</strong> ₹${info.visitingCharge || 100}</div>
                    <div><strong>Method:</strong> ${info.pricingMethod || 'hourly'}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="align-self: flex-start;">Save Profile Updates</button>
      </form>
    `;
  },

  renderOnboarding(container, worker) {
    container.innerHTML = `
      <div class="role-selection-wrapper" style="max-width: 700px; margin: 0 auto; padding: 3rem 1rem;">
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem; text-align: center;">Worker Professional Onboarding</h1>
        <p style="color: var(--text-secondary); text-align: center; margin-bottom: 2rem;">Complete your profile and specialities to go online and receive customer bookings.</p>

        <form id="onboarding-form" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 2.5rem; display: flex; flex-direction: column; gap: 1.5rem; box-shadow: var(--shadow-lg);">
          <h3 style="font-size: 1.25rem; font-weight: 700; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">Step 1 — Basic Profile Information</h3>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Full Name</label>
              <input type="text" id="ob-name" class="form-control" value="${worker?.name || ''}" placeholder="e.g. Rajesh Kumar" required>
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Phone Number</label>
              <input type="text" id="ob-phone" class="form-control" value="${worker?.phone || '+91 98200 11223'}" required>
            </div>
          </div>

          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Professional Bio</label>
            <textarea id="ob-bio" class="form-control" rows="3" placeholder="Describe your experience and reliability..." required>${worker?.bio || 'Experienced and reliable local service professional in Mumbai.'}</textarea>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Base Locality</label>
              <select id="ob-locality" class="form-select">
                ${LOCALITIES.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Service Area</label>
              <input type="text" id="ob-area" class="form-control" value="Andheri, Bandra & Juhu" required>
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Radius (km)</label>
              <input type="number" id="ob-radius" class="form-control" value="10" min="1" max="50" required>
            </div>
          </div>

          <h3 style="font-size: 1.25rem; font-weight: 700; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-top: 1rem;">Step 2 & 3 — Select Specialities & Service-Specific Pricing</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary);">Select the categories you provide services for and set your starting prices.</p>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;" id="speciality-checkboxes">
            ${CATEGORIES.map(c => `
              <label style="display: flex; align-items: center; gap: 0.75rem; background: var(--bg-primary); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;">
                <input type="checkbox" name="speciality" value="${c.id}" style="width: 18px; height: 18px;" ${c.id === 'electrician' ? 'checked' : ''}>
                <div>
                  <div style="font-weight: 600;">${c.icon} ${c.name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">Starting @ ₹350</div>
                </div>
              </label>
            `).join('')}
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top: 1.5rem; padding: 0.85rem; font-size: 1.05rem;">Complete Onboarding & Go Online</button>
        </form>
      </div>
    `;

    container.querySelector('#onboarding-form').onsubmit = (e) => {
      e.preventDefault();
      const name = container.querySelector('#ob-name').value;
      const phone = container.querySelector('#ob-phone').value;
      const bio = container.querySelector('#ob-bio').value;
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
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          ratingAverage: 5.0,
          ratingCount: 1,
          verificationStatus: 'Verified'
        };
        workers.push(targetWorker);
      }

      targetWorker.name = name;
      targetWorker.phone = phone;
      targetWorker.bio = bio;
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
      Toast.show('Onboarding completed successfully! You are now online.', 'success');
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
        const amount = prompt('Enter counter offer amount (₹):');
        if (!amount) return;
        const note = prompt('Add optional note for customer (e.g. "Parts cost extra"):') || 'Counter-offer';

        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.workerCounterOffer(b, amount, note) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Counter offer of ₹${amount} sent to customer!`, 'success');
        this.render(container);
      };
    });

    container.querySelectorAll('.enroute-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.setEnRoute(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Status updated: Worker en route.`, 'info');
        this.render(container);
      };
    });

    container.querySelectorAll('.arrived-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.setArrived(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Status updated: Worker arrived at location.`, 'info');
        this.render(container);
      };
    });

    container.querySelectorAll('.start-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.startJob(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Job ${bookingId} started!`, 'success');
        this.render(container);
      };
    });

    container.querySelectorAll('.complete-job-btn').forEach(btn => {
      btn.onclick = () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.completeJob(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Job ${bookingId} completed successfully!`, 'success');
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
