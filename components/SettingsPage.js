// LocalKaam — Settings page
// All settings in this module persist to localStorage. Profile/security actions
// use Supabase when a real Supabase session is available and clearly report
// when a feature is local-only or unavailable.
import { Settings, ACCENT_COLORS, FONT_SIZES, DENSITIES, THEMES } from '../settingsService.js';
import { SettingsSidebar } from './SettingsSidebar.js';
import { ProfileDropdown } from './ProfileDropdown.js';
import { AuthService } from '../authService.js';
import { SupabaseService } from '../supabaseClient.js';
import { StorageService } from '../storage.js';
import { WorkerFeedback } from '../worker_new_features.js';
import { Toast } from '../toast.js';
import { LOCALITIES } from '../data.js';
import { icon, avatarMarkup } from './icons.js';
import { getSettingsSection } from './settingsConfig.js';
import { esc } from '../utils.js';
import { i18n, t } from '../i18n.js';

const APP_VERSION = '1.0.0';
const REPO_URL = 'https://github.com/harsh020508/coders_sujal';

function formatDate(value, fallback = 'Not available') {
  if (!value) return fallback;
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return fallback;
  }
}

function describeDevice() {
  const ua = navigator.userAgent || '';
  let browser = 'This browser';
  if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  let platform = 'Unknown device';
  if (/Windows/.test(ua)) platform = 'Windows';
  else if (/Android/.test(ua)) platform = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) platform = 'iOS';
  else if (/Mac OS X/.test(ua)) platform = 'macOS';
  else if (/Linux/.test(ua)) platform = 'Linux';

  return `${browser} on ${platform}`;
}

