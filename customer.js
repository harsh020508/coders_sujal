import { StorageService } from './storage.js';
import { MatchingService } from './matching.js';
import { BookingService } from './bookings.js';
import { CATEGORIES, LOCALITIES } from './data.js';
import { Toast } from './toast.js';
import { AuthService } from './authService.js';
import { esc } from './utils.js';

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
        <aside class="sidebar">
          <div class="sidebar-section-label">Navigation</div>
          <div class="sidebar-item active" data-view="discover">
            <span>🔍</span>
            <span>Discover Services</span>
          </div>
          <div class="sidebar-item" data-view="bookings">
            <span>📅</span>
            <span>My Bookings</span>
            <span class="sidebar-badge">${bookings.length}</span>
          </div>
          <div class="sidebar-item" data-view="compare" id="compare-sidebar-btn">
            <span>⚖️</span>
            <span>Compare</span>
            <span class="sidebar-badge">${this.comparedWorkers.length}/3</span>
          </div>

          <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-color);">
            <label for="locality-select" style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
              Service Location
            </label>
            <select id="locality-select" class="form-select" style="font-size: 0.85rem; padding: 0.5rem 0.75rem;">
              ${LOCALITIES.map(l => `<option value="${esc(l.id)}" ${l.id === customerLocality ? 'selected' : ''}>${esc(l.name)} (${esc(l.zone)})</option>`).join('')}
            </select>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="main-content" id="customer-main-content">
          ${this.renderDiscoverView(eligibleWorkers)}
        </main>
      </div>
    `;

    this.attachEvents(container);
  },

  sortWorkers(workers) {
    return [...workers].sort((a, b) => {
      if (this.sortBy === 'rating') return (b.ratingAverage || 0) - (a.ratingAverage || 0);
      if (this.sortBy === 'price_low') {
        const aMin = Math.min(...Object.values(a.specialities || {}).map(s => s.startingPrice || 350));
        const bMin = Math.min(...Object.values(b.specialities || {}).map(s => s.startingPrice || 350));
        return aMin - bMin;
      }
      if (this.sortBy === 'distance') return (a.distance || 0) - (b.distance || 0);
      return (a.matchScore || 0) - (b.matchScore || 0);
    });
  },

  renderDiscoverView(eligibleWorkers) {
    const localityObj = LOCALITIES.find(l => l.id === StorageService.getCustomerLocality()) || { name: 'Mumbai' };
    return `
      <div class="dashboard-header">
        <div>
          <h1>Find Verified Professionals</h1>
          <p>Book expert electricians, plumbers, carpenters, and technicians in <strong>${esc(localityObj.name)}</strong> with upfront pricing.</p>
        </div>
      </div>

      <!-- Categories Shortcuts (Scrollable Pill Row) -->
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">Browse by Category</span>
        </div>
        <div class="cat-scroll-row" style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch;">
          <button class="chip ${this.currentCategory === 'all' ? 'active' : ''} cat-shortcut-btn" data-cat="all">🌟 All Categories</button>
          ${CATEGORIES.map(c => `
            <button class="chip ${this.currentCategory === c.id ? 'active' : ''} cat-shortcut-btn" data-cat="${esc(c.id)}">
              <span>${esc(c.icon)}</span> ${esc(c.name)}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="search-filter-bar">
        <div class="search-input-group">
          <input type="text" id="service-search-input" class="form-control" placeholder="Search tasks: 'Wiring repair', 'Leaking tap', 'AC gas'..." value="${esc(this.searchQuery)}">
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; width: auto; flex-shrink: 0;">
          <select id="sort-by-select" class="form-select" style="min-width: 160px; font-size: 0.85rem;">
            <option value="match" ${this.sortBy === 'match' ? 'selected' : ''}>✨ Best Match</option>
            <option value="rating" ${this.sortBy === 'rating' ? 'selected' : ''}>⭐ Highest Rated</option>
            <option value="price_low" ${this.sortBy === 'price_low' ? 'selected' : ''}>💵 Lowest Price</option>
            <option value="distance" ${this.sortBy === 'distance' ? 'selected' : ''}>📍 Nearest First</option>
          </select>
        </div>
      </div>

      <!-- Workers Results Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <h3 style="font-size: 1.15rem; font-weight: 700;">
          Available Professionals Nearby (${eligibleWorkers.length})
        </h3>
        ${this.comparedWorkers.length > 0 ? `
          <button class="btn btn-outline btn-sm" id="open-comparison-modal" style="font-size: 0.8rem;">
            ⚖️ View Comparison (${this.comparedWorkers.length})
          </button>
        ` : ''}
      </div>

      ${eligibleWorkers.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>No online professionals found</h3>
          <p>Try selecting a different service category, expanding your location, or switching worker online in worker mode.</p>
          <button class="btn btn-outline btn-sm" id="reset-filter-btn" style="margin-top: 0.5rem;">Reset Filters</button>
        </div>
      ` : `
        <div class="workers-grid">
          ${eligibleWorkers.map(w => {
            const specKeys = Object.keys(w.specialities || {});
            const firstSpecKey = this.currentCategory !== 'all' && w.specialities[this.currentCategory] ? this.currentCategory : specKeys[0];
            const specInfo = (w.specialities && w.specialities[firstSpecKey]) || { startingPrice: 350, tasks: [] };
            const catObj = CATEGORIES.find(c => c.id === firstSpecKey) || { name: firstSpecKey || 'General' };

            return `
              <div class="worker-card">
                <div class="worker-header">
                  <img src="${esc(w.avatar || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150')}" alt="${esc(w.name)}" class="worker-avatar" loading="lazy">
                  <div class="worker-info">
                    <h3>
                      ${esc(w.name)}
                      ${w.verificationStatus === 'Verified' ? '<span title="Verified Professional" style="color: #10b981; font-size: 0.95rem;">✓</span>' : ''}
                    </h3>
                    <span class="worker-cat-badge">${esc(catObj.name)}</span>
                  </div>
                  <div>
                    <label style="font-size: 0.75rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.25rem; cursor: pointer; white-space: nowrap;">
                      <input type="checkbox" class="compare-checkbox" data-id="${esc(w.id)}" ${this.comparedWorkers.includes(w.id) ? 'checked' : ''}>
                      <span>Compare</span>
                    </label>
                  </div>
                </div>

                <div class="worker-meta">
                  <div class="worker-meta-item">
                    <span>Distance &amp; ETA</span>
                    <span>📍 ${w.distance || '2.5'} km (~${w.eta || '25'}m)</span>
                  </div>
                  <div class="worker-meta-item">
                    <span>Rating</span>
                    <span>⭐ ${w.ratingAverage || '4.8'} (${w.ratingCount || 12})</span>
                  </div>
                  <div class="worker-meta-item">
                    <span>Experience</span>
                    <span>🏆 ${w.experience || 3} Years</span>
                  </div>
                  <div class="worker-meta-item">
                    <span>Status</span>
                    <span style="color: var(--success); display: inline-flex; align-items: center; gap: 4px;">
                      <span class="status-dot online"></span> Online
                    </span>
                  </div>
                </div>

                <div class="worker-skills">
                  ${(specInfo.tasks || []).slice(0, 3).map(t => `<span class="skill-tag">${esc(t)}</span>`).join('')}
                </div>

                <div class="worker-footer">
                  <div class="worker-rate">
                    ₹${specInfo.startingPrice || 350} <span>${specInfo.pricingMethod === 'fixed' ? 'fixed' : '/ hr'}</span>
                  </div>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="btn btn-outline btn-sm view-worker-profile-btn" data-id="${esc(w.id)}">Profile</button>
                    <button class="btn btn-primary btn-sm book-worker-btn" data-id="${esc(w.id)}">Book</button>
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
          <h1>My Bookings &amp; Appointments</h1>
          <p>Track your active appointments, review counter-offers, and view digital invoices.</p>
        </div>
      </div>

      ${bookings.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <h3>No bookings found yet</h3>
          <p>Browse our verified home service experts and book your first service in minutes!</p>
          <button class="btn btn-primary btn-sm" id="empty-discover-btn">Discover Services</button>
        </div>
      ` : `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Service &amp; Pro</th>
                <th>Slot &amp; Location</th>
                <th>Agreed Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${bookings.map(b => {
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

                // Check for worker counter offer waiting for customer action
                const hasCounterWaiting = Array.isArray(b.counterOfferHistory) &&
                  b.counterOfferHistory.length > 0 &&
                  b.counterOfferHistory[b.counterOfferHistory.length - 1].sender === 'worker' &&
                  ['Pending confirmation', 'Pending'].includes(b.status);
                const lastCounter = hasCounterWaiting ? b.counterOfferHistory[b.counterOfferHistory.length - 1] : null;

                return `
                  <tr>
                    <td>
                      <strong>${esc(b.id)}</strong><br>
                      <small style="color: var(--text-muted); font-size: 0.75rem;">${new Date(b.createdAt).toLocaleDateString()}</small>
                    </td>
                    <td>
                      <strong style="color: var(--text-primary);">${esc(b.serviceTask || b.serviceCategory)}</strong><br>
                      <span style="color: var(--accent-primary); font-size: 0.85rem; font-weight: 500;">👤 ${esc(worker.name)}</span>
                    </td>
                    <td>
                      <div style="font-size: 0.85rem;">${esc(b.appointmentDate)}</div>
                      <small style="color: var(--text-muted);">${esc(b.appointmentTime)} · ${esc(b.locality?.toUpperCase())}</small>
                    </td>
                    <td>
                      <strong style="font-size: 1rem; color: var(--text-primary);">₹${b.agreedPrice}</strong>
                      ${b.customerOffer ? `<br><small style="color: var(--text-muted); font-size: 0.75rem;">Offered: ₹${b.customerOffer}</small>` : ''}
                      ${hasCounterWaiting ? `<br><span class="badge badge-pending" style="font-size: 0.7rem; margin-top: 2px;">Counter: ₹${lastCounter.amount}</span>` : ''}
                    </td>
                    <td>
                      <span class="badge ${statusBadgeClass}">${esc(b.status)}</span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
                        <button class="btn btn-outline btn-xs view-booking-details-btn" data-id="${esc(b.id)}">Details</button>
                        ${hasCounterWaiting ? `
                          <button class="btn btn-success btn-xs cust-accept-counter-btn" data-id="${esc(b.id)}" title="Accept Worker Counter Offer of ₹${lastCounter.amount}">Accept ₹${lastCounter.amount}</button>
                          <button class="btn btn-danger btn-xs cust-decline-counter-btn" data-id="${esc(b.id)}" title="Decline Counter Offer">Decline</button>
                        ` : ''}
                        ${['Pending confirmation', 'Confirmed'].includes(b.status) ? `
                          <button class="btn btn-danger btn-xs cancel-booking-btn" data-id="${esc(b.id)}">Cancel</button>
                        ` : ''}
                        ${b.status === 'Job completed' ? `
                          <button class="btn btn-primary btn-xs invoice-btn" data-id="${esc(b.id)}">Invoice</button>
                          ${!b.reviewId ? `<button class="btn btn-outline btn-xs review-booking-btn" data-id="${esc(b.id)}">⭐ Review</button>` : ''}
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  attachEvents(container) {
    const localitySelect = container.querySelector('#locality-select');
    if (localitySelect) {
      localitySelect.addEventListener('change', (e) => {
        StorageService.setCustomerLocality(e.target.value);
        Toast.show(`Location updated to ${e.target.options[e.target.selectedIndex].text}`, 'info');
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

    const resetFilterBtn = container.querySelector('#reset-filter-btn');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.sortBy = 'match';
        const workers = StorageService.getWorkers();
        const customerLocality = StorageService.getCustomerLocality();
        let eligible = MatchingService.getEligibleWorkers(workers, customerLocality, 'all', '');
        eligible = this.sortWorkers(eligible);
        container.querySelector('#customer-main-content').innerHTML = this.renderDiscoverView(eligible);
        this.attachDiscoverEvents(container);
      });
    }

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
        if (compareBtn) {
          compareBtn.innerHTML = `<span>⚖️</span><span>Compare</span><span class="sidebar-badge">${this.comparedWorkers.length}/3</span>`;
        }
        const openCompareModalBtn = container.querySelector('#open-comparison-modal');
        if (openCompareModalBtn) {
          openCompareModalBtn.textContent = `⚖️ View Comparison (${this.comparedWorkers.length})`;
        }
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
    const emptyDiscoverBtn = container.querySelector('#empty-discover-btn');
    if (emptyDiscoverBtn) {
      emptyDiscoverBtn.addEventListener('click', () => {
        container.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        container.querySelector('.sidebar-item[data-view="discover"]')?.classList.add('active');
        const workers = StorageService.getWorkers();
        const customerLocality = StorageService.getCustomerLocality();
        let eligible = MatchingService.getEligibleWorkers(workers, customerLocality, this.currentCategory, this.searchQuery);
        eligible = this.sortWorkers(eligible);
        container.querySelector('#customer-main-content').innerHTML = this.renderDiscoverView(eligible);
        this.attachDiscoverEvents(container);
      });
    }

    container.querySelectorAll('.view-booking-details-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookingId = btn.getAttribute('data-id');
        this.showBookingDetailsModal(bookingId, container);
      });
    });

    // Accept worker counter offer
    container.querySelectorAll('.cust-accept-counter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookingId = btn.getAttribute('data-id');
        let bookings = StorageService.getBookings();
        bookings = bookings.map(b => b.id === bookingId ? BookingService.customerAcceptCounter(b) : b);
        StorageService.saveBookings(bookings);
        Toast.show(`Counter-offer accepted! Appointment confirmed.`, 'success');
        container.querySelector('#customer-main-content').innerHTML = this.renderBookingsView();
        this.attachBookingsEvents(container);
      });
    });

    // Decline worker counter offer
    container.querySelectorAll('.cust-decline-counter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookingId = btn.getAttribute('data-id');
        if (confirm('Decline this counter offer and cancel booking?')) {
          let bookings = StorageService.getBookings();
          bookings = bookings.map(b => b.id === bookingId ? BookingService.customerDeclineCounter(b) : b);
          StorageService.saveBookings(bookings);
          Toast.show('Counter-offer declined. Booking cancelled.', 'info');
          container.querySelector('#customer-main-content').innerHTML = this.renderBookingsView();
          this.attachBookingsEvents(container);
        }
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
      <div class="modal-card" style="max-width: 680px;">
        <button class="modal-close" id="close-modal" aria-label="Close modal">×</button>
        <div style="display: flex; gap: 1.25rem; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap;">
          <img src="${esc(worker.avatar || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150')}" alt="${esc(worker.name)}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-primary);">
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 800; display: flex; align-items: center; gap: 6px;">
              ${esc(worker.name)}
              ${worker.verificationStatus === 'Verified' ? '<span style="color: #10b981; font-size: 1rem;" title="Verified Pro">✓ Verified</span>' : ''}
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem;">
              📍 Base: <strong>${esc(worker.baseLocality?.toUpperCase())}</strong> · Service Area: ${esc(worker.serviceArea)} · 🏆 ${worker.experience || 3} Yrs Exp
            </p>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
              <span style="font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">⭐ ${worker.ratingAverage || '4.8'}</span>
              <span style="color: var(--text-muted); font-size: 0.8rem;">(${worker.ratingCount || 10} reviews)</span>
            </div>
          </div>
        </div>

        <p style="color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.6; font-size: 0.9rem; background: var(--bg-secondary); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
          ${esc(worker.bio || 'Experienced local technician dedicated to quality home repairs with transparent pricing.')}
        </p>

        <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.75rem;">Services &amp; Transparent Rates</h3>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; max-height: 260px; overflow-y: auto;">
          ${Object.keys(specialities).map(sk => {
            const info = specialities[sk];
            const catObj = CATEGORIES.find(c => c.id === sk) || { name: sk };
            return `
              <div style="background: var(--bg-card); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 4px;">
                  <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--accent-primary);">${esc(catObj.name)}</h4>
                  <span style="font-size: 1rem; font-weight: 800; color: var(--text-primary);">
                    ₹${info.startingPrice} <small style="font-weight: 400; font-size: 0.8rem; color: var(--text-muted);">(${esc(info.pricingMethod || 'hourly')})</small>
                  </span>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                  Visiting Charge: ₹${info.visitingCharge || 100} · Est. Duration: ${esc(info.estDuration || '1-2 hours')}
                </p>
                <div class="worker-skills">
                  ${(info.tasks || []).map(t => `<span class="skill-tag">${esc(t)}</span>`).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; flex-wrap: wrap;">
          <button class="btn btn-outline btn-sm" id="close-btn">Close</button>
          <button class="btn btn-primary btn-sm" id="modal-book-btn" data-id="${esc(worker.id)}">Book Appointment Now →</button>
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

    const profile = AuthService.getProfile();
    const customerName = profile ? (profile.full_name || profile.name || 'Aarav Mehta') : 'Aarav Mehta';
    const customerPhone = profile ? (profile.phone || '+91 98765 43210') : '+91 98765 43210';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 620px;">
        <button class="modal-close" id="close-modal" aria-label="Close modal">×</button>
        <h2 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.25rem;">
          Book with ${esc(worker.name)}
        </h2>
        <p style="color: var(--text-secondary); margin-bottom: 1.25rem; font-size: 0.875rem;">
          Select service task, preferred slot, and submit booking or optional counter-offer.
        </p>

        <form id="booking-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
            <div>
              <label class="form-label">Service Category</label>
              <select id="book-category" class="form-select">
                ${Object.keys(specialities).map(sk => {
                  const catObj = CATEGORIES.find(c => c.id === sk) || { name: sk };
                  return `<option value="${esc(sk)}">${esc(catObj.name)}</option>`;
                }).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">Specific Task</label>
              <select id="book-task" class="form-select">
                ${(firstInfo.tasks || []).map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">Problem Description &amp; Scope</label>
            <textarea id="job-desc" class="form-control" rows="2" placeholder="Describe the problem..." required>Need prompt assistance for repair work.</textarea>
          </div>

          <div>
            <label class="form-label">Service Address in Mumbai</label>
            <input type="text" id="cust-address" class="form-control" value="Flat 402, Titanium Heights, Andheri West" required>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
            <div>
              <label class="form-label">Appointment Date</label>
              <input type="date" id="book-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div>
              <label class="form-label">Preferred Time Slot</label>
              <select id="book-time" class="form-select">
                <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
              </select>
            </div>
          </div>

          <!-- Price Breakdown & Optional Negotiation -->
          <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
              <span style="color: var(--text-secondary);">Service Base Estimate:</span>
              <strong id="price-base">₹${firstInfo.startingPrice}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
              <span style="color: var(--text-secondary);">Visiting / Inspection Charge:</span>
              <strong id="price-visit">₹${firstInfo.visitingCharge}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 800; border-top: 1px solid var(--border-color); padding-top: 0.4rem; margin-top: 0.4rem; color: var(--text-primary);">
              <span>Standard Total:</span>
              <span id="price-total">₹${firstInfo.startingPrice + firstInfo.visitingCharge}</span>
            </div>

            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color);">
              <label class="form-label" style="font-size: 0.8rem; display: flex; justify-content: space-between;">
                <span>💬 Propose Custom Price Offer (Optional)</span>
                <small style="color: var(--text-muted); font-weight: normal;">Negotiate directly</small>
              </label>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <span style="font-weight: 700; color: var(--text-secondary);">₹</span>
                <input type="number" id="cust-custom-offer" class="form-control" placeholder="Leave empty for standard rate" min="100" max="25000" style="padding: 6px 10px; font-size: 0.9rem;">
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline btn-sm" id="close-btn">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Confirm &amp; Submit Booking</button>
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
      taskSelect.innerHTML = (info.tasks || []).map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
      priceBase.textContent = `₹${info.startingPrice}`;
      priceVisit.textContent = `₹${info.visitingCharge}`;
      priceTotal.textContent = `₹${info.startingPrice + info.visitingCharge}`;
    };

    modal.querySelector('#booking-form').onsubmit = (e) => {
      e.preventDefault();
      const sk = catSelect.value;
      const info = specialities[sk] || { startingPrice: 350, visitingCharge: 100 };
      const customOfferVal = modal.querySelector('#cust-custom-offer').value;
      const customerOffer = customOfferVal ? parseFloat(customOfferVal) : null;

      const customerData = {
        name: customerName,
        phone: customerPhone,
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
        visitingCharge: info.visitingCharge,
        customerOffer: customerOffer
      };

      const newBooking = BookingService.createBooking(worker, customerData, bookingDetails);
      if (profile && profile.id) {
        newBooking.customerId = profile.id;
      }
      const bookings = StorageService.getBookings();
      bookings.push(newBooking);
      StorageService.saveBookings(bookings);

      modal.remove();
      Toast.show(`Booking request ${newBooking.id} submitted!`, 'success');
      this.render(container);
    };
  },

  showComparisonModal(container) {
    const workers = StorageService.getWorkers();
    const compared = workers.filter(w => this.comparedWorkers.includes(w.id));

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 850px;">
        <button class="modal-close" id="close-modal" aria-label="Close modal">×</button>
        <h2 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 1rem;">
          Side-by-Side Worker Comparison (${compared.length}/3)
        </h2>

        ${compared.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">⚖️</div>
            <p>No professionals selected for comparison yet. Check the 'Compare' box on worker cards.</p>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
            ${compared.map(w => {
              const specKeys = Object.keys(w.specialities || {});
              const info = (w.specialities && w.specialities[specKeys[0]]) || { startingPrice: 350 };
              return `
                <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-color); display: flex; flex-direction: column;">
                  <img src="${esc(w.avatar || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150')}" alt="${esc(w.name)}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; margin-bottom: 0.75rem; border: 2px solid var(--accent-primary);">
                  <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.25rem;">${esc(w.name)}</h3>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">${esc(w.baseLocality?.toUpperCase())}</div>

                  <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; margin-bottom: 1rem; flex: 1;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-secondary);">Starting Rate:</span>
                      <strong>₹${info.startingPrice}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-secondary);">Rating:</span>
                      <strong>⭐ ${w.ratingAverage || '4.8'} (${w.ratingCount || 10})</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-secondary);">Experience:</span>
                      <strong>${w.experience || 3} Yrs</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-secondary);">Status:</span>
                      <strong style="color: var(--success);">🟢 Online</strong>
                    </div>
                  </div>

                  <button class="btn btn-primary btn-sm book-worker-from-compare" data-id="${esc(w.id)}" style="width: 100%;">
                    Book Now
                  </button>
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

  showBookingDetailsModal(bookingId, container) {
    const bookings = StorageService.getBookings();
    const workers = StorageService.getWorkers();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    const worker = workers.find(w => w.id === booking.workerId) || {};

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 580px;">
        <button class="modal-close" id="close-modal" aria-label="Close modal">×</button>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px;">
          <h2 style="font-size: 1.3rem; font-weight: 800;">Booking Details</h2>
          <span class="badge badge-accepted">${esc(booking.status)}</span>
        </div>

        <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.875rem; display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.25rem;">
          <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Booking Reference</strong><br><strong>${esc(booking.id)}</strong></div>
          <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Professional</strong><br>${esc(worker.name)} (${esc(worker.phone || '+91 98211 44551')})</div>
          <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Task &amp; Description</strong><br>${esc(booking.serviceTask)} — ${esc(booking.jobDescription)}</div>
          <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Service Address</strong><br>${esc(booking.address)} (${esc(booking.locality?.toUpperCase())})</div>
          <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Slot</strong><br>${esc(booking.appointmentDate)} @ ${esc(booking.appointmentTime)}</div>
          <div><strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Agreed Amount</strong><br><strong style="font-size: 1.1rem; color: var(--text-primary);">₹${booking.agreedPrice}</strong></div>
        </div>

        <!-- Counter Offer History if present -->
        ${Array.isArray(booking.counterOfferHistory) && booking.counterOfferHistory.length > 0 ? `
          <div style="margin-bottom: 1.25rem;">
            <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem; text-transform: uppercase; color: var(--text-muted);">Negotiation History</h4>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem;">
              ${booking.counterOfferHistory.map(h => `
                <div style="background: var(--bg-card); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                  <span><strong>${h.sender === 'worker' ? '🛠️ Worker' : '🏠 You'}:</strong> ${esc(h.note || '')}</span>
                  <strong>₹${h.amount}</strong>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button class="btn btn-primary btn-sm" id="close-btn">Close</button>
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
    const worker = workers.find(w => w.id === booking.workerId) || { name: 'Service Professional' };

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 620px;">
        <button class="modal-close" id="close-modal" aria-label="Close modal">×</button>
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 1.2rem; font-weight: 800; color: var(--color-forest-ink); background: var(--color-highlighter-yellow); padding: 2px 8px; border-radius: 4px;">LK</span>
              <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--text-primary); margin: 0;">LocalKaam Receipt</h2>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 4px;">Hyperlocal Service Transaction Invoice</p>
          </div>
          <div style="text-align: right; font-size: 0.85rem;">
            <strong>INV-${esc(booking.id)}</strong><br>
            <small style="color: var(--text-muted);">${new Date(booking.completedAt || booking.createdAt).toLocaleDateString()}</small>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; font-size: 0.85rem;">
          <div>
            <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Customer</span><br>
            <strong>${esc(booking.customerName || 'Aarav Mehta')}</strong><br>
            <small style="color: var(--text-secondary);">${esc(booking.address)}</small>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Professional</span><br>
            <strong>${esc(worker.name)}</strong><br>
            <small style="color: var(--text-secondary);">${esc(worker.phone || '+91 98211 44551')}</small>
          </div>
        </div>

        <div class="table-container" style="margin-bottom: 1.25rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Service &amp; Task</th>
                <th>Slot</th>
                <th>Visiting</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${esc(booking.serviceTask)}</strong><br><small style="color: var(--text-secondary);">${esc(booking.jobDescription)}</small></td>
                <td>${esc(booking.appointmentDate)}</td>
                <td>₹${booking.visitingCharge || 100}</td>
                <td><strong style="color: var(--accent-primary); font-size: 1rem;">₹${booking.agreedPrice}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="background: var(--bg-secondary); padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.8rem; color: var(--text-secondary); text-align: center;">
          ✓ 100% direct payment to local professional · Zero platform commission deduction
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button class="btn btn-outline btn-sm" onclick="window.print()">🖨️ Print Receipt</button>
          <button class="btn btn-primary btn-sm" id="close-inv">Done</button>
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
      <div class="modal-card" style="max-width: 480px;">
        <button class="modal-close" id="close-modal" aria-label="Close modal">×</button>
        <h2 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 0.25rem;">Rate &amp; Review Professional</h2>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">Your feedback helps your neighbors find trusted service experts.</p>

        <form id="review-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label class="form-label">Rating</label>
            <select id="rev-rating" class="form-select">
              <option value="5">⭐⭐⭐⭐⭐ 5 - Excellent (Highly Recommended)</option>
              <option value="4">⭐⭐⭐⭐ 4 - Very Good (Prompt &amp; Professional)</option>
              <option value="3">⭐⭐⭐ 3 - Average (Satisfactory Work)</option>
              <option value="2">⭐⭐ 2 - Below Expectations</option>
              <option value="1">⭐ 1 - Poor Service</option>
            </select>
          </div>
          <div>
            <label class="form-label">Detailed Comment</label>
            <textarea id="rev-comment" class="form-control" rows="3" placeholder="Share details about punctuality, skill quality, and pricing..." required>Professional, courteous, and timely service.</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-outline btn-sm" id="cancel-rev-btn">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Submit Verified Review</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#cancel-rev-btn').onclick = () => modal.remove();

    modal.querySelector('#review-form').onsubmit = (e) => {
      e.preventDefault();
      const rating = parseInt(modal.querySelector('#rev-rating').value, 10);
      const comment = modal.querySelector('#rev-comment').value;

      const bookings = StorageService.getBookings();
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        booking.reviewId = `REV-${Date.now()}`;
        StorageService.saveBookings(bookings);
        const workers = StorageService.getWorkers();
        const worker = workers.find(w => w.id === booking.workerId);
        if (worker) {
          const totalRating = ((worker.ratingAverage || 4.8) * (worker.ratingCount || 10)) + rating;
          worker.ratingCount = (worker.ratingCount || 10) + 1;
          worker.ratingAverage = Math.round((totalRating / worker.ratingCount) * 10) / 10;
          StorageService.saveWorkers(workers);
        }
      }
      modal.remove();
      Toast.show('Review submitted successfully! Thank you.', 'success');
      container.querySelector('#customer-main-content').innerHTML = this.renderBookingsView();
      this.attachBookingsEvents(container);
    };
  }
};
