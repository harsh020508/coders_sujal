// LocalKaam — Admin Dashboard
// Hidden behind a passcode gate.
// Access: URL hash #admin  OR  keyboard shortcut Ctrl+Shift+A  OR  click logo 5×
// Admins can review/approve/reject worker documents. Changes are persisted to the
// backend SQLite DB via /api/admin/workers and broadcast to all clients via SSE.

import { StorageService } from './storage.js';
import { REQUIRED_VERIFICATION_DOCUMENTS, COMPLAINT_CATEGORIES } from './data.js';
import { esc } from './utils.js';
import { Toast } from './toast.js';

// -----------------------------------------------------------------
// Passcode (matches server ADMIN_PASSCODE env / 'localkaam2024')
// -----------------------------------------------------------------
const ADMIN_PASSCODE = 'localkaam2024';
const ADMIN_SESSION_KEY = 'localkaam_admin_authed';

function isAdminAuthed() {
  try { return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'; } catch (_) { return false; }
}
function setAdminAuthed(val) {
  try { sessionStorage.setItem(ADMIN_SESSION_KEY, val ? '1' : ''); } catch (_) {}
}

// -----------------------------------------------------------------
// Backend API helpers — fall back to localStorage when server is unreachable
// -----------------------------------------------------------------
const API_BASE = '/api/admin';

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Passcode': ADMIN_PASSCODE,
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchWorkers() {
  try {
    return await apiFetch('/workers');
  } catch (_) {
    return StorageService.getWorkers();
  }
}

async function patchWorker(id, updates) {
  // Persist to backend first
  try {
    const updated = await apiFetch(`/workers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    // Sync to localStorage so the rest of the UI reflects it immediately
    const ws = StorageService.getWorkers();
    const idx = ws.findIndex(w => w.id === id);
    if (idx !== -1) { ws[idx] = { ...ws[idx], ...updates }; StorageService.saveWorkers(ws); }
    return updated;
  } catch (_) {
    // Offline fallback — write to localStorage only
    const ws = StorageService.getWorkers();
    const idx = ws.findIndex(w => w.id === id);
    if (idx !== -1) { ws[idx] = { ...ws[idx], ...updates }; StorageService.saveWorkers(ws); return ws[idx]; }
    throw new Error('Worker not found locally either');
  }
}

// Complaint triage — same backend-first / local-fallback pattern as workers
async function fetchComplaints() {
  try {
    return await apiFetch('/complaints');
  } catch (_) {
    return StorageService.getComplaints();
  }
}

async function patchComplaint(id, updates) {
  try {
    const updated = await apiFetch(`/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    const cs = StorageService.getComplaints();
    const idx = cs.findIndex(c => c.id === id);
    if (idx !== -1) { cs[idx] = { ...cs[idx], ...updates }; StorageService.saveComplaints(cs); }
    return updated;
  } catch (_) {
    const cs = StorageService.getComplaints();
    const idx = cs.findIndex(c => c.id === id);
    if (idx !== -1) { cs[idx] = { ...cs[idx], ...updates }; StorageService.saveComplaints(cs); return cs[idx]; }
    throw new Error('Complaint not found locally either');
  }
}

// -----------------------------------------------------------------
// Seed demo uploadedDocs for workers that have none
// -----------------------------------------------------------------
function ensureDemoDocs(workers) {
  let changed = false;
  workers.forEach(w => {
    if (!w.uploadedDocs) {
      w.uploadedDocs = REQUIRED_VERIFICATION_DOCUMENTS.map(doc => ({
        type: doc.type,
        title: doc.title,
        fileName: doc.demoFileName,
        uploadedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
        notes: ''
      }));
      changed = true;
    }
  });
  if (changed) StorageService.saveWorkers(workers);
  return workers;
}

// =================================================================
// AdminDashboard
// =================================================================
export const AdminDashboard = {
  _currentFilter: 'all',
  _selectedWorkerId: null,
  _container: null,
  _searchQuery: '',
  _workers: [],            // cached from last fetch
  _backendOnline: false,   // shown in header

  // Complaint triage tab
  _currentTab: 'verification',   // 'verification' | 'complaints'
  _complaints: [],
  _complaintFilter: 'all',       // all | Submitted | Under Review | Awaiting Response | Resolved | Closed
  _selectedComplaintId: null,

  // Lifecycle statuses shown in the triage board
  COMPLAINT_STATUSES: ['Submitted', 'Under Review', 'Awaiting Response', 'Resolved', 'Closed'],

  // Allowed transitions per current status (buttons in the triage panel)
  _COMPLAINT_ACTIONS: {
    'Submitted': [
      { to: 'Under Review',      label: 'Start Review',      icon: 'search',  kind: 'accent' },
      { to: 'Awaiting Response', label: 'Awaiting Customer', icon: 'hourglass', kind: 'secondary' },
    ],
    'Under Review': [
      { to: 'Resolved',          label: 'Mark Resolved',     icon: 'check-circle', kind: 'accent' },
      { to: 'Awaiting Response', label: 'Awaiting Customer', icon: 'hourglass', kind: 'secondary' },
    ],
    'Awaiting Response': [
      { to: 'Resolved',          label: 'Mark Resolved',     icon: 'check-circle', kind: 'accent' },
      { to: 'Under Review',      label: 'Back to Review',    icon: 'search', kind: 'secondary' },
    ],
    'Resolved': [
      { to: 'Closed',            label: 'Close Complaint',   icon: 'archive', kind: 'secondary' },
    ],
    'Closed': [
      { to: 'Under Review',      label: 'Reopen Complaint',  icon: 'rotate-cw', kind: 'secondary' },
    ],
  },

  // Entry point
  render(container) {
    this._container = container;
    if (!isAdminAuthed()) {
      this._renderPasscodeGate(container);
    } else {
      this._loadAndRender(container);
    }
  },

  async _loadAndRender(container) {
    // Show loading state briefly
    const main = container.querySelector('#admin-main-area');
    if (main) main.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text-secondary);">Syncing with server…</div>';

    try {
      const raw = await fetchWorkers();
      this._workers = ensureDemoDocs(raw);
      this._backendOnline = true;
    } catch (_) {
      this._workers = ensureDemoDocs(StorageService.getWorkers());
      this._backendOnline = false;
    }
    try {
      this._complaints = await fetchComplaints();
    } catch (_) {
      this._complaints = StorageService.getComplaints();
    }
    this._renderDashboard(container);
  },

  // ---------------------------------------------------------------
  // Passcode Gate
  // ---------------------------------------------------------------
  _renderPasscodeGate(container) {
    container.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-secondary);padding:1rem;">
        <div class="ui-card ui-card--pad" style="max-width:420px;width:100%;text-align:center;padding:2.5rem 2rem;">
          <div style="width:60px;height:60px;border-radius:50%;background:var(--accent-light);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-size:1.75rem;">🔐</div>
          <h2 style="font-size:1.4rem;font-weight:800;margin:0 0 0.4rem;color:var(--ink);">Admin Access</h2>
          <p class="ui-muted" style="font-size:0.875rem;margin:0 0 1.5rem;">Enter the admin passcode to access the verification dashboard.</p>
          <div style="display:flex;flex-direction:column;gap:0.75rem;">
            <input
              type="password"
              id="admin-passcode-input"
              class="form-input"
              placeholder="Admin passcode"
              autocomplete="current-password"
              style="text-align:center;letter-spacing:0.15em;font-size:1.1rem;padding:0.75rem;"
            />
            <div id="admin-passcode-error" style="display:none;color:var(--bad);font-size:0.8rem;font-weight:600;"></div>
            <button id="admin-passcode-submit" class="ui-btn ui-btn--accent" style="width:100%;justify-content:center;padding:0.75rem;">
              <i data-lucide="lock-open" class="lucide-xs"></i> Unlock Dashboard
            </button>
            <button id="admin-passcode-back" class="ui-btn ui-btn--secondary" style="width:100%;justify-content:center;font-size:0.85rem;">
              ← Back to Landing
            </button>
          </div>
          <p style="margin:1.25rem 0 0;font-size:0.75rem;color:var(--text-muted);">
            🔒 This area is hidden from public navigation — reserved for LocalKaam operations staff.
          </p>
          <p style="margin:0.4rem 0 0;font-size:0.7rem;color:var(--text-muted);">
            Shortcut: <kbd style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:4px;padding:1px 5px;font-family:monospace;">Ctrl+Shift+A</kbd>
          </p>
        </div>
      </div>
    `;
    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();

    const input  = container.querySelector('#admin-passcode-input');
    const errBox = container.querySelector('#admin-passcode-error');
    const submit = container.querySelector('#admin-passcode-submit');
    const back   = container.querySelector('#admin-passcode-back');

    const tryUnlock = () => {
      const val = (input?.value || '').trim();
      if (val === ADMIN_PASSCODE) {
        setAdminAuthed(true);
        this._loadAndRender(container);
      } else {
        if (errBox) { errBox.textContent = 'Incorrect passcode. Please try again.'; errBox.style.display = 'block'; }
        input?.focus();
        input?.select();
      }
    };

    submit?.addEventListener('click', tryUnlock);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
    back?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('locakaam:navigate-role', { detail: { role: 'landing' } }));
    });
    input?.focus();
  },

  // ---------------------------------------------------------------
  // Main Dashboard Shell (renders once; content area refreshed)
  // ---------------------------------------------------------------
  _renderDashboard(container) {
    const workers = this._workers;
    const filter  = this._currentFilter;
    const q       = (this._searchQuery || '').toLowerCase();

    const counts = {
      all:      workers.length,
      Pending:  workers.filter(w => w.verificationStatus === 'Pending').length,
      Verified: workers.filter(w => w.verificationStatus === 'Verified').length,
      Rejected: workers.filter(w => w.verificationStatus === 'Rejected').length,
    };

    // Complaint triage counts
    const openComplaints = this._complaints.filter(c => !['Resolved', 'Closed'].includes(c.status)).length;
    const complaintCounts = {
      all: this._complaints.length,
      Submitted: this._complaints.filter(c => c.status === 'Submitted').length,
      'Under Review': this._complaints.filter(c => c.status === 'Under Review').length,
      'Awaiting Response': this._complaints.filter(c => c.status === 'Awaiting Response').length,
      Resolved: this._complaints.filter(c => c.status === 'Resolved').length,
      Closed: this._complaints.filter(c => c.status === 'Closed').length,
    };

    let filtered = filter === 'all' ? workers : workers.filter(w => w.verificationStatus === filter);
    if (q) {
      filtered = filtered.filter(w =>
        (w.name || '').toLowerCase().includes(q) ||
        Object.keys(w.specialities || {}).join(' ').toLowerCase().includes(q) ||
        (w.serviceArea || '').toLowerCase().includes(q) ||
        (w.phone || '').includes(q)
      );
    }

    const isComplaintsTab = this._currentTab === 'complaints';

    // Complaint triage list
    let complaintFiltered = this._complaintFilter === 'all'
      ? this._complaints
      : this._complaints.filter(c => c.status === this._complaintFilter);
    if (q) {
      complaintFiltered = complaintFiltered.filter(c =>
        (c.id || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        (c.customerId || c.customer_id || '').toLowerCase().includes(q) ||
        (c.customerName || '').toLowerCase().includes(q) ||
        (c.bookingId || '').toLowerCase().includes(q) ||
        (c.description || c.details || '').toLowerCase().includes(q)
      );
    }

    container.innerHTML = `
      <div style="display:flex;min-height:100vh;">

        <!-- Sidebar -->
        <aside style="width:240px;min-width:200px;background:var(--bg-secondary);border-right:1px solid var(--border-color);display:flex;flex-direction:column;padding:1.25rem 0;flex-shrink:0;">
          <div style="padding:0 1rem 1rem;border-bottom:1px solid var(--border-color);margin-bottom:0.75rem;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:0.3rem;">
              <div class="nav-logo" style="width:30px;height:30px;font-size:0.8rem;" id="admin-logo-click">LK</div>
              <strong style="color:var(--ink);font-size:0.95rem;">LocalKaam</strong>
            </div>
            <div style="font-size:0.7rem;color:var(--text-muted);font-weight:500;">Admin Dashboard</div>
            <!-- Backend status indicator -->
            <div style="margin-top:6px;display:flex;align-items:center;gap:5px;font-size:0.68rem;">
              <span style="width:7px;height:7px;border-radius:50%;background:${this._backendOnline ? '#10b981' : '#f59e0b'};display:inline-block;flex-shrink:0;"></span>
              <span style="color:var(--text-muted);">${this._backendOnline ? 'Backend connected' : 'Using local cache'}</span>
            </div>
          </div>

          <div style="padding:0 0.75rem;flex:1;">
            <div style="font-size:0.68rem;color:var(--text-muted);font-weight:500;margin-bottom:0.5rem;padding-left:0.4rem;">Verification Queue</div>

            ${this._sidebarItem('all',      'users',        'All Workers',    counts.all)}
            ${this._sidebarItem('Pending',  'clock',        'Pending Review', counts.Pending, '#f59e0b')}
            ${this._sidebarItem('Verified', 'badge-check',  'Verified',       counts.Verified, '#10b981')}
            ${this._sidebarItem('Rejected', 'x-circle',     'Rejected',       counts.Rejected, '#ef4444')}

            <div style="font-size:0.68rem;color:var(--text-muted);font-weight:500;margin:1rem 0 0.5rem;padding-left:0.4rem;">Operations</div>

            ${this._tabItem('verification', 'badge-check', 'Worker Verification', counts.all)}
            ${this._tabItem('complaints', 'message-square-warning', 'Complaint Triage', openComplaints, openComplaints > 0 ? '#f59e0b' : null)}
          </div>

          <div style="padding:1rem;border-top:1px solid var(--border-color);margin-top:auto;">
            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.5rem;">
              Logged in as Admin
            </div>
            <button id="admin-refresh-btn" class="ui-btn ui-btn--secondary" style="width:100%;justify-content:center;font-size:0.8rem;padding:0.4rem 0.75rem;margin-bottom:6px;">
              <i data-lucide="refresh-cw" class="lucide-xs"></i> Refresh
            </button>
            <button id="admin-logout-btn" class="ui-btn ui-btn--secondary" style="width:100%;justify-content:center;font-size:0.8rem;padding:0.4rem 0.75rem;">
              <i data-lucide="log-out" class="lucide-xs"></i> Sign Out
            </button>
            <button id="admin-back-landing" class="ui-btn" style="width:100%;justify-content:center;font-size:0.78rem;margin-top:6px;color:var(--text-muted);">
              ← Back to App
            </button>
          </div>
        </aside>

        <!-- Main area -->
        <main id="admin-main-area" style="flex:1;overflow-y:auto;background:var(--bg-primary);display:flex;flex-direction:column;">
          <!-- Header -->
          <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;position:sticky;top:0;background:var(--bg-primary);z-index:10;">
            ${isComplaintsTab ? `
              <div>
                <h1 style="margin:0;font-size:1.3rem;font-weight:800;color:var(--ink);">Complaint Triage</h1>
                <p class="ui-muted" style="margin:3px 0 0;font-size:0.82rem;">Triage, respond to and resolve customer complaints end-to-end.</p>
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <span style="display:inline-flex;align-items:center;gap:5px;background:var(--color-warning-bg);color:var(--color-warning-text);border-radius:8px;padding:4px 12px;font-size:0.78rem;font-weight:500;">
                  <i data-lucide="hourglass" class="lucide-xs"></i> ${openComplaints} Open
                </span>
                <span style="display:inline-flex;align-items:center;gap:5px;background:var(--color-info-bg);color:var(--color-info);border-radius:8px;padding:4px 12px;font-size:0.78rem;font-weight:500;">
                  <i data-lucide="search" class="lucide-xs"></i> ${complaintCounts['Under Review'] + complaintCounts['Awaiting Response']} In Progress
                </span>
                <span style="display:inline-flex;align-items:center;gap:5px;background:var(--color-success-bg);color:var(--color-success);border-radius:8px;padding:4px 12px;font-size:0.78rem;font-weight:500;">
                  <i data-lucide="check-circle" class="lucide-xs"></i> ${complaintCounts.Resolved + complaintCounts.Closed} Closed Out
                </span>
              </div>
            ` : `
              <div>
                <h1 style="margin:0;font-size:1.3rem;font-weight:800;color:var(--ink);">Worker Document Verification</h1>
                <p class="ui-muted" style="margin:3px 0 0;font-size:0.82rem;">Review uploaded documents and approve or reject worker onboarding applications.</p>
              </div>
              <!-- Stats pills -->
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <span style="display:inline-flex;align-items:center;gap:5px;background:var(--color-warning-bg);color:var(--color-warning-text);border-radius:8px;padding:4px 12px;font-size:0.78rem;font-weight:500;">
                  <i data-lucide="clock" class="lucide-xs"></i> ${counts.Pending} Pending
                </span>
                <span style="display:inline-flex;align-items:center;gap:5px;background:var(--color-success-bg);color:var(--color-success);border-radius:8px;padding:4px 12px;font-size:0.78rem;font-weight:500;">
                  <i data-lucide="badge-check" class="lucide-xs"></i> ${counts.Verified} Verified
                </span>
                <span style="display:inline-flex;align-items:center;gap:5px;background:var(--color-danger-bg);color:var(--color-danger);border-radius:8px;padding:4px 12px;font-size:0.78rem;font-weight:500;">
                  <i data-lucide="x-circle" class="lucide-xs"></i> ${counts.Rejected} Rejected
                </span>
              </div>
            `}
          </div>

          <!-- Search bar -->
          <div style="padding:0.85rem 1.5rem;border-bottom:1px solid var(--border-color);background:var(--bg-secondary);">
            <div style="display:flex;align-items:center;gap:0.5rem;max-width:420px;">
              <i data-lucide="search" class="lucide-xs" style="color:var(--text-muted);flex-shrink:0;"></i>
              <input
                id="admin-search-input"
                type="search"
                class="form-input"
                placeholder="${isComplaintsTab ? 'Search by complaint ID, category, booking…' : 'Search by name, skill, area, phone…'}"
                value="${esc(this._searchQuery)}"
                style="flex:1;font-size:0.85rem;padding:6px 10px;"
              />
              ${q ? `<button id="admin-search-clear" class="ui-btn" style="font-size:0.75rem;padding:4px 8px;color:var(--text-muted);">✕</button>` : ''}
            </div>
          </div>

          ${isComplaintsTab ? `
            <!-- Complaint status filter chips -->
            <div style="padding:0.85rem 1.5rem;border-bottom:1px solid var(--border-color);background:var(--bg-secondary);display:flex;gap:0.4rem;flex-wrap:wrap;">
              ${['all', ...this.COMPLAINT_STATUSES].map(s => this._complaintFilterChip(s, s === 'all' ? complaintCounts.all : complaintCounts[s])).join('')}
            </div>

            <!-- Complaint list -->
            <div style="padding:1.25rem 1.5rem;flex:1;">
              ${complaintFiltered.length === 0 ? `
                <div class="ui-empty ui-card ui-card--pad" style="padding:3rem 1rem;text-align:center;max-width:500px;margin:3rem auto;">
                  <div class="ui-empty__icon"><i data-lucide="message-square-warning" class="lucide-md"></i></div>
                  <h4 style="font-size:1rem;font-weight:500;margin:0.5rem 0 0.25rem;color:var(--ink);">No complaints found</h4>
                  <p class="ui-muted" style="font-size:0.85rem;margin:0;">${q ? 'Try a different search term.' : 'Try a different status filter.'}</p>
                </div>
              ` : `
                <div style="display:flex;flex-direction:column;gap:1rem;">
                  ${complaintFiltered.map(c => this._renderComplaintCard(c)).join('')}
                </div>
              `}
            </div>
          ` : `
          <!-- Worker list -->
          <div style="padding:1.25rem 1.5rem;flex:1;">
            ${filtered.length === 0 ? `
              <div class="ui-empty ui-card ui-card--pad" style="padding:3rem 1rem;text-align:center;max-width:500px;margin:3rem auto;">
                <div class="ui-empty__icon"><i data-lucide="inbox" class="lucide-md"></i></div>
                <h4 style="font-size:1rem;font-weight:500;margin:0.5rem 0 0.25rem;color:var(--ink);">No workers found</h4>
                <p class="ui-muted" style="font-size:0.85rem;margin:0;">${q ? 'Try a different search term.' : 'Try a different filter from the sidebar.'}</p>
              </div>
            ` : `
              <div style="display:flex;flex-direction:column;gap:1rem;">
                ${filtered.map(w => this._renderWorkerCard(w)).join('')}
              </div>
            `}
          </div>
          `}
        </main>

        <!-- Detail panel -->
        <div id="admin-detail-panel" style="display:none;width:420px;min-width:340px;border-left:1px solid var(--border-color);background:var(--bg-secondary);overflow-y:auto;padding:1.25rem;"></div>
      </div>
    `;

    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();
    this._attachDashboardEvents(container);

    // Re-open selected detail panel after re-render (per active tab)
    if (this._currentTab === 'verification' && this._selectedWorkerId) {
      const sel = this._workers.find(w => w.id === this._selectedWorkerId);
      if (sel) this._openDetailPanel(container, sel);
    }
    if (this._currentTab === 'complaints' && this._selectedComplaintId) {
      const sel = this._complaints.find(c => c.id === this._selectedComplaintId);
      if (sel) this._openComplaintPanel(container, sel);
    }
  },

  _sidebarItem(filterKey, icon, label, count, dotColor = null) {
    const active = this._currentFilter === filterKey;
    const dot = dotColor ? `<span style="width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block;margin-right:4px;flex-shrink:0;"></span>` : '';
    return `
      <div
        class="admin-filter-item"
        data-filter="${esc(filterKey)}"
        style="
          display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;cursor:pointer;
          font-size:0.85rem;font-weight:600;transition:background 0.15s;
          ${active ? 'background:var(--accent-light);color:var(--ink);' : 'color:var(--text-secondary);'}
        "
        role="button" tabindex="0"
      >
        ${dot}<i data-lucide="${esc(icon)}" class="lucide-xs" style="flex-shrink:0;"></i>
        <span style="flex:1;">${esc(label)}</span>
        <span style="
          font-size:0.7rem;font-weight:500;padding:2px 7px;border-radius:6px;
          ${active ? 'background:var(--accent-primary);color:#fff;' : 'background:var(--border-color);color:var(--text-muted);'}
        ">${count}</span>
      </div>
    `;
  },

  _tabItem(tabKey, icon, label, count, dotColor = null) {
    const active = this._currentTab === tabKey;
    const dot = dotColor ? `<span style="width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block;margin-right:4px;flex-shrink:0;"></span>` : '';
    return `
      <div
        class="admin-tab-item"
        data-tab="${esc(tabKey)}"
        style="
          display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;cursor:pointer;
          font-size:0.85rem;font-weight:600;transition:background 0.15s;
          ${active ? 'background:var(--accent-light);color:var(--ink);' : 'color:var(--text-secondary);'}
        "
        role="button" tabindex="0"
        aria-current="${active ? 'page' : 'false'}"
      >
        ${dot}<i data-lucide="${esc(icon)}" class="lucide-xs" style="flex-shrink:0;"></i>
        <span style="flex:1;">${esc(label)}</span>
        <span style="
          font-size:0.7rem;font-weight:500;padding:2px 7px;border-radius:6px;
          ${active ? 'background:var(--accent-primary);color:#fff;' : 'background:var(--border-color);color:var(--text-muted);'}
        ">${count}</span>
      </div>
    `;
  },

  _statusBadge(status) {
    const map = {
      Verified: { bg: '#d1fae5', color: '#065f46', icon: 'badge-check', label: 'Verified' },
      Pending:  { bg: '#fef3c7', color: '#92400e', icon: 'clock',       label: 'Pending'  },
      Rejected: { bg: '#fee2e2', color: '#991b1b', icon: 'x-circle',    label: 'Rejected' },
    };
    const s = map[status] || map.Pending;
    return `
      <span style="display:inline-flex;align-items:center;gap:5px;background:${s.bg};color:${s.color};border-radius:999px;padding:3px 10px;font-size:0.75rem;font-weight:700;">
        <i data-lucide="${esc(s.icon)}" class="lucide-xs"></i> ${esc(s.label)}
      </span>
    `;
  },

  _renderWorkerCard(w) {
    const docs     = Array.isArray(w.uploadedDocs) ? w.uploadedDocs : [];
    const docCount = docs.length;
    const cats     = Object.keys(w.specialities || {}).join(', ') || 'General';
    const initials = (w.name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const reviewedAt = w.adminReviewedAt ? new Date(w.adminReviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;

    return `
      <div
        class="admin-worker-card"
        data-worker-id="${esc(w.id)}"
        style="
          background:var(--bg-card);border:1px solid var(--border-color);border-radius:12px;
          padding:1rem 1.25rem;cursor:pointer;transition:box-shadow 0.15s, border-color 0.15s;
          display:flex;align-items:center;gap:1rem;flex-wrap:wrap;
          ${this._selectedWorkerId === w.id ? 'border-color:var(--accent-primary);box-shadow:0 0 0 2px var(--accent-primary)33;' : ''}
        "
        role="button" tabindex="0"
        aria-label="Review ${esc(w.name)}'s documents"
      >
        <!-- Avatar -->
        <div style="width:48px;height:48px;border-radius:50%;background:var(--accent-light);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;color:var(--ink);flex-shrink:0;overflow:hidden;">
          ${w.avatar ? `<img src="${esc(w.avatar)}" style="width:100%;height:100%;object-fit:cover;" alt="${esc(w.name)}" loading="lazy" onerror="this.style.display='none'">` : initials}
        </div>

        <!-- Info -->
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:3px;">
            <strong style="font-size:0.95rem;color:var(--ink);">${esc(w.name || 'Unnamed')}</strong>
            ${this._statusBadge(w.verificationStatus || 'Pending')}
            ${reviewedAt ? `<span style="font-size:0.7rem;color:var(--text-muted);">Reviewed ${reviewedAt}</span>` : ''}
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);">
            ${esc(cats)} &nbsp;·&nbsp; ${esc(w.serviceArea || w.baseLocality || 'Mumbai')}
            &nbsp;·&nbsp; <i data-lucide="file-text" class="lucide-xs" style="vertical-align:-2px;"></i> ${docCount} doc${docCount !== 1 ? 's' : ''}
            ${w.phone ? `&nbsp;·&nbsp; ${esc(w.phone)}` : ''}
          </div>
          ${w.adminNotes ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:3px;font-style:italic;">📝 ${esc(w.adminNotes.substring(0, 80))}${w.adminNotes.length > 80 ? '…' : ''}</div>` : ''}
        </div>

        <!-- CTA -->
        <button class="admin-review-btn ui-btn ui-btn--secondary" data-worker-id="${esc(w.id)}" style="font-size:0.8rem;padding:5px 14px;flex-shrink:0;">
          Review <i data-lucide="chevron-right" class="lucide-xs"></i>
        </button>
      </div>
    `;
  },

  // ---------------------------------------------------------------
  // Complaint triage — badges, chips, cards
  // ---------------------------------------------------------------
  _complaintStatusBadge(status) {
    const map = {
      'Submitted':         { bg: '#e0e7ff', color: '#3730a3', icon: 'message-square-warning' },
      'Under Review':      { bg: '#fef3c7', color: '#92400e', icon: 'search' },
      'Awaiting Response': { bg: '#fce7f3', color: '#9d174d', icon: 'hourglass' },
      'Resolved':          { bg: '#d1fae5', color: '#065f46', icon: 'check-circle' },
      'Closed':            { bg: '#e5e7eb', color: '#374151', icon: 'archive' },
    };
    const s = map[status] || map['Submitted'];
    return `
      <span style="display:inline-flex;align-items:center;gap:5px;background:${s.bg};color:${s.color};border-radius:999px;padding:3px 10px;font-size:0.75rem;font-weight:700;">
        <i data-lucide="${esc(s.icon)}" class="lucide-xs"></i> ${esc(status || 'Submitted')}
      </span>
    `;
  },

  _complaintFilterChip(statusKey, count) {
    const active = this._complaintFilter === statusKey;
    const label = statusKey === 'all' ? 'All' : statusKey;
    return `
      <button
        class="admin-complaint-filter"
        data-status="${esc(statusKey)}"
        style="
          font:inherit;font-size:0.78rem;font-weight:700;padding:5px 12px;border-radius:999px;cursor:pointer;
          border:1px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'};
          background:${active ? 'var(--accent-primary)' : 'var(--bg-card)'};
          color:${active ? '#fff' : 'var(--text-secondary)'};
        "
        aria-pressed="${active ? 'true' : 'false'}"
      >
        ${esc(label)} <span style="opacity:0.75;">(${count})</span>
      </button>
    `;
  },

  _renderComplaintCard(c) {
    const cat = COMPLAINT_CATEGORIES.find(x => x.id === c.category);
    const catIcon = cat ? cat.icon : '❓';
    const catName = cat ? cat.name : (c.category || 'Other');
    const createdAt = c.createdAt
      ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const history = Array.isArray(c.statusHistory) ? c.statusHistory : [];
    const lastEntry = history.length ? history[history.length - 1] : null;
    const lastUpdate = lastEntry
      ? `${lastEntry.status}${lastEntry.timestamp ? ' · ' + new Date(lastEntry.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}`
      : null;
    const desc = c.description || c.details || '';
    const selected = this._selectedComplaintId === c.id;

    return `
      <div
        class="admin-complaint-card"
        data-complaint-id="${esc(c.id)}"
        style="
          background:var(--bg-card);border:1px solid ${selected ? 'var(--accent-primary)' : 'var(--border-color)'};
          box-shadow:${selected ? '0 0 0 2px var(--accent-primary)33' : 'none'};
          border-radius:12px;padding:1rem 1.25rem;cursor:pointer;
          transition:box-shadow 0.15s, border-color 0.15s;
          display:flex;align-items:center;gap:1rem;flex-wrap:wrap;
        "
        role="button" tabindex="0"
        aria-label="Triage complaint ${esc(c.id)}"
      >
        <!-- Category icon -->
        <div style="width:48px;height:48px;border-radius:12px;background:var(--accent-light);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">
          ${esc(catIcon)}
        </div>

        <!-- Info -->
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:3px;">
            <strong style="font-size:0.95rem;color:var(--ink);">${esc(c.id)}</strong>
            ${this._complaintStatusBadge(c.status)}
            <span style="font-size:0.72rem;color:var(--text-muted);">${esc(catName)}</span>
          </div>
          <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:3px;">
            ${esc(desc.substring(0, 110))}${desc.length > 110 ? '…' : ''}
          </div>
          <div style="font-size:0.72rem;color:var(--text-muted);">
            ${c.bookingId ? `<i data-lucide="calendar-check" class="lucide-xs" style="vertical-align:-2px;"></i> ${esc(c.bookingId)} &nbsp;·&nbsp; ` : ''}
            <i data-lucide="user" class="lucide-xs" style="vertical-align:-2px;"></i> ${esc(c.customerName || c.customerId || c.customer_id || '—')}
            ${createdAt ? ` &nbsp;·&nbsp; Filed ${esc(createdAt)}` : ''}
            ${lastUpdate ? ` &nbsp;·&nbsp; <i data-lucide="history" class="lucide-xs" style="vertical-align:-2px;"></i> ${esc(lastUpdate)}` : ''}
          </div>
        </div>

        <!-- CTA -->
        <button class="admin-triage-btn ui-btn ui-btn--secondary" data-complaint-id="${esc(c.id)}" style="font-size:0.8rem;padding:5px 14px;flex-shrink:0;">
          Triage <i data-lucide="chevron-right" class="lucide-xs"></i>
        </button>
      </div>
    `;
  },

  // ---------------------------------------------------------------
  // Detail Panel
  // ---------------------------------------------------------------
  _openDetailPanel(container, worker) {
    this._selectedWorkerId = worker.id;
    this._selectedComplaintId = null;
    const panel = container.querySelector('#admin-detail-panel');
    if (!panel) return;

    const docs       = Array.isArray(worker.uploadedDocs) ? worker.uploadedDocs : [];
    const initials   = (worker.name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const isVerified = worker.verificationStatus === 'Verified';
    const isRejected = worker.verificationStatus === 'Rejected';
    const reviewedAt = worker.adminReviewedAt
      ? new Date(worker.adminReviewedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;

    panel.style.display = 'block';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">
        <h2 style="font-size:1.1rem;font-weight:800;color:var(--ink);margin:0;">Document Review</h2>
        <button id="admin-close-panel" class="ui-btn" style="padding:4px 8px;color:var(--text-muted);font-size:0.8rem;" aria-label="Close panel">✕</button>
      </div>

      <!-- Worker summary -->
      <div style="display:flex;align-items:center;gap:0.75rem;background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:0.85rem;margin-bottom:1rem;">
        <div style="width:44px;height:44px;border-radius:50%;background:var(--accent-light);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.9rem;color:var(--ink);overflow:hidden;flex-shrink:0;">
          ${worker.avatar ? `<img src="${esc(worker.avatar)}" style="width:100%;height:100%;object-fit:cover;" alt="${esc(worker.name)}" onerror="this.style.display='none'">` : initials}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;color:var(--ink);font-size:0.95rem;">${esc(worker.name || 'Unnamed')}</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);">${esc(worker.phone || '—')} &nbsp;·&nbsp; ${esc(Object.keys(worker.specialities || {}).join(', ') || 'General')}</div>
          ${reviewedAt ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;">Last reviewed: ${esc(reviewedAt)}</div>` : ''}
        </div>
        ${this._statusBadge(worker.verificationStatus || 'Pending')}
      </div>

      <!-- Document checklist -->
      <h3 style="font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin:0 0 0.6rem;">
        Uploaded Documents <span style="font-weight:400;text-transform:none;">(${docs.length} of ${REQUIRED_VERIFICATION_DOCUMENTS.length})</span>
      </h3>

      ${docs.length === 0 ? `
        <div class="ui-empty" style="padding:1.5rem;text-align:center;color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;">
          <i data-lucide="file-x" class="lucide-md" style="display:block;margin:0 auto 0.5rem;"></i>
          No documents uploaded yet.
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:0.6rem;margin-bottom:1.25rem;">
          ${docs.map(doc => this._renderDocRow(doc)).join('')}
        </div>
      `}

      <!-- Admin notes -->
      <h3 style="font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin:0 0 0.4rem;">Admin Notes</h3>
      <textarea
        id="admin-notes-input"
        class="form-input"
        placeholder="Add verification notes or rejection reason…"
        rows="3"
        style="width:100%;resize:vertical;font-size:0.85rem;margin-bottom:1rem;box-sizing:border-box;"
      >${esc(worker.adminNotes || '')}</textarea>

      <!-- Action Buttons -->
      <div style="display:flex;flex-direction:column;gap:0.6rem;">
        ${!isVerified ? `
          <button id="admin-approve-btn" class="ui-btn ui-btn--accent" data-worker-id="${esc(worker.id)}" style="justify-content:center;width:100%;">
            <i data-lucide="badge-check" class="lucide-xs"></i> Approve &amp; Verify Worker
          </button>
        ` : `
          <div style="display:flex;align-items:center;gap:6px;background:#d1fae5;color:#065f46;border-radius:8px;padding:0.6rem 0.85rem;font-size:0.85rem;font-weight:700;">
            <i data-lucide="check-circle" class="lucide-xs"></i> This worker is already Verified.
          </div>
        `}
        ${!isRejected ? `
          <button id="admin-reject-btn" class="ui-btn ui-btn--secondary" data-worker-id="${esc(worker.id)}" style="justify-content:center;width:100%;border-color:#ef4444;color:#ef4444;">
            <i data-lucide="x-circle" class="lucide-xs"></i> Reject Application
          </button>
        ` : `
          <div style="display:flex;align-items:center;gap:6px;background:#fee2e2;color:#991b1b;border-radius:8px;padding:0.6rem 0.85rem;font-size:0.85rem;font-weight:700;">
            <i data-lucide="x-circle" class="lucide-xs"></i> Application already rejected.
          </div>
        `}
        ${(isVerified || isRejected) ? `
          <button id="admin-reset-btn" class="ui-btn" data-worker-id="${esc(worker.id)}" style="justify-content:center;width:100%;font-size:0.8rem;color:var(--text-muted);">
            <i data-lucide="rotate-cw" class="lucide-xs"></i> Reset to Pending
          </button>
        ` : ''}
      </div>
    `;

    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();

    // Highlight selected card
    container.querySelectorAll('.admin-worker-card').forEach(el => {
      const sel = el.dataset.workerId === worker.id;
      el.style.borderColor = sel ? 'var(--accent-primary)' : 'var(--border-color)';
      el.style.boxShadow   = sel ? '0 0 0 2px var(--accent-primary)33' : '';
    });

    // Panel events
    panel.querySelector('#admin-close-panel')?.addEventListener('click', () => {
      panel.style.display = 'none';
      this._selectedWorkerId = null;
      container.querySelectorAll('.admin-worker-card').forEach(el => {
        el.style.borderColor = 'var(--border-color)';
        el.style.boxShadow   = '';
      });
    });

    panel.querySelector('#admin-approve-btn')?.addEventListener('click', () => {
      this._setWorkerStatus(container, worker.id, 'Verified', panel);
    });
    panel.querySelector('#admin-reject-btn')?.addEventListener('click', () => {
      const notes = (panel.querySelector('#admin-notes-input')?.value || '').trim();
      if (!notes) {
        Toast.show('Please add a rejection reason in the Admin Notes field.', 'warn');
        panel.querySelector('#admin-notes-input')?.focus();
        return;
      }
      this._setWorkerStatus(container, worker.id, 'Rejected', panel);
    });
    panel.querySelector('#admin-reset-btn')?.addEventListener('click', () => {
      this._setWorkerStatus(container, worker.id, 'Pending', panel);
    });

    // Auto-save notes on blur
    panel.querySelector('#admin-notes-input')?.addEventListener('blur', async () => {
      const notes = (panel.querySelector('#admin-notes-input')?.value || '').trim();
      await patchWorker(worker.id, { adminNotes: notes }).catch(() => {});
    });
  },

  _renderDocRow(doc) {
    const icons = {
      identity_proof:      '🪪',
      address_proof:       '🏠',
      trade_license:       '📜',
      experience_evidence: '💼',
    };
    const icon = icons[doc.type] || '📄';
    const uploadedAt = doc.uploadedAt
      ? new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
    const fileName = doc.fileName || '(no file)';

    return `
      <div style="display:flex;align-items:flex-start;gap:0.6rem;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;padding:0.65rem 0.85rem;">
        <span style="font-size:1.2rem;line-height:1;flex-shrink:0;margin-top:1px;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.82rem;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(doc.title || doc.type)}">${esc(doc.title || doc.type)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:1px;">
            <i data-lucide="file" class="lucide-xs" style="vertical-align:-2px;"></i>
            ${esc(fileName)} &nbsp;·&nbsp; Uploaded ${uploadedAt}
          </div>
        </div>
        <button class="ui-btn" style="font-size:0.72rem;padding:3px 10px;flex-shrink:0;color:var(--text-secondary);" title="View document (demo)"
          onclick="window.alert('Document viewer would open:\\n${esc(fileName)}')">
          <i data-lucide="eye" class="lucide-xs"></i> View
        </button>
      </div>
    `;
  },

  // ---------------------------------------------------------------
  // Status change — calls backend then re-renders
  // ---------------------------------------------------------------
  async _setWorkerStatus(container, workerId, newStatus, panel) {
    const notes = (panel?.querySelector('#admin-notes-input')?.value || '').trim();
    const reviewedAt = new Date().toISOString();

    try {
      const updated = await patchWorker(workerId, {
        verificationStatus: newStatus,
        adminNotes: notes,
        adminReviewedAt: reviewedAt
      });
      // Update local cache
      const idx = this._workers.findIndex(w => w.id === workerId);
      if (idx !== -1) this._workers[idx] = { ...this._workers[idx], ...updated, verificationStatus: newStatus, adminNotes: notes, adminReviewedAt: reviewedAt };
    } catch (err) {
      Toast.show('Could not save to server — changes stored locally only.', 'warn');
      const idx = this._workers.findIndex(w => w.id === workerId);
      if (idx !== -1) {
        this._workers[idx].verificationStatus = newStatus;
        this._workers[idx].adminNotes = notes;
        this._workers[idx].adminReviewedAt = reviewedAt;
      }
    }

    const workerName = this._workers.find(w => w.id === workerId)?.name || 'Worker';
    const labels = { Verified: 'approved ✅', Rejected: 'rejected ❌', Pending: 'reset to Pending 🔄' };
    Toast.show(`${workerName} has been ${labels[newStatus] || newStatus}.`,
      newStatus === 'Verified' ? 'success' : newStatus === 'Rejected' ? 'error' : 'info');

    this._renderDashboard(container);
  },

  // ---------------------------------------------------------------
  // Complaint triage panel
  // ---------------------------------------------------------------
  _openComplaintPanel(container, complaint) {
    this._selectedComplaintId = complaint.id;
    const panel = container.querySelector('#admin-detail-panel');
    if (!panel) return;

    const cat = COMPLAINT_CATEGORIES.find(x => x.id === complaint.category);
    const catName = cat ? cat.name : (complaint.category || 'Other');
    const createdAt = complaint.createdAt
      ? new Date(complaint.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;
    const incident = complaint.incidentDate
      ? new Date(complaint.incidentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const actions = this._COMPLAINT_ACTIONS[complaint.status] || [];
    const history = Array.isArray(complaint.statusHistory) && complaint.statusHistory.length
      ? [...complaint.statusHistory].reverse() // newest first
      : [{ status: complaint.status || 'Submitted', timestamp: complaint.createdAt, note: 'Complaint submitted' }];

    panel.style.display = 'block';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">
        <h2 style="font-size:1.1rem;font-weight:800;color:var(--ink);margin:0;">Complaint Triage</h2>
        <button id="admin-close-panel" class="ui-btn" style="padding:4px 8px;color:var(--text-muted);font-size:0.8rem;" aria-label="Close panel">✕</button>
      </div>

      <!-- Complaint summary -->
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:0.85rem;margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.4rem;">
          <strong style="font-size:0.95rem;color:var(--ink);">${esc(complaint.id)}</strong>
          ${this._complaintStatusBadge(complaint.status)}
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
          <span style="font-size:1.3rem;line-height:1;">${esc(cat ? cat.icon : '❓')}</span>
          <div style="font-size:0.82rem;color:var(--text-secondary);">${esc(catName)}${cat ? ` — ${esc(cat.description)}` : ''}</div>
        </div>
        <div style="font-size:0.74rem;color:var(--text-muted);display:flex;flex-direction:column;gap:2px;">
          ${complaint.bookingId ? `<span><i data-lucide="calendar-check" class="lucide-xs" style="vertical-align:-2px;"></i> Booking: ${esc(complaint.bookingId)}</span>` : ''}
          <span><i data-lucide="user" class="lucide-xs" style="vertical-align:-2px;"></i> Customer: ${esc(complaint.customerName || complaint.customerId || complaint.customer_id || '—')}</span>
          ${incident ? `<span><i data-lucide="alarm-clock" class="lucide-xs" style="vertical-align:-2px;"></i> Incident date: ${esc(incident)}</span>` : ''}
          ${createdAt ? `<span><i data-lucide="clock" class="lucide-xs" style="vertical-align:-2px;"></i> Filed: ${esc(createdAt)}</span>` : ''}
        </div>
      </div>

      <!-- What the customer reported -->
      <h3 style="font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin:0 0 0.4rem;">Customer Report</h3>
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:0.85rem;font-size:0.85rem;color:var(--text-secondary);line-height:1.5;margin-bottom:0.75rem;">
        ${esc(complaint.description || complaint.details || 'No description provided.')}
      </div>
      ${complaint.resolutionRequest ? `
        <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:0.75rem 0.85rem;font-size:0.8rem;color:#3730a3;line-height:1.45;margin-bottom:1rem;">
          <strong style="display:block;margin-bottom:2px;">Requested Resolution</strong>
          ${esc(complaint.resolutionRequest)}
        </div>
      ` : ''}

      <!-- Status timeline -->
      <h3 style="font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin:0 0 0.4rem;">Status Timeline</h3>
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:10px;padding:0.6rem 0.85rem;margin-bottom:1rem;">
        ${history.map(h => `
          <div style="display:flex;gap:0.6rem;align-items:flex-start;padding:0.3rem 0;">
            <span style="width:8px;height:8px;border-radius:50%;background:var(--accent-primary);margin-top:6px;flex-shrink:0;"></span>
            <div style="min-width:0;">
              <div style="font-size:0.8rem;font-weight:700;color:var(--ink);">${esc(h.status)}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);">
                ${h.timestamp ? esc(new Date(h.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : '—'}
                ${h.note ? ` — ${esc(h.note)}` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Admin notes -->
      <h3 style="font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin:0 0 0.4rem;">Admin Notes</h3>
      <textarea
        id="admin-notes-input"
        class="form-input"
        placeholder="Internal note for this complaint (auto-saves)…"
        rows="3"
        style="width:100%;resize:vertical;font-size:0.85rem;margin-bottom:1rem;box-sizing:border-box;"
      >${esc(complaint.adminNotes || '')}</textarea>

      <!-- Action buttons per lifecycle state -->
      <h3 style="font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin:0 0 0.4rem;">Actions</h3>
      <div style="display:flex;flex-direction:column;gap:0.6rem;">
        ${actions.length === 0 ? `
          <div style="display:flex;align-items:center;gap:6px;background:#e5e7eb;color:#374151;border-radius:8px;padding:0.6rem 0.85rem;font-size:0.85rem;font-weight:700;">
            <i data-lucide="archive" class="lucide-xs"></i> No actions available.
          </div>
        ` : ''}
        ${actions.map(a => `
          <button
            class="admin-complaint-action ui-btn ${a.kind === 'accent' ? 'ui-btn--accent' : 'ui-btn--secondary'}"
            data-complaint-id="${esc(complaint.id)}"
            data-to-status="${esc(a.to)}"
            style="justify-content:center;width:100%;"
          >
            <i data-lucide="${esc(a.icon)}" class="lucide-xs"></i> ${esc(a.label)}
          </button>
        `).join('')}
      </div>
    `;

    if (typeof window !== 'undefined' && typeof window.refreshIcons === 'function') window.refreshIcons();

    // Highlight selected card
    container.querySelectorAll('.admin-complaint-card').forEach(el => {
      const sel = el.dataset.complaintId === complaint.id;
      el.style.borderColor = sel ? 'var(--accent-primary)' : 'var(--border-color)';
      el.style.boxShadow   = sel ? '0 0 0 2px var(--accent-primary)33' : 'none';
    });

    // Panel events
    panel.querySelector('#admin-close-panel')?.addEventListener('click', () => {
      panel.style.display = 'none';
      this._selectedComplaintId = null;
      container.querySelectorAll('.admin-complaint-card').forEach(el => {
        el.style.borderColor = 'var(--border-color)';
        el.style.boxShadow   = 'none';
      });
    });

    panel.querySelectorAll('.admin-complaint-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const to = btn.dataset.toStatus;
        if (to) this._setComplaintStatus(container, complaint.id, to, panel);
      });
    });

    // Auto-save notes on blur
    panel.querySelector('#admin-notes-input')?.addEventListener('blur', async () => {
      const notes = (panel.querySelector('#admin-notes-input')?.value || '').trim();
      if (notes === (complaint.adminNotes || '')) return;
      try {
        await patchComplaint(complaint.id, { adminNotes: notes });
        const idx = this._complaints.findIndex(c => c.id === complaint.id);
        if (idx !== -1) this._complaints[idx].adminNotes = notes;
      } catch (_) {}
    });
  },

  // ---------------------------------------------------------------
  // Complaint status change — calls backend then re-renders
  // ---------------------------------------------------------------
  async _setComplaintStatus(container, complaintId, newStatus, panel) {
    const notes = (panel?.querySelector('#admin-notes-input')?.value || '').trim();
    let updated = null;

    try {
      updated = await patchComplaint(complaintId, { status: newStatus, adminNotes: notes });
    } catch (_) {
      Toast.show('Could not save to server — changes stored locally only.', 'warn');
    }

    // Update local cache (patchComplaint already synced the localStorage fallback)
    const idx = this._complaints.findIndex(c => c.id === complaintId);
    if (idx !== -1) {
      this._complaints[idx] = { ...this._complaints[idx], ...(updated || {}), status: newStatus, adminNotes: notes };
      const history = Array.isArray(this._complaints[idx].statusHistory)
        ? [...this._complaints[idx].statusHistory]
        : [];
      const last = history[history.length - 1];
      // Server appends history itself; avoid double-appending when it already did
      if (!last || last.status !== newStatus) {
        history.push({ status: newStatus, timestamp: new Date().toISOString(), note: notes || 'Updated by admin' });
        this._complaints[idx].statusHistory = history;
      }
    }

    Toast.show(`${complaintId} marked ${newStatus}.`,
      (newStatus === 'Resolved' || newStatus === 'Closed') ? 'success' : 'info');

    this._renderDashboard(container);
  },

  // ---------------------------------------------------------------
  // Event wiring
  // ---------------------------------------------------------------
  _attachDashboardEvents(container) {
    // Operations tab switch (verification ↔ complaints)
    container.querySelectorAll('.admin-tab-item').forEach(el => {
      const go = () => {
        this._currentTab = el.dataset.tab;
        this._selectedWorkerId = null;
        this._selectedComplaintId = null;
        this._renderDashboard(container);
      };
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });

    // Sidebar filter — always returns to the verification tab
    container.querySelectorAll('.admin-filter-item').forEach(el => {
      const go = () => {
        this._currentTab       = 'verification';
        this._currentFilter    = el.dataset.filter;
        this._selectedWorkerId = null;
        this._selectedComplaintId = null;
        this._renderDashboard(container);
      };
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });

    // Complaint status filter chips
    container.querySelectorAll('.admin-complaint-filter').forEach(el => {
      el.addEventListener('click', () => {
        this._complaintFilter = el.dataset.status;
        this._selectedComplaintId = null;
        this._renderDashboard(container);
      });
    });

    // Search
    const searchInput = container.querySelector('#admin-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this._searchQuery    = searchInput.value;
        this._selectedWorkerId = null;
        this._selectedComplaintId = null;
        this._renderDashboard(container);
      });
    }
    container.querySelector('#admin-search-clear')?.addEventListener('click', () => {
      this._searchQuery    = '';
      this._selectedWorkerId = null;
      this._selectedComplaintId = null;
      this._renderDashboard(container);
    });

    // Worker card / review btn clicks
    container.querySelectorAll('.admin-worker-card, .admin-review-btn').forEach(el => {
      const go = e => {
        e.stopPropagation();
        const wid = el.dataset.workerId;
        const w   = this._workers.find(x => x.id === wid);
        if (w) this._openDetailPanel(container, w);
      };
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
    });

    // Complaint card / triage btn clicks
    container.querySelectorAll('.admin-complaint-card, .admin-triage-btn').forEach(el => {
      const go = e => {
        e.stopPropagation();
        const cid = el.dataset.complaintId;
        const c   = this._complaints.find(x => x.id === cid);
        if (c) this._openComplaintPanel(container, c);
      };
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } });
    });

    // Refresh button
    container.querySelector('#admin-refresh-btn')?.addEventListener('click', () => {
      this._selectedWorkerId = null;
      this._selectedComplaintId = null;
      this._loadAndRender(container);
    });

    // Sign out
    container.querySelector('#admin-logout-btn')?.addEventListener('click', () => {
      setAdminAuthed(false);
      this._selectedWorkerId = null;
      this._selectedComplaintId = null;
      this._searchQuery = '';
      this._currentTab = 'verification';
      this._complaintFilter = 'all';
      this._renderPasscodeGate(this._container);
    });

    // Back to app
    container.querySelector('#admin-back-landing')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('locakaam:navigate-role', { detail: { role: 'landing' } }));
    });

    // Secret: click LK logo 5× to log back out (useful when demoing)
    let _logoClicks = 0, _logoTimer = null;
    container.querySelector('#admin-logo-click')?.addEventListener('click', () => {
      _logoClicks++;
      if (_logoTimer) clearTimeout(_logoTimer);
      _logoTimer = setTimeout(() => { _logoClicks = 0; }, 2000);
      if (_logoClicks >= 5) {
        _logoClicks = 0;
        setAdminAuthed(false);
        Toast.show('Admin session ended via logo shortcut.', 'info');
        this._renderPasscodeGate(this._container);
      }
    });
  }
};
