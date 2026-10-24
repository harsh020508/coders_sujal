import { StorageService } from './storage.js';
import { MatchingService } from './matching.js';
import { BookingService } from './bookings.js';
import { CATEGORIES, LOCALITIES } from './data.js';
import { Toast } from './toast.js';

export const CustomerFrontend = {
  currentCategory: 'all',
  searchQuery: '',
  comparedWorkers: [],
  sortBy: 'match', // match, rating, price_low, distance

  render(container) {
    const workers = StorageService.getWorkers();
    const bookings = StorageService.getBookings();
    const customerLocality = StorageService.getCustomerLocality();
    let eligibleWorkers = MatchingService.getEligibleWorkers(workers, customerLocality, this.currentCategory, this.searchQuery);

    // Apply sorting
    eligibleWorkers = this.sortWorkers(eligibleWorkers);

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Customer Sidebar -->
        <div class="sidebar">
          <div class="sidebar-item active" data-view="discover">
            <span>🔍</span> Discover Services
          </div>
          <div class="sidebar-item" data-view="bookings">
            <span>📅</span> My Bookings (${bookings.length})
          </div>
          <div class="sidebar-item" data-view="compare" id="compare-sidebar-btn">
            <span>⚖️</span> Compare Workers (${this.comparedWorkers.length}/3)
          </div>
          <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-color);">
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Current Locality:</div>
            <select id="locality-select" class="form-select" style="font-size: 0.85rem; padding: 0.5rem;">
              ${LOCALITIES.map(l => `<option value="${l.id}" ${l.id === customerLocality ? 'selected' : ''}>${l.name} (${l.zone})</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="main-content" id="customer-main-content">
          ${this.renderDiscoverView(eligibleWorkers)}
        </div>
      </div>
    `;

    this.attachEvents(container);
  },

  sortWorkers(workers) {
    return [...workers].sort((a, b) => {
      if (this.sortBy === 'rating') return b.ratingAverage - a.ratingAverage;
      if (this.sortBy === 'price_low') return a.hourlyRate - b.hourlyRate;
      if (this.sortBy === 'distance') return a.distance - b.distance;
      return a.matchScore - b.matchScore; // default match
    });
  },

  renderDiscoverView(eligibleWorkers) {
    return `
      <div class="dashboard-header">
        <div>
          <h1>Find Local Service Professionals</h1>
          <p>Verified experts right around your corner in Mumbai with transparent rates & fast ETA.</p>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="search-filter-bar">
        <div class="search-input-group">
          <input type="text" id="service-search-input" placeholder="Search 'Leaking tap', 'Wiring', 'Deep cleaning'..." value="${this.searchQuery}">
        </div>
        <select id="category-filter-select" class="form-select" style="max-width: 180px;">
          <option value="all">All Categories</option>
          ${CATEGORIES.map(c => `<option value="${c.id}" ${this.currentCategory === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
        </select>
        <select id="sort-by-select" class="form-select" style="max-width: 170px;">
          <option value="match" ${this.sortBy === 'match' ? 'selected' : ''}>✨ Best Match</option>
          <option value="rating" ${this.sortBy === 'rating' ? 'selected' : ''}>⭐ Highest Rated</option>
          <option value="price_low" ${this.sortBy === 'price_low' ? 'selected' : ''}>💵 Lowest Price</option>
          <option value="distance" ${this.sortBy === 'distance' ? 'selected' : ''}>📍 Nearest First</option>
        </select>
      </div>

      <!-- Categories Shortcuts -->
      <div style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem;">Popular Categories</h3>
        <div style="display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem;">
          <button class="btn ${this.currentCategory === 'all' ? 'btn-primary' : 'btn-outline'} btn-sm cat-shortcut-btn" data-cat="all">🌟 All</button>
          ${CATEGORIES.map(c => `
            <button class="btn ${this.currentCategory === c.id ? 'btn-primary' : 'btn-outline'} btn-sm cat-shortcut-btn" data-cat="${c.id}">${c.icon} ${c.name}</button>
          `).join('')}
        </div>
      </div>

      <!-- Workers Results Grid -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="font-size: 1.2rem; font-weight: 700;">Available Professionals Nearby (${eligibleWorkers.length})</h3>
        ${this.comparedWorkers.length > 0 ? `<button class="btn btn-outline btn-sm" id="open-comparison-modal">View Comparison (${this.comparedWorkers.length})</button>` : ''}
      </div>

      ${eligibleWorkers.length === 0 ? `
        <div style="text-align: center; padding: 4rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">No professionals found in this locality or radius</h3>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">Try changing your locality or clearing search filters.</p>
        </div>
      ` : `
        <div class="workers-grid">
          ${eligibleWorkers.map(w => `
            <div class="worker-card">
              <div class="worker-header">
                <img src="${w.avatar}" alt="${w.name}" class="worker-avatar">
                <div class="worker-info" style="flex: 1;">
                  <h3>${w.name} ${w.verificationStatus === 'Verified' ? '<span title="Verified Professional" style="color: #10b981; font-size: 0.9rem;">✓</span>' : ''}</h3>
                  <span class="worker-cat-badge">${w.category}</span>
                </div>
                <div>
                  <label style="font-size: 0.75rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                    <input type="checkbox" class="compare-checkbox" data-id="${w.id}" ${this.comparedWorkers.includes(w.id) ? 'checked' : ''}> Compare
                  </label>
                </div>
              </div>

              <div class="worker-meta">
                <div class="worker-meta-item">
                  <span>Distance & ETA</span>
                  <span>📍 ${w.distance} km (~${w.eta} mins)</span>
                </div>
                <div class="worker-meta-item">
                  <span>Rating</span>
                  <span>⭐ ${w.ratingAverage} (${w.ratingCount} reviews)</span>
                </div>
                <div class="worker-meta-item">
                  <span>Experience</span>
                  <span>🏆 ${w.experience} Years</span>
                </div>
                <div class="worker-meta-item">
                  <span>Status</span>
                  <span style="color: ${w.available ? 'var(--success)' : 'var(--danger)'};">${w.available ? '🟢 Available' : '🔴 Busy'}</span>
                </div>
              </div>

              <div class="worker-skills">
                ${w.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
              </div>

              <div class="worker-footer">
                <div class="worker-rate">
                  ₹${w.hourlyRate} <span>/ hour</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-outline btn-sm view-worker-profile-btn" data-id="${w.id}">Details</button>
                  <button class="btn btn-primary btn-sm book-worker-btn" data-id="${w.id}">Book Now</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  },

  renderBookingsView() {
    const bookings = StorageService.getBookings();
    const workers = StorageService.getWorkers();

    return `
      <div class="dashboard-header">
        <div>
          <h1>My Bookings & Jobs</h1>
          <p>Track your active requests, ongoing work, and history with local service professionals.</p>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Service & Worker</th>
              <th>Locality & Address</th>
              <th>Agreed Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.length === 0 ? `
              <tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No bookings found. Discover professionals and book a service!</td></tr>
            ` : bookings.map(b => {
              const worker = workers.find(w => w.id === b.workerId) || { name: 'Professional', phone: '+91 99999 99999' };
              const statusBadgeClass = {
                'Pending': 'badge-pending',
                'Accepted': 'badge-accepted',
                'In Progress': 'badge-in-progress',
                'Completed': 'badge-completed',
                'Rejected': 'badge-rejected',
                'Cancelled': 'badge-cancelled'
              }[b.status] || 'badge-pending';

              return `
                <tr>
                  <td><strong>${b.id}</strong><br><small style="color: var(--text-secondary);">${new Date(b.createdAt).toLocaleDateString()}</small></td>
                  <td>
                    <strong>${b.service}</strong><br>
                    <span style="color: var(--accent-primary); font-weight: 500;">${worker.name}</span>
                  </td>
                  <td>${b.locality.toUpperCase()}<br><small style="color: var(--text-secondary);">${b.address}</small></td>
                  <td><strong>₹${b.agreedPrice}</strong> ${b.customerOffer ? `<br><small style="color: var(--text-secondary);">Offer: ₹${b.customerOffer}</small>` : ''}</td>
                  <td><span class="badge ${statusBadgeClass}">${b.status}</span></td>
                  <td>
                    <button class="btn btn-outline btn-sm view-booking-details-btn" data-id="${b.id}">Details</button>
                    ${b.status === 'Pending' || b.status === 'Accepted' ? `<button class="btn btn-danger btn-sm cancel-booking-btn" data-id="${b.id}">Cancel</button>` : ''}
                    ${b.status === 'Completed' ? `
                      <button class="btn btn-primary btn-sm invoice-btn" data-id="${b.id}">Invoice</button>
                      ${!b.reviewId ? `<button class="btn btn-outline btn-sm review-booking-btn" data-id="${b.id}">Review</button>` : ''}
                    ` : ''}
                    <button class="btn btn-outline btn-sm complaint-booking-btn" data-id="${b.id}" style="margin-top: 2px;">Report Issue</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  attachEvents(container) {
    const localitySelect = container.querySelector('#locality-select');
    if (localitySelect) {
      localitySelect.addEventListener('change', (e) => {
        StorageService.setCustomerLocality(e.target.value);
        Toast.show(`Locality switched to ${e.target.options[e.target.selectedIndex].text}`, 'info');
        this.render(container);
      });
    }

    container.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        container.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const mainContent = container.querySelector('#customer-main-content');
        if (view === 'discover') {
          const workers = StorageService.getWorkers();
          const customerLocality = StorageService.getCustomerLocality();
          let eligible = MatchingService.getEligibleWorkers(workers, customerLocality, this.currentCategory, this.searchQuery);
          eligible = this.sortWorkers(eligible);
          mainContent.innerHTML = this.renderDiscoverView(eligible);
          this.attachDiscoverEvents(container);
        } else if (view === 'bookings') {
          mainContent.innerHTML = this.renderBookingsView();
          this.attachBookingsEvents(container);
        } else if (view === 'compare') {
          this.showComparisonModal(container);
        }
      });
    });

    this.attachDiscoverEvents(container);
  },

  attachDiscoverEvents(container) {
    const searchInput = container.querySelector('#service-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        const workers = StorageService.getWorkers();
        const customerLocality = StorageService.getCustomerLocality();
        let eligible = MatchingService.getEligibleWorkers(workers, customerLocality, this.currentCategory, this.searchQuery);
        eligible = this.sortWorkers(eligible);
        container.querySelector('#customer-main-content').innerHTML = this.renderDiscoverView(eligible);
        this.attachDiscoverEvents(container);
      });
    }

    const catSelect = container.querySelector('#category-filter-select');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.currentCategory = e.target.value;
        const workers = StorageService.getWorkers();
        const customerLocality = StorageService.getCustomerLocality();
        let eligible = MatchingService.getEligibleWorkers(workers, customerLocality, this.currentCategory, this.searchQuery);
        eligible = this.sortWorkers(eligible);
        container.querySelector('#customer-main-content').innerHTML = this.renderDiscoverView(eligible);
        this.attachDiscoverEvents(container);
      });
    }

    const sortSelect = container.querySelector('#sort-by-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        const workers = StorageService.getWorkers();
        const customerLocality = StorageService.getCustomerLocality();
        let eligible = MatchingService.getEligibleWorkers(workers, customerLocality, this.currentCategory, this.searchQuery);
        eligible = this.sortWorkers(eligible);
        container.querySelector('#customer-main-content').innerHTML = this.renderDiscoverView(eligible);
        this.attachDiscoverEvents(container);
      });
    }

    container.querySelectorAll('.cat-shortcut-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentCategory = btn.getAttribute('data-cat');
        const workers = StorageService.getWorkers();
        const customerLocality = StorageService.getCustomerLocality();
        let eligible = MatchingService.getEligibleWorkers(workers, customerLocality, this.currentCategory, this.searchQuery);
        eligible = this.sortWorkers(eligible);
        container.querySelector('#customer-main-content').innerHTML = this.renderDiscoverView(eligible);
        this.attachDiscoverEvents(container);
      });
    });

    container.querySelectorAll('.compare-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = chk.getAttribute('data-id');
        if (chk.checked) {
          if (this.comparedWorkers.length >= 3) {
            Toast.show('You can compare a maximum of 3 workers side by side.', 'warning');
            chk.checked = false;
            return;
          }
          if (!this.comparedWorkers.includes(id)) this.comparedWorkers.push(id);
          Toast.show('Worker added to comparison', 'info');
        } else {
          this.comparedWorkers = this.comparedWorkers.filter(wid => wid !== id);
        }
        const compareBtn = container.querySelector('#compare-sidebar-btn');
        if (compareBtn) compareBtn.innerHTML = `<span>⚖️</span> Compare Workers (${this.comparedWorkers.length}/3)`;
      });
    });

    const openCompareModalBtn = container.querySelector('#open-comparison-modal');
    if (openCompareModalBtn) {
      openCompareModalBtn.addEventListener('click', () => this.showComparisonModal(container));
    }

    container.querySelectorAll('.view-worker-profile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const workerId = btn.getAttribute('data-id');
        this.showWorkerDetailsModal(workerId, container);
      });
    });

    container.querySelectorAll('.book-worker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const workerId = btn.getAttribute('data-id');
        this.showBookingModal(workerId, container);
      });
    });
  },

  attachBookingsEvents(container) {
    container.querySelectorAll('.view-booking-details-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookingId = btn.getAttribute('data-id');
        this.showBookingDetailsModal(bookingId, container);
      });
    });

    container.querySelectorAll('.cancel-booking-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookingId = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to cancel this booking?')) {
          let bookings = StorageService.getBookings();
          bookings = bookings.map(b => b.id === bookingId ? BookingService.cancelBooking(b) : b);
          StorageService.saveBookings(bookings);
          Toast.show('Booking cancelled successfully', 'info');
          container.querySelector('#customer-main-content').innerHTML = this.renderBookingsView();
          this.attachBookingsEvents(container);
        }
      });
    });

    container.querySelectorAll('.invoice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookingId = btn.getAttribute('data-id');
        this.showInvoiceModal(bookingId);
      });
    });

    container.querySelectorAll('.review-booking-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookingId = btn.getAttribute('data-id');
        this.showReviewModal(bookingId, container);
      });
    });

    container.querySelectorAll('.complaint-booking-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookingId = btn.getAttribute('data-id');
        this.showComplaintModal(bookingId, container);
      });
    });
  },

  showInvoiceModal(bookingId) {
    const bookings = StorageService.getBookings();
    const workers = StorageService.getWorkers();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    const worker = workers.find(w => w.id === booking.workerId) || {};

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 650px;">
        <button class="modal-close" id="close-modal">×</button>
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border-color); padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
          <div>
            <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--accent-primary);">LocalKaam Invoice</h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">Official Service Transaction Receipt</p>
          </div>
          <div style="text-align: right;">
            <strong>Invoice ID:</strong> INV-${booking.id}<br>
            <small style="color: var(--text-secondary);">Date: ${new Date(booking.completedAt || booking.createdAt).toLocaleDateString()}</small>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; font-size: 0.95rem;">
          <div>
            <strong>Customer Details:</strong><br>
            ${booking.customerName}<br>
            ${booking.customerPhone}<br>
            ${booking.address} (${booking.locality.toUpperCase()})
          </div>
          <div>
            <strong>Professional Details:</strong><br>
            ${worker.name} (${worker.phone || '+91 98000 11223'})<br>
            Category: ${worker.category?.toUpperCase()}<br>
            Verification: ${worker.verificationStatus}
          </div>
        </div>

        <table class="data-table" style="margin-bottom: 1.5rem;">
          <thead>
            <tr>
              <th>Description</th>
              <th>Hours</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${booking.service} — ${booking.jobDescription}</td>
              <td>${booking.estimatedHours} hrs</td>
              <td>₹${worker.hourlyRate}/hr</td>
              <td><strong>₹${booking.agreedPrice}</strong></td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; margin-bottom: 1.5rem;">
          <div>
            <span style="font-size: 0.85rem; color: var(--text-secondary);">Payment Status</span>
            <div style="font-weight: 700; color: var(--success);">🟢 Paid Directly to Professional</div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.85rem; color: var(--text-secondary);">Total Amount</span>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-primary);">₹${booking.agreedPrice}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 1rem;">
          <button class="btn btn-outline" id="print-invoice-btn">🖨️ Print / Download</button>
          <button class="btn btn-primary" id="close-inv-btn">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-inv-btn').onclick = () => modal.remove();
    modal.querySelector('#print-invoice-btn').onclick = () => {
      window.print();
    };
  },

  showWorkerDetailsModal(workerId, container) {
    const workers = StorageService.getWorkers();
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" id="close-modal">×</button>
        <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem;">
          <img src="${worker.avatar}" alt="${worker.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-primary);">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 700;">${worker.name}</h2>
            <span class="worker-cat-badge">${worker.category}</span>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">📍 Base: ${worker.baseLocality.toUpperCase()} • 🏆 ${worker.experience} Years Exp</p>
          </div>
        </div>

        <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.5;">${worker.bio || 'Experienced local professional dedicated to quality craftsmanship.'}</p>

        <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div><strong>Hourly Rate:</strong> ₹${worker.hourlyRate} / hr</div>
          <div><strong>Rating:</strong> ⭐ ${worker.ratingAverage} (${worker.ratingCount} reviews)</div>
          <div><strong>Service Radius:</strong> ${worker.serviceRadius} km</div>
          <div><strong>Status:</strong> <span style="color: ${worker.available ? 'var(--success)' : 'var(--danger)'};">${worker.available ? 'Available Now' : 'Busy'}</span></div>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Skills & Expertise</h4>
          <div class="worker-skills">
            ${worker.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 1rem;">
          <button class="btn btn-outline" id="close-btn">Close</button>
          <button class="btn btn-primary" id="modal-book-btn" data-id="${worker.id}">Book Professional Now</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-btn').onclick = () => modal.remove();
    modal.querySelector('#modal-book-btn').onclick = () => {
      modal.remove();
      this.showBookingModal(workerId, container);
    };
  },

  showBookingModal(workerId, container) {
    const workers = StorageService.getWorkers();
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" id="close-modal">×</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Book Service with ${worker.name}</h2>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.95rem;">Category: ${worker.category.toUpperCase()} • Rate: ₹${worker.hourlyRate}/hr</p>

        <form id="booking-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Your Name</label>
            <input type="text" id="cust-name" class="form-control" value="Aarav Mehta" required>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Problem Description & Work Scope</label>
            <textarea id="job-desc" class="form-control" rows="3" placeholder="e.g. Kitchen sink leaking pipe needs replacement" required>Leaking tap fix required urgently in kitchen sink.</textarea>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Service Address in Mumbai</label>
            <input type="text" id="cust-address" class="form-control" value="Flat 402, Titanium Heights, Andheri West" required>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Booking Type</label>
              <select id="booking-type" class="form-select">
                <option value="instant">Instant (Immediate)</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Estimated Duration (Hours)</label>
              <input type="number" id="est-hours" class="form-control" value="2" min="1" max="10" required>
            </div>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Your Price Offer (₹) <span style="color: var(--text-secondary); font-weight: normal;">(Optional negotiation)</span></label>
            <input type="number" id="cust-offer" class="form-control" placeholder="e.g. 500">
            <small style="color: var(--text-secondary);">Standard Estimate: ₹<span id="std-est">${worker.hourlyRate * 2}</span></small>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
            <button type="button" class="btn btn-outline" id="close-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Booking Request</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-btn').onclick = () => modal.remove();

    const estHoursInput = modal.querySelector('#est-hours');
    const stdEstSpan = modal.querySelector('#std-est');
    estHoursInput.oninput = () => {
      const h = parseFloat(estHoursInput.value) || 1;
      stdEstSpan.textContent = h * worker.hourlyRate;
    };

    modal.querySelector('#booking-form').onsubmit = (e) => {
      e.preventDefault();
      const customerData = {
        name: modal.querySelector('#cust-name').value,
        phone: '+91 98765 43210',
        address: modal.querySelector('#cust-address').value,
        locality: StorageService.getCustomerLocality()
      };
      const bookingDetails = {
        service: worker.skills[0] || worker.category,
        jobDescription: modal.querySelector('#job-desc').value,
        bookingType: modal.querySelector('#booking-type').value,
        estimatedHours: parseFloat(estHoursInput.value),
        customerOffer: modal.querySelector('#cust-offer').value ? parseFloat(modal.querySelector('#cust-offer').value) : null
      };

      const newBooking = BookingService.createBooking(worker, customerData, bookingDetails);
      const bookings = StorageService.getBookings();
      bookings.push(newBooking);
      StorageService.saveBookings(bookings);

      modal.remove();
      Toast.show(`Booking request ${newBooking.id} submitted successfully!`, 'success');
      this.render(container);
    };
  },

  showComparisonModal(container) {
    const workers = StorageService.getWorkers();
    const compared = workers.filter(w => this.comparedWorkers.includes(w.id));

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 900px;">
        <button class="modal-close" id="close-modal">×</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem;">Side-by-Side Worker Comparison</h2>

        ${compared.length === 0 ? `
          <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No workers selected for comparison. Check 'Compare' checkboxes on worker cards.</p>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(${compared.length}, 1fr); gap: 1rem; overflow-x: auto;">
            ${compared.map(w => `
              <div style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <img src="${w.avatar}" alt="${w.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-bottom: 0.75rem;">
                <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${w.name}</h3>
                <span class="worker-cat-badge">${w.category}</span>
                <div style="margin-top: 1rem; font-size: 0.9rem; display: flex; flex-direction: column; gap: 0.5rem;">
                  <div><strong>Rate:</strong> ₹${w.hourlyRate}/hr</div>
                  <div><strong>Rating:</strong> ⭐ ${w.ratingAverage} (${w.ratingCount})</div>
                  <div><strong>Experience:</strong> ${w.experience} yrs</div>
                  <div><strong>Locality:</strong> ${w.baseLocality.toUpperCase()}</div>
                  <div><strong>Status:</strong> <span style="color: ${w.available ? 'var(--success)' : 'var(--danger)'};">${w.available ? 'Available' : 'Busy'}</span></div>
                </div>
                <button class="btn btn-primary btn-sm book-worker-from-compare" data-id="${w.id}" style="width: 100%; margin-top: 1rem;">Book Now</button>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelectorAll('.book-worker-from-compare').forEach(btn => {
      btn.onclick = () => {
        const wid = btn.getAttribute('data-id');
        modal.remove();
        this.showBookingModal(wid, container);
      };
    });
  },

  showBookingDetailsModal(bookingId, container) {
    const bookings = StorageService.getBookings();
    const workers = StorageService.getWorkers();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    const worker = workers.find(w => w.id === booking.workerId) || {};

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" id="close-modal">×</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Booking Details: ${booking.id}</h2>
        <span class="badge badge-${booking.status.toLowerCase().replace(' ', '-')}">${booking.status}</span>

        <div style="margin-top: 1.5rem; background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; font-size: 0.95rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div><strong>Professional:</strong> ${worker.name} (${worker.phone})</div>
          <div><strong>Service:</strong> ${booking.service}</div>
          <div><strong>Problem Description:</strong> ${booking.jobDescription}</div>
          <div><strong>Address:</strong> ${booking.address} (${booking.locality.toUpperCase()})</div>
          <div><strong>Original Estimate:</strong> ₹${booking.originalEstimate} (${booking.estimatedHours} hrs @ ₹${worker.hourlyRate}/hr)</div>
          ${booking.customerOffer ? `<div><strong>Customer Offer:</strong> ₹${booking.customerOffer}</div>` : ''}
          <div><strong>Agreed Price:</strong> ₹<strong>${booking.agreedPrice}</strong></div>
        </div>

        ${booking.counterOfferHistory && booking.counterOfferHistory.length > 0 ? `
          <div style="margin-top: 1.5rem;">
            <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Negotiation & Counter-Offer History</h4>
            <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem;">
              ${booking.counterOfferHistory.map(c => `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.35rem;">
                  <span><strong>${c.sender.toUpperCase()}</strong>: ₹${c.amount}</span>
                  <span style="color: var(--text-secondary);">${c.note}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${booking.status === 'Pending' && booking.counterOfferHistory.length > 0 && booking.counterOfferHistory[booking.counterOfferHistory.length - 1].sender === 'worker' ? `
          <div style="margin-top: 1.5rem; background: var(--accent-light); padding: 1rem; border-radius: 8px; text-align: center;">
            <p style="font-weight: 600; margin-bottom: 0.75rem; color: var(--accent-primary);">Worker countered at ₹${booking.agreedPrice}. Do you accept?</p>
            <div style="display: flex; justify-content: center; gap: 1rem;">
              <button class="btn btn-primary btn-sm" id="accept-counter-btn">Accept Counter (₹${booking.agreedPrice})</button>
              <button class="btn btn-danger btn-sm" id="decline-counter-btn">Decline & Cancel</button>
            </div>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
          <button class="btn btn-outline" id="close-btn">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-btn').onclick = () => modal.remove();

    const acceptBtn = modal.querySelector('#accept-counter-btn');
    if (acceptBtn) {
      acceptBtn.onclick = () => {
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === booking.id ? BookingService.customerAcceptCounter(b) : b);
        StorageService.saveBookings(bookings);
        modal.remove();
        Toast.show('Counter-offer accepted! Booking is now Accepted.', 'success');
        container.querySelector('#customer-main-content').innerHTML = this.renderBookingsView();
        this.attachBookingsEvents(container);
      };
    }

    const declineBtn = modal.querySelector('#decline-counter-btn');
    if (declineBtn) {
      declineBtn.onclick = () => {
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === booking.id ? BookingService.customerDeclineCounter(b) : b);
        StorageService.saveBookings(bookings);
        modal.remove();
        Toast.show('Counter-offer declined. Booking cancelled.', 'info');
        container.querySelector('#customer-main-content').innerHTML = this.renderBookingsView();
        this.attachBookingsEvents(container);
      };
    }
  },

  showReviewModal(bookingId, container) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" id="close-modal">×</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Rate & Review Professional</h2>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Your feedback helps maintain high standards on LocalKaam.</p>

        <form id="review-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Rating (1 to 5 Stars)</label>
            <select id="review-rating" class="form-select">
              <option value="5">⭐⭐⭐⭐⭐ (5 - Excellent)</option>
              <option value="4">⭐⭐⭐⭐ (4 - Very Good)</option>
              <option value="3">⭐⭐⭐ (3 - Average)</option>
              <option value="2">⭐⭐ (2 - Below Expectations)</option>
              <option value="1">⭐ (1 - Poor)</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Review Comment</label>
            <textarea id="review-comment" class="form-control" rows="3" placeholder="Describe your experience with the service..." required>Very prompt, polite, and resolved the issue cleanly.</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
            <button type="button" class="btn btn-outline" id="close-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Review</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-btn').onclick = () => modal.remove();

    modal.querySelector('#review-form').onsubmit = (e) => {
      e.preventDefault();
      const rating = parseInt(modal.querySelector('#review-rating').value);
      const comment = modal.querySelector('#review-comment').value;

      const bookings = StorageService.getBookings();
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      const reviews = StorageService.getReviews();
      const newReview = {
        id: `REV-${Date.now()}`,
        bookingId,
        workerId: booking.workerId,
        customerName: booking.customerName,
        rating,
        comment,
        timestamp: new Date().toISOString()
      };
      reviews.push(newReview);
      StorageService.saveReviews(reviews);

      booking.reviewId = newReview.id;
      StorageService.saveBookings(bookings);

      const workers = StorageService.getWorkers();
      const worker = workers.find(w => w.id === booking.workerId);
      if (worker) {
        const totalRating = (worker.ratingAverage * worker.ratingCount) + rating;
        worker.ratingCount += 1;
        worker.ratingAverage = Math.round((totalRating / worker.ratingCount) * 10) / 10;
        StorageService.saveWorkers(workers);
      }

      modal.remove();
      Toast.show('Review submitted successfully!', 'success');
      container.querySelector('#customer-main-content').innerHTML = this.renderBookingsView();
      this.attachBookingsEvents(container);
    };
  },

  showComplaintModal(bookingId, container) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" id="close-modal">×</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Report an Issue / Complaint</h2>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Let us know if you faced any problem with this service.</p>

        <form id="complaint-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Issue Details</label>
            <textarea id="complaint-text" class="form-control" rows="4" placeholder="Describe the problem..." required>Delay in arrival / incomplete cleanup.</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
            <button type="button" class="btn btn-outline" id="close-btn">Cancel</button>
            <button type="submit" class="btn btn-danger">Submit Complaint</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-btn').onclick = () => modal.remove();

    modal.querySelector('#complaint-form').onsubmit = (e) => {
      e.preventDefault();
      const complaintText = modal.querySelector('#complaint-text').value;

      const bookings = StorageService.getBookings();
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      const complaints = StorageService.getComplaints();
      const newComplaint = {
        id: `CMP-${Date.now()}`,
        bookingId,
        workerId: booking.workerId,
        complaintText,
        status: 'Open',
        timestamp: new Date().toISOString()
      };
      complaints.push(newComplaint);
      StorageService.saveComplaints(complaints);

      booking.complaintId = newComplaint.id;
      StorageService.saveBookings(bookings);

      modal.remove();
      Toast.show('Complaint registered successfully.', 'info');
      container.querySelector('#customer-main-content').innerHTML = this.renderBookingsView();
      this.attachBookingsEvents(container);
    };
  }
};