export const SettingsPage = {
  currentSection: 'general',
  pendingSection: null,
  container: null,
  sidebarController: null,
  _savedTimer: null,
  _escapeHandler: null,

  init(section) {
    Settings.init();
    const saved = (() => {
      try {
        return localStorage.getItem('localkaam_settings_section');
      } catch (e) {
        return null;
      }
    })();
    const candidate = section || this.pendingSection || saved || 'general';
    this.pendingSection = null;
    this.currentSection = getSettingsSection(candidate).id;
    this.mount();
  },

  mount() {
    const view = document.getElementById('app-view-container');
    if (!view) return;
    this.container = view;
    view.classList.add('settings-view');
    view.innerHTML = `
      <div class="settings-layout">
        ${SettingsSidebar.render(this.currentSection)}
        <main class="settings-main" id="settings-main">
          <div class="settings-mobile-bar">
            <button type="button" class="icon-button settings-mobile-menu" id="settings-menu-toggle" aria-label="Open settings navigation" aria-expanded="false" aria-controls="settings-sidebar">
              ${icon('menu', 19)}
            </button>
            <div class="settings-mobile-title">
              <span>Settings</span>
              <strong id="settings-mobile-title">${esc(getSettingsSection(this.currentSection).label)}</strong>
            </div>
            <span class="settings-mobile-mark">LK</span>
          </div>
          <div class="settings-content" id="settings-content"></div>
        </main>
      </div>
    `;

    this.sidebarController = SettingsSidebar.bind({
      onNavigate: (id) => this.renderSection(id, { focus: true })
    });

    const menuToggle = document.getElementById('settings-menu-toggle');
    menuToggle?.addEventListener('click', () => {
      const sidebar = document.getElementById('settings-sidebar');
      const isOpen = sidebar && sidebar.classList.contains('is-open');
      if (isOpen) this.sidebarController?.close();
      else this.sidebarController?.open();
      menuToggle.setAttribute('aria-expanded', String(!isOpen));
    });

    if (this._escapeHandler) document.removeEventListener('keydown', this._escapeHandler);
    this._escapeHandler = (event) => {
      if (event.key === 'Escape') {
        const sidebar = document.getElementById('settings-sidebar');
        if (sidebar && sidebar.classList.contains('is-open')) {
          this.sidebarController?.close();
          menuToggle?.setAttribute('aria-expanded', 'false');
          menuToggle?.focus({ preventScroll: true });
        }
      }
    };
    document.addEventListener('keydown', this._escapeHandler);

    this.renderSection(this.currentSection, { focus: false, scroll: false });
  },

  open(section) {
    if (!this.container) {
      this.init(section);
      return;
    }
    this.renderSection(section, { focus: true });
  },

  renderSection(sectionId, options = {}) {
    const { focus = false, scroll = true } = options;
    if (!this.container) {
      this.init(sectionId);
      return;
    }
    const section = getSettingsSection(sectionId);
    const content = document.getElementById('settings-content');
    if (!content) return;

    const changed = section.id !== this.currentSection;
    this.currentSection = section.id;
    try {
      localStorage.setItem('localkaam_settings_section', section.id);
    } catch (e) {}

    this.sidebarController?.updateActive(section.id);
    const body = this.renderPage(section.id);

    content.innerHTML = `
      <section class="settings-page" aria-labelledby="settings-page-title">
        <header class="settings-page-header">
          <div class="settings-page-heading">
            <span class="settings-eyebrow">${esc(section.category)}</span>
            <h1 id="settings-page-title" tabindex="-1">${esc(section.label)}</h1>
            <p class="settings-page-description">${esc(section.description)}</p>
          </div>
          <div class="settings-save-state" id="settings-save-state" role="status" aria-live="polite">
            ${icon('check', 14)}<span>Preferences save automatically</span>
          </div>
        </header>
        <div class="settings-page-body">
          ${body}
        </div>
      </section>
    `;

    const mobileTitle = document.getElementById('settings-mobile-title');
    if (mobileTitle) mobileTitle.textContent = section.label;
    document.title = `${section.label} · Settings · LocalKaam`;
    this.bindPage(section.id);
    i18n.translateDOM(content);

    if (focus) {
      const heading = document.getElementById('settings-page-title');
      heading?.focus({ preventScroll: true });
    }
    if (scroll && changed) {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, 0);
      }
    }
  },

  // ------------------------------------------------------------------------
  // Shared UI helpers
  // ------------------------------------------------------------------------

  panel(title, description, body, extraClass = '') {
    return `
      <section class="settings-panel ${extraClass}">
        ${title ? `
          <div class="settings-panel-header">
            <h2 class="settings-panel-title">${esc(title)}</h2>
            ${description ? `<p class="settings-panel-description">${esc(description)}</p>` : ''}
          </div>
        ` : ''}
        <div class="settings-panel-body">${body}</div>
      </section>
    `;
  },

  switchRow({ id, title, description, checked, disabled = false, note = '' }) {
    return `
      <div class="settings-row${disabled ? ' is-disabled' : ''}">
        <div class="settings-row-copy">
          <label class="settings-row-title" for="${id}">${esc(title)}</label>
          <p class="settings-row-description">${esc(description)}</p>
          ${note ? `<p class="settings-inline-note">${esc(note)}</p>` : ''}
        </div>
        <label class="switch" aria-label="${esc(title)}">
          <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
          <span class="switch-track" aria-hidden="true"></span>
        </label>
      </div>
    `;
  },

  selectRow({ id, title, description, value, options, note = '' }) {
    return `
      <div class="settings-row">
        <div class="settings-row-copy">
          <label class="settings-row-title" for="${id}">${esc(title)}</label>
          <p class="settings-row-description">${esc(description)}</p>
          ${note ? `<p class="settings-inline-note">${esc(note)}</p>` : ''}
        </div>
        <select class="settings-select" id="${id}">
          ${options.map((option) => `
            <option value="${esc(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''} ${option.disabled ? 'disabled' : ''}>
              ${esc(option.label)}
            </option>
          `).join('')}
        </select>
      </div>
    `;
  },

  field({ id, label, value = '', type = 'text', placeholder = '', note = '', disabled = false, maxlength = '', autocomplete = 'off', required = false, inputmode = '' }) {
    return `
      <div class="settings-field">
        <label for="${id}">${esc(label)}</label>
        <input
          class="settings-input"
          type="${type}"
          id="${id}"
          value="${esc(value)}"
          placeholder="${esc(placeholder)}"
          ${disabled ? 'disabled' : ''}
          ${maxlength ? `maxlength="${maxlength}"` : ''}
          ${autocomplete ? `autocomplete="${esc(autocomplete)}"` : ''}
          ${required ? 'required' : ''}
          ${inputmode ? `inputmode="${esc(inputmode)}"` : ''}
        >
        ${note ? `<p class="settings-field-note">${note}</p>` : ''}
      </div>
    `;
  },

  setSavedState(message = 'Saved just now', tone = 'saved') {
    const el = document.getElementById('settings-save-state');
    if (!el) return;
    el.className = `settings-save-state is-${tone}`;
    el.innerHTML = `${icon(tone === 'error' ? 'alert' : 'check', 14)}<span>${esc(message)}</span>`;
    if (this._savedTimer) window.clearTimeout(this._savedTimer);
    if (tone === 'saved') {
      this._savedTimer = window.setTimeout(() => {
        const current = document.getElementById('settings-save-state');
        if (!current) return;
        current.className = 'settings-save-state';
        current.innerHTML = `${icon('check', 14)}<span>Preferences save automatically</span>`;
      }, 2600);
    }
  },

  persist(path, value, message = 'Saved just now') {
    Settings.set(path, value);
    const result = Settings.save();
    if (!result || !result.success) {
      this.setSavedState('Could not save changes', 'error');
      Toast.show('Your changes could not be saved. Storage may be unavailable.', 'error');
      return false;
    }
    this.setSavedState(message);
    return true;
  },

  bindSwitch(id, path, onChange) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      const ok = this.persist(path, el.checked);
      if (!ok) el.checked = !el.checked;
      else if (onChange) onChange(el.checked, el);
    });
  },

  bindSelect(id, path, onChange) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      const value = el.value;
      const ok = this.persist(path, value);
      if (ok && onChange) onChange(value, el);
    });
  },

  term(value) {
    return esc(value);
  },

  // ------------------------------------------------------------------------
  // Page router
  // ------------------------------------------------------------------------

  renderPage(sectionId) {
    switch (sectionId) {
      case 'general': return this.renderGeneralPage();
      case 'appearance': return this.renderAppearancePage();
      case 'notifications': return this.renderNotificationsPage();
      case 'profile': return this.renderProfilePage();
      case 'reviews': return this.renderReviewsPage();
      case 'security-login': return this.renderSecurityPage();
      case 'account': return this.renderAccountPage();
      case 'privacy': return this.renderPrivacyPage();
      case 'personalization': return this.renderPersonalizationPage();
      case 'language': return this.renderLanguagePage();
      case 'keyboard-shortcuts': return this.renderShortcutsPage();
      case 'help-support': return this.renderHelpPage();
      case 'complaints': return this.renderComplaintsPage();
      case 'about': return this.renderAboutPage();
      default: return this.renderGeneralPage();
    }
  },

  bindPage(sectionId) {
    switch (sectionId) {
      case 'general': this.bindGeneral(); break;
      case 'appearance': this.bindAppearance(); break;
      case 'notifications': this.bindNotifications(); break;
      case 'profile': this.bindProfile(); break;
      case 'reviews': this.bindReviews(); break;
      case 'security-login': this.bindSecurity(); break;
      case 'account': this.bindAccount(); break;
      case 'privacy': this.bindPrivacy(); break;
      case 'personalization': this.bindPersonalization(); break;
      case 'language': this.bindLanguage(); break;
      case 'keyboard-shortcuts': this.bindShortcuts(); break;
      case 'help-support': this.bindHelp(); break;
      case 'complaints': this.bindComplaints(); break;
      case 'about': this.bindAbout(); break;
      default: break;
    }
  },

  // ------------------------------------------------------------------------
  // Worker context helpers (Reviews / Complaints / Professional profile live
  // in Settings only — they were removed from the worker sidebar).
  // ------------------------------------------------------------------------

  isWorkerContext() {
    try {
      const role = StorageService.getCurrentRole && StorageService.getCurrentRole();
      if (role === 'worker') return true;
    } catch (e) {}
    return AuthService.getProfile()?.role === 'worker';
  },

  getCurrentWorker() {
    const workers = StorageService.getWorkers() || [];
    const authProfile = AuthService.getProfile();
    let currentWorkerId = null;
    try { currentWorkerId = StorageService.getSelectedWorkerId(); } catch (e) {}
    if (authProfile && authProfile.role === 'worker') {
      const authId = String(authProfile.id || '');
      const partial = authId ? authId.substring(0, 8) : '';
      const myWorker = workers.find((w) =>
        (w.user_id && String(w.user_id) === authId) ||
        (w.userId && String(w.userId) === authId) ||
        (partial && w.id === `w_${partial}`) ||
        (authProfile.phone && w.phone && w.phone === authProfile.phone && AuthService.isGuest())
      );
      if (myWorker) currentWorkerId = myWorker.id;
    }
    return workers.find((w) => w.id === currentWorkerId) || workers[0] || null;
  },

  renderReviewsPage() {
    const worker = this.getCurrentWorker();
    if (!worker) {
      return `${this.panel('Reviews & Ratings', 'Customer feedback for your professional profile.', `<div class="settings-empty-state">${icon('star', 20)}<div><strong>No worker profile selected.</strong><p>Complete worker onboarding to collect reviews.</p></div></div>`)}`;
    }
    return `
      ${this.panel('Reviews & Ratings', `Feedback for ${esc(worker.name)}. Respond from here — it stays in Settings only.`, `
        <div id="settings-reviews-body">${WorkerFeedback.renderFeedbackSection(worker)}</div>
      `)}
    `;
  },

  bindReviews() {
    const worker = this.getCurrentWorker();
    if (!worker) return;
    document.querySelectorAll('.respond-review-btn').forEach((btn) => {
      btn.onclick = () => {
        const reviewId = btn.getAttribute('data-review-id');
        WorkerFeedback.respondToReview(reviewId, worker.id);
      };
    });
  },

  renderComplaintsPage() {
    const worker = this.isWorkerContext() ? this.getCurrentWorker() : null;
    const complaints = StorageService.getComplaints() || [];
    return `
      ${this.panel('Complaints', 'View and file complaints about bookings. This lives in Settings only.', `
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Filter</span>
            <p class="settings-row-description">Narrow the list by status.</p>
          </div>
          <select class="settings-select" id="s-complaint-filter" aria-label="Filter complaints">
            <option value="all">All Complaints</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div id="s-complaints-list" style="margin-top: 12px;">
          ${complaints.length === 0 ? `<p style="color: var(--text-secondary); text-align: center; padding: 1.5rem;">No complaints yet.</p>` : `
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${complaints.map((c) => `
                <div style="background: var(--bg-primary); padding: 14px; border-radius: 8px; border: 1px solid var(--border-color);">
                  <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 4px;">${esc(c.issue || c.category || 'Complaint')}</h4>
                  <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 4px;">${esc(c.details || 'No details provided')}</p>
                  <p style="color: var(--text-secondary); font-size: 0.8rem; margin: 0;">${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''} · Status: <span class="badge">${esc(c.status || 'Open')}</span></p>
                  ${c.workerResponse ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 6px;"><strong>Response:</strong> ${esc(c.workerResponse)}</p>` : ''}
                  ${c.resolution_notes ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 6px;"><strong>Resolution:</strong> ${esc(c.resolution_notes)}</p>` : ''}
                </div>
              `).join('')}
            </div>`}
        </div>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px;">Submit New Complaint</h3>
          <form id="s-complaint-form" style="display: flex; flex-direction: column; gap: 12px; max-width: 560px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Category</label>
                <select id="s-complaint-category" class="settings-select">
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
                <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Booking ID</label>
                <input type="text" id="s-complaint-booking-id" class="form-control" placeholder="e.g. BK-10492" required>
              </div>
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">Complaint Details</label>
              <textarea id="s-complaint-details" class="form-control" rows="3" placeholder="Describe the incident..."></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 12px;">
              <button type="button" class="btn btn-outline btn-sm" id="s-complaint-cancel">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Submit Complaint</button>
            </div>
          </form>
        </div>
      `)}
    `;
  },

  bindComplaints() {
    const worker = this.isWorkerContext() ? this.getCurrentWorker() : null;
    const filterSelect = document.getElementById('s-complaint-filter');
    filterSelect?.addEventListener('change', () => {
      const filter = filterSelect.value;
      const listDiv = document.getElementById('s-complaints-list');
      if (!listDiv) return;
      const complaints = StorageService.getComplaints() || [];
      const filtered = filter === 'all' ? complaints : complaints.filter((c) => String(c.status || '').toLowerCase() === filter);
      listDiv.innerHTML = filtered.length === 0
        ? `<p style="color: var(--text-secondary); text-align: center; padding: 1.5rem;">No complaints found.</p>`
        : `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${filtered.map((c) => `
              <div style="background: var(--bg-primary); padding: 14px; border-radius: 8px; border: 1px solid var(--border-color);">
                <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 4px;">${esc(c.issue || c.category || 'Complaint')}</h4>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 4px;">${esc(c.details || 'No details provided')}</p>
                <p style="color: var(--text-secondary); font-size: 0.8rem; margin: 0;">${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''} · Status: <span class="badge">${esc(c.status || 'Open')}</span></p>
                ${c.workerResponse ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 6px;"><strong>Response:</strong> ${esc(c.workerResponse)}</p>` : ''}
                ${c.resolution_notes ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 6px;"><strong>Resolution:</strong> ${esc(c.resolution_notes)}</p>` : ''}
              </div>
            `).join('')}
          </div>`;
    });

    document.getElementById('s-complaint-cancel')?.addEventListener('click', () => {
      document.getElementById('s-complaint-form')?.reset();
    });

    const form = document.getElementById('s-complaint-form');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const category = document.getElementById('s-complaint-category')?.value || 'other';
      const bookingId = (document.getElementById('s-complaint-booking-id')?.value || '').trim();
      const details = (document.getElementById('s-complaint-details')?.value || '').trim();
      if (!bookingId || !details) {
        Toast.show('Please fill in all required fields', 'error');
        return;
      }
      const complaint = {
        id: `CMP-${Date.now()}`,
        bookingId,
        workerId: worker ? worker.id : null,
        customerId: null,
        customerName: worker ? worker.name : (AuthService.getProfile()?.full_name || 'Customer'),
        category,
        issue: category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        details,
        status: 'Open',
        createdAt: new Date().toISOString()
      };
      const complaints = StorageService.getComplaints() || [];
      complaints.unshift(complaint);
      StorageService.saveComplaints(complaints);
      this.renderSection('complaints', { focus: false, scroll: false });
      Toast.show('Complaint submitted.', 'success');
    });
  },

  renderWorkerProfessionalPanel() {
    if (!this.isWorkerContext()) return '';
    const worker = this.getCurrentWorker();
    if (!worker) return '';
    return `
      ${this.panel('Professional profile', 'How customers see you as a worker. Edit here — this replaces the old sidebar “My Profile”.', `
        <form id="worker-full-profile-form" class="settings-form profile-form" novalidate>
          <div class="settings-grid-2">
            ${this.field({ id: 'wp-name', label: 'Full Name', value: worker.name || '', placeholder: 'e.g. Rajesh Kumar', required: true })}
            ${this.field({ id: 'wp-phone', label: 'Phone Number', value: worker.phone || '+91 98211 44551', type: 'tel', required: true })}
          </div>
          <div class="settings-field">
            <label for="wp-bio">Professional Bio</label>
            <textarea class="settings-textarea" id="wp-bio" rows="3" required>${esc(worker.bio || '')}</textarea>
          </div>
          <div class="settings-grid-2">
            ${this.field({ id: 'wp-experience', label: 'Past Experience', value: worker.pastExperience || '', placeholder: 'e.g. 4 years with residential repairs' })}
            ${this.field({ id: 'wp-certifications', label: 'Certifications / ITI License', value: worker.certifications || '', placeholder: 'e.g. ITI Certified Electrician' })}
          </div>
          <div class="settings-grid-2">
            <div class="settings-field">
              <label for="wp-locality">Base Locality</label>
              <select class="settings-select" id="wp-locality">
                ${LOCALITIES.map((l) => `<option value="${esc(l.id)}" ${l.id === worker.baseLocality ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
              </select>
            </div>
            ${this.field({ id: 'wp-area', label: 'Service Area', value: worker.serviceArea || '', required: true })}
          </div>
          <div class="settings-field">
            <label for="wp-radius">Service Radius (km)</label>
            <input type="number" class="form-control" id="wp-radius" value="${worker.serviceRadius || 10}" min="1" max="50" required>
          </div>
          <div class="settings-form-actions">
            <button type="submit" class="btn btn-primary btn-sm">Save Professional Profile</button>
          </div>
        </form>
      `)}
    `;
  },

  bindWorkerProfessionalPanel() {
    const form = document.getElementById('worker-full-profile-form');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const worker = this.getCurrentWorker();
      if (!worker) { Toast.show('No worker profile selected.', 'error'); return; }
      const workers = StorageService.getWorkers();
      const target = workers.find((item) => item.id === worker.id);
      if (!target) { Toast.show('No worker profile selected.', 'error'); return; }
      target.name = document.getElementById('wp-name')?.value.trim() || target.name;
      target.phone = document.getElementById('wp-phone')?.value.trim() || target.phone;
      target.bio = document.getElementById('wp-bio')?.value.trim() || target.bio;
      target.pastExperience = document.getElementById('wp-experience')?.value.trim() || target.pastExperience;
      target.certifications = document.getElementById('wp-certifications')?.value.trim() || target.certifications;
      target.baseLocality = document.getElementById('wp-locality')?.value || target.baseLocality;
      target.serviceArea = document.getElementById('wp-area')?.value.trim() || target.serviceArea;
      target.serviceRadius = parseFloat(document.getElementById('wp-radius')?.value) || 10;
      StorageService.saveWorkers(workers);
      window.dispatchEvent(new CustomEvent('locakaam:profile-updated'));
      ProfileDropdown.refresh();
      this.renderSection('profile', { focus: false, scroll: false });
      Toast.show('Profile updated successfully!', 'success');
    });
  },

  renderWorkerSupportPanel() {
    if (!this.isWorkerContext()) return '';
    return `
      ${this.panel('Worker support', 'Helpline and tickets for billing or job disputes. This replaces the old sidebar “Help Centre”.', `
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Emergency Helpline (24/7)</span>
            <p class="settings-row-description">Free helpline in Hindi, Marathi & English.</p>
          </div>
          <a class="btn btn-outline btn-sm" href="tel:18004195226" style="text-decoration: none;">📞 1800-419-KAAM</a>
        </div>
        <form id="worker-support-ticket-form" class="settings-form profile-form" novalidate>
          <div class="settings-field">
            <label for="supp-subject">Subject</label>
            <input type="text" id="supp-subject" class="form-control" placeholder="e.g. Payment inquiry or rescheduling" required>
          </div>
          <div class="settings-field">
            <label for="supp-desc">Description</label>
            <textarea id="supp-desc" class="form-control" rows="3" placeholder="Describe the inquiry..." required></textarea>
          </div>
          <div class="settings-form-actions">
            <button type="submit" class="btn btn-primary btn-sm">Submit Ticket</button>
          </div>
        </form>
      `)}
    `;
  },

  bindWorkerSupportPanel() {
    const form = document.getElementById('worker-support-ticket-form');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const worker = this.getCurrentWorker();
      const subject = document.getElementById('supp-subject')?.value.trim() || '';
      const desc = document.getElementById('supp-desc')?.value.trim() || '';
      if (!subject || !desc) { Toast.show('Please fill in all required fields', 'error'); return; }
      const tickets = StorageService.getSupportTickets() || [];
      tickets.push({
        id: `TKT-${Date.now()}`,
        workerId: worker ? worker.id : null,
        subject,
        description: desc,
        status: 'Open',
        createdAt: new Date().toISOString()
      });
      StorageService.saveSupportTickets(tickets);
      form.reset();
      Toast.show('Support ticket submitted!', 'success');
    });
  },

  // ------------------------------------------------------------------------
  // General
  // ------------------------------------------------------------------------

  renderGeneralPage() {
    const language = Settings.get('general.language', 'en');
    const landing = Settings.get('general.defaultLanding', 'last');
    const enterKey = Settings.get('general.enterKey', 'submit');

    return `
      ${this.panel('Language', 'Choose the language used by the interface.', `
        <div class="settings-row">
          <div class="settings-row-copy">
            <label class="settings-row-title" for="general-language">Display language</label>
            <p class="settings-row-description">Choose your interface language. LocalKaam translates titles, categories and badges instantly.</p>
          </div>
          <select class="settings-select" id="general-language">
            <option value="en" ${language === 'en' ? 'selected' : ''}>English</option>
            <option value="hi" ${language === 'hi' ? 'selected' : ''}>हिन्दी (Hindi)</option>
            <option value="mr" ${language === 'mr' ? 'selected' : ''}>मराठी (Marathi)</option>
            <option value="gu" ${language === 'gu' ? 'selected' : ''}>ગુજરાતી (Gujarati)</option>
            <option value="ta" ${language === 'ta' ? 'selected' : ''}>தமிழ் (Tamil)</option>
            <option value="te" ${language === 'te' ? 'selected' : ''}>తెలుగు (Telugu)</option>
          </select>
        </div>
      `)}

      ${this.panel('Startup', 'Control what happens when you open LocalKaam.', `
        ${this.selectRow({
          id: 'general-landing',
          title: 'When the app opens',
          description: 'Choose the first screen you see after opening LocalKaam.',
          value: landing,
          options: [
            { value: 'last', label: 'Remember my last screen' },
            { value: 'landing', label: 'Landing page' },
            { value: 'customer', label: 'Customer dashboard' },
            { value: 'worker', label: 'Worker dashboard' }
          ]
        })}
      `)}

      ${this.panel('Keyboard behaviour', 'Small adjustments that affect data entry.', `
        ${this.selectRow({
          id: 'general-enter-key',
          title: 'Enter key in text areas',
          description: 'Choose whether Enter submits a form or inserts a new line.',
          value: enterKey,
          options: [
            { value: 'submit', label: 'Submit the form' },
            { value: 'newline', label: 'Insert a new line' }
          ],
          note: 'Ctrl + Enter always submits the current form.'
        })}
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Auto-save</span>
            <p class="settings-row-description">Preference changes are written to this device immediately.</p>
          </div>
          <span class="settings-status-pill is-success">${icon('check', 13)} On</span>
        </div>
      `)}

      <p class="settings-footnote">Settings in this section apply to this browser. They are stored locally and never sent to another service.</p>
    `;
  },

  bindGeneral() {
    this.bindSelect('general-language', 'general.language', (val) => { i18n.setLanguage(val); });
    this.bindSelect('general-landing', 'general.defaultLanding');
    this.bindSelect('general-enter-key', 'general.enterKey');
  },

  // ------------------------------------------------------------------------
  // Appearance
  // ------------------------------------------------------------------------

  renderAppearancePage() {
    const theme = Settings.get('appearance.theme', 'light');
    const accent = Settings.get('appearance.accentColor', '');
    const fontSize = Settings.get('appearance.fontSize', 'medium');
    const density = Settings.get('appearance.density', 'comfortable');

    const themeDescriptions = {
      light: 'Warm paper surfaces with forest ink.',
      dark: 'Low-light palette for evening use.',
      system: 'Follow your operating system setting.'
    };
    const themeIcons = { light: 'sun', dark: 'moon', system: 'monitor' };

    return `
      ${this.panel('Theme', 'Pick a surface palette for the whole application.', `
        <fieldset class="settings-fieldset">
          <legend class="sr-only">Theme</legend>
          <div class="theme-options">
            ${THEMES.map((option) => `
              <label class="theme-option">
                <input type="radio" name="appearance-theme" value="${option.id}" ${theme === option.id ? 'checked' : ''}>
                <span class="theme-option-card">
                  <span class="theme-preview theme-preview-${option.id}" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </span>
                  <span class="theme-option-label">${icon(themeIcons[option.id], 16)} ${esc(option.name)}</span>
                  <span class="theme-option-description">${esc(themeDescriptions[option.id])}</span>
                </span>
              </label>
            `).join('')}
          </div>
        </fieldset>
      `)}

      ${this.panel('Accent colour', 'Used for selected controls, links and primary actions.', `
        <fieldset class="settings-fieldset">
          <legend class="settings-field-label">Accent</legend>
          <div class="accent-swatches">
            ${ACCENT_COLORS.map((color) => `
              <label class="accent-swatch" title="${esc(color.name)}">
                <input type="radio" name="appearance-accent" value="${esc(color.value)}" ${accent === color.value ? 'checked' : ''} aria-label="${esc(color.name)}">
                <span class="accent-swatch-dot${color.id === 'default' ? ' is-default' : ''}" style="${color.value ? `background:${esc(color.value)}` : ''}">
                  ${accent === color.value ? icon('check', 13) : ''}
                </span>
                <span class="accent-swatch-name">${esc(color.name)}</span>
              </label>
            `).join('')}
            <label class="accent-swatch accent-swatch-custom" title="Custom colour">
              <span class="accent-swatch-dot${accent && !ACCENT_COLORS.some((c) => c.value === accent) ? ' is-selected' : ''}" style="background:conic-gradient(#b5491f,#ffe95c,#0f6b62,#45439a,#b5491f)">
                ${accent && !ACCENT_COLORS.some((c) => c.value === accent) ? icon('check', 13) : ''}
              </span>
              <span class="accent-swatch-name">Custom</span>
              <input type="color" id="appearance-custom-accent" value="${esc(accent || '#1a3300')}" aria-label="Choose a custom accent colour">
            </label>
          </div>
          <p class="settings-field-note">Every colour adapts automatically for dark mode — presets use a brighter variant so text stays readable on dark surfaces.</p>
        </fieldset>
      `)}

      ${this.panel('Type size', 'Adjust the size of text across the interface.', `
        <fieldset class="settings-fieldset">
          <legend class="sr-only">Type size</legend>
          <div class="settings-segmented" role="radiogroup" aria-label="Type size">
            ${FONT_SIZES.map((size) => `
              <label class="segment">
                <input type="radio" name="appearance-font-size" value="${size.id}" ${fontSize === size.id ? 'checked' : ''}>
                <span class="segment-label segment-size-${size.id}">${esc(size.name)}</span>
              </label>
            `).join('')}
          </div>
          <p class="settings-field-note">Text size preview updates immediately.</p>
        </fieldset>
      `)}

      ${this.panel('Interface density', 'How tightly content is spaced on screen.', `
        <fieldset class="settings-fieldset">
          <legend class="sr-only">Interface density</legend>
          <div class="settings-segmented" role="radiogroup" aria-label="Interface density">
            ${DENSITIES.map((option) => `
              <label class="segment">
                <input type="radio" name="appearance-density" value="${option.id}" ${density === option.id ? 'checked' : ''}>
                <span class="segment-label">${esc(option.name)}</span>
              </label>
            `).join('')}
          </div>
        </fieldset>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Reset appearance</span>
            <p class="settings-row-description">Restore the default theme, accent, text size and density.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="appearance-reset">Reset</button>
        </div>
      `)}
    `;
  },

  bindAppearance() {
    const themeInputs = document.querySelectorAll('input[name="appearance-theme"]');
    themeInputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        Settings.setTheme(input.value);
        this.setSavedState('Appearance updated');
        window.dispatchEvent(new CustomEvent('locakaam:theme-changed'));
      });
    });

    const accentInputs = document.querySelectorAll('input[name="appearance-accent"]');
    accentInputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        Settings.setAccentColor(input.value);
        this.setSavedState('Accent colour updated');
        window.dispatchEvent(new CustomEvent('locakaam:accent-changed'));
        // Re-render to keep the custom picker and selection ring in sync.
        this.renderSection('appearance', { focus: false, scroll: false });
      });
    });

    const customAccent = document.getElementById('appearance-custom-accent');
    customAccent?.addEventListener('input', () => {
      Settings.setAccentColor(customAccent.value);
      this.setSavedState('Accent colour updated');
      window.dispatchEvent(new CustomEvent('locakaam:accent-changed'));
    });
    customAccent?.addEventListener('change', () => {
      this.renderSection('appearance', { focus: false, scroll: false });
    });

    document.querySelectorAll('input[name="appearance-font-size"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        Settings.setFontSize(input.value);
        this.setSavedState('Text size updated');
      });
    });

    document.querySelectorAll('input[name="appearance-density"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        Settings.setDensity(input.value);
        this.setSavedState('Density updated');
      });
    });

    document.getElementById('appearance-reset')?.addEventListener('click', () => {
      Settings.resetAppearance();
      this.renderSection('appearance', { focus: false, scroll: false });
      this.setSavedState('Appearance reset to defaults');
      window.dispatchEvent(new CustomEvent('locakaam:theme-changed'));
      window.dispatchEvent(new CustomEvent('locakaam:accent-changed'));
      Toast.show('Appearance reset to the default theme.', 'success');
    });
  },

  // ------------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------------

  renderNotificationsPage() {
    const enabled = Settings.get('notifications.enabled', true);
    const email = Settings.get('notifications.email', true);
    const push = Settings.get('notifications.push', false);
    const important = Settings.get('notifications.importantUpdates', true);
    const booking = Settings.get('notifications.bookingUpdates', true);
    const promotions = Settings.get('notifications.promotions', false);
    const permission = (typeof Notification !== 'undefined' && Notification.permission) || 'unsupported';
    const pushSupported = typeof Notification !== 'undefined';
    const pushBlocked = permission === 'denied';
    const pushGranted = permission === 'granted';

    return `
      ${this.panel('Delivery', 'Choose whether LocalKaam can reach you.', `
        ${this.switchRow({
          id: 'notification-master',
          title: 'Enable notifications',
          description: 'Master switch for all LocalKaam updates.',
          checked: enabled
        })}
        ${this.switchRow({
          id: 'notification-email',
          title: 'Email notifications',
          description: 'Booking confirmations, changes and account notices by email.',
          checked: email,
          disabled: !enabled
        })}
        ${this.switchRow({
          id: 'notification-push',
          title: 'Browser notifications',
          description: pushSupported
            ? 'Show desktop notifications while LocalKaam is open in this browser.'
            : 'This browser does not expose the Notification API.',
          checked: push && pushGranted,
          disabled: !enabled || !pushSupported || pushBlocked,
          note: pushBlocked
            ? 'Notifications are blocked for this site. Allow them in your browser settings, then reload this page.'
            : (pushGranted ? 'Browser permission granted.' : 'Turning this on asks your browser for permission.')
        })}
      `)}

      ${this.panel('What you receive', 'Fine-tune the updates you care about.', `
        ${this.switchRow({
          id: 'notification-important',
          title: 'Important updates',
          description: 'Security notices, policy changes and service availability.',
          checked: important,
          disabled: !enabled
        })}
        ${this.switchRow({
          id: 'notification-booking',
          title: 'Booking updates',
          description: 'New requests, counter-offers and status changes.',
          checked: booking,
          disabled: !enabled
        })}
        ${this.switchRow({
          id: 'notification-promotions',
          title: 'Promotions and offers',
          description: 'Occasional offers from local professionals.',
          checked: promotions,
          disabled: !enabled
        })}
      `)}

      ${this.panel('Test delivery', 'Confirm that browser notifications work on this device.', `
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Send a test notification</span>
            <p class="settings-row-description">Uses the browser Notification API. If permission is not granted, an in-app message is shown instead.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="notification-test">Send test</button>
        </div>
      `)}
    `;
  },

  bindNotifications() {
    const master = document.getElementById('notification-master');
    const dependentIds = ['notification-email', 'notification-push', 'notification-important', 'notification-booking', 'notification-promotions'];

    const refreshDependentState = () => {
      const enabled = Boolean(master && master.checked);
      dependentIds.forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        if (id === 'notification-push') {
          const permission = (typeof Notification !== 'undefined' && Notification.permission) || 'unsupported';
          input.disabled = !enabled || typeof Notification === 'undefined' || permission === 'denied';
        } else {
          input.disabled = !enabled;
        }
        input.closest('.settings-row')?.classList.toggle('is-disabled', input.disabled);
      });
      this.setSavedState();
    };

    master?.addEventListener('change', () => {
      const ok = this.persist('notifications.enabled', master.checked);
      if (!ok) master.checked = !master.checked;
      refreshDependentState();
    });

    this.bindSwitch('notification-email', 'notifications.email');
    this.bindSwitch('notification-important', 'notifications.importantUpdates');
    this.bindSwitch('notification-booking', 'notifications.bookingUpdates');
    this.bindSwitch('notification-promotions', 'notifications.promotions');

    const push = document.getElementById('notification-push');
    push?.addEventListener('change', async () => {
      if (typeof Notification === 'undefined') {
        push.checked = false;
        Toast.show('This browser does not support notifications.', 'error');
        return;
      }
      if (!push.checked) {
        this.persist('notifications.push', false);
        return;
      }
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          push.checked = false;
          this.persist('notifications.push', false);
          Toast.show('Browser notification permission was not granted.', 'warning');
          this.renderSection('notifications', { focus: false, scroll: false });
          return;
        }
        this.persist('notifications.push', true);
        Toast.show('Browser notifications enabled.', 'success');
        this.renderSection('notifications', { focus: false, scroll: false });
      } catch (error) {
        push.checked = false;
        Toast.show('Could not request notification permission.', 'error');
      }
    });

    document.getElementById('notification-test')?.addEventListener('click', () => {
      if (Settings.get('notifications.enabled', true) === false) {
        Toast.show('Enable notifications first.', 'warning');
        return;
      }
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && Settings.get('notifications.push', false)) {
          new Notification('LocalKaam', { body: 'Notifications are working on this device.' });
          Toast.show('Test notification sent.', 'success');
        } else {
          Toast.show('In-app notifications are working. Browser notifications need permission and the browser toggle enabled.', 'info');
        }
      } catch (error) {
        Toast.show('The test notification could not be shown.', 'error');
      }
    });
  },

  // ------------------------------------------------------------------------
  // Profile
  // ------------------------------------------------------------------------

  getProfileData() {
    const auth = AuthService.getProfile() || {};
    const stored = Settings.get('profile', {}) || {};
    const fullName = stored.displayName || auth.full_name || auth.name || '';
    const username = stored.username || fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    return {
      fullName,
      username,
      email: auth.email || stored.email || '',
      bio: stored.bio || '',
      phone: stored.phone || auth.phone || '',
      locality: stored.locality || auth.locality || 'andheri',
      avatarUrl: stored.avatarUrl || auth.avatar_url || '',
      role: auth.role || (auth.user_metadata && auth.user_metadata.role) || 'customer',
      createdAt: auth.created_at || auth.user_metadata?.created_at || ''
    };
  },

  renderProfilePage() {
    const profile = this.getProfileData();
    const roleLabel = profile.role === 'worker' ? 'Service worker' : 'Customer';
    const initialsProfile = { ...profile, displayName: profile.fullName };

    return `
      <section class="settings-panel">
        <div class="profile-editor-head">
          <div class="profile-avatar-preview" id="profile-avatar-preview">
            ${avatarMarkup(initialsProfile, 'lg')}
          </div>
          <div class="profile-editor-identity">
            <h2>${esc(profile.fullName || 'Your profile')}</h2>
            <p>${esc(profile.email || 'Local account')} · ${esc(roleLabel)}</p>
            <div class="profile-editor-actions">
              <button type="button" class="btn btn-outline btn-sm" id="profile-avatar-upload">${icon('camera', 15)} Change photo</button>
              <button type="button" class="btn btn-quiet btn-sm" id="profile-avatar-remove" ${profile.avatarUrl ? '' : 'hidden'}>${icon('trash', 14)} Remove</button>
              <input type="file" id="profile-avatar-input" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
            </div>
            <p class="settings-field-note profile-avatar-note">Photos are stored locally on this device. Maximum 800 KB.</p>
          </div>
        </div>

        <form id="profile-form" class="settings-form profile-form" novalidate>
          <div id="profile-form-error" class="settings-form-error" role="alert" hidden></div>

          <div class="settings-grid-2">
            ${this.field({
              id: 'profile-full-name',
              label: 'Display name',
              value: profile.fullName,
              placeholder: 'e.g. Aarav Mehta',
              autocomplete: 'name',
              required: true,
              maxlength: '80'
            })}
            ${this.field({
              id: 'profile-username',
              label: 'Username',
              value: profile.username,
              placeholder: 'aaravmehta',
              maxlength: '20',
              note: 'Letters, numbers and underscores. 3–20 characters.'
            })}
          </div>

          <div class="settings-grid-2">
            ${this.field({
              id: 'profile-email',
              label: 'Email address',
              value: profile.email,
              type: 'email',
              placeholder: 'you@example.com',
              autocomplete: 'email',
              note: AuthService.isSupabaseAccount()
                ? 'Changing this sends a confirmation link before the new address becomes active.'
                : 'Local demo account email. Stored on this device only.'
            })}
            ${this.field({
              id: 'profile-phone',
              label: 'Phone number',
              value: profile.phone,
              type: 'tel',
              placeholder: '+91 98765 43210',
              autocomplete: 'tel',
              inputmode: 'tel',
              maxlength: '20'
            })}
          </div>

          <div class="settings-field">
            <label for="profile-locality">Locality</label>
            <select class="settings-select" id="profile-locality">
              ${LOCALITIES.map((locality) => `
                <option value="${esc(locality.id)}" ${profile.locality === locality.id ? 'selected' : ''}>${esc(locality.name)} — ${esc(locality.zone)}</option>
              `).join('')}
            </select>
          </div>

          <div class="settings-field">
            <div class="settings-label-row">
              <label for="profile-bio">Short bio</label>
              <span class="settings-character-count" id="profile-bio-count">${profile.bio.length}/240</span>
            </div>
            <textarea class="settings-textarea" id="profile-bio" maxlength="240" rows="4" placeholder="Tell local professionals a little about yourself.">${esc(profile.bio)}</textarea>
            <p class="settings-field-note">Shown on your LocalKaam profile. Keep it short and useful.</p>
          </div>

          <div class="settings-form-actions">
            <button type="submit" class="btn btn-primary btn-sm" id="profile-save">Save profile</button>
            <button type="button" class="btn btn-outline btn-sm" id="profile-discard">Discard changes</button>
          </div>
        </form>
      </section>

      ${this.renderWorkerProfessionalPanel()}

      <p class="settings-footnote">Display name, phone and locality sync to your Supabase profile when a Supabase session is active. Your username, bio and photo are kept on this device.</p>
    `;
  },

  bindProfile() {
    const form = document.getElementById('profile-form');
    const bio = document.getElementById('profile-bio');
    const bioCount = document.getElementById('profile-bio-count');
    const errorBox = document.getElementById('profile-form-error');
    const fileInput = document.getElementById('profile-avatar-input');
    const uploadButton = document.getElementById('profile-avatar-upload');
    const removeButton = document.getElementById('profile-avatar-remove');

    bio?.addEventListener('input', () => {
      if (bioCount) bioCount.textContent = `${bio.value.length}/240`;
    });

    uploadButton?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
        Toast.show('Choose a PNG, JPEG, WebP or GIF image.', 'error');
        fileInput.value = '';
        return;
      }
      if (file.size > 800 * 1024) {
        Toast.show('That image is larger than 800 KB. Choose a smaller file.', 'error');
        fileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        Settings.set('profile.avatarUrl', dataUrl);
        const result = Settings.save();
        if (!result.success) {
          Toast.show('The photo could not be saved. Storage may be full.', 'error');
          return;
        }
        const preview = document.getElementById('profile-avatar-preview');
        if (preview) preview.innerHTML = avatarMarkup({ displayName: this.getProfileData().fullName, avatarUrl: dataUrl }, 'lg');
        if (removeButton) removeButton.hidden = false;
        this.setSavedState('Profile photo updated');
        window.dispatchEvent(new CustomEvent('locakaam:profile-updated'));
        ProfileDropdown.refresh();
        Toast.show('Profile photo saved on this device.', 'success');
      };
      reader.onerror = () => Toast.show('That image could not be read.', 'error');
      reader.readAsDataURL(file);
      fileInput.value = '';
    });

    removeButton?.addEventListener('click', () => {
      Settings.set('profile.avatarUrl', '');
      Settings.save();
      this.renderSection('profile', { focus: false, scroll: false });
      window.dispatchEvent(new CustomEvent('locakaam:profile-updated'));
      ProfileDropdown.refresh();
      Toast.show('Profile photo removed.', 'info');
    });

    document.getElementById('profile-discard')?.addEventListener('click', () => {
      this.renderSection('profile', { focus: false, scroll: false });
      Toast.show('Unsaved profile changes discarded.', 'info');
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (errorBox) {
        errorBox.hidden = true;
        errorBox.textContent = '';
      }

      const fullName = document.getElementById('profile-full-name')?.value.trim() || '';
      const username = document.getElementById('profile-username')?.value.trim() || '';
      const email = document.getElementById('profile-email')?.value.trim() || '';
      const phone = document.getElementById('profile-phone')?.value.trim() || '';
      const locality = document.getElementById('profile-locality')?.value || 'andheri';
      const bioValue = document.getElementById('profile-bio')?.value.trim() || '';
      const saveButton = document.getElementById('profile-save');

      const showError = (message, fieldId) => {
        if (errorBox) {
          errorBox.hidden = false;
          errorBox.textContent = message;
          errorBox.focus?.();
        }
        const field = fieldId ? document.getElementById(fieldId) : null;
        if (field) {
          field.setAttribute('aria-invalid', 'true');
          field.focus();
        }
        Toast.show(message, 'error');
      };

      ['profile-full-name', 'profile-username', 'profile-email'].forEach((id) => {
        document.getElementById(id)?.removeAttribute('aria-invalid');
      });

      if (!fullName) return showError('Please enter a display name.', 'profile-full-name');
      if (fullName.length > 80) return showError('Display name must be 80 characters or fewer.', 'profile-full-name');
      if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return showError('Username must be 3–20 characters using letters, numbers or underscores.', 'profile-username');
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return showError('Enter a valid email address.', 'profile-email');
      }
      if (bioValue.length > 240) return showError('Bio must be 240 characters or fewer.', 'profile-bio');

      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'Saving…';
      }

      Settings.set('profile.displayName', fullName);
      Settings.set('profile.username', username);
      Settings.set('profile.email', email);
      Settings.set('profile.phone', phone);
      Settings.set('profile.locality', locality);
      Settings.set('profile.bio', bioValue);
      const saved = Settings.save();

      if (!saved.success) {
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.textContent = 'Save profile';
        }
        return showError('Your profile could not be saved because browser storage is unavailable.');
      }

      let updateResult = null;
      try {
        updateResult = await AuthService.updateProfile({
          full_name: fullName,
          username,
          email,
          phone,
          locality,
          bio: bioValue,
          avatar_url: Settings.get('profile.avatarUrl', '')
        });
      } catch (error) {
        updateResult = { error, syncError: error };
      }

      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Save profile';
      }

      if (updateResult?.error) {
        this.setSavedState('Profile saved locally', 'error');
        showError(`Profile saved on this device, but the account update failed: ${updateResult.error.message || updateResult.error}`);
        this.renderSection('profile', { focus: false, scroll: false });
        return;
      }

      this.setSavedState('Profile saved');
      if (updateResult?.emailConfirmation) {
        Toast.show('Profile saved. Check your inbox to confirm the new email address.', 'info');
      } else if (updateResult?.syncError) {
        Toast.show('Profile saved on this device, but cloud sync failed. Check your connection.', 'warning');
      } else if (updateResult?.synced) {
        Toast.show('Profile saved and synced to your account.', 'success');
      } else {
        Toast.show('Profile saved on this device.', 'success');
      }

      window.dispatchEvent(new CustomEvent('locakaam:profile-updated'));
      ProfileDropdown.refresh();
      this.renderSection('profile', { focus: false, scroll: false });
    });

    this.bindWorkerProfessionalPanel();
  },

  // ------------------------------------------------------------------------
  // Security & login
  // ------------------------------------------------------------------------

  renderSecurityPage() {
    const isSupabase = AuthService.isSupabaseAccount();
    const loginAlerts = Settings.get('security.loginAlerts', true);
    const sessionTimeout = String(Settings.get('security.sessionTimeout', 30));

    const passwordPanel = isSupabase
      ? `
        <form id="password-form" class="settings-form" novalidate>
          <div id="password-form-error" class="settings-form-error" role="alert" hidden></div>
          <div class="settings-grid-2">
            ${this.field({
              id: 'password-new',
              label: 'New password',
              type: 'password',
              placeholder: 'At least 8 characters',
              autocomplete: 'new-password'
            })}
            ${this.field({
              id: 'password-confirm',
              label: 'Confirm new password',
              type: 'password',
              placeholder: 'Repeat the new password',
              autocomplete: 'new-password'
            })}
          </div>
          <div class="settings-form-actions">
            <button type="submit" class="btn btn-primary btn-sm" id="password-save">Update password</button>
          </div>
        </form>
      `
      : `
        <div class="settings-empty-state">
          ${icon('lock', 20)}
          <div>
            <strong>Password changes are unavailable for local demo accounts.</strong>
            <p>Sign in with a Supabase email account to manage a password. Demo accounts are stored only in this browser.</p>
          </div>
        </div>
      `;

    return `
      ${this.panel('Password', 'Keep your account protected with a strong password.', passwordPanel)}

      ${this.panel('Active session', 'Details for the session currently using LocalKaam.', `
        <div class="session-card">
          <span class="session-icon">${icon('monitor', 19)}</span>
          <div class="session-copy">
            <strong id="session-device">${esc(describeDevice())}</strong>
            <span id="session-detail">${isSupabase ? 'Checking cloud session…' : 'Local demo session in this browser'}</span>
          </div>
          <span class="settings-status-pill is-success" id="session-badge">This device</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Session type</span>
            <p class="settings-row-description" id="session-type">${isSupabase ? 'Supabase account session' : 'Local browser session'}</p>
          </div>
          <span class="settings-muted-value" id="session-expiry">—</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Sign out everywhere</span>
            <p class="settings-row-description">${isSupabase ? 'Revoke this session and sign out other devices using your account.' : 'Clear the local demo session stored in this browser.'}</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="sign-out-all">Sign out</button>
        </div>
      `)}

      ${this.panel('Login protection', 'Preferences for this browser.', `
        ${this.switchRow({
          id: 'security-login-alerts',
          title: 'Login alerts',
          description: 'Show a notice when a new sign-in is detected on this device.',
          checked: loginAlerts
        })}
        ${this.selectRow({
          id: 'security-timeout',
          title: 'Automatic sign-out',
          description: 'Sign out after a period without activity. Applies to this browser.',
          value: sessionTimeout,
          options: [
            { value: '15', label: 'After 15 minutes' },
            { value: '30', label: 'After 30 minutes' },
            { value: '60', label: 'After 1 hour' },
            { value: '120', label: 'After 2 hours' },
            { value: '0', label: 'Never' }
          ]
        })}
        ${this.switchRow({
          id: 'security-2fa',
          title: 'Two-factor authentication',
          description: 'Not available in this build.',
          checked: false,
          disabled: true,
          note: 'Supabase MFA must be configured on the backend before this control can be enabled. It is shown as disabled rather than pretending it works.'
        })}
      `)}
    `;
  },

  bindSecurity() {
    this.bindSwitch('security-login-alerts', 'security.loginAlerts');
    this.bindSelect('security-timeout', 'security.sessionTimeout', (value) => {
      Settings.set('security.sessionTimeout', Number(value));
      Settings.save();
      window.dispatchEvent(new CustomEvent('locakaam:session-timeout-changed'));
    });

    this.hydrateSessionInfo();

    document.getElementById('sign-out-all')?.addEventListener('click', () => {
      ProfileDropdown.openDialog({
        title: 'Sign out of LocalKaam?',
        body: '<p class="lk-dialog-copy">This will end your current session. For a Supabase account, other devices signed into this account will also be revoked.</p>',
        confirmLabel: 'Sign out',
        danger: true,
        onConfirm: async () => {
          await AuthService.signOutAllDevices();
          Toast.show('You have been signed out.', 'info');
          window.dispatchEvent(new CustomEvent('locakaam:logout'));
        }
      });
    });

    const form = document.getElementById('password-form');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorBox = document.getElementById('password-form-error');
      const newPassword = document.getElementById('password-new')?.value || '';
      const confirmPassword = document.getElementById('password-confirm')?.value || '';
      const button = document.getElementById('password-save');

      const showError = (message) => {
        if (errorBox) {
          errorBox.hidden = false;
          errorBox.textContent = message;
        }
        Toast.show(message, 'error');
      };

      if (errorBox) errorBox.hidden = true;
      if (newPassword.length < 8) return showError('New password must be at least 8 characters long.');
      if (newPassword !== confirmPassword) return showError('The two passwords do not match.');

      if (button) {
        button.disabled = true;
        button.textContent = 'Updating…';
      }
      const result = await AuthService.changePassword(newPassword);
      if (button) {
        button.disabled = false;
        button.textContent = 'Update password';
      }

      if (result.error) {
        showError(result.error.message || 'The password could not be updated.');
        return;
      }

      form.reset();
      this.setSavedState('Password updated');
      Toast.show('Your password was updated successfully.', 'success');
    });
  },

  async hydrateSessionInfo() {
    const detail = document.getElementById('session-detail');
    const type = document.getElementById('session-type');
    const expiry = document.getElementById('session-expiry');
    const badge = document.getElementById('session-badge');
    try {
      const info = await AuthService.getSessionInfo();
      if (info.mode === 'supabase' && info.session) {
        if (detail) detail.textContent = `Signed in as ${info.user?.email || 'your account'}`;
        if (type) type.textContent = 'Supabase account session';
        if (expiry) expiry.textContent = info.session.expires_at
          ? `Expires ${new Date(info.session.expires_at * 1000).toLocaleString('en-IN')}`
          : 'Managed by Supabase';
        if (badge) badge.textContent = 'Cloud session';
      } else {
        if (detail) detail.textContent = `Signed in as ${info.user?.email || 'local demo account'}`;
        if (type) type.textContent = 'Local browser session';
        if (expiry) expiry.textContent = 'No cloud expiry';
        if (badge) badge.textContent = 'This device';
      }
    } catch (error) {
      if (detail) detail.textContent = 'Session details could not be loaded.';
    }
  },

  // ------------------------------------------------------------------------
  // Account
  // ------------------------------------------------------------------------

  renderAccountPage() {
    const user = AuthService.getUser() || {};
    const profile = AuthService.getProfile() || {};
    const createdAt = user.created_at || profile.created_at || '';
    const accountId = user.id || profile.id || 'Local session';
    const role = profile.role || user.user_metadata?.role || 'customer';

    return `
      ${this.panel('Account overview', 'The details attached to your LocalKaam account.', `
        <div class="account-summary">
          ${avatarMarkup({ ...profile, displayName: this.getProfileData().fullName, avatarUrl: this.getProfileData().avatarUrl }, 'md')}
          <div>
            <strong>${esc(this.getProfileData().fullName || 'Local account')}</strong>
            <span>${esc(profile.email || user.email || 'No email on file')}</span>
          </div>
          <span class="settings-status-pill">${esc(role === 'worker' ? 'Worker account' : 'Customer account')}</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Plan</span>
            <p class="settings-row-description">LocalKaam is free for customers and workers in this build.</p>
          </div>
          <span class="settings-muted-value">Free</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Member since</span>
            <p class="settings-row-description">When this account was first created.</p>
          </div>
          <span class="settings-muted-value">${esc(formatDate(createdAt, 'This session'))}</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Account ID</span>
            <p class="settings-row-description">Used to identify your account in LocalKaam.</p>
          </div>
          <code class="settings-code">${esc(String(accountId))}</code>
        </div>
      `)}

      ${this.panel('Account actions', 'Switch dashboards, export your data or sign out.', `
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Dashboards</span>
            <p class="settings-row-description">Open the customer or worker experience with this account.</p>
          </div>
          <div class="settings-inline-actions">
            <button type="button" class="btn btn-outline btn-sm" data-open-role="customer">Customer</button>
            <button type="button" class="btn btn-outline btn-sm" data-open-role="worker">Worker</button>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Export my data</span>
            <p class="settings-row-description">Download your profile, preferences and local marketplace data as JSON.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="account-export">${icon('download', 14)} Export</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Reset preferences</span>
            <p class="settings-row-description">Restore all settings to defaults. Your profile is kept.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="account-reset">Reset</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Sign out</span>
            <p class="settings-row-description">End your session on this device.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="account-sign-out">Sign out</button>
        </div>
        <div class="settings-row is-danger-zone">
          <div class="settings-row-copy">
            <span class="settings-row-title">Delete account</span>
            <p class="settings-row-description">Account deletion needs a verified request so marketplace records are handled correctly.</p>
          </div>
          <button type="button" class="btn btn-quiet btn-sm" id="account-delete">Request deletion</button>
        </div>
      `)}
    `;
  },

  bindAccount() {
    document.querySelectorAll('[data-open-role]').forEach((button) => {
      button.addEventListener('click', () => {
        const role = button.getAttribute('data-open-role');
        window.dispatchEvent(new CustomEvent('locakaam:navigate-role', { detail: { role } }));
      });
    });

    document.getElementById('account-export')?.addEventListener('click', () => this.exportData());

    document.getElementById('account-reset')?.addEventListener('click', () => {
      ProfileDropdown.openDialog({
        title: 'Reset preferences?',
        body: '<p class="lk-dialog-copy">Theme, notifications and all other preferences will return to their defaults. Your profile details are kept.</p>',
        confirmLabel: 'Reset preferences',
        danger: true,
        onConfirm: () => {
          Settings.reset({ keepProfile: true });
          this.renderSection('account', { focus: false, scroll: false });
          window.dispatchEvent(new CustomEvent('locakaam:theme-changed'));
          window.dispatchEvent(new CustomEvent('locakaam:accent-changed'));
          Toast.show('Preferences reset to defaults.', 'success');
        }
      });
    });

    document.getElementById('account-sign-out')?.addEventListener('click', () => ProfileDropdown.confirmLogout());

    document.getElementById('account-delete')?.addEventListener('click', () => {
      ProfileDropdown.openDialog({
        title: 'Request account deletion',
        body: `
          <p class="lk-dialog-copy">This build does not have a secure server endpoint for account deletion. Open an issue and the team can verify and remove your account.</p>
          <p class="lk-dialog-copy"><a class="settings-link" href="${REPO_URL}/issues/new" target="_blank" rel="noopener noreferrer">Open a deletion request ${icon('external', 13)}</a></p>
        `,
        confirmLabel: 'Close',
        cancelLabel: '',
        onConfirm: () => {}
      });
    });
  },

  exportData() {
    const user = AuthService.getUser() || {};
    const profile = AuthService.getProfile() || {};
    let bookings = [];
    let reviews = [];
    let complaints = [];
    try {
      bookings = JSON.parse(localStorage.getItem('localkaam_bookings') || '[]');
      reviews = JSON.parse(localStorage.getItem('localkaam_reviews') || '[]');
      complaints = JSON.parse(localStorage.getItem('localkaam_complaints') || '[]');
    } catch (e) {}

    const payload = {
      exportedAt: new Date().toISOString(),
      application: 'LocalKaam',
      version: APP_VERSION,
      account: {
        id: user.id || null,
        email: profile.email || user.email || null,
        role: profile.role || null
      },
      profile,
      preferences: Settings.settings,
      bookings,
      reviews,
      complaints
    };

    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `localkaam-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      Toast.show('Your data export has been downloaded.', 'success');
    } catch (error) {
      Toast.show('The data export could not be created.', 'error');
    }
  },

  // ------------------------------------------------------------------------
  // Privacy
  // ------------------------------------------------------------------------

  renderPrivacyPage() {
    const visibility = Settings.get('privacy.profileVisibility', 'public');
    const showEmail = Settings.get('privacy.showEmail', false);
    const showOnline = Settings.get('privacy.showOnlineStatus', true);
    const activity = Settings.get('privacy.activityStatus', false);

    return `
      ${this.panel('Profile visibility', 'Control how your profile appears in shared LocalKaam views.', `
        ${this.selectRow({
          id: 'privacy-visibility',
          title: 'Who can see my profile',
          description: 'Applies to your name, locality and role when shown to other users.',
          value: visibility,
          options: [
            { value: 'public', label: 'Anyone on LocalKaam' },
            { value: 'connections', label: 'People I have worked with' },
            { value: 'private', label: 'Only me' }
          ]
        })}
        ${this.switchRow({
          id: 'privacy-show-email',
          title: 'Show email address',
          description: 'Allow other users to see your email on your profile.',
          checked: showEmail
        })}
        ${this.switchRow({
          id: 'privacy-show-online',
          title: 'Show online status',
          description: 'Let people know when you are active on LocalKaam.',
          checked: showOnline
        })}
        ${this.switchRow({
          id: 'privacy-activity',
          title: 'Share recent activity',
          description: 'Show recent bookings and reviews in your profile activity.',
          checked: activity
        })}
      `)}

      ${this.panel('Your data', 'Download or review the information stored for this account.', `
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Download my data</span>
            <p class="settings-row-description">Exports your profile, preferences and local marketplace records as JSON.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="privacy-export">${icon('download', 14)} Export</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Cloud storage</span>
            <p class="settings-row-description">${AuthService.isSupabaseAccount() ? 'Your account profile is stored in Supabase. Marketplace demo data stays in this browser unless Supabase is connected.' : 'This demo account lives entirely in this browser. No cloud storage is used.'}</p>
          </div>
          <span class="settings-status-pill">${AuthService.isSupabaseAccount() ? 'Supabase' : 'Local'}</span>
        </div>
      `)}

      <p class="settings-footnote">Privacy preferences are saved on this device. LocalKaam does not sell personal data or run third-party advertising trackers.</p>
    `;
  },

  bindPrivacy() {
    this.bindSelect('privacy-visibility', 'privacy.profileVisibility');
    this.bindSwitch('privacy-show-email', 'privacy.showEmail');
    this.bindSwitch('privacy-show-online', 'privacy.showOnlineStatus');
    this.bindSwitch('privacy-activity', 'privacy.activityStatus');
    document.getElementById('privacy-export')?.addEventListener('click', () => this.exportData());
  },

  // ------------------------------------------------------------------------
  // Personalization
  // ------------------------------------------------------------------------

  renderPersonalizationPage() {
    const jobs = Settings.get('personalization.personalizedJobs', true);
    const services = Settings.get('personalization.personalizedServices', true);
    const smart = Settings.get('personalization.smartRecommendations', true);
    const digest = Settings.get('personalization.weeklyDigest', false);
    const recent = Settings.get('personalization.recentlyViewed', true);

    return `
      ${this.panel('Recommendations', 'Choose how LocalKaam tailors what you see.', `
        ${this.switchRow({
          id: 'personalization-jobs',
          title: 'Personalized job suggestions',
          description: 'Use your locality and past bookings to rank nearby professionals.',
          checked: jobs
        })}
        ${this.switchRow({
          id: 'personalization-services',
          title: 'Personalized service offers',
          description: 'Show relevant service categories and local availability.',
          checked: services
        })}
        ${this.switchRow({
          id: 'personalization-smart',
          title: 'Smart recommendations',
          description: 'Rank workers using rating, distance and availability signals.',
          checked: smart
        })}
        ${this.switchRow({
          id: 'personalization-recent',
          title: 'Recently viewed services',
          description: 'Keep a short local history to make it easier to return to a service.',
          checked: recent
        })}
        ${this.switchRow({
          id: 'personalization-digest',
          title: 'Weekly summary',
          description: 'Receive a weekly digest of local services and updates.',
          checked: digest
        })}
      `)}

      ${this.panel('Interface', 'Make LocalKaam feel right for you.', `
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Appearance</span>
            <p class="settings-row-description">Theme, accent colour, text size and density.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" data-open-section="appearance">Open appearance</button>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Privacy</span>
            <p class="settings-row-description">Control profile visibility and activity sharing.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" data-open-section="privacy">Open privacy</button>
        </div>
      `)}
    `;
  },

  bindPersonalization() {
    this.bindSwitch('personalization-jobs', 'personalization.personalizedJobs');
    this.bindSwitch('personalization-services', 'personalization.personalizedServices');
    this.bindSwitch('personalization-smart', 'personalization.smartRecommendations');
    this.bindSwitch('personalization-recent', 'personalization.recentlyViewed');
    this.bindSwitch('personalization-digest', 'personalization.weeklyDigest');
    document.querySelectorAll('[data-open-section]').forEach((button) => {
      button.addEventListener('click', () => this.renderSection(button.getAttribute('data-open-section'), { focus: true }));
    });
  },

  // ------------------------------------------------------------------------
  // Language
  // ------------------------------------------------------------------------

  renderLanguagePage() {
    const language = Settings.get('general.language', 'en');
    return `
      ${this.panel('Interface language', 'Select your preferred language.', `
        <div class="settings-row">
          <div class="settings-row-copy">
            <label class="settings-row-title" for="language-page-select">Language selection</label>
            <p class="settings-row-description">Choose the display language for LocalKaam.</p>
          </div>
          <select class="settings-select" id="language-page-select">
            <option value="en" ${language === 'en' ? 'selected' : ''}>English</option>
            <option value="hi" ${language === 'hi' ? 'selected' : ''}>हिन्दी (Hindi)</option>
            <option value="mr" ${language === 'mr' ? 'selected' : ''}>मराठी (Marathi)</option>
            <option value="gu" ${language === 'gu' ? 'selected' : ''}>ગુજરાતી (Gujarati)</option>
            <option value="ta" ${language === 'ta' ? 'selected' : ''}>தமிழ் (Tamil)</option>
            <option value="te" ${language === 'te' ? 'selected' : ''}>తెలుగు (Telugu)</option>
          </select>
        </div>
      `)}
    `;
  },

  bindLanguage() {
    this.bindSelect('language-page-select', 'general.language', (val) => { i18n.setLanguage(val); });
  },

  // ------------------------------------------------------------------------
  // Keyboard shortcuts
  // ------------------------------------------------------------------------

  renderShortcutsPage() {
    const enabled = Settings.get('shortcuts.enabled', true);
    const openSettings = Settings.getShortcut('openSettings') || 'ctrl+,';
    const search = Settings.getShortcut('search') || 'ctrl+k';
    const toggleTheme = Settings.getShortcut('toggleTheme') || 'ctrl+shift+l';

    return `
      ${this.panel('Shortcuts', 'Use the keyboard to move around LocalKaam.', `
        ${this.switchRow({
          id: 'shortcuts-enabled',
          title: 'Enable keyboard shortcuts',
          description: 'Turn global shortcuts on or off.',
          checked: enabled
        })}
        <div class="settings-row">
          <div class="settings-row-copy">
            <label class="settings-row-title" for="shortcut-open-settings">Open settings</label>
            <p class="settings-row-description">Works from any screen.</p>
          </div>
          <select class="settings-select" id="shortcut-open-settings">
            <option value="ctrl+," ${openSettings === 'ctrl+,' ? 'selected' : ''}>Ctrl + ,</option>
            <option value="alt+," ${openSettings === 'alt+,' ? 'selected' : ''}>Alt + ,</option>
            <option value="ctrl+shift+," ${openSettings === 'ctrl+shift+,' ? 'selected' : ''}>Ctrl + Shift + ,</option>
          </select>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <label class="settings-row-title" for="shortcut-search">Focus settings search</label>
            <p class="settings-row-description">Jumps straight to the search field on this page.</p>
          </div>
          <select class="settings-select" id="shortcut-search">
            <option value="ctrl+k" ${search === 'ctrl+k' ? 'selected' : ''}>Ctrl + K</option>
            <option value="ctrl+shift+k" ${search === 'ctrl+shift+k' ? 'selected' : ''}>Ctrl + Shift + K</option>
            <option value="alt+k" ${search === 'alt+k' ? 'selected' : ''}>Alt + K</option>
          </select>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <label class="settings-row-title" for="shortcut-toggle-theme">Toggle light / dark theme</label>
            <p class="settings-row-description">Switches between light and dark immediately.</p>
          </div>
          <select class="settings-select" id="shortcut-toggle-theme">
            <option value="ctrl+shift+l" ${toggleTheme === 'ctrl+shift+l' ? 'selected' : ''}>Ctrl + Shift + L</option>
            <option value="alt+t" ${toggleTheme === 'alt+t' ? 'selected' : ''}>Alt + T</option>
          </select>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Reset shortcuts</span>
            <p class="settings-row-description">Restore the default key combinations.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="shortcuts-reset">Reset</button>
        </div>
      `)}

      ${this.panel('Shortcut reference', 'These shortcuts are implemented in the app today.', `
        <table class="settings-table">
          <thead>
            <tr><th scope="col">Action</th><th scope="col">Shortcut</th></tr>
          </thead>
          <tbody>
            <tr><td>Open settings</td><td><span class="settings-kbd" data-shortcut-label="openSettings">${esc(Settings.shortcutLabel('openSettings'))}</span></td></tr>
            <tr><td>Focus settings search</td><td><span class="settings-kbd" data-shortcut-label="search">${esc(Settings.shortcutLabel('search'))}</span></td></tr>
            <tr><td>Toggle light / dark theme</td><td><span class="settings-kbd" data-shortcut-label="toggleTheme">${esc(Settings.shortcutLabel('toggleTheme'))}</span></td></tr>
            <tr><td>Close a menu or dialog</td><td><span class="settings-kbd">Esc</span></td></tr>
            <tr><td>Move between controls</td><td><span class="settings-kbd">Tab</span> / <span class="settings-kbd">Shift + Tab</span></td></tr>
            <tr><td>Activate the focused control</td><td><span class="settings-kbd">Enter</span> / <span class="settings-kbd">Space</span></td></tr>
          </tbody>
        </table>
        <p class="settings-footnote">On macOS, Ctrl also works with Cmd. Shortcuts are ignored while typing in a text field unless the combination includes Ctrl, Alt or Cmd.</p>
      `)}
    `;
  },

  bindShortcuts() {
    this.bindSwitch('shortcuts-enabled', 'shortcuts.enabled');
    const bindShortcutSelect = (id, key) => {
      const select = document.getElementById(id);
      if (!select) return;
      select.addEventListener('change', () => {
        const ok = this.persist(`shortcuts.${key}`, select.value);
        if (!ok) return;
        const label = document.querySelector(`[data-shortcut-label="${key}"]`);
        if (label) label.textContent = Settings.shortcutLabel(key);
      });
    };
    bindShortcutSelect('shortcut-open-settings', 'openSettings');
    bindShortcutSelect('shortcut-search', 'search');
    bindShortcutSelect('shortcut-toggle-theme', 'toggleTheme');

    document.getElementById('shortcuts-reset')?.addEventListener('click', () => {
      Settings.set('shortcuts.openSettings', 'ctrl+,');
      Settings.set('shortcuts.search', 'ctrl+k');
      Settings.set('shortcuts.toggleTheme', 'ctrl+shift+l');
      Settings.save();
      this.renderSection('keyboard-shortcuts', { focus: false, scroll: false });
      this.setSavedState('Shortcuts reset');
    });
  },

  // ------------------------------------------------------------------------
  // Help & support
  // ------------------------------------------------------------------------

  renderHelpPage() {
    const faqs = [
      {
        q: 'How do I book a local professional?',
        a: 'Choose Customer, select your locality and a service category, then pick a professional. Enter the task details and an optional price offer, and send the request. The professional responds from their worker dashboard.'
      },
      {
        q: 'How does pricing work?',
        a: 'Professionals publish their own hourly rate and visiting charge. LocalKaam does not add a platform markup. You can negotiate with clear counter-offers before a booking is confirmed.'
      },
      {
        q: 'Where is my data stored?',
        a: 'Preferences and demo marketplace data are stored in this browser. If a Supabase session is active, your account profile is stored in Supabase as well. The Privacy screen lets you export your data.'
      },
      {
        q: 'Why can I not change my password?',
        a: 'Password management is available for Supabase email accounts. The demo accounts used in this build authenticate locally and do not have a password to change.'
      },
      {
        q: 'Why is only English available?',
        a: 'The interface has only been translated into English so far. Other languages will be enabled once their translations are complete.'
      }
    ];

    return `
      ${this.panel('Frequently asked questions', 'Quick answers to common questions.', `
        <div class="settings-faq-list">
          ${faqs.map((faq) => `
            <details class="settings-faq">
              <summary>${esc(faq.q)}${icon('chevron-down', 15)}</summary>
              <p>${esc(faq.a)}</p>
            </details>
          `).join('')}
        </div>
      `)}

      ${this.panel('Get in touch', 'The project is open source, and support runs through GitHub.', `
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Report a bug or request a feature</span>
            <p class="settings-row-description">Open an issue with details and reproduction steps.</p>
          </div>
          <a class="btn btn-outline btn-sm" href="${REPO_URL}/issues/new" target="_blank" rel="noopener noreferrer">Open GitHub ${icon('external', 13)}</a>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Documentation</span>
            <p class="settings-row-description">Setup, architecture and feature notes live in the repository README.</p>
          </div>
          <a class="btn btn-outline btn-sm" href="${REPO_URL}#readme" target="_blank" rel="noopener noreferrer">Read docs ${icon('external', 13)}</a>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Copy diagnostics</span>
            <p class="settings-row-description">Copy version and browser information to include in a bug report.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="help-diagnostics">Copy</button>
        </div>
      `)}

      ${this.renderWorkerSupportPanel()}
    `;
  },

  bindHelp() {
    this.bindWorkerSupportPanel();
    document.getElementById('help-diagnostics')?.addEventListener('click', async () => {
      const diagnostic = [
        `LocalKaam ${APP_VERSION}`,
        `Mode: ${AuthService.isSupabaseAccount() ? 'Supabase account' : 'Local demo account'}`,
        `Theme: ${Settings.get('appearance.theme', 'light')} (${Settings.getResolvedTheme()})`,
        `Browser: ${describeDevice()}`,
        `URL: ${window.location.href}`,
        `Timestamp: ${new Date().toISOString()}`
      ].join('\n');
      try {
        await navigator.clipboard.writeText(diagnostic);
        Toast.show('Diagnostics copied to the clipboard.', 'success');
      } catch (error) {
        Toast.show('Clipboard access is unavailable in this browser.', 'error');
      }
    });
  },

  // ------------------------------------------------------------------------
  // About
  // ------------------------------------------------------------------------

  renderAboutPage() {
    return `
      <section class="settings-panel about-hero">
        <div class="about-mark">LK</div>
        <div>
          <h2>LocalKaam</h2>
          <p>A hyperlocal marketplace connecting Mumbai households with trusted blue-collar professionals.</p>
          <div class="about-meta">
            <span class="settings-status-pill">Version ${APP_VERSION}</span>
            <span class="settings-status-pill">Hackathon build</span>
            <span class="settings-status-pill">MIT licence</span>
          </div>
        </div>
      </section>

      ${this.panel('Project details', 'What powers this build.', `
        <div class="about-grid">
          <div class="about-item">
            <span>Frontend</span>
            <strong>Vanilla JavaScript, HTML and CSS</strong>
          </div>
          <div class="about-item">
            <span>Data &amp; auth</span>
            <strong>Supabase, localStorage and SQLite sync</strong>
          </div>
          <div class="about-item">
            <span>Typography</span>
            <strong>Bricolage Grotesque, Inter and JetBrains Mono</strong>
          </div>
          <div class="about-item">
            <span>Design system</span>
            <strong>LocalKaam sketchbook palette</strong>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Source code</span>
            <p class="settings-row-description">Read the code, file issues or contribute.</p>
          </div>
          <a class="btn btn-outline btn-sm" href="${REPO_URL}" target="_blank" rel="noopener noreferrer">GitHub ${icon('external', 13)}</a>
        </div>
        <div class="settings-row">
          <div class="settings-row-copy">
            <span class="settings-row-title">Copy version</span>
            <p class="settings-row-description">Useful when reporting an issue.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="about-copy-version">Copy</button>
        </div>
      `)}

      ${this.panel('Credits', 'Built by the LocalKaam team for the hackathon.', `
        <p class="settings-copy">LocalKaam was built as a hackathon project by the coders_sujal team. Thanks to the open-source projects that made it possible, including Supabase, Node.js, and the typefaces served by Google Fonts.</p>
        <p class="settings-footnote">© ${new Date().getFullYear()} LocalKaam. Released under the MIT licence.</p>
      `)}
    `;
  },

  bindAbout() {
    document.getElementById('about-copy-version')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(`LocalKaam ${APP_VERSION}`);
        Toast.show('Version copied.', 'success');
      } catch (error) {
        Toast.show('Clipboard access is unavailable in this browser.', 'error');
      }
    });
  }
};
