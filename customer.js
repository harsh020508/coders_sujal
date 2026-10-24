import { StorageService } from './storage.js';
import { MatchingService } from './matching.js';
import { BookingService } from './bookings.js';
import { CATEGORIES, LOCALITIES } from './data.js';
import { Toast } from './toast.js';

export const CustomerFrontend = {
  currentCategory: 'all',
  searchQuery: '',
  comparedWorkers: [],
  sortBy: 'match',

  render(container) {
    const workers = StorageService.getWorkers();
    const bookings = StorageService.getBookings();
    const customerLocality = StorageService.getCustomerLocality();
    let eligibleWorkers = MatchingService.getEligibleWorkers(workers, customerLocality, this.currentCategory, this.searchQuery);
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
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Current Service Location:</div>
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
      if (this.sortBy === 'price_low') {
        const aMin = Math.min(...Object.values(a.specialities || {}).map(s => s.startingPrice || 350));
        const bMin = Math.min(...Object.values(b.specialities || {}).map(s => s.startingPrice || 350));
        return aMin - bMin;
      }
      if (this.sortBy === 'distance') return a.distance - b.distance;
      return a.matchScore - b.matchScore;
    });
  },

  renderDiscoverView(eligibleWorkers) {
    return `
      <div class="dashboard-header">
        <div>
          <h1>Find Verified Local Service Professionals</h1>
          <p>Book expert electricians, plumbers, carpenters, cleaners, and technicians right around your corner in Mumbai.</p>
        </div>
      </div>

      <!-- Categories Shortcuts -->
      <div style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem;">Service Categories</h3>
        <div style="display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem;">
          <button class="btn ${this.currentCategory === 'all' ? 'btn-primary' : 'btn-outline'} btn-sm cat-shortcut-btn" data-cat="all">🌟 All Categories</button>
          ${CATEGORIES.map(c => `
            <button class="btn ${this.currentCategory === c.id ? 'btn-primary' : 'btn-outline'} btn-sm cat-shortcut-btn" data-cat="${c.id}">${c.icon} ${c.name}</button>
          `).join('')}
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="search-filter-bar">
        <div class="search-input-group">
          <input type="text" id="service-search-input" placeholder="Search tasks like 'Wiring repair', 'Leaking tap', 'AC servicing'..." value="${this.searchQuery}">
        </div>
        <select id="sort-by-select" class="form-select" style="max-width: 180px;">
          <option value="match" ${this.sortBy === 'match' ? 'selected' : ''}>✨ Best Match</option>
          <option value="rating" ${this.sortBy === 'rating' ? 'selected' : ''}>⭐ Highest Rated</option>
          <option value="price_low" ${this.sortBy === 'price_low' ? 'selected' : ''}>💵 Lowest Price</option>
          <option value="distance" ${this.sortBy === 'distance' ? 'selected' : ''}>📍 Nearest First</option>
        </select>
      </div>

      <!-- Workers Results Grid -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="font-size: 1.2rem; font-weight: 700;">Available Professionals Nearby (${eligibleWorkers.length})</h3>
        ${this.comparedWorkers.length > 0 ? `<button class="btn btn-outline btn-sm" id="open-comparison-modal">View Comparison (${this.comparedWorkers.length})</button>` : ''}
      </div>

      ${eligibleWorkers.length === 0 ? `
        <div style="text-align: center; padding: 4rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">No registered professionals found for this category or location</h3>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">Try selecting another service category, choosing a different location, or switching roles to register a worker!</p>
        </div>
      ` : `
        <div class="workers-grid">
          ${eligibleWorkers.map(w => {
            const specKeys = Object.keys(w.specialities || {});
            const firstSpecKey = this.currentCategory !== 'all' && w.specialities[this.currentCategory] ? this.currentCategory : specKeys[0];
            const specInfo = w.specialities[firstSpecKey] || { startingPrice: 350, tasks: [] };
            const catObj = CATEGORIES.find(c => c.id === firstSpecKey) || { name: firstSpecKey };

            return `
              <div class="worker-card">
                <div class="worker-header">
                  <img src="${w.avatar}" alt="${w.name}" class="worker-avatar">
                  <div class="worker-info" style="flex: 1;">
                    <h3>${w.name} ${w.verificationStatus === 'Verified' ? '<span title="Verified Professional" style="color: #10b981; font-size: 0.9rem;">✓</span>' : ''}</h3>
                    <span class="worker-cat-badge">${catObj.name}</span>
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
                    <span style="color: ${w.available && !w.pauseNewBookings ? 'var(--success)' : 'var(--danger)'};">${w.available && !w.pauseNewBookings ? '🟢 Online' : '🔴 Offline'}</span>
                  </div>
                </div>

                <div class="worker-skills">
                  ${(specInfo.tasks || []).slice(0, 3).map(t => `<span class="skill-tag">${t}</span>`).join('')}
                </div>

                <div class="worker-footer">
                  <div class="worker-rate">
                    ₹${specInfo.startingPrice} <span>${specInfo.pricingMethod === 'fixed' ? 'fixed' : '/ hr'}</span>
                  </div>
                  <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-outline btn-sm view-worker-profile-btn" data-id="${w.id}">Profile</button>
                    <button class="btn btn-primary btn-sm book-worker-btn" data-id="${w.id}">Book Now</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
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
          <h1>My Bookings & Appointments</h1>
          <p>Track your active appointments, live job status updates, and transaction history.</p>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Service & Professional</th>
              <th>Appointment Slot</th>
              <th>Agreed Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.length === 0 ? `
              <tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No bookings found. Discover professionals and book an appointment!</td></tr>
            ` : bookings.map(b => {
              const worker = workers.find(w => w.id === b.workerId) || { name: 'Professional', phone: '+91 99999 99999' };
              const statusBadgeClass = {
                'Pending confirmation': 'badge-pending',
                'Confirmed': 'badge-accepted',
                'Worker en route': 'badge-in-progress',
                'Worker arrived': 'badge-in-progress',
                'Job in progress': 'badge-in-progress',
                'Job completed': 'badge-completed',
                'Cancelled': 'badge-rejected',
                'Disputed': 'badge-rejected'
              }[b.status] || 'badge-pending';

              return `
                <tr>
                  <td><strong>${b.id}</strong><br><small style="color: var(--text-secondary);">${new Date(b.createdAt).toLocaleDateString()}</small></td>
                  <td>
                    <strong>${b.serviceTask}</strong><br>
                    <span style="color: var(--accent-primary); font-weight: 500;">${worker.name}</span>
                  </td>
                  <td>${b.appointmentDate} @ ${b.appointmentTime}</td>
                  <td><strong>₹${b.agreedPrice}</strong></td>
                  <td><span class="badge ${statusBadgeClass}">${b.status}</span></td>
                  <td>
                    <button class="btn btn-outline btn-sm view-booking-details-btn" data-id="${b.id}">Details</button>
                    ${['Pending confirmation', 'Confirmed'].includes(b.status) ? `<button class="btn btn-danger btn-sm cancel-booking-btn" data-id="${b.id}">Cancel</button>` : ''}
                    ${b.status === 'Job completed' ? `
                      <button class="btn btn-primary btn-sm invoice-btn" data-id="${b.id}">Invoice</button>
                      ${!b.reviewId ? `<button class="btn btn-outline btn-sm review-booking-btn" data-id="${b.id}">Review</button>` : ''}
                    ` : ''}
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
        Toast.show(`Location set to ${e.target.options[e.target.selectedIndex].text}`, 'info');
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
      chk.addEventListener('change', () => {
        const id = chk.getAttribute('data-id');
        if (chk.checked) {
          if (this.comparedWorkers.length >= 3) {
            Toast.show('You can compare a maximum of 3 workers.', 'warning');
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
  },

  showWorkerDetailsModal(workerId, container) {
    const workers = StorageService.getWorkers();
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const specialities = worker.specialities || {};

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 700px;">
        <button class="modal-close" id="close-modal">×</button>
        <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem;">
          <img src="${worker.avatar}" alt="${worker.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-primary);">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 700;">${worker.name} ${worker.verificationStatus === 'Verified' ? '<span style="color: #10b981;">✓ Verified</span>' : ''}</h2>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">📍 Base: ${worker.baseLocality?.toUpperCase()} • Service Area: ${worker.serviceArea} • 🏆 ${worker.experience} Years Exp</p>
          </div>
        </div>

        <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.5;">${worker.bio}</p>

        <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem;">Services & Service-Specific Pricing</h3>
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
          ${Object.keys(specialities).map(sk => {
            const info = specialities[sk];
            const catObj = CATEGORIES.find(c => c.id === sk) || { name: sk };
            return `
              <div style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--accent-primary);">${catObj.name}</h4>
                  <span style="font-size: 1.1rem; font-weight: 800;">₹${info.startingPrice} <small style="font-weight: normal; font-size: 0.8rem;">(${info.pricingMethod})</small></span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Visiting charge: ₹${info.visitingCharge} • Est. Duration: ${info.estDuration}</p>
                <div class="worker-skills">
                  ${(info.tasks || []).map(t => `<span class="skill-tag">${t}</span>`).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 1rem;">
          <button class="btn btn-outline" id="close-btn">Close</button>
          <button class="btn btn-primary" id="modal-book-btn" data-id="${worker.id}">Book Appointment Now</button>
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

    const specialities = worker.specialities || {};
    const firstSpecKey = Object.keys(specialities)[0] || 'general';
    const firstInfo = specialities[firstSpecKey] || { startingPrice: 350, visitingCharge: 100, tasks: ['General Repair'] };

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 650px;">
        <button class="modal-close" id="close-modal">×</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Book Appointment with ${worker.name}</h2>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.95rem;">Select exact service task, appointment slot, and confirm transparent pricing.</p>

        <form id="booking-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Service Category</label>
              <select id="book-category" class="form-select">
                ${Object.keys(specialities).map(sk => {
                  const catObj = CATEGORIES.find(c => c.id === sk) || { name: sk };
                  return `<option value="${sk}">${catObj.name}</option>`;
                }).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Specific Task</label>
              <select id="book-task" class="form-select">
                ${(firstInfo.tasks || []).map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Problem Description & Work Scope</label>
            <textarea id="job-desc" class="form-control" rows="3" placeholder="Describe the issue in detail..." required>Need professional assistance as discussed.</textarea>
          </div>

          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Service Address in Mumbai</label>
            <input type="text" id="cust-address" class="form-control" value="Flat 402, Titanium Heights, Andheri West" required>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Appointment Date</label>
              <input type="date" id="book-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Appointment Time Slot</label>
              <select id="book-time" class="form-select">
                <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
              </select>
            </div>
          </div>

          <div style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem;">Transparent Price Breakdown</h4>
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.35rem;">
              <span>Service Starting Price:</span>
              <strong id="price-base">₹${firstInfo.startingPrice}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.35rem;">
              <span>Visiting / Inspection Charge:</span>
              <strong id="price-visit">₹${firstInfo.visitingCharge}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1rem; font-weight: 800; border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.5rem; color: var(--accent-primary);">
              <span>Total Estimated Amount:</span>
              <span id="price-total">₹${firstInfo.startingPrice + firstInfo.visitingCharge}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="button" class="btn btn-outline" id="close-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Confirm & Submit Booking Request</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-btn').onclick = () => modal.remove();

    const catSelect = modal.querySelector('#book-category');
    const taskSelect = modal.querySelector('#book-task');
    const priceBase = modal.querySelector('#price-base');
    const priceVisit = modal.querySelector('#price-visit');
    const priceTotal = modal.querySelector('#price-total');

    catSelect.onchange = () => {
      const sk = catSelect.value;
      const info = specialities[sk] || { startingPrice: 350, visitingCharge: 100, tasks: ['General Repair'] };
      taskSelect.innerHTML = (info.tasks || []).map(t => `<option value="${t}">${t}</option>`).join('');
      priceBase.textContent = `₹${info.startingPrice}`;
      priceVisit.textContent = `₹${info.visitingCharge}`;
      priceTotal.textContent = `₹${info.startingPrice + info.visitingCharge}`;
    };

    modal.querySelector('#booking-form').onsubmit = (e) => {
      e.preventDefault();
      const sk = catSelect.value;
      const info = specialities[sk] || { startingPrice: 350, visitingCharge: 100 };

      const customerData = {
        name: 'Aarav Mehta',
        phone: '+91 98765 43210',
        address: modal.querySelector('#cust-address').value,
        locality: StorageService.getCustomerLocality()
      };
      const bookingDetails = {
        serviceKey: sk,
        serviceTask: taskSelect.value,
        jobDescription: modal.querySelector('#job-desc').value,
        bookingType: 'scheduled',
        appointmentDate: modal.querySelector('#book-date').value,
        appointmentTime: modal.querySelector('#book-time').value,
        estimatedHours: 2,
        basePrice: info.startingPrice,
        visitingCharge: info.visitingCharge
      };

      const newBooking = BookingService.createBooking(worker, customerData, bookingDetails);
      const bookings = StorageService.getBookings();
      bookings.push(newBooking);
      StorageService.saveBookings(bookings);

      modal.remove();
      Toast.show(`Booking request ${newBooking.id} submitted to ${worker.name}!`, 'success');
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
          <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No workers selected for comparison.</p>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(${compared.length}, 1fr); gap: 1rem; overflow-x: auto;">
            ${compared.map(w => {
              const specKeys = Object.keys(w.specialities || {});
              const info = w.specialities[specKeys[0]] || { startingPrice: 350 };
              return `
                <div style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
                  <img src="${w.avatar}" alt="${w.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-bottom: 0.75rem;">
                  <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${w.name}</h3>
                  <div style="margin-top: 1rem; font-size: 0.9rem; display: flex; flex-direction: column; gap: 0.5rem;">
                    <div><strong>Starting Price:</strong> ₹${info.startingPrice}</div>
                    <div><strong>Rating:</strong> ⭐ ${w.ratingAverage} (${w.ratingCount})</div>
                    <div><strong>Experience:</strong> ${w.experience} yrs</div>
                    <div><strong>Locality:</strong> ${w.baseLocality?.toUpperCase()}</div>
                    <div><strong>Status:</strong> <span style="color: ${w.available && !w.pauseNewBookings ? 'var(--success)' : 'var(--danger)'};">${w.available && !w.pauseNewBookings ? 'Online' : 'Offline'}</span></div>
                  </div>
                  <button class="btn btn-primary btn-sm book-worker-from-compare" data-id="${w.id}" style="width: 100%; margin-top: 1rem;">Book Now</button>
                </div>
              `;
            }).join('')}
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

  showBookingDetailsModal(bookingId) {
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
        <span class="badge badge-accepted">${booking.status}</span>

        <div style="margin-top: 1.5rem; background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; font-size: 0.95rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div><strong>Professional:</strong> ${worker.name} (${worker.phone || '+91 98211 44551'})</div>
          <div><strong>Service Task:</strong> ${booking.serviceTask}</div>
          <div><strong>Problem Description:</strong> ${booking.jobDescription}</div>
          <div><strong>Address:</strong> ${booking.address} (${booking.locality.toUpperCase()})</div>
          <div><strong>Appointment Slot:</strong> ${booking.appointmentDate} @ ${booking.appointmentTime}</div>
          <div><strong>Agreed Price:</strong> ₹<strong>${booking.agreedPrice}</strong> (Base ₹${booking.basePrice} + Visiting ₹${booking.visitingCharge})</div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
          <button class="btn btn-primary" id="close-btn">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-btn').onclick = () => modal.remove();
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

        <table class="data-table" style="margin-bottom: 1.5rem;">
          <thead>
            <tr>
              <th>Task & Description</th>
              <th>Slot</th>
              <th>Visiting</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${booking.serviceTask} — ${booking.jobDescription}</td>
              <td>${booking.appointmentDate}</td>
              <td>₹${booking.visitingCharge}</td>
              <td><strong>₹${booking.agreedPrice}</strong></td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; gap: 1rem;">
          <button class="btn btn-outline" onclick="window.print()">🖨️ Print</button>
          <button class="btn btn-primary" id="close-inv">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-inv').onclick = () => modal.remove();
  },

  showReviewModal(bookingId, container) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" id="close-modal">×</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Rate & Review Professional</h2>
        <form id="review-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Rating</label>
            <select id="rev-rating" class="form-select">
              <option value="5">⭐⭐⭐⭐⭐ (5 - Excellent)</option>
              <option value="4">⭐⭐⭐⭐ (4 - Very Good)</option>
              <option value="3">⭐⭐⭐ (3 - Average)</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Review Comment</label>
            <textarea id="rev-comment" class="form-control" rows="3" required>Professional and timely service.</textarea>
          </div>
          <button type="submit" class="btn btn-primary">Submit Review</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();

    modal.querySelector('#review-form').onsubmit = (e) => {
      e.preventDefault();
      const rating = parseInt(modal.querySelector('#rev-rating').value);
      const bookings = StorageService.getBookings();
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        booking.reviewId = `REV-${Date.now()}`;
        StorageService.saveBookings(bookings);
        const workers = StorageService.getWorkers();
        const worker = workers.find(w => w.id === booking.workerId);
        if (worker) {
          worker.ratingCount = (worker.ratingCount || 0) + 1;
          worker.ratingAverage = Math.round((((worker.ratingAverage || 5) * (worker.ratingCount - 1)) + rating) / worker.ratingCount * 10) / 10;
          StorageService.saveWorkers(workers);
        }
      }
      modal.remove();
      Toast.show('Review submitted!', 'success');
      container.querySelector('#customer-main-content').innerHTML = this.renderBookingsView();
      this.attachBookingsEvents(container);
    };
  }
};
