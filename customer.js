import { StorageService } from './storage.js';
import { MatchingService } from './matching.js';
import { BookingService } from './bookings.js';
import { CATEGORIES, LOCALITIES, COMPLAINT_CATEGORIES, SUPPORT_CATEGORIES } from './data.js';
import { Toast } from './toast.js';
import { AuthService } from './authService.js';
import { esc } from './utils.js';

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
          <div class="sidebar-item" data-view="compare">
            <span>⚖️</span> Compare Workers (${this.comparedWorkers.length}/3)
          </div>
          <div class="sidebar-item" data-view="help">
            <span>🛟</span> Help Centre
          </div>
          <div class="sidebar-item" data-view="complaints">
            <span>⚠️</span> Complaint Centre (${StorageService.getComplaints().length})
          </div>
          <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-color);">
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Current Service Location:</div>
            <select id="locality-select" class="form-select" style="font-size: 0.85rem; padding: 0.5rem;">
              ${LOCALITIES.map(l => `<option value="${esc(l.id)}" ${l.id === customerLocality ? 'selected' : ''}>${esc(l.name)} (${esc(l.zone)})</option>`).join('')}
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
      if (this.sortBy === 'rating') return (b.ratingAverage || 0) - (a.ratingAverage || 0);
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
          <button class="btn ${this.currentCategory === 'all' ? 'btn-primary' : 'btn-outline'} btn-sm cat-shortcut-btn" data-cat="all">🌐 All Categories</button>
          ${CATEGORIES.map(c => `
            <button class="btn ${this.currentCategory === c.id ? 'btn-primary' : 'btn-outline'} btn-sm cat-shortcut-btn" data-cat="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</button>
          `).join('')}
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="search-filter-bar">
        <div class="search-input-group">
          <input type="text" id="service-search-input" placeholder="Search tasks like 'Wiring repair', 'Leaking tap', 'AC servicing'..." value="${esc(this.searchQuery)}">
        </div>
        <select id="sort-by-select" class="form-select" style="max-width: 180px;">
          <option value="match" ${this.sortBy === 'match' ? 'selected' : ''}>🎯 Best Match</option>
          <option value="rating" ${this.sortBy === 'rating' ? 'selected' : ''}>⭐ Highest Rated</option>
          <option value="price_low" ${this.sortBy === 'price_low' ? 'selected' : ''}>💰 Lowest Price</option>
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
          <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">No online professionals found for this category or location</h3>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">Try selecting another service category, choosing a different location, or turning a worker online!</p>
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
                  <img src="${esc(w.avatar)}" alt="${esc(w.name)}" class="worker-avatar">
                  <div class="worker-info" style="flex: 1;">
                    <h3>${esc(w.name)} ${w.verificationStatus === 'Verified' ? '<span title="Verified Professional" style="color: #10b981; font-size: 0.9rem;">✅</span>' : ''}</h3>
                    <span class="worker-cat-badge">${esc(catObj.name)}</span>
                  </div>
                  <div>
                    <label style="font-size: 0.75rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                      <input type="checkbox" class="compare-checkbox" data-id="${esc(w.id)}" ${this.comparedWorkers.includes(w.id) ? 'checked' : ''}> Compare
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
                    <span>🎯 ${w.experience} Years</span>
                  </div>
                  <div class="worker-meta-item">
                    <span>Status</span>
                    <span style="color: var(--success);">🟢 Online</span>
                  </div>
                </div>

                <div class="worker-skills">
                  ${(specInfo.tasks || []).slice(0, 3).map(t => `<span class="skill-tag">${esc(t)}</span>`).join('')}
                </div>

                <div class="worker-footer">
                  <div class="worker-rate">
                    ₹${specInfo.startingPrice} <span>${specInfo.pricingMethod === 'fixed' ? 'fixed' : '/ hr'}</span>
                  </div>
                  <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-outline btn-sm view-worker-profile-btn" data-id="${esc(w.id)}">Profile</button>
                    <button class="btn btn-primary btn-sm book-worker-btn" data-id="${esc(w.id)}">Book Now</button>
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
              const worker = workers.find(w => w.id === b.workerId);
              return `
                <tr>
                  <td><strong>${esc(b.id)}</strong></td>
                  <td><strong>${esc(b.serviceCategory.toUpperCase())}</strong><br>${esc(b.serviceTask)}<br><small>${esc(worker?.name || 'Worker')}</small></td>
                  <td>${esc(b.appointmentDate)} @ ${esc(b.appointmentTime)}</td>
                  <td>₹${b.agreedPrice}</td>
                  <td><span class="badge badge-${b.status.toLowerCase().replace(/ /g, '-')}">${esc(b.status)}</span></td>
                  <td>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                      <button class="btn btn-outline btn-sm view-booking-details-btn" data-id="${esc(b.id)}">Details</button>
                      ${b.status === 'Job completed' ? `<button class="btn btn-primary btn-sm write-review-btn" data-id="${esc(b.id)}">Write Review</button>` : ''}
                      <button class="btn btn-outline btn-sm view-invoice-btn" data-id="${esc(b.id)}">Invoice</button>
                      {b.status !== 'Cancelled' && b.status !== 'Job completed' ? `<button class="btn btn-danger btn-sm cancel-booking-btn" data-id="${esc(b.id)}">Cancel</button>` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderHelpCentreView() {
    const tickets = StorageService.getSupportTickets();
    const selectedBooking = StorageService.getBookings().find(b => b.id === this.supportTicketBookingId);

    const categoryList = SUPPORT_CATEGORIES.map(cat => `
      <button class="btn ${this.helpCategory === cat.id ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="CustomerFrontend.setHelpCategory('${esc(cat.id)}')" style="justify-content: flex-start;">
        ${this.getSupportCategoryIcon(cat.id)} ${esc(cat.name)}
      </button>
    `).join('');

    const faqs = this.getFAQsForCategory(this.helpCategory);

    return `
      <div class="dashboard-header">
        <div>
          <h1>Help Centre & Support</h1>
          <p>Find answers, browse help articles, or get in touch with our support team.</p>
        </div>
        <button class="btn btn-primary" onclick="CustomerFrontend.showSupportTicketModal()">Contact Support</button>
      </div>

      <div style="display: grid; grid-template-columns: 250px 1fr; gap: 2rem; margin-bottom: 2rem;">
        <div>
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem;">Support Categories</h3>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${categoryList}
          </div>
        </div>
        <div>
          <div class="search-filter-bar" style="margin-bottom: 1.5rem;">
            <div class="search-input-group">
              <input type="text" id="help-search-input" placeholder="Search FAQs, help articles, or topics...">
            </div>
          </div>
          <div id="help-faq-container">
            ${this.renderFAQs(faqs)}
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Contact Support</h3>
          <div class="help-contact-card">
            <h4>Still need help?</h4>
            <p>Our support team typically responds within 24 hours.</p>
            <button class="btn btn-primary" onclick="CustomerFrontend.showSupportTicketModal()">Contact Support</button>
          </div>
        </div>
        <div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">My Support Tickets (${tickets.length})</h3>
          <div class="support-tickets-list">
            ${tickets.length === 0 ? `
              <div style="text-align: center; padding: 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); color: var(--text-secondary);">
                No support tickets yet. Contact us if you need assistance.
              </div>
            ` : tickets.map(t => `
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1rem; margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <strong>${esc(t.id)}</strong>
                  <span class="ticket-status-badge status-${t.status.toLowerCase()}">${esc(t.status)}</span>
                </div>
                <p style="font-size: 0.9rem; margin-bottom: 0.25rem;">${esc(t.subject)}</p>
                <p style="font-size: 0.85rem; color: var(--text-secondary);">${esc(t.category)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  getSupportCategoryIcon(categoryId) {
    const cat = SUPPORT_CATEGORIES.find(c => c.id === categoryId);
    if (cat) {
      const icons = {
        booking: '📅', payment: '💰', late_no_show: '⏰', cancellation: '🚫',
        quality: '⭐', account: '👤', safety: '🛡️', general: '❓'
      };
      return icons[cat.id] || '❓';
    }
    const icons = {
      did_not_arrive: '🚫', arrived_late: '⏰', poor_quality: '❌', incomplete_service: '⭕',
      unexpected_charges: '💰', unprofessional: '🚸', payment_issue: '💳', misconduct_safety: '⚠️', other: '❓'
    };
    return icons[categoryId] || '❓';
  },

  getFAQsForCategory(categoryId) {
    const faqsMap = {
      booking: [
        { q: 'How do I book a service?', a: 'Browse services, select a professional, choose your service category, and submit a booking request.' },
        { q: 'How long does booking confirmation take?', a: 'Most bookings are confirmed within 15-30 minutes during business hours.' },
        { q: 'Can I reschedule a booking?', a: 'Yes, you can cancel or reschedule from the My Bookings section.' }
      ],
      payment: [
        { q: 'What payment methods are accepted?', a: 'We accept all major credit/debit cards and UPI payments.' },
        { q: 'When will I be charged?', a: 'Payment is charged after job completion and worker confirmation.' }
      ],
      late_no_show: [
        { q: 'What happens if the worker is late?', a: 'If a worker is late, you can contact support or file a complaint.' },
        { q: 'What if the worker does not show up?', a: 'File a complaint under the worker did not arrive category.' }
      ],
      cancellation: [
        { q: 'Can I cancel a booking?', a: 'Yes, cancellations are free before the job starts.' },
        { q: 'What is the cancellation policy?', a: 'Free cancellation before worker arrival; partial fees may apply after.' }
      ],
      quality: [
        { q: 'How is service quality measured?', a: 'Customers rate work quality, behaviour, punctuality, and communication.' },
        { q: 'What if work is not up to mark?', a: 'You can file a complaint under poor-quality work.' }
      ],
      account: [
        { q: 'How do I update my profile?', a: 'Visit your profile settings to update name, phone, and locality.' },
        { q: 'How do I reset my password?', a: 'Use the forgot password link on the login screen.' }
      ],
      safety: [
        { q: 'How do I report safety concerns?', a: 'You can file a complaint under misconduct or safety concern.' },
        { q: 'Is my personal data safe?', a: 'We use encrypted storage and strict access controls.' }
      ],
      general: [
        { q: 'How do I contact support?', a: 'Use the Contact Support button in the Help Centre.' },
        { q: 'Is LocalKaam available in other cities?', a: 'Currently serving Mumbai and surrounding areas.' }
      ]
    };
    return faqsMap[categoryId] || [];
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

  showSupportTicketModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 650px;">
        <button class="modal-close" id="close-modal">✕</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Contact Support</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem;">We typically respond within 24 hours.</p>
        <form id="support-ticket-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Category</label>
            <select id="ticket-category" class="form-select">
              ${SUPPORT_CATEGORIES.map(c => `<option value="${esc(c.id)}" ${this.supportTicketCategory === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Subject</label>
            <input type="text" id="ticket-subject" class="form-control" required placeholder="Brief subject of your issue">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Description</label>
            <textarea id="ticket-description" class="form-control" rows="4" required placeholder="Describe your issue in detail"></textarea>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Related Booking (Optional)</label>
            <select id="ticket-booking" class="form-select">
              <option value="">General Inquiry</option>
              ${StorageService.getBookings().map(b => `<option value="${esc(b.id)}">${esc(b.id)} - ${esc(b.serviceTask)}</option>`).join('')}
            </select>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="button" class="btn btn-outline" id="close-ticket-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Ticket</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    modal.querySelector('#close-ticket-btn').onclick = () => modal.remove();

    modal.querySelector('#support-ticket-form').onsubmit = (e) => {
      e.preventDefault();
      const category = modal.querySelector('#ticket-category').value;
      const subject = modal.querySelector('#ticket-subject').value;
      const description = modal.querySelector('#ticket-description').value;
      const bookingId = modal.querySelector('#ticket-booking').value;

      const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
      const ticket = {
        id: ticketId,
        bookingId: bookingId || null,
        customerName: 'Customer',
        category: category,
        subject: subject,
        description: description,
        status: 'Open',
        priority: this.supportTicketPriority,
        response: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const tickets = StorageService.getSupportTickets();
      tickets.unshift(ticket);
      StorageService.saveSupportTickets(tickets);
      modal.remove();
      Toast.show(`Support ticket ${ticketId} submitted successfully!`, 'success');
      this.renderHelpCentreView();
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
        <button class="btn btn-primary" onclick="CustomerFrontend.showComplaintModal()">File a Complaint</button>
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
      this.renderComplaintsView();
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

  showBookingModal(workerId, container) {
    const workers = StorageService.getWorkers();
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const specialities = worker.specialities || {};
    const firstInfo = Object.values(specialities)[0] || { startingPrice: 350, visitingCharge: 100 };

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
        <button class="modal-close" id="close-modal">✕</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem;">Book ${esc(worker.name)}</h2>
        <form id="booking-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Service Category</label>
            <select id="book-category" class="form-select">
              ${Object.keys(specialities).map(sk => {
                const cat = sk.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return `<option value="${esc(sk)}">${esc(cat)}</option>`;
              }).join('')}
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Service Task</label>
            <select id="book-task" class="form-select"></select>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Job Description</label>
            <textarea id="job-desc" class="form-control" rows="3" required></textarea>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Customer Name</label>
            <input type="text" id="customer-name" class="form-control" required>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Customer Phone</label>
            <input type="text" id="customer-phone" class="form-control" required>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Address</label>
            <input type="text" id="cust-address" class="form-control" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
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
      taskSelect.innerHTML = (info.tasks || []).map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
      priceBase.textContent = `₹${info.startingPrice}`;
      priceVisit.textContent = `₹${info.visitingCharge}`;
      priceTotal.textContent = `₹${info.startingPrice + info.visitingCharge}`;
    };

    modal.querySelector('#booking-form').onsubmit = (e) => {
      e.preventDefault();
      const sk = catSelect.value;
      const info = specialities[sk] || { startingPrice: 350, visitingCharge: 100 };

      const customerData = {
        name: modal.querySelector('#customer-name').value,
        phone: modal.querySelector('#customer-phone').value,
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
        <button class="modal-close" id="close-modal">✕</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem;">Side-by-Side Worker Comparison</h2>

        ${compared.length === 0 ? `
          <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No workers selected for comparison.</p>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(${Math.min(compared.length, 3)}, 1fr); gap: 1rem; overflow-x: auto;">
            ${compared.map(w => {
              const specKeys = Object.keys(w.specialities || {});
              const info = w.specialities[specKeys[0]] || { startingPrice: 350 };
              return `
                <div style="background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
                  <img src="${esc(w.avatar)}" alt="${esc(w.name)}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-bottom: 0.75rem;">
                  <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">${esc(w.name)}</h3>
                  <div style="margin-top: 1rem; font-size: 0.9rem; display: flex; flex-direction: column; gap: 0.5rem;">
                    <div><strong>Starting Price:</strong> ₹${info.startingPrice}</div>
                    <div><strong>Rating:</strong> ⭐ ${w.ratingAverage} (${w.ratingCount})</div>
                    <div><strong>Experience:</strong> ${w.experience} yrs</div>
                    <div><strong>Locality:</strong> ${esc(w.baseLocality?.toUpperCase())}</div>
                    <div><strong>Status:</strong> <span style="color: var(--success);">Online</span></div>
                  </div>
                  <button class="btn btn-primary btn-sm book-worker-from-compare" data-id="${esc(w.id)}" style="width: 100%; margin-top: 1rem;">Book Now</button>
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
        <button class="modal-close" id="close-modal">✕</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Booking Details: ${esc(booking.id)}</h2>
        <span class="badge badge-accepted">${esc(booking.status)}</span>

        <div style="margin-top: 1.5rem; background: var(--bg-primary); padding: 1.25rem; border-radius: 8px; font-size: 0.95rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div><strong>Professional:</strong> ${esc(worker.name)} (${esc(worker.phone || '+91 98211 44551')})</div>
          <div><strong>Service Task:</strong> ${esc(booking.serviceTask)}</div>
          <div><strong>Problem Description:</strong> ${esc(booking.jobDescription)}</div>
          <div><strong>Address:</strong> ${esc(booking.address)} (${esc(booking.locality.toUpperCase())})</div>
          <div><strong>Appointment Slot:</strong> ${esc(booking.appointmentDate)} @ ${esc(booking.appointmentTime)}</div>
          <div><strong>Agreed Price:</strong> ₹<strong>${booking.agreedPrice}</strong></div>
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
        <button class="modal-close" id="close-modal">✕</button>
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border-color); padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
          <div>
            <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--accent-primary);">LocalKaam Invoice</h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">Official Service Transaction Receipt</p>
          </div>
          <div style="text-align: right;">
            <strong>Invoice ID:</strong> INV-${esc(booking.id)}<br>
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
              <td>${esc(booking.serviceTask)} - ${esc(booking.jobDescription)}</td>
              <td>${esc(booking.appointmentDate)}</td>
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
      <div class="modal-card" style="max-width: 650px;">
        <button class="modal-close" id="close-modal">✕</button>
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Rate & Review Professional</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem;">Booking: ${esc(booking.id)} • Service: ${esc(booking.serviceTask)}</p>
        <form id="review-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Overall Rating *</label>
            <div class="star-rating" style="display: flex; gap: 0.5rem; font-size: 2rem;" data-field="overallRating">
              ${[1, 2, 3, 4, 5].map(star => `
                <span class="star" data-value="${star}" style="cursor: pointer; color: ${star <= 0 ? 'var(--text-secondary)' : '#f59e0b'};">★</span>
              `).join('')}
            </div>
            <input type="hidden" id="rev-rating" value="0">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Work Quality *</label>
            <div class="star-rating" style="display: flex; gap: 0.5rem; font-size: 1.5rem;" data-field="qualityRating">
              ${[1, 2, 3, 4, 5].map(star => `
                <span class="star" data-value="${star}" style="cursor: pointer; color: ${star <= 0 ? 'var(--text-secondary)' : '#f59e0b'};">★</span>
              `).join('')}
            </div>
            <input type="hidden" id="rev-quality" value="0">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Professional Behaviour *</label>
            <div class="star-rating" style="display: flex; gap: 0.5rem; font-size: 1.5rem;" data-field="behaviourRating">
              ${[1, 2, 3, 4, 5].map(star => `
                <span class="star" data-value="${star}" style="cursor: pointer; color: ${star <= 0 ? 'var(--text-secondary)' : '#f59e0b'};">★</span>
              `).join('')}
            </div>
            <input type="hidden" id="rev-behaviour" value="0">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Punctuality *</label>
            <div class="star-rating" style="display: flex; gap: 0.5rem; font-size: 1.5rem;" data-field="punctualityRating">
              ${[1, 2, 3, 4, 5].map(star => `
                <span class="star" data-value="${star}" style="cursor: pointer; color: ${star <= 0 ? 'var(--text-secondary)' : '#f59e0b'};">★</span>
              `).join('')}
            </div>
            <input type="hidden" id="rev-punctuality" value="0">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Communication *</label>
            <div class="star-rating" style="display: flex; gap: 0.5rem; font-size: 1.5rem;" data-field="communicationRating">
              ${[1, 2, 3, 4, 5].map(star => `
                <span class="star" data-value="${star}" style="cursor: pointer; color: ${star <= 0 ? 'var(--text-secondary)' : '#f59e0b'};">★</span>
              `).join('')}
            </div>
            <input type="hidden" id="rev-communication" value="0">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Written Feedback</label>
            <textarea id="rev-comment" class="form-control" rows="4" placeholder="Share details of your experience..."></textarea>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Feedback Tags</label>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${FEEDBACK_TAGS.map(tag => `
                <button type="button" class="btn btn-outline btn-sm feedback-tag-btn" data-tag="${esc(tag.id)}">${esc(tag.label)}</button>
              `).join('')}
            </div>
          </div>
          <button type="submit" class="btn btn-primary">Submit Review</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => modal.remove();

    // Star rating interactions
    const setStarRating = (starsContainer, inputId, currentVal) => {
      const stars = starsContainer.querySelectorAll('.star');
      stars.forEach(star => {
        star.onclick = () => {
          stars.forEach(s => { s.style.color = 'var(--text-secondary)'; });
          star.style.color = '#f59e0b';
          const val = parseInt(star.getAttribute('data-value'));
          document.getElementById(inputId).value = val;
        };
      });
    };

    // Set initial values
    document.getElementById('rev-rating').value = String(this.currentOverallRating || 0);
    document.getElementById('rev-quality').value = String(this.currentQualityRating || 0);
    document.getElementById('rev-behaviour').value = String(this.currentBehaviourRating || 0);
    document.getElementById('rev-punctuality').value = String(this.currentPunctualityRating || 0);
    document.getElementById('rev-communication').value = String(this.currentCommunicationRating || 0);

    modal.querySelector('#review-form').onsubmit = (e) => {
      e.preventDefault();
      const overallRating = parseInt(document.getElementById('rev-rating').value);
      const qualityRating = parseInt(document.getElementById('rev-quality').value);
      const behaviourRating = parseInt(document.getElementById('rev-behaviour').value);
      const punctualityRating = parseInt(document.getElementById('rev-punctuality').value);
      const communicationRating = parseInt(document.getElementById('rev-communication').value);
      const comment = document.getElementById('rev-comment').value;
      const selectedTags = Array.from(modal.querySelectorAll('.feedback-tag-btn.selected')).map(btn => btn.getAttribute('data-tag'));
      if (!selectedTags.includes('excellent_service')) selectedTags.push('excellent_service');

      const finalTags = [...new Set(selectedTags)];

      const newReview = {
        id: `REV-${Date.now()}`,
        bookingId: bookingId,
        workerId: worker.id,
        customerId: null,
        customerName: AuthService.getProfile()?.full_name || 'Customer',
        overallRating,
        qualityRating,
        behaviourRating,
        punctualityRating,
        communicationRating,
        comment: comment.trim(),
        feedbackTags: finalTags,
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
      Toast.show('Review submitted successfully!', 'success');
      container.querySelector('#customer-main-content').innerHTML = this.renderBookingsView();
      this.attachEvents(container);
    };
  }
};