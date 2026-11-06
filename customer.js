import { StorageService } from './storage.js';
import { MatchingService } from './matching.js';
import { BookingService } from './bookings.js';
import { CATEGORIES, LOCALITIES, COMPLAINT_CATEGORIES, SUPPORT_CATEGORIES } from './data.js';
import { Toast } from './toast.js';
import { AuthService } from './authService.js';
import { esc } from './utils.js';
import { initScrollReveal } from './transitions.js';
import { i18n } from './i18n.js';
import { avatar, rating, statusBadge, emptyState, trapFocus } from './ui.js';
import { CustomerMap } from './customerMap.js';
import { PhotoDiagnosis } from './photoDiagnosis.js';

// Helper to get all feedback tags
const FEEDBACK_TAGS = [
  { id: 'excellent_service', label: 'Excellent service' },
  { id: 'very_professional', label: 'Very professional' },
  { id: 'arrived_on_time', label: 'Arrived on time' },
  { id: 'good_value', label: 'Good value for money' },
  { id: 'needs_improvement', label: 'Needs improvement' }
];

export const CustomerFrontend = {
  currentCategory: 'all',
  searchQuery: '',
  comparedWorkers: [],
  sortBy: 'match',
  helpCategory: 'booking',
  supportTicketCategory: 'booking',
  supportTicketPriority: 'Medium',
  hasGlobalListeners: false,

  render(container) {
    const workers = StorageService.getWorkers();
    const bookings = StorageService.getBookings();
    const notifications = StorageService.getNotifications();
    const unreadNotifsCount = notifications.filter(n => !n.isRead).length;
    const customerLocality = StorageService.getCustomerLocality();
    const availableLocalities = MatchingService.getAvailableLocalities(workers);
    const currentLocalityName = (LOCALITIES.find(l => l.id === customerLocality) || { name: customerLocality }).name;
    let eligibleWorkers = MatchingService.getEligibleWorkers(workers, customerLocality, this.currentCategory, this.searchQuery);
    eligibleWorkers = this.sortWorkers(eligibleWorkers);

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Customer Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-section-label">Navigation</div>
          <div class="sidebar-nav-list">
            <div class="sidebar-item active" data-view="discover">
              <span><i data-lucide="search" class="lucide-xs"></i></span>
              <span>Discover Services</span>
            </div>
            <div class="sidebar-item" data-view="map">
              <span><i data-lucide="map" class="lucide-xs"></i></span>
              <span>Live Map &amp; Nearby</span>
            </div>
            <div class="sidebar-item" data-view="photo">
              <span><i data-lucide="camera" class="lucide-xs"></i></span>
              <span>AI Photo Diagnosis</span>
            </div>
            <div class="sidebar-item" data-view="bookings">
              <span><i data-lucide="calendar" class="lucide-xs"></i></span>
              <span>My Bookings</span>
              <span class="sidebar-badge">${bookings.length}</span>
            </div>
            <div class="sidebar-item" data-view="notifications">
              <span><i data-lucide="bell" class="lucide-xs"></i></span>
              <span>Notifications</span>
              ${unreadNotifsCount > 0 ? `<span class="sidebar-badge" style="background:#ef4444;color:#fff;">${unreadNotifsCount}</span>` : ''}
            </div>
            <div class="sidebar-item" data-view="compare" id="compare-sidebar-btn">
              <span><i data-lucide="scale" class="lucide-xs"></i></span>
              <span>Compare</span>
              <span class="sidebar-badge">${this.comparedWorkers.length}/3</span>
            </div>
            <div class="sidebar-item" data-view="help-centre">
              <span><i data-lucide="help-circle" class="lucide-xs"></i></span>
              <span>Help Centre</span>
            </div>
            <div class="sidebar-item" data-view="complaints">
              <span><i data-lucide="triangle-alert" class="lucide-xs"></i></span>
              <span>Complaints</span>
            </div>
          </div>

          <div class="sidebar-locality-box">
            <label for="locality-input">
              Service Location
            </label>
            <input type="text" id="locality-input" class="form-control" list="locality-suggestions"
              autocomplete="off" placeholder="Type your city or locality…"
              value="${esc(currentLocalityName)}"
              style="width: 100%; box-sizing: border-box; font-size: 0.88rem; padding: 0.5rem 0.6rem;" />
            <datalist id="locality-suggestions">
              ${availableLocalities.map(l => `<option value="${esc(l.name)}">${esc(l.name)} (${esc(l.zone)}) · ${l.workerCount} worker${l.workerCount !== 1 ? 's' : ''} available</option>`).join('')}
            </datalist>
            <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 4px;">
              Only cities with available workers are listed.
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="main-content" id="customer-main-content">
          ${this.renderDiscoverView(eligibleWorkers)}
        </main>
      </div>
    `;

    this.attachEvents(container);
    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
    if (typeof window !== "undefined") {
      try {
        initScrollReveal(container, ".ui-worker,.ui-card,.sidebar-item");
      } catch (e) {}
    }
  },

  sortWorkers(workers) {
    const minPrice = (w) => {
      const vals = Object.values(w.specialities || {}).map(s => s.startingPrice || 350);
      return vals.length ? Math.min(...vals) : (Number(w.hourlyRate || w.hourly_rate) || 350);
    };
    return [...workers].sort((a, b) => {
      if (this.sortBy === 'rating') return (b.ratingAverage || 0) - (a.ratingAverage || 0);
      if (this.sortBy === 'price_low') {
        return minPrice(a) - minPrice(b);
      }
      if (this.sortBy === 'distance') return (a.distance || 0) - (b.distance || 0);
      return (a.matchScore || 0) - (b.matchScore || 0);
    });
  },

  renderDiscoverView(eligibleWorkers) {
    const localityObj = LOCALITIES.find(l => l.id === StorageService.getCustomerLocality()) || { name: 'Mumbai' };
    const allBookings = StorageService.getBookings();
    const activeBookings = allBookings.filter(b => !['Job completed', 'Cancelled', 'Disputed'].includes(b.status)).length;
    const completedBookings = allBookings.filter(b => b.status === 'Job completed').length;
    return `
      <div class="dashboard-header">
        <div>
          <h1>Find Verified Professionals</h1>
          <p>Book expert electricians, plumbers, carpenters, and technicians in <strong>${esc(localityObj.name)}</strong> with upfront pricing.</p>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-card-header"><span>Workers Nearby</span><i data-lucide="users" class="lucide-xs"></i></div>
          <h2>${eligibleWorkers.length}</h2>
        </div>
        <div class="metric-card">
          <div class="metric-card-header"><span>Active Bookings</span><i data-lucide="calendar" class="lucide-xs"></i></div>
          <h2>${activeBookings}</h2>
        </div>
        <div class="metric-card">
          <div class="metric-card-header"><span>Completed Jobs</span><i data-lucide="circle-check" class="lucide-xs"></i></div>
          <h2>${completedBookings}</h2>
        </div>
      </div>

      <!-- Quick Action Cards: AI Photo Diagnosis & Live Interactive Map -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.75rem;">
        <div class="quick-action-card">
          <div>
            <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 800; font-size: 1.05rem; color: var(--text-primary); margin-bottom: 0.2rem;">
              <i data-lucide="camera" class="lucide-sm"></i> AI Photo Diagnosis
              <span class="badge" style="background: var(--accent-primary); color: white; font-size: 0.65rem;">Gemini</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.3;">
              Upload a picture of any broken fixture. AI identifies category, likely materials &amp; Mumbai rate estimate.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" id="hero-btn-ai-photo" style="flex-shrink: 0; white-space: nowrap;">
            Diagnose →
          </button>
        </div>

        <div class="quick-action-card quick-action-card--map">
          <div>
            <div style="display: flex; align-items: center; gap: 0.4rem; font-weight: 800; font-size: 1.05rem; color: var(--text-primary); margin-bottom: 0.2rem;">
              <i data-lucide="map" class="lucide-sm"></i> Interactive Live Map
              <span class="badge" style="background: #2563eb; color: white; font-size: 0.65rem;">OSM Free</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.3;">
              Explore workers on map with live distance, Nominatim address search &amp; live OSRM turn-by-turn tracking.
            </p>
          </div>
          <button class="btn btn-outline btn-sm" id="hero-btn-live-map" style="flex-shrink: 0; white-space: nowrap;">
            Open Map →
          </button>
        </div>
      </div>

      <!-- Categories Shortcuts (Scrollable Pill Row) -->
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">Browse by Category</span>
        </div>
        <div class="cat-scroll-row" style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch;">
          <button class="chip ${this.currentCategory === 'all' ? 'active' : ''} cat-shortcut-btn" data-cat="all"><i data-lucide="layout-grid" class="lucide-xs"></i> All Categories</button>
          ${CATEGORIES.map(c => `
            <button class="chip ${this.currentCategory === c.id ? 'active' : ''} cat-shortcut-btn" data-cat="${esc(c.id)}">
              <i data-lucide="${esc(c.lucideIcon || 'wrench')}" class="lucide-xs"></i> ${esc(c.name)}
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
            <option value="match" ${this.sortBy === 'match' ? 'selected' : ''}>Best Match</option>
            <option value="rating" ${this.sortBy === 'rating' ? 'selected' : ''}>Highest Rated</option>
            <option value="price_low" ${this.sortBy === 'price_low' ? 'selected' : ''}>Lowest Price</option>
            <option value="distance" ${this.sortBy === 'distance' ? 'selected' : ''}>Nearest First</option>
          </select>
        </div>
      </div>

      <div id="discover-results">
        ${this.renderDiscoverResults(eligibleWorkers)}
      </div>
    `;
  },

  renderDiscoverResults(eligibleWorkers) {
    return `
      <!-- Workers Results Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <h3 style="font-size: 1.15rem; font-weight: 700;">
          Available Professionals Nearby (${eligibleWorkers.length})
        </h3>
        ${this.comparedWorkers.length > 0 ? `
          <button class="btn btn-outline btn-sm" id="open-comparison-modal" style="font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px;">
            <i data-lucide="scale" class="lucide-xs"></i> View Comparison (${this.comparedWorkers.length})
          </button>
        ` : ''}
      </div>

      ${eligibleWorkers.length === 0 ? emptyState({
        iconName: 'search-x',
        title: 'No online professionals found',
        text: 'Try selecting a different service category, expanding your location, or switching worker online in worker mode.',
        actionHtml: '<button class="ui-btn ui-btn--secondary ui-btn--sm" id="reset-filter-btn" style="margin-top: 0.5rem;">Reset Filters</button>'
      }) : (() => {
        const sortedWorkers = [...eligibleWorkers].sort((a, b) => {
          if (a.verificationStatus === 'Verified' && b.verificationStatus !== 'Verified') return -1;
          if (a.verificationStatus !== 'Verified' && b.verificationStatus === 'Verified') return 1;
          return (Number(b.ratingAverage) || 0) - (Number(a.ratingAverage) || 0);
        });

        return `
          <div class="workers-grid ui-grid">
            ${sortedWorkers.map(w => {
              const specKeys = Object.keys(w.specialities || {});
              const firstSpecKey = this.currentCategory !== 'all' && w.specialities[this.currentCategory] ? this.currentCategory : specKeys[0];
              const specInfo = (w.specialities && w.specialities[firstSpecKey]) || { startingPrice: 350, tasks: [] };
              const catObj = CATEGORIES.find(c => c.id === firstSpecKey) || { name: firstSpecKey || 'General' };
              const tasks = specInfo.tasks || [];

              return `
                <article class="ui-card ui-worker worker-card" data-worker-id="${esc(w.id)}">
                  <div class="ui-worker__head">
                    ${avatar(w, 56)}
                    <div style="flex:1;min-width:0;">
                      <div class="ui-worker__name" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <span style="font-weight:700;font-size:1.05rem;color:var(--ink);">${esc(w.name)}</span>
                        <label style="font-size: 0.75rem; color: var(--muted); display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
                          <input type="checkbox" class="compare-checkbox" data-id="${esc(w.id)}" ${this.comparedWorkers.includes(w.id) ? 'checked' : ''}>
                          <span>Compare</span>
                        </label>
                      </div>
                      <div class="ui-worker__meta" style="margin-top:4px;">
                        ${rating(w.ratingAverage || 4.8, w.ratingCount || 12)}
                        ${statusBadge(w.verificationStatus)}
                        <span class="ui-badge ui-badge--info" style="font-size:var(--fs-xs);">${esc(catObj.name)}</span>
                      </div>
                    </div>
                  </div>

                  <div style="display:flex;gap:12px;font-size:0.8rem;background:var(--surface-2);padding:6px 10px;border-radius:8px;justify-content:space-between;align-items:center;">
                    <span><i data-lucide="map-pin" class="lucide-xs"></i> <strong>${w.distance || '2.5'} km</strong> (~${w.eta || '25'}m)</span>
                    <span><i data-lucide="award" class="lucide-xs"></i> <strong>${w.experience || 3} yrs</strong> exp</span>
                    <span style="color:var(--ok);font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                      <span class="status-dot online"></span> Online
                    </span>
                  </div>

                  <div class="ui-chips">
                    ${tasks.slice(0, 3).map(t => `<span class="ui-chip ui-chip--static">${esc(t)}</span>`).join('')}
                    ${tasks.length > 3 ? `<span class="ui-chip ui-chip--static">+${tasks.length - 3} more</span>` : ''}
                  </div>

                  <div class="ui-worker__foot">
                    <span class="ui-price">₹${specInfo.startingPrice || 350} <small>${specInfo.pricingMethod === 'fixed' ? 'fixed' : '/ hr'}</small></span>
                    <div style="display:flex;gap:8px;">
                      <button type="button" class="ui-btn ui-btn--secondary ui-btn--sm view-worker-profile-btn" data-id="${esc(w.id)}">Profile</button>
                      <button type="button" class="ui-btn ui-btn--accent ui-btn--sm book-worker-btn" data-id="${esc(w.id)}">Request a visit</button>
                    </div>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        `;
      })()}
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
          <div class="empty-state-icon"><i data-lucide="calendar" class="lucide-lg" style="color: var(--text-muted);"></i></div>
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
                  ${this.renderOtpStatusPanel(b)}
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
                        <button class="btn btn-outline btn-xs view-booking-details-btn" data-id="${esc(b.id)}">Details</button>
                        ${['Confirmed', 'Worker en route', 'Worker arrived', 'Job in progress'].includes(b.status) ? `
                          <button class="btn btn-primary btn-xs track-on-map-btn" data-id="${esc(b.id)}" style="background: #2563eb; border-color: #2563eb; color: white;">
                            🗺️ Live Track
                          </button>
                        ` : ''}
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
    // Service Location: type-ahead input, restricted to cities where
    // workers are available. Unknown cities (or cities with no online
    // workers) get a popup instead of silently changing location.
    const localityInput = container.querySelector('#locality-input');
    if (localityInput) {
      const applyLocality = () => {
        const raw = localityInput.value;
        const matched = MatchingService.findLocalityByName(raw);
        const available = MatchingService.getAvailableLocalities(StorageService.getWorkers());
        if (!matched) {
          const names = available.map(l => l.name).join(', ') || 'none right now';
          Toast.show(`Workers are not available in "${raw.trim()}" yet. Available in: ${names}.`, 'warning');
          localityInput.value = (LOCALITIES.find(l => l.id === StorageService.getCustomerLocality()) || { name: '' }).name;
          return;
        }
        if (!available.some(l => l.id === matched.id)) {
          Toast.show(`No workers are available in ${matched.name} right now. Please pick another city.`, 'warning');
          localityInput.value = (LOCALITIES.find(l => l.id === StorageService.getCustomerLocality()) || { name: '' }).name;
          return;
        }
        StorageService.setCustomerLocality(matched.id);
        Toast.show(`Location updated to ${matched.name}`, 'success');
        this.render(container);
      };
      localityInput.addEventListener('change', applyLocality);
      localityInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); applyLocality(); }
      });
    }

    container.querySelectorAll('.sidebar-item').forEach(item => {
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      const go = () => this.switchView(item.getAttribute('data-view'), {}, container);
      item.addEventListener('click', go);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });

    // Global listeners for cross-component events (Map, Photo Diagnosis, Booking)
    if (!this.hasGlobalListeners) {
      this.hasGlobalListeners = true;

      window.addEventListener('localkaam:book-worker', (e) => {
        const workerId = e.detail?.workerId;
        if (workerId) this.showBookingModal(workerId, container);
      });

      window.addEventListener('localkaam:open-map', (e) => {
        const service = e.detail?.service || 'all';
        this.currentCategory = service;
        this.switchView('map', { preselectedService: service }, container);
      });

      window.addEventListener('localkaam:book-with-diagnosis', (e) => {
        const { diagnosis, photoUrl } = e.detail || {};
        const workers = StorageService.getWorkers();
        const customerLocality = StorageService.getCustomerLocality();
        const eligible = MatchingService.getEligibleWorkers(workers, customerLocality, diagnosis?.service_category || 'all');
        const chosenWorker = eligible.length > 0 ? eligible[0] : workers[0];

        if (chosenWorker) {
          this.showBookingModal(chosenWorker.id, container, {
            photoUrl,
            aiDiagnosis: diagnosis,
            jobDescription: diagnosis ? `[AI Diagnosis: ${diagnosis.issue}]` : '',
            urgency: diagnosis?.urgency || 'medium',
            serviceKey: diagnosis?.service_category,
            customerOffer: diagnosis?.price_min
          });
        } else {
          Toast.show('No online workers available for this category. Opening map...', 'info');
          this.switchView('map', { preselectedService: diagnosis?.service_category }, container);
        }
      });
    }

    this.attachDiscoverEvents(container);
    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
  },

  switchView(viewName, options = {}, container) {
    const sidebar = container.querySelector('.sidebar');
    if (sidebar) {
      sidebar.querySelectorAll('.sidebar-item').forEach(i => {
        i.classList.toggle('active', i.getAttribute('data-view') === viewName);
      });
    }

    const mainContent = container.querySelector('#customer-main-content');
    if (!mainContent) return;

    if (viewName !== 'map') CustomerMap.cleanup();

    if (viewName === 'discover') {
      const workers = StorageService.getWorkers();
      const customerLocality = StorageService.getCustomerLocality();
      let eligible = MatchingService.getEligibleWorkers(workers, customerLocality, this.currentCategory, this.searchQuery);
      eligible = this.sortWorkers(eligible);
      mainContent.innerHTML = this.renderDiscoverView(eligible);
      this.attachDiscoverEvents(container);
    } else if (viewName === 'map') {
      CustomerMap.mount(mainContent, options);
    } else if (viewName === 'photo') {
      PhotoDiagnosis.render(mainContent);
    } else if (viewName === 'bookings') {
      mainContent.innerHTML = this.renderBookingsView();
      this.attachBookingsEvents(container);
    } else if (viewName === 'notifications') {
      mainContent.innerHTML = this.renderNotificationsView();
      this.attachNotificationsEvents(container);
    } else if (viewName === 'compare') {
      this.showComparisonModal(container);
    } else if (viewName === 'help-centre') {
      mainContent.innerHTML = this.renderHelpCentreView();
      this.attachHelpEvents(container);
    } else if (viewName === 'complaints') {
      mainContent.innerHTML = this.renderComplaintsView();
      this.attachComplaintEvents(container);
    }

    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
  },

  getSupportCategoryIcon(categoryId) {
    const icons = {
      booking: 'calendar', payment: 'credit-card', late_no_show: 'clock', cancellation: 'x-circle',
      quality: 'star', account: 'user', safety: 'shield-check', general: 'help-circle'
    };
    return icons[categoryId] || 'help-circle';
  },

  // Re-render only the results area so typing in #service-search-input
  // never loses focus (previously every keystroke replaced the input itself).
  _refreshDiscoverResults(container) {
    const workers = StorageService.getWorkers();
    const customerLocality = StorageService.getCustomerLocality();
    let eligible = MatchingService.getEligibleWorkers(workers, customerLocality, this.currentCategory, this.searchQuery);
    eligible = this.sortWorkers(eligible);
    const results = container.querySelector('#discover-results');
    if (results) {
      results.innerHTML = this.renderDiscoverResults(eligible);
      this.attachDiscoverResultEvents(container);
      if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
    }
    return eligible;
  },

  _syncDiscoverHeader(container) {
    const searchInput = container.querySelector('#service-search-input');
    if (searchInput && searchInput.value !== this.searchQuery) searchInput.value = this.searchQuery;
    const sortSelect = container.querySelector('#sort-by-select');
    if (sortSelect && sortSelect.value !== this.sortBy) sortSelect.value = this.sortBy;
    container.querySelectorAll('.cat-shortcut-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-cat') === this.currentCategory);
    });
  },

  attachDiscoverEvents(container) {
    // Header (search / sort / categories) is bound once; results are rebound
    // after each partial update.
    const searchInput = container.querySelector('#service-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this._refreshDiscoverResults(container);
      });
    }

    const sortSelect = container.querySelector('#sort-by-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this._refreshDiscoverResults(container);
      });
    }

    container.querySelectorAll('.cat-shortcut-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentCategory = btn.getAttribute('data-cat');
        this._syncDiscoverHeader(container);
        this._refreshDiscoverResults(container);
      });
    });

    const heroAiBtn = container.querySelector('#hero-btn-ai-photo');
    if (heroAiBtn) {
      heroAiBtn.addEventListener('click', () => this.switchView('photo', {}, container));
    }

    const heroMapBtn = container.querySelector('#hero-btn-live-map');
    if (heroMapBtn) {
      heroMapBtn.addEventListener('click', () => this.switchView('map', {}, container));
    }

    this.attachDiscoverResultEvents(container);
  },

  attachDiscoverResultEvents(container) {
    const resetFilterBtn = container.querySelector('#reset-filter-btn');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.sortBy = 'match';
        this._syncDiscoverHeader(container);
        this._refreshDiscoverResults(container);
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
          compareBtn.innerHTML = `<span><i data-lucide="scale" class="lucide-xs"></i></span><span>Compare</span><span class="sidebar-badge">${this.comparedWorkers.length}/3</span>`;
        }
        const openCompareModalBtn = container.querySelector('#open-comparison-modal');
        if (openCompareModalBtn) {
          openCompareModalBtn.textContent = `⚖️ View Comparison (${this.comparedWorkers.length})`;
        }
        // Keep the header button count in sync after toggling compare.
        if (this.comparedWorkers.length === 0) this._refreshDiscoverResults(container);
      });
    });

    const openCompareModalBtn = container.querySelector('#open-comparison-modal');
    if (openCompareModalBtn) {
      openCompareModalBtn.addEventListener('click', () => this.showComparisonModal(container));
    }

    container.querySelectorAll('.view-worker-profile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const workerId = btn.getAttribute('data-id');
        this.showWorkerProfileModal(workerId, container);
      });
    });

    container.querySelectorAll('.book-worker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const workerId = btn.getAttribute('data-id');
        this.showBookingModal(workerId, container);
      });
    });
  },

  renderHelpCentreView() {
    const tickets = StorageService.getSupportTickets();
    const categoryList = SUPPORT_CATEGORIES.map(cat => `
      <button class="btn ${this.helpCategory === cat.id ? 'btn-primary' : 'btn-outline'} btn-sm help-cat-btn" data-cat="${esc(cat.id)}" style="justify-content: flex-start; width: 100%; text-align: left;">
        <i data-lucide="${this.getSupportCategoryIcon(cat.id)}" class="lucide-xs"></i> ${esc(cat.name)}
      </button>
    `).join('');

    const faqs = this.getFAQsForCategory(this.helpCategory);

    return `
      <div class="dashboard-header">
        <div>
          <h1>Help Centre &amp; Support</h1>
          <p>Find answers, browse help articles, or get in touch with our support team.</p>
        </div>
        <button class="btn btn-primary btn-sm" id="open-support-ticket-btn">Contact Support</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        <div>
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">Support Categories</h3>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${categoryList}
          </div>
        </div>
        <div>
          <div class="search-filter-bar" style="margin-bottom: 1rem; padding: 0.75rem;">
            <div class="search-input-group" style="width: 100%;">
              <input type="text" id="help-search-input" class="form-control" placeholder="Search FAQs, help articles, or topics...">
            </div>
          </div>
          <div id="help-faq-container">
            ${this.renderFAQs(faqs)}
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
        <div class="help-contact-card" style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: var(--radius-cards); padding: 1.5rem;">
          <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem;">Still need help?</h4>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">Our Mumbai customer support team typically responds within 24 hours.</p>
          <button class="btn btn-primary btn-sm" id="card-contact-support-btn">Open Support Ticket</button>
        </div>
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">My Support Tickets (${tickets.length})</h3>
          <div class="support-tickets-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${tickets.length === 0 ? `
              <div style="text-align: center; padding: 2rem; background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: var(--radius-cards); color: var(--text-secondary);">
                No support tickets yet. Contact us if you need assistance.
              </div>
            ` : tickets.map(t => `
              <div style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: var(--radius-cards); padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <strong>${esc(t.id)}</strong>
                  <span class="badge ${t.status === 'Resolved' ? 'badge-completed' : 'badge-pending'}">${esc(t.status || 'Open')}</span>
                </div>
                <p style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.25rem;">${esc(t.subject)}</p>
                <small style="color: var(--text-muted);">${esc(t.category)} · ${new Date(t.createdAt).toLocaleDateString()}</small>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div style="margin-top: 1.5rem; background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: var(--radius-cards); padding: 1.25rem;">
        <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">LocalKaam Care (AI)</h4>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.75rem;">Ask about bookings, workers, payments, reviews, account issues or complaints. I only answer LocalKaam / complaint questions.</p>
        <div id="care-messages" style="display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto; padding:8px; background:var(--bg-secondary); border-radius:10px; margin-bottom:8px;">
          <div style="font-size:0.85rem; color:var(--text-secondary); padding:10px; background:var(--bg-card); border-radius:10px;">Hi! Ask me about a booking, complaint, payment, or LocalKaam service.</div>
        </div>
        <div style="display:flex; gap:8px;">
          <input type="text" id="care-input" class="form-control" placeholder="e.g. My worker did not arrive, how do I complain?" maxlength="2000" style="flex:1;">
          <button class="btn btn-primary btn-sm" id="care-send">Send</button>
        </div>
      </div>
    `;
  },

  attachHelpEvents(container) {
    // LocalKaam Care chat (scoped AI, keys stay server-side)
    const careHistory = [];
    const careBox = container.querySelector('#care-messages');
    const careInput = container.querySelector('#care-input');
    const careSend = container.querySelector('#care-send');
    const appendCare = (role, text) => {
      if (!careBox) return null;
      const who = role === 'user' ? 'You' : 'Care';
      const div = document.createElement('div');
      div.style.cssText = 'font-size:0.85rem; padding:10px; border-radius:10px; max-width:92%; white-space:pre-wrap; word-break:break-word; ' + (role === 'user'
        ? 'align-self:flex-end; background:var(--accent-primary); color:#fff;'
        : 'align-self:flex-start; background:var(--bg-card); color:var(--text-primary); border:1px solid var(--border-color);');
      div.textContent = text;
      const label = document.createElement('div');
      label.style.cssText = 'font-size:0.7rem; font-weight:700; letter-spacing:0.04em; opacity:0.7; margin-bottom:2px;';
      label.textContent = who.toUpperCase();
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex; flex-direction:column; gap:2px; ' + (role === 'user' ? 'align-items:flex-end;' : 'align-items:flex-start;');
      wrap.appendChild(label);
      wrap.appendChild(div);
      careBox.appendChild(wrap);
      careBox.scrollTop = careBox.scrollHeight;
      return div;
    };
    let careBusy = false;
    const sendCare = async () => {
      if (careBusy) return;
      const text = (careInput?.value || '').trim();
      if (!text || !careInput) return;
      careBusy = true;
      careInput.value = '';
      appendCare('user', text);
      careHistory.push({ role: 'user', content: text });
      if (careSend) { careSend.disabled = true; careSend.textContent = '…'; }
      const thinkingBubble = appendCare('assistant', 'Thinking…');
      try {
        const res = await fetch('/api/customer-care', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: careHistory.slice(-10) })
        });
        const data = await res.json().catch(() => ({}));
        const reply = (data && data.reply) || 'I could not answer right now. Please open a Support Ticket below.';
        if (thinkingBubble) thinkingBubble.textContent = reply;
        else appendCare('assistant', reply);
        careHistory.push({ role: 'assistant', content: reply });
      } catch (e) {
        const msg = 'I could not reach the care server. Please open a Support Ticket below.';
        if (thinkingBubble) thinkingBubble.textContent = msg;
        else appendCare('assistant', msg);
      } finally {
        careBusy = false;
        if (careSend) { careSend.disabled = false; careSend.textContent = 'Send'; }
        careInput?.focus();
      }
    };
    careSend?.addEventListener('click', sendCare);
    careInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendCare(); });

    container.querySelectorAll('.help-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.helpCategory = btn.getAttribute('data-cat');
        container.querySelector('#customer-main-content').innerHTML = this.renderHelpCentreView();
        this.attachHelpEvents(container);
        if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
      });
    });

    const searchInput = container.querySelector('#help-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const allFaqs = this.getFAQsForCategory(this.helpCategory);
        const filtered = query
          ? allFaqs.filter(f => f.q.toLowerCase().includes(query) || f.a.toLowerCase().includes(query))
          : allFaqs;
        const faqBox = container.querySelector('#help-faq-container');
        if (faqBox) faqBox.innerHTML = this.renderFAQs(filtered);
      });
    }

    const openTicket = () => this.showSupportTicketModal(container);
    container.querySelector('#open-support-ticket-btn')?.addEventListener('click', openTicket);
    container.querySelector('#card-contact-support-btn')?.addEventListener('click', openTicket);
  },

  attachComplaintEvents(container) {
    container.querySelector('#open-complaint-modal-btn')?.addEventListener('click', () => {
      this.showComplaintModal(container);
    });
  },

  attachBookingsEvents(container) {
    container.querySelectorAll('.track-on-map-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookingId = btn.getAttribute('data-id');
        const booking = StorageService.getBookings().find(b => b.id === bookingId);
        if (booking) this.switchView('map', { trackingBooking: booking }, container);
      });
    });

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
        if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
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
        if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
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
        if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
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
        if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
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
    // ── OTP: resend handler (customer dashboard)
    // In-app only (Uber/Ola-style): generate a fresh code on the booking
    // itself. No server/SMS call — the old server endpoint isn't running
    // on Vercel, which caused the earlier "Network error" toast.
    container.querySelectorAll('.resend-arrival-otp-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const bookingId = btn.getAttribute('data-booking-id');
        const { generateArrivalOtp, arrivalOtpExpiry, hashArrivalOtp } = await import('./bookings.js');
        let bookings = StorageService.getBookings();
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) { Toast.show('Booking not found.', 'error'); return; }
        if (booking.arrivalOtpUsed) { Toast.show('This booking is already verified.', 'info'); return; }
        const plainOtp = generateArrivalOtp();
        StorageService.setCustomerOtp(bookingId, plainOtp); // customer-only
        bookings = bookings.map(b => {
          if (b.id !== bookingId) return b;
          const { arrivalOtp: _legacyPlain, ...rest } = b; // never persist plaintext on booking
          return { ...rest, arrivalOtpHash: hashArrivalOtp(plainOtp), arrivalOtpExpiresAt: arrivalOtpExpiry(b.appointmentDate), arrivalOtpAttempts: 0, arrivalOtpUsed: false };
        });
        StorageService.saveBookings(bookings);
        Toast.show('New OTP generated in your app ✅', 'success');
        this.render(container);
      });
    });

    // ── OTP: async load OTP status panels
    this.loadOtpStatusForBookings(container).catch(() => {});

  },

  getFAQsForCategory(category) {
    const faqs = {
      booking: [
        { q: 'How do I book a service on LocalKaam?', a: 'Select your locality, pick a service category, choose a verified worker, select an appointment date & time, and submit your request.' },
        { q: 'Can I negotiate or make a counter-offer?', a: 'Yes! LocalKaam supports transparent price negotiation. You can propose your budget and the professional can accept or counter-offer.' },
        { q: 'What if I need to reschedule my booking?', a: 'You can reschedule or cancel an appointment directly from your My Bookings dashboard.' }
      ],
      payment: [
        { q: 'How does payment work?', a: 'Payments are settled directly with the professional upon satisfactory completion with 0% platform commission deductions.' },
        { q: 'Are prices fixed or hourly?', a: 'Professionals list upfront starting rates (hourly or fixed task pricing) with transparent visiting charges.' },
        { q: 'Can I get a digital invoice/receipt?', a: 'Yes, once a job is marked completed, a detailed digital invoice is generated under My Bookings.' }
      ],
      late_no_show: [
        { q: 'What if my worker is delayed in Mumbai traffic?', a: 'You can view live status updates (Worker en route, Worker arrived) or call the professional directly.' },
        { q: 'What if the worker does not show up?', a: 'You can cancel with zero fee and book another available professional in your locality immediately.' }
      ],
      cancellation: [
        { q: 'Is there a cancellation charge?', a: 'No, LocalKaam provides free cancellations before the worker arrives at your doorstep.' },
        { q: 'How do I cancel a confirmed booking?', a: 'Go to My Bookings, click Cancel Booking, and confirm. The professional is notified immediately.' }
      ],
      quality: [
        { q: 'What if the service quality is unsatisfactory?', a: 'You can file a formal complaint under Complaints with photos/details. Our team will mediate resolution promptly.' },
        { q: 'How are professionals vetted?', a: 'All professionals undergo identity verification, skill checks, and customer rating reviews.' }
      ],
      account: [
        { q: 'How do I update my locality?', a: 'Use the Service Location dropdown in the sidebar or change locality in your customer settings anytime.' },
        { q: 'Can I switch between Customer and Worker modes?', a: 'Yes, use the switch button or mobile navigation drawer to switch between customer and worker workspaces.' }
      ],
      safety: [
        { q: 'What safety precautions are taken?', a: 'Verified badges confirm documented professionals, and you can share job status details with family members.' },
        { q: 'How do I report an urgent issue?', a: 'File an urgent priority support ticket or contact Mumbai emergency services if safety is threatened.' }
      ],
      general: [
        { q: 'What areas in Mumbai are covered?', a: 'LocalKaam covers Andheri, Bandra, Powai, Juhu, Malad, Colaba, Dadar, Thane, and surrounding localities.' },
        { q: 'Does LocalKaam charge customer booking fees?', a: 'No! There are zero hidden platform taxes or surge convenience fees on LocalKaam.' }
      ]
    };
    return faqs[category] || faqs.general;
  },

  renderFAQs(faqs) {
    if (faqs.length === 0) {
      return '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No FAQs found for this category.</div>';
    }
    return faqs.map((faq, idx) => `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1.25rem; margin-bottom: 1rem;">
        <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Q${idx + 1}: ${esc(faq.q)}</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">A: ${esc(faq.a)}</p>
      </div>
    `).join('');
  },

  setHelpCategory(categoryId) {
    this.helpCategory = categoryId;
    this.renderHelpCentreView();
  },

  showSupportTicketModal(container) {
    const bookings = StorageService.getBookings();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 520px;">
        <button class="modal-close" id="close-modal" aria-label="Close modal">×</button>
        <h2 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 0.35rem;">Open Support Ticket</h2>
        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1.25rem;">
          Our Mumbai support team will review your query and reply within 24 hours.
        </p>

        <form id="support-ticket-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label class="form-label">Category</label>
            <select id="ticket-category" class="form-select" required>
              ${SUPPORT_CATEGORIES.map(c => `<option value="${esc(c.id)}" ${c.id === this.helpCategory ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="form-label">Related Booking <small style="color: var(--text-muted);">(Optional)</small></label>
            <select id="ticket-booking" class="form-select">
              <option value="">None / General Inquiry</option>
              ${bookings.map(b => `<option value="${esc(b.id)}">${esc(b.serviceTask || b.serviceCategory)} (${esc(b.id)}) - ₹${b.agreedPrice}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="form-label">Subject</label>
            <input type="text" id="ticket-subject" class="form-control" placeholder="Brief summary of your issue..." required>
          </div>

          <div>
            <label class="form-label">Description</label>
            <textarea id="ticket-description" class="form-control" rows="4" placeholder="Please describe what happened in detail..." required></textarea>
          </div>

          <div>
            <label class="form-label">Priority</label>
            <select id="ticket-priority" class="form-select">
              <option value="Low">Low - General query</option>
              <option value="Medium" selected>Medium - Requires attention</option>
              <option value="High">High - Urgent / Active appointment issue</option>
            </select>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
            <button type="button" class="btn btn-outline btn-sm" id="close-ticket-btn">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Submit Ticket →</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    i18n.translateDOM(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-ticket-btn').onclick = () => modal.remove();

    modal.querySelector('#support-ticket-form').onsubmit = (e) => {
      e.preventDefault();
      const category = modal.querySelector('#ticket-category').value;
      const subject = modal.querySelector('#ticket-subject').value;
      const description = modal.querySelector('#ticket-description').value;
      const bookingId = modal.querySelector('#ticket-booking').value;
      const priority = modal.querySelector('#ticket-priority')?.value || 'Medium';

      const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
      const profile = AuthService.getProfile();
      const ticket = {
        id: ticketId,
        bookingId: bookingId || null,
        customerId: profile?.id || null,
        customerName: profile?.full_name || 'Customer',
        category: category,
        subject: subject.trim(),
        description: description.trim(),
        status: 'Open',
        priority: priority,
        response: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const tickets = StorageService.getSupportTickets();
      tickets.unshift(ticket);
      StorageService.saveSupportTickets(tickets);
      modal.remove();
      Toast.show(`Support ticket ${ticketId} submitted successfully!`, 'success');

      const mainContent = document.querySelector('#customer-main-content');
      if (mainContent) {
        mainContent.innerHTML = this.renderHelpCentreView();
        this.attachHelpEvents(document.querySelector('.app-container') || document.body);
      }
    };
  },

  renderComplaintsView() {
    const complaints = StorageService.getComplaints();

    return `
      <div class="dashboard-header">
        <div>
          <h1>Complaint Centre</h1>
          <p>File and track complaints about service experiences.</p>
        </div>
        <button class="btn btn-primary btn-sm" id="open-complaint-modal-btn">File a Complaint</button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Related Service</th>
              <th>Submission Date</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${complaints.length === 0 ? `
              <tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No complaints filed yet.</td></tr>
            ` : complaints.map(c => {
              const booking = StorageService.getBookings().find(b => b.id === c.bookingId);
              return `
                <tr>
                  <td><strong>${esc(c.id)}</strong></td>
                  <td>${esc(booking ? `${booking.serviceTask} (${booking.id})` : c.bookingId || 'N/A')}</td>
                  <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                  <td><span class="complaint-category-badge">${esc(c.category.replace(/_/g, ' '))}</span></td>
                  <td><span class="ticket-status-badge status-${c.status.toLowerCase()}">${esc(c.status)}</span></td>
                  <td>
                    <button class="btn btn-outline btn-sm view-complaint-btn" data-id="${esc(c.id)}">View Details</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  showComplaintModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
        <button class="modal-close" id="close-modal">✕</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">File a Complaint</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem;">We take all complaints seriously and will investigate promptly.</p>
        <form id="complaint-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Related Booking</label>
            <select id="complaint-booking" class="form-select">
              <option value="">General Complaint (No Booking)</option>
              ${StorageService.getBookings().map(b => `<option value="${esc(b.id)}">${esc(b.id)} - ${esc(b.serviceTask)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Complaint Category</label>
            <select id="complaint-category" class="form-select">
              ${COMPLAINT_CATEGORIES.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Description</label>
            <textarea id="complaint-description" class="form-control" rows="4" required placeholder="Describe what happened in detail"></textarea>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Date of Incident</label>
            <input type="date" id="complaint-incident-date" class="form-control">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Requested Resolution</label>
            <textarea id="complaint-resolution" class="form-control" rows="2" placeholder="What resolution are you seeking?"></textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="button" class="btn btn-outline" id="close-complaint-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Complaint</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-complaint-btn').onclick = () => modal.remove();

    modal.querySelector('#complaint-form').onsubmit = (e) => {
      e.preventDefault();
      const bookingId = modal.querySelector('#complaint-booking').value;
      const category = modal.querySelector('#complaint-category').value;
      const description = modal.querySelector('#complaint-description').value;
      const incidentDate = modal.querySelector('#complaint-incident-date').value;
      const resolutionRequest = modal.querySelector('#complaint-resolution').value;

      const complaintId = `CMP-${Date.now().toString(36).toUpperCase()}`;
      const complaint = {
        id: complaintId,
        bookingId: bookingId || null,
        customerName: 'Customer',
        issue: category,
        details: description,
        status: 'Submitted',
        category: category,
        incidentDate: incidentDate || null,
        attachments: [],
        resolutionRequest: resolutionRequest || '',
        resolutionNotes: '',
        workerResponse: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: [{ status: 'Submitted', timestamp: new Date().toISOString(), note: 'Complaint submitted' }]
      };

      const complaints = StorageService.getComplaints();
      complaints.unshift(complaint);
      StorageService.saveComplaints(complaints);
      modal.remove();
      Toast.show(`Complaint ${complaintId} submitted successfully!`, 'success');
      const mainContent = document.querySelector('#customer-main-content');
      if (mainContent) {
        mainContent.innerHTML = this.renderComplaintsView();
        this.attachComplaintEvents(document.querySelector('.app-container') || document.body);
      }
    };
  },

  showWorkerProfileModal(workerId, container) {
    const workers = StorageService.getWorkers();
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const reviews = StorageService.getReviews().filter(r => r.workerId === workerId);

    const ratings = [5, 4, 3, 2, 1];
    const distribution = ratings.map(star => ({
      star,
      count: reviews.filter(r => Math.round(r.overallRating) === star).length
    }));
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) / reviews.length : (worker.ratingAverage || 0);
    const distTotal = distribution.reduce((sum, d) => sum + d.count, 0);
    const distPercent = (d) => distTotal > 0 ? Math.round((d.count / distTotal) * 100) : 0;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
        <button class="modal-close" id="close-modal">✕</button>
        <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
          <img src="${esc(worker.avatar)}" alt="${esc(worker.name)}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 700;">${esc(worker.name)}</h2>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">${esc(worker.bio)}</p>
            <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
              <span>⭐ ${avgRating.toFixed(1)} (${reviews.length} reviews)</span>
              <span>🎯 ${worker.experience} years</span>
              <span>📍 ${esc(worker.baseLocality)}</span>
            </div>
          </div>
        </div>

        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Customer Reviews</h3>
        ${reviews.length === 0 ? `
          <p style="color: var(--text-secondary); padding: 1rem; text-align: center;">No reviews yet. Be the first to review this professional!</p>
        ` : `
          ${distribution.map(d => distPercent(d)).join(' • ')}
          <div style="margin-top: 1rem;">
            ${distribution.map(d => {
              const pct = distPercent(d);
              return `
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                  <span style="font-size: 0.8rem; width: 2rem;">${d.star}★</span>
                  <div style="flex: 1; background: var(--bg-primary); border-radius: 4px; height: 8px; overflow: hidden;">
                    <div style="width: ${pct}%; background: #f59e0b; height: 100%; transition: width 0.5s;"></div>
                  </div>
                  <span style="font-size: 0.8rem; width: 3rem;">${d.count}</span>
                </div>
              `;
            }).join('')}
          </div>
          <div style="max-height: 300px; overflow-y: auto; margin-bottom: 1.5rem;">
            ${reviews.slice(0, 10).map(r => `
              <div key="${r.id}" style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                  <strong>${esc(r.customerName || 'Customer')}</strong>
                  <span>⭐ ${r.overallRating}</span>
                </div>
                <p style="font-size: 0.9rem; margin-bottom: 0.5rem;">${esc(r.comment || 'No written feedback provided.')}</p>
                ${r.feedbackTags && r.feedbackTags.length > 0 ? `
                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                    ${r.feedbackTags.map(tag => `<span class="skill-tag">${esc(tag)}</span>`).join('')}
                  </div>
                ` : ''}
                <small style="color: var(--text-secondary); display: block; margin-top: 0.5rem;">Service: ${esc(r.serviceTask || 'General Service')} • ${new Date(r.createdAt).toLocaleDateString()}</small>
              </div>
            `).join('')}
          </div>
        `}

        <button class="btn btn-primary" id="close-profile-btn" style="width: 100%;">Close</button>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-profile-btn').onclick = () => modal.remove();
  },

  showBookingModal(workerId, container, prefillOptions = {}) {
    const workers = StorageService.getWorkers();
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    // SECURITY: Enforce verification and availability on booking
    if (worker.verificationStatus !== 'Verified') {
      Toast.show('Cannot book an unverified professional. Only Verified experts can receive bookings.', 'error');
      return;
    }
    if (worker.isSuspended) {
      Toast.show('This professional account is suspended and cannot accept bookings.', 'error');
      return;
    }
    if (!worker.available) {
      Toast.show('This professional is currently offline and not accepting new bookings.', 'warning');
      return;
    }
    // City check: the worker must actually serve the customer's location.
    const customerLocalityId = StorageService.getCustomerLocality();
    if (!MatchingService.isWorkerAvailableIn(worker, customerLocalityId)) {
      const customerLocName = (LOCALITIES.find(l => l.id === customerLocalityId) || {}).name || customerLocalityId;
      const workerLocName = (LOCALITIES.find(l => l.id === worker.baseLocality) || {}).name || worker.baseLocality;
      Toast.show(`${worker.name} is not available in ${customerLocName}. They serve from ${workerLocName} (up to ${worker.serviceRadius || 10} km). Please choose a worker in your city.`, 'warning');
      return;
    }

    const specialities = worker.specialities || {};
    const defaultSpecKey = (prefillOptions.serviceKey && specialities[prefillOptions.serviceKey])
      ? prefillOptions.serviceKey
      : (Object.keys(specialities)[0] || 'general');
    const firstInfo = specialities[defaultSpecKey] || { startingPrice: 350, visitingCharge: 100, tasks: ['General Repair'] };

    const modal = document.createElement('div');
    modal.className = 'ui-overlay modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="ui-modal modal-card" style="max-width: 540px; padding: clamp(20px, 4vw, 28px);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--peacock-50);color:var(--peacock-600);display:grid;place-items:center;font-weight:700;">
              ${esc((worker.name || 'W').charAt(0))}
            </div>
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--ink);">
                Request a Visit
              </h2>
              <p style="color: var(--muted); margin: 0; font-size: 0.8rem;">
                Verified pro: ${esc(worker.name)}
              </p>
            </div>
          </div>
          <button class="modal-close" id="close-modal" aria-label="Close modal">×</button>
        </div>

        <!-- 3-step progress indicator -->
        <div style="margin-bottom: 16px;">
          <div style="display:flex;justify-content:space-between;font-size:var(--fs-xs);font-weight:600;color:var(--muted);margin-bottom:6px;">
            <span>Step 2 of 3: Details &amp; Schedule</span>
            <span>Fast response</span>
          </div>
          <div style="height:4px;background:var(--surface-2);border-radius:4px;overflow:hidden;">
            <div style="width:66%;height:100%;background:var(--peacock-500);border-radius:4px;"></div>
          </div>
        </div>

        ${prefillOptions.photoUrl ? `
          <!-- Attached AI Photo Diagnosis Preview -->
          <div style="display: flex; gap: 0.85rem; align-items: center; background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 16px;">
            <img src="${prefillOptions.photoUrl}" alt="Problem preview" style="width: 56px; height: 56px; border-radius: 6px; object-fit: cover; border: 1.5px solid #3b82f6; flex-shrink: 0;" />
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 2px;">
                <span class="badge" style="background: #2563eb; color: white; font-size: 0.7rem;">📸 AI Diagnosis Attached</span>
                ${prefillOptions.aiDiagnosis?.urgency === 'emergency' ? '<span class="badge" style="background: #dc2626; color: white; font-size: 0.7rem;">🚨 Emergency</span>' : ''}
              </div>
              <div style="font-weight: 700; font-size: 0.88rem; color: #1e40af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${esc(prefillOptions.aiDiagnosis?.issue || prefillOptions.jobDescription || 'Household Issue')}
              </div>
              ${prefillOptions.aiDiagnosis ? `
                <div style="font-size: 0.75rem; color: #15803d; font-weight: 600; margin-top: 2px;">
                  Estimated Rate: ₹${prefillOptions.aiDiagnosis.price_min} – ₹${prefillOptions.aiDiagnosis.price_max}
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <form id="booking-form" style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
            <div class="ui-field">
              <label class="ui-label" for="book-category">Service Category</label>
              <select id="book-category" class="ui-select form-select">
                ${Object.keys(specialities).map(sk => {
                  const catObj = CATEGORIES.find(c => c.id === sk) || { name: sk };
                  return `<option value="${esc(sk)}" ${sk === defaultSpecKey ? 'selected' : ''}>${esc(catObj.name)}</option>`;
                }).join('')}
              </select>
            </div>
            <div class="ui-field">
              <label class="ui-label" for="book-task">Specific Task</label>
              <select id="book-task" class="ui-select form-select">
                ${(firstInfo.tasks || []).map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="ui-field">
            <label class="ui-label" for="job-desc">Problem Scope</label>
            <textarea id="job-desc" class="ui-textarea form-control" rows="2" placeholder="Briefly describe what needs fixing..." required>${esc(prefillOptions.jobDescription || 'Need prompt assistance for repair work.')}</textarea>
          </div>

          <div class="ui-field">
            <label class="ui-label" for="cust-address">Mumbai Service Address</label>
            <input type="text" id="cust-address" class="ui-input form-control" value="Flat 402, Titanium Heights, Andheri West" required>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px;">
            <div class="ui-field">
              <label class="ui-label" for="book-date">Appointment Date</label>
              <input type="date" id="book-date" class="ui-input form-control" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="ui-field">
              <label class="ui-label" for="book-time">Preferred Slot</label>
              <select id="book-time" class="ui-select form-select">
                <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
              </select>
            </div>
          </div>

          <!-- Price Summary & Optional Counter Offer -->
          <div style="background: var(--surface-2); padding: 12px 14px; border-radius: var(--r-md); border: 1px solid var(--line);">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
              <span class="ui-muted">Estimated Base:</span>
              <strong id="price-base">₹${firstInfo.startingPrice}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
              <span class="ui-muted">Visiting / Inspection:</span>
              <strong id="price-visit">₹${firstInfo.visitingCharge}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 700; border-top: 1px solid var(--line); padding-top: 6px; margin-top: 6px; color: var(--ink);">
              <span>Standard Total:</span>
              <span id="price-total">₹${firstInfo.startingPrice + firstInfo.visitingCharge}</span>
            </div>

            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--line-strong);">
              <label class="ui-label" for="cust-custom-offer" style="font-size: 0.8rem; display: flex; justify-content: space-between;">
                <span>Propose Custom Price Offer (Optional)</span>
                <small class="ui-muted">Direct negotiation</small>
              </label>
              <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                <span style="font-weight: 700; color: var(--muted);">₹</span>
                <input type="number" id="cust-custom-offer" class="ui-input form-control" placeholder="Leave empty for standard rate" min="100" max="25000" value="${prefillOptions.customerOffer || ''}" style="min-height:38px;padding:6px 10px;font-size:0.9rem;">
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;">
            <button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" id="close-btn">Cancel</button>
            <button type="submit" class="ui-btn ui-btn--accent ui-btn--sm" id="submit-booking-btn">Send request</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    const release = trapFocus(modal, () => {
      release();
      modal.remove();
    });

    const closeModal = () => {
      release();
      modal.remove();
    };

    modal.querySelector('#close-modal').onclick = closeModal;
    modal.querySelector('#close-btn').onclick = closeModal;

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
      const submitBtn = modal.querySelector('#submit-booking-btn');
      if (submitBtn) {
        submitBtn.setAttribute('aria-busy', 'true');
        submitBtn.disabled = true;
      }

      const sk = catSelect.value;
      const info = specialities[sk] || { startingPrice: 350, visitingCharge: 100 };
      const customOfferVal = modal.querySelector('#cust-custom-offer').value;
      const customerOffer = customOfferVal ? parseFloat(customOfferVal) : null;

      const customerProfile = AuthService.getProfile() || {};
      const customerLocalityId = StorageService.getCustomerLocality();
      const localityInfo = LOCALITIES.find(l => l.id === customerLocalityId);
      const customerData = {
        id: customerProfile.id || null,
        customerId: customerProfile.id || null,
        name: customerProfile.fullName || customerProfile.full_name || 'Customer',
        phone: customerProfile.phone || '+91 98765 43210',
        address: modal.querySelector('#cust-address').value,
        locality: customerLocalityId,
        coordinates: localityInfo ? { lat: localityInfo.lat, lng: localityInfo.lng } : null
      };
      const bookingDetails = {
        serviceKey: sk,
        serviceTask: taskSelect.value,
        jobDescription: modal.querySelector('#job-desc').value,
        photoUrl: prefillOptions.photoUrl || null,
        aiDiagnosis: prefillOptions.aiDiagnosis || null,
        urgency: prefillOptions.urgency || (prefillOptions.aiDiagnosis ? prefillOptions.aiDiagnosis.urgency : 'medium'),
        bookingType: 'scheduled',
        appointmentDate: modal.querySelector('#book-date').value,
        appointmentTime: modal.querySelector('#book-time').value,
        estimatedHours: 2,
        basePrice: info.startingPrice,
        visitingCharge: info.visitingCharge,
        customerOffer: customerOffer
      };

      const newBooking = BookingService.createBooking(worker, customerData, bookingDetails);
      // Plaintext OTP goes ONLY to the customer store + this confirmation
      // screen. The saved booking (visible to workers) keeps just the hash.
      const plainOtp = newBooking.arrivalOtp;
      StorageService.setCustomerOtp(newBooking.id, plainOtp);
      delete newBooking.arrivalOtp;
      const bookings = StorageService.getBookings();
      bookings.push(newBooking);
      StorageService.saveBookings(bookings);

      // Swap to Confirmation View per Section 6.4
      const card = modal.querySelector('.modal-card');
      if (card) {
        card.innerHTML = `
          <div style="text-align:center;padding:24px 16px;display:grid;gap:12px;place-items:center;">
            <div style="width:64px;height:64px;border-radius:50%;background:var(--ok-bg);color:var(--ok);display:grid;place-items:center;">
              <i data-lucide="badge-check" class="lucide-lg"></i>
            </div>
            <h3 style="font-size:var(--fs-xl);font-weight:700;color:var(--ink);margin:0;">Request sent to ${esc(worker.name)}</h3>
            <p class="ui-muted" style="max-width:38ch;font-size:var(--fs-sm);margin:0;line-height:1.5;">
              ${esc(worker.name)} will review it and you'll be notified when they respond.
            </p>
            <div style="background:#ffe95c;border-radius:10px;padding:10px 16px;">
              <div style="font-size:0.75rem;font-weight:700;color:#4b5563;">YOUR ARRIVAL OTP</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:1.6rem;font-weight:800;letter-spacing:0.12em;color:#1a3300;">${esc(plainOtp)}</div>
              <div style="font-size:0.75rem;color:#4b5563;">Share this code verbally when the professional reaches your home.</div>
            </div>
            <div style="margin-top:12px;">
              <button type="button" class="ui-btn ui-btn--accent ui-btn--sm" id="booking-done-btn">Done</button>
            </div>
          </div>
        `;
        if (typeof window !== 'undefined' && window.refreshIcons) window.refreshIcons();
        card.querySelector('#booking-done-btn')?.addEventListener('click', () => {
          closeModal();
          this.render(container);
        });
      }

      Toast.show(`Request sent to ${worker.name}`, 'success');
      setTimeout(() => {
        try {
          if (document.body.contains(modal)) {
            closeModal();
            this.render(container);
          }
        } catch (_) {}
      }, 3500);
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
    i18n.translateDOM(modal);
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
          ${booking.photoUrl ? `
            <div style="margin-top: 4px;">
              <strong style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Attached Problem Photo</strong><br>
              <img src="${esc(booking.photoUrl)}" alt="Problem photo" style="max-height: 140px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 4px; object-fit: cover; max-width: 100%;">
            </div>
          ` : ''}
          ${booking.aiDiagnosis ? `
            <div style="background: var(--bg-card); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;">
              <strong style="font-size: 0.8rem; color: #15803d;">🤖 AI Diagnosis:</strong> ${esc(booking.aiDiagnosis.issue || 'Identified')}<br>
              <small style="color: var(--text-muted);">
                Estimated Price: ₹${booking.aiDiagnosis.price_min} – ₹${booking.aiDiagnosis.price_max} · 
                Urgency: <span class="diagnosis-urgency-badge urgency-${esc(booking.aiDiagnosis.urgency || 'medium')}" style="font-size: 0.65rem; padding: 2px 6px;">${esc((booking.aiDiagnosis.urgency || 'medium').toUpperCase())}</span>
                ${booking.aiDiagnosis.estimated_duration_minutes ? ` · ~${booking.aiDiagnosis.estimated_duration_minutes} min` : ''}
              </small>
            </div>
          ` : ''}
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
    i18n.translateDOM(modal);
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
    i18n.translateDOM(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-inv').onclick = () => modal.remove();
  },

  showReviewModal(bookingId, container) {
    const bookings = StorageService.getBookings();
    const workers = StorageService.getWorkers();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      Toast.show('Booking not found for review.', 'error');
      return;
    }
    const worker = workers.find(w => w.id === booking.workerId);
    if (!worker) {
      Toast.show('Worker not found for review.', 'error');
      return;
    }

    // Check for existing review
    const existingReviews = StorageService.getReviews();
    const existingReview = existingReviews.find(r => r.bookingId === bookingId);

    if (existingReview) {
      Toast.show('You have already submitted a review for this booking.', 'warning');
      return;
    }

    // Check booking status
    if (booking.status !== 'Job completed') {
      Toast.show('You can only review completed bookings.', 'warning');
      return;
    }

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
              <option value="5">5 - Excellent (Highly Recommended)</option>
              <option value="4">4 - Very Good (Prompt &amp; Professional)</option>
              <option value="3">3 - Average (Satisfactory Work)</option>
              <option value="2">2 - Below Expectations</option>
              <option value="1">1 - Poor Service</option>
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
    i18n.translateDOM(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#cancel-rev-btn').onclick = () => modal.remove();

    modal.querySelector('#review-form').onsubmit = (e) => {
      e.preventDefault();
      const rating = parseInt(modal.querySelector('#rev-rating').value, 10);
      const comment = modal.querySelector('#rev-comment').value;

      const newReview = {
        id: `REV-${Date.now()}`,
        bookingId: bookingId,
        workerId: worker.id,
        customerId: null,
        customerName: AuthService.getProfile()?.full_name || 'Customer',
        overallRating: rating,
        qualityRating: rating,
        behaviourRating: rating,
        punctualityRating: rating,
        communicationRating: rating,
        comment: comment.trim(),
        feedbackTags: [],
        createdAt: new Date().toISOString()
      };

      const reviews = StorageService.getReviews();
      reviews.push(newReview);
      StorageService.saveReviews(reviews);

      // Update booking with reviewId
      const bookings = StorageService.getBookings();
      const bookingToUpdate = bookings.find(b => b.id === bookingId);
      if (bookingToUpdate) {
        bookingToUpdate.reviewId = newReview.id;
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

      // Update worker rating
      const workers = StorageService.getWorkers();
      const workerToUpdate = workers.find(w => w.id === worker.id);
      if (workerToUpdate) {
        const workerReviews = reviews.filter(r => r.workerId === worker.id);
        const avgRating = workerReviews.length > 0 
          ? workerReviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) / workerReviews.length 
          : 0;
        workerToUpdate.ratingAverage = Math.round(avgRating * 10) / 10;
        workerToUpdate.ratingCount = workerReviews.length;
        StorageService.saveWorkers(workers);
      }

      modal.remove();
      Toast.show('Review submitted successfully! Thank you.', 'success');
      container.querySelector('#customer-main-content').innerHTML = this.renderBookingsView();
      this.attachEvents(container);
    };
  },

  /**
   * Render a compact OTP info panel for active booking cards.
   * Shown to customers for Confirmed/Accepted/Worker en route bookings.
   */
  renderOtpStatusPanel(booking) {
    // OTP is issued when the customer books (Uber/Ola-style), so show it
    // from 'Pending confirmation' onwards, not just after acceptance.
    // Plaintext comes from the customer-only store; the booking itself
    // (shared with workers) holds only the hash.
    const statuses = ['Pending confirmation', 'Pending', 'Confirmed', 'Accepted', 'Worker en route'];
    if (!statuses.includes(booking.status)) return '';
    const customerOtp = StorageService.getCustomerOtp(booking.id) || booking.arrivalOtp; // booking.arrivalOtp = legacy fallback
    return `
      <div class="otp-status-panel" data-otp-booking-id="${esc(booking.id)}"
        style="margin-top: 8px; padding: 10px 12px; border-radius: 8px; background: #f0fdf4; border: 1.5px solid #bbf7d0; display: flex; align-items: flex-start; gap: 8px;">
        <span style="font-size: 1.25rem; flex-shrink: 0; line-height: 1;">🔐</span>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 700; font-size: 0.82rem; color: #166534; margin-bottom: 2px;">Arrival Verification OTP</div>
          <p style="font-size: 0.78rem; color: #15803d; margin: 0 0 6px; line-height: 1.4;">
            Share this 6-digit code with the professional <strong>verbally</strong> upon their arrival at your location.
          </p>
          ${booking.arrivalOtpUsed
            ? '<div style="font-size: 0.85rem; font-weight: 700; color: #16a34a;">✅ Arrival verified — technician has checked in!</div>'
            : customerOtp
              ? `<div style="margin:4px 0 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span style="color:#4b5563;font-weight:600;font-size:0.82rem;">Your arrival code:</span><strong style="font-family:'JetBrains Mono',monospace;font-size:1.4rem;letter-spacing:0.12em;color:#1a3300;background:#ffe95c;padding:2px 12px;border-radius:8px;">${esc(customerOtp)}</strong><span style="color:#4b5563;font-size:0.78rem;">Share it verbally with the technician.</span></div>`
              : '<div style="font-size: 0.78rem; color: #f59e0b; margin-bottom: 6px;">⏳ No code yet — tap Resend OTP below to generate your arrival code.</div>'}
          <div class="otp-panel-status-${esc(booking.id)}" style="font-size: 0.78rem; font-weight: 600; color: #166534; margin-bottom: 6px;"></div>
          <button class="btn btn-outline btn-xs resend-arrival-otp-btn"
            data-booking-id="${esc(booking.id)}"
            style="font-size: 0.72rem; padding: 2px 8px; border-color: #16a34a; color: #166534;">
            🔁 Resend OTP
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Load OTP status for all booking OTP panels asynchronously after render.
   * Updates status display without exposing sensitive data.
   */
  // OTP lives on the booking itself (in-app, like Uber/Ola) — no server
  // round-trip, so this also works on the static Vercel deployment where
  // server.js is not running. The code itself is rendered in
  // renderOtpStatusPanel(); here we only add the expiry note.
  async loadOtpStatusForBookings(container) {
    const panels = container.querySelectorAll('[data-otp-booking-id]');
    if (!panels.length) return;
    let bookings = [];
    try { bookings = StorageService.getBookings() || []; } catch (e) {}
    for (const panel of panels) {
      const bookingId = panel.getAttribute('data-otp-booking-id');
      const statusEl = panel.querySelector(`.otp-panel-status-${bookingId}`);
      if (!statusEl) continue;
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking || booking.arrivalOtpUsed) { statusEl.textContent = ''; continue; }
      if (!(booking.arrivalOtpHash || booking.arrivalOtp || StorageService.getCustomerOtp(bookingId))) {
        statusEl.innerHTML = '<span style="color:#f59e0b;">⏳ Tap Resend OTP below to generate your arrival code.</span>';
      } else if (Date.now() > (booking.arrivalOtpExpiresAt || 0)) {
        statusEl.innerHTML = '<span style="color:#dc2626;">⚠️ OTP expired. Click Resend OTP to get a new code in your app.</span>';
      } else {
        const expiry = new Date(booking.arrivalOtpExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        statusEl.innerHTML = `<span style="color:#166534;font-weight:normal;">Valid until ${expiry} · share verbally at your door.</span>`;
      }
    }
  },

  renderNotificationsView() {
    const notifications = StorageService.getNotifications();
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const configMap = {
      ORDER_ACCEPTED: { icon: 'check-circle', color: '#10b981', bg: '#ecfdf5', label: 'Accepted' },
      WORKER_ARRIVED: { icon: 'map-pin', color: '#2563eb', bg: '#eff6ff', label: 'Arrived' },
      ORDER_COMPLETED: { icon: 'check-circle', color: '#7c3aed', bg: '#f5f3ff', label: 'Completed' }
    };

    return `
      <div class="dashboard-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <h1>Order Updates &amp; Notifications</h1>
          <p>Real-time milestones automatically generated from your worker's verified status changes.</p>
        </div>
        ${unreadCount > 0 ? `
          <button class="btn btn-outline btn-sm" id="customer-mark-all-read-btn">
            <i data-lucide="check-check" class="lucide-xs"></i> Mark All as Read (${unreadCount})
          </button>
        ` : ''}
      </div>

      ${notifications.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="bell-off" class="lucide-lg" style="color: var(--text-muted);"></i></div>
          <h3>No notifications yet</h3>
          <p>When you place an order, you will receive real-time popups and history records here when your worker accepts, arrives, and completes the service.</p>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:12px;max-width:900px;">
          ${notifications.map(n => {
            const c = configMap[n.notificationType] || configMap.ORDER_ACCEPTED;
            return `
              <div class="card notif-center-card ${n.isRead ? 'read' : 'unread'}" data-id="${esc(n.id)}" style="padding:16px 20px;border-radius:12px;border:1.5px solid var(--border-color);background:var(--bg-card);display:flex;align-items:flex-start;gap:14px;position:relative;${!n.isRead ? 'border-left:4px solid ' + c.color + ';background:rgba(255,233,92,0.06);' : ''}">
                <div style="width:42px;height:42px;border-radius:10px;background:${c.bg};color:${c.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <i data-lucide="${c.icon}" class="lucide-sm"></i>
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                      <strong style="font-size:1rem;color:var(--text-primary);">${esc(n.title)}</strong>
                      <span class="badge" style="background:${c.bg};color:${c.color};font-size:0.72rem;padding:2px 8px;">${c.label}</span>
                    </div>
                    <span style="font-size:0.75rem;color:var(--text-muted);">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p style="margin:6px 0 10px;font-size:0.875rem;color:var(--text-secondary);line-height:1.45;">${esc(n.message)}</p>
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    ${n.bookingId ? `
                      <span class="badge" style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color);font-size:0.75rem;">
                        <i data-lucide="tag" class="lucide-xs"></i> Booking #${esc(n.bookingId)}
                      </span>
                    ` : '<span></span>'}
                    <div style="display:flex;gap:8px;align-items:center;">
                      ${!n.isRead ? `
                        <button class="btn btn-outline btn-xs mark-single-read-btn" data-id="${esc(n.id)}" style="font-size:0.72rem;padding:2px 8px;">
                          Mark as read
                        </button>
                      ` : `
                        <span style="font-size:0.72rem;color:var(--text-muted);">Read</span>
                      `}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  },

  attachNotificationsEvents(container) {
    const markAllBtn = container.querySelector('#customer-mark-all-read-btn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', async () => {
        await StorageService.markAllNotificationsRead();
        container.querySelector('#customer-main-content').innerHTML = this.renderNotificationsView();
        this.attachNotificationsEvents(container);
        if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
      });
    }

    container.querySelectorAll('.mark-single-read-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        await StorageService.markNotificationRead(id);
        container.querySelector('#customer-main-content').innerHTML = this.renderNotificationsView();
        this.attachNotificationsEvents(container);
        if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
      });
    });
  }
};
if (typeof window !== "undefined") window.CustomerFrontend = CustomerFrontend;
