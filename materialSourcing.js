// LocalKaam — Feature 11: Material Sourcing / Parts Request
// Workers request parts mid-job → Customer approves → Cost added to invoice
// Demo mode: simulates local hardware store delivery in 30–60 min

import { StorageService } from './storage.js';
import { Toast } from './toast.js';
import { esc } from './utils.js';

// ─── Storage key ──────────────────────────────────────────────────────────────
const PARTS_KEY = 'localkaam_parts_requests';

function getParts() {
  try {
    const raw = localStorage.getItem(PARTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function setParts(parts) {
  try { localStorage.setItem(PARTS_KEY, JSON.stringify(parts)); } catch (_) {}
}

// ─── Demo parts catalog (simulates supplier API) ──────────────────────────────
export const PARTS_CATALOG = [
  // Plumbing
  { id: 'p_gate_valve_1in',   name: '1-inch Gate Valve',          category: 'plumber',     unitPrice: 180,  unit: 'piece', brand: 'Zoloto', eta: '35 min' },
  { id: 'p_cpvc_pipe_3m',     name: 'CPVC Pipe 3/4" × 3m',        category: 'plumber',     unitPrice: 220,  unit: 'piece', brand: 'Ashirvad', eta: '40 min' },
  { id: 'p_tap_bib_half',     name: 'Bib Cock Tap ½"',            category: 'plumber',     unitPrice: 350,  unit: 'piece', brand: 'Jaquar', eta: '45 min' },
  { id: 'p_teflon_roll',      name: 'PTFE Teflon Tape (20m)',      category: 'plumber',     unitPrice: 25,   unit: 'roll',  brand: 'Generic', eta: '30 min' },
  { id: 'p_ball_valve',       name: 'Ball Valve ½"',               category: 'plumber',     unitPrice: 120,  unit: 'piece', brand: 'Zoloto', eta: '35 min' },
  { id: 'p_washers_set',      name: 'Rubber Washer Set (20pcs)',   category: 'plumber',     unitPrice: 40,   unit: 'set',   brand: 'Generic', eta: '30 min' },

  // Electrical
  { id: 'e_mcb_32a',          name: 'MCB 32A Single Pole',         category: 'electrician', unitPrice: 320,  unit: 'piece', brand: 'Legrand', eta: '45 min' },
  { id: 'e_wire_1sqmm_10m',   name: 'FR Wire 1.5 sq mm × 10m',    category: 'electrician', unitPrice: 190,  unit: 'roll',  brand: 'Finolex', eta: '40 min' },
  { id: 'e_switch_modular',   name: 'Modular Switch 6A',           category: 'electrician', unitPrice: 85,   unit: 'piece', brand: 'Anchor', eta: '35 min' },
  { id: 'e_socket_16a',       name: '16A Socket with Shutter',     category: 'electrician', unitPrice: 110,  unit: 'piece', brand: 'Havells', eta: '35 min' },
  { id: 'e_conduit_1m',       name: 'PVC Conduit Pipe 1m',         category: 'electrician', unitPrice: 30,   unit: 'piece', brand: 'Generic', eta: '30 min' },
  { id: 'e_junction_box',     name: 'PVC Junction Box',            category: 'electrician', unitPrice: 45,   unit: 'piece', brand: 'Generic', eta: '30 min' },

  // Carpentry
  { id: 'c_wood_screw_bag',   name: 'Wood Screws Assorted (100pc)',category: 'carpenter',   unitPrice: 60,   unit: 'bag',   brand: 'Generic', eta: '30 min' },
  { id: 'c_hinge_pair',       name: 'Piano Hinge 12" (pair)',      category: 'carpenter',   unitPrice: 140,  unit: 'pair',  brand: 'Hettich', eta: '35 min' },
  { id: 'c_lock_mortise',     name: 'Mortise Lock Set',            category: 'carpenter',   unitPrice: 420,  unit: 'set',   brand: 'Godrej', eta: '50 min' },
  { id: 'c_sandpaper_120',    name: 'Sandpaper 120-grit (10 pcs)', category: 'carpenter',   unitPrice: 55,   unit: 'pack',  brand: 'Norton', eta: '30 min' },
  { id: 'c_wood_filler',      name: 'Wood Filler Paste 200g',      category: 'carpenter',   unitPrice: 90,   unit: 'tube',  brand: 'Fevikwik', eta: '35 min' },

  // AC Repair
  { id: 'ac_gas_r32',         name: 'R32 Refrigerant Gas (1kg)',   category: 'ac_repair',   unitPrice: 1800, unit: 'kg',    brand: 'Honeywell', eta: '60 min' },
  { id: 'ac_capacitor_35mf',  name: 'Run Capacitor 35μF',          category: 'ac_repair',   unitPrice: 180,  unit: 'piece', brand: 'Generic', eta: '45 min' },
  { id: 'ac_filter_1ton',     name: 'AC Filter Net 1-Ton',         category: 'ac_repair',   unitPrice: 120,  unit: 'piece', brand: 'Generic', eta: '40 min' },

  // Appliance Repair
  { id: 'ap_heating_coil',    name: 'Geyser Heating Element 2kW',  category: 'appliance_repair', unitPrice: 480, unit: 'piece', brand: 'Generic', eta: '50 min' },
  { id: 'ap_motor_capacitor', name: 'Fan Motor Capacitor 2.5μF',   category: 'appliance_repair', unitPrice: 90,  unit: 'piece', brand: 'Generic', eta: '40 min' },
];

// ─── Status lifecycle ─────────────────────────────────────────────────────────
// pending_approval → approved → ordered → out_for_delivery → delivered → added_to_invoice
// pending_approval → rejected

export const PART_STATUS_CONFIG = {
  pending_approval: { label: 'Awaiting Approval',    color: '#d97706', bg: '#fef3c7', icon: 'clock' },
  approved:         { label: 'Approved',              color: '#059669', bg: '#ecfdf5', icon: 'check-circle' },
  ordered:          { label: 'Ordered',               color: '#2563eb', bg: '#eff6ff', icon: 'shopping-cart' },
  out_for_delivery: { label: 'Out for Delivery',      color: '#7c3aed', bg: '#f5f3ff', icon: 'truck' },
  delivered:        { label: 'Delivered',             color: '#065f46', bg: '#d1fae5', icon: 'package-check' },
  added_to_invoice: { label: 'Added to Invoice',      color: '#1e40af', bg: '#dbeafe', icon: 'receipt' },
  rejected:         { label: 'Rejected by Customer',  color: '#dc2626', bg: '#fef2f2', icon: 'x-circle' },
};

// ─── Core service ─────────────────────────────────────────────────────────────
export const MaterialSourcingService = {

  getRequestsForBooking(bookingId) {
    return getParts().filter(p => p.bookingId === bookingId);
  },

  getAllRequests() {
    return getParts();
  },

  createRequest({ bookingId, workerId, workerName, items, deliveryAddress, note }) {
    const parts = getParts();
    const totalCost = items.reduce((s, it) => s + (it.unitPrice * it.qty), 0);
    const req = {
      id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      bookingId,
      workerId,
      workerName,
      items,          // [{ partId, name, qty, unitPrice, unit }]
      totalCost,
      deliveryAddress,
      note: note || '',
      status: 'pending_approval',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deliveryEta: null,
      deliveredAt: null,
    };
    parts.push(req);
    setParts(parts);
    return req;
  },

  updateStatus(requestId, status) {
    const parts = getParts();
    const idx = parts.findIndex(p => p.id === requestId);
    if (idx === -1) return null;
    parts[idx].status = status;
    parts[idx].updatedAt = Date.now();

    if (status === 'approved') {
      // Simulate: auto-advance to ordered in 1s (demo), delivery ETA = max item ETA
      const maxEta = Math.max(...(parts[idx].items.map(it => {
        const cat = PARTS_CATALOG.find(c => c.id === it.partId);
        return cat ? parseInt(cat.eta) : 40;
      })));
      parts[idx].deliveryEta = Date.now() + maxEta * 60 * 1000;
    }
    if (status === 'delivered') {
      parts[idx].deliveredAt = Date.now();
    }
    setParts(parts);
    return parts[idx];
  },

  addToInvoice(requestId, bookingId) {
    const parts = getParts();
    const req = parts.find(p => p.id === requestId);
    if (!req) return false;

    // Add cost to booking's agreedPrice
    const bookings = StorageService.getBookings();
    const bIdx = bookings.findIndex(b => b.id === bookingId);
    if (bIdx !== -1) {
      bookings[bIdx].partsTotal = (bookings[bIdx].partsTotal || 0) + req.totalCost;
      bookings[bIdx].partsCost = (bookings[bIdx].partsCost || []);
      bookings[bIdx].partsCost.push({ requestId, cost: req.totalCost, addedAt: Date.now() });
      StorageService.saveBookings(bookings);
    }
    this.updateStatus(requestId, 'added_to_invoice');
    return true;
  },

  rejectRequest(requestId) {
    return this.updateStatus(requestId, 'rejected');
  },

  // Demo: simulate delivery progress for approved requests
  simulateDelivery(requestId, onUpdate) {
    const steps = ['ordered', 'out_for_delivery', 'delivered'];
    let i = 0;
    const advance = () => {
      if (i >= steps.length) return;
      const updated = this.updateStatus(requestId, steps[i]);
      if (onUpdate) onUpdate(updated);
      i++;
      if (i < steps.length) setTimeout(advance, 4000 + Math.random() * 3000);
    };
    setTimeout(advance, 1500);
  },
};

// ─── Worker UI: Parts Request Panel ──────────────────────────────────────────
export const WorkerPartsPanel = {

  renderRequestForm(booking, worker) {
    const relevantParts = PARTS_CATALOG.filter(p =>
      !worker?.specialities || p.category === Object.keys(worker.specialities || {})[0] ||
      true // show all for now
    ).slice(0, 20);

    return `
      <div class="dash-card" id="parts-request-panel" style="max-width:720px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <div style="width:38px;height:38px;border-radius:10px;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i data-lucide="package" class="lucide-sm"></i>
          </div>
          <div>
            <h3 style="margin:0;font-size:1.05rem;">Request Parts / Materials</h3>
            <p style="margin:0;font-size:0.8rem;color:var(--text-muted);">Select items needed — customer approval required. Delivered to job site in 30–60 min.</p>
          </div>
        </div>

        <div id="parts-catalog-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-bottom:16px;max-height:280px;overflow-y:auto;padding-right:4px;">
          ${relevantParts.map(part => `
            <label class="parts-catalog-item" data-part-id="${esc(part.id)}" style="
              display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid var(--border-color);
              border-radius:10px;cursor:pointer;background:var(--bg-card);transition:border-color 0.15s;">
              <input type="checkbox" class="part-select-cb" data-part-id="${esc(part.id)}" style="margin-top:3px;accent-color:var(--accent-primary);">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:0.85rem;color:var(--text-primary);line-height:1.3;">${esc(part.name)}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${esc(part.brand)} · ${esc(part.unit)}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                  <span style="font-weight:700;color:var(--accent-primary);font-size:0.9rem;">₹${part.unitPrice}</span>
                  <span style="font-size:0.72rem;color:var(--text-muted);background:var(--bg-secondary);padding:2px 7px;border-radius:999px;">
                    <i data-lucide="truck" style="width:11px;height:11px;vertical-align:-2px;"></i> ${esc(part.eta)}
                  </span>
                </div>
              </div>
            </label>
          `).join('')}
        </div>

        <!-- Selected items qty editor -->
        <div id="parts-selected-editor" style="display:none;margin-bottom:14px;border:1.5px solid var(--border-color);border-radius:10px;overflow:hidden;">
          <div style="padding:10px 14px;background:var(--bg-secondary);font-weight:700;font-size:0.82rem;color:var(--text-secondary);">SELECTED ITEMS</div>
          <div id="parts-selected-list" style="padding:10px 14px;display:flex;flex-direction:column;gap:8px;"></div>
          <div style="padding:10px 14px;border-top:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.85rem;color:var(--text-muted);">Total parts cost</span>
            <span id="parts-total-display" style="font-weight:800;font-size:1.1rem;color:var(--text-primary);">₹0</span>
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <label class="form-label">Note to customer (optional)</label>
          <textarea id="parts-note-input" class="form-control" rows="2" placeholder="e.g. The existing valve is corroded, need a replacement to complete the repair safely."></textarea>
        </div>

        <button class="btn btn-primary" id="parts-submit-btn" disabled style="width:100%;">
          <i data-lucide="send" class="lucide-xs"></i> Send Parts Request to Customer
        </button>
      </div>
    `;
  },

  renderExistingRequests(bookingId) {
    const requests = MaterialSourcingService.getRequestsForBooking(bookingId);
    if (!requests.length) return '';

    return `
      <div class="dash-card" style="max-width:720px;margin-top:16px;">
        <h3 style="font-size:1rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
          <i data-lucide="list-ordered" class="lucide-sm" style="color:var(--accent-primary);"></i>
          Parts Requests for This Job
        </h3>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${requests.map(req => this._renderRequestCard(req)).join('')}
        </div>
      </div>
    `;
  },

  _renderRequestCard(req) {
    const cfg = PART_STATUS_CONFIG[req.status] || PART_STATUS_CONFIG.pending_approval;
    const timeAgo = this._timeAgo(req.createdAt);
    return `
      <div class="parts-req-card" data-req-id="${esc(req.id)}" style="
        border:1.5px solid var(--border-color);border-radius:10px;padding:12px 14px;
        background:var(--bg-card);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <span style="font-weight:700;font-size:0.85rem;color:var(--text-primary);">${esc(req.id.slice(-8).toUpperCase())}</span>
          <span class="badge" style="background:${cfg.bg};color:${cfg.color};font-size:0.75rem;padding:3px 10px;border-radius:999px;">
            <i data-lucide="${cfg.icon}" style="width:11px;height:11px;vertical-align:-2px;"></i> ${cfg.label}
          </span>
        </div>
        <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:6px;">
          ${req.items.map(it => `${esc(it.name)} × ${it.qty}`).join(', ')}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <span style="font-size:0.78rem;color:var(--text-muted);">${timeAgo}</span>
          <span style="font-weight:700;color:var(--accent-primary);">₹${req.totalCost.toLocaleString('en-IN')}</span>
        </div>
        ${req.status === 'delivered' ? `
          <div style="margin-top:10px;">
            <button class="btn btn-sm btn-primary parts-add-invoice-btn" data-req-id="${esc(req.id)}" data-booking-id="${esc(req.bookingId)}">
              <i data-lucide="receipt" class="lucide-xs"></i> Add ₹${req.totalCost} to Invoice
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },

  attachEvents(container, booking, worker) {
    const grid = container.querySelector('#parts-catalog-grid');
    const submitBtn = container.querySelector('#parts-submit-btn');
    const selectedEditor = container.querySelector('#parts-selected-editor');
    const selectedList = container.querySelector('#parts-selected-list');
    const totalDisplay = container.querySelector('#parts-total-display');
    const noteInput = container.querySelector('#parts-note-input');

    if (!grid || !submitBtn) return;

    let selectedParts = {}; // { partId: qty }

    const updateSelected = () => {
      const checks = grid.querySelectorAll('.part-select-cb:checked');
      selectedParts = {};
      checks.forEach(cb => {
        const pid = cb.getAttribute('data-part-id');
        selectedParts[pid] = selectedParts[pid] || 1;
      });

      const hasAny = Object.keys(selectedParts).length > 0;
      submitBtn.disabled = !hasAny;
      selectedEditor.style.display = hasAny ? '' : 'none';

      if (hasAny) {
        let total = 0;
        selectedList.innerHTML = Object.entries(selectedParts).map(([pid, qty]) => {
          const part = PARTS_CATALOG.find(p => p.id === pid);
          if (!part) return '';
          total += part.unitPrice * qty;
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <span style="font-size:0.85rem;flex:1;">${esc(part.name)}</span>
              <div style="display:flex;align-items:center;gap:6px;">
                <button class="btn btn-outline btn-xs parts-qty-dec" data-pid="${esc(pid)}">−</button>
                <span style="min-width:24px;text-align:center;font-weight:700;" id="qty-${esc(pid)}">${qty}</span>
                <button class="btn btn-outline btn-xs parts-qty-inc" data-pid="${esc(pid)}">+</button>
                <span style="font-size:0.85rem;color:var(--text-muted);min-width:60px;text-align:right;">₹${(part.unitPrice * qty).toLocaleString('en-IN')}</span>
              </div>
            </div>
          `;
        }).join('');
        totalDisplay.textContent = `₹${total.toLocaleString('en-IN')}`;

        // Qty buttons
        selectedList.querySelectorAll('.parts-qty-inc').forEach(btn => {
          btn.onclick = () => {
            const pid = btn.getAttribute('data-pid');
            selectedParts[pid] = (selectedParts[pid] || 1) + 1;
            updateSelected();
          };
        });
        selectedList.querySelectorAll('.parts-qty-dec').forEach(btn => {
          btn.onclick = () => {
            const pid = btn.getAttribute('data-pid');
            selectedParts[pid] = Math.max(1, (selectedParts[pid] || 1) - 1);
            updateSelected();
          };
        });
      }
    };

    // Checkbox highlight
    grid.querySelectorAll('.part-select-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const lbl = cb.closest('.parts-catalog-item');
        if (lbl) lbl.style.borderColor = cb.checked ? 'var(--accent-primary)' : 'var(--border-color)';
        updateSelected();
      });
    });

    // Submit
    submitBtn.addEventListener('click', () => {
      const items = Object.entries(selectedParts).map(([pid, qty]) => {
        const part = PARTS_CATALOG.find(p => p.id === pid);
        return { partId: pid, name: part.name, qty, unitPrice: part.unitPrice, unit: part.unit };
      });
      const req = MaterialSourcingService.createRequest({
        bookingId: booking.id,
        workerId: worker?.id || 'w1',
        workerName: worker?.name || 'Worker',
        items,
        deliveryAddress: booking.address || 'Job site address',
        note: noteInput?.value || '',
      });

      Toast.show(`Parts request sent! Customer will approve. ETA ~${Math.max(...items.map(it => { const p = PARTS_CATALOG.find(c => c.id === it.partId); return p ? parseInt(p.eta) : 40; }))} min after approval.`, 'success', 5000);

      // Re-render panel
      const panel = container.querySelector('#parts-request-panel');
      if (panel) {
        const existingSection = container.querySelector('.parts-existing-section');
        if (existingSection) {
          existingSection.innerHTML = this.renderExistingRequests(booking.id);
          if (typeof window.refreshIcons === 'function') window.refreshIcons();
        }
      }
    });

    // Add-to-invoice buttons (in existing requests)
    container.querySelectorAll('.parts-add-invoice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const reqId = btn.getAttribute('data-req-id');
        const bkId = btn.getAttribute('data-booking-id');
        const ok = MaterialSourcingService.addToInvoice(reqId, bkId);
        if (ok) {
          Toast.show('Parts cost added to job invoice!', 'success');
          btn.closest('.parts-req-card').querySelector('.badge').textContent = 'Added to Invoice';
          btn.remove();
        }
      });
    });
  },

  _timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  },
};

// ─── Customer UI: Parts Approval Panel ───────────────────────────────────────
export const CustomerPartsPanel = {

  renderForBooking(bookingId) {
    const requests = MaterialSourcingService.getRequestsForBooking(bookingId);
    if (!requests.length) return '';

    const pending = requests.filter(r => r.status === 'pending_approval');
    const others  = requests.filter(r => r.status !== 'pending_approval');

    return `
      <div class="parts-customer-panel" style="margin-top:16px;">
        ${pending.length > 0 ? `
          <div style="border:2px solid #d97706;border-radius:12px;padding:16px;background:#fffbeb;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
              <i data-lucide="package" style="width:20px;height:20px;color:#d97706;"></i>
              <strong style="color:#92400e;font-size:0.95rem;">Worker Requesting Parts (${pending.length})</strong>
            </div>
            ${pending.map(req => this._renderApprovalCard(req)).join('')}
          </div>
        ` : ''}

        ${others.length > 0 ? `
          <div style="border:1.5px solid var(--border-color);border-radius:12px;overflow:hidden;">
            <div style="padding:10px 14px;background:var(--bg-secondary);font-weight:700;font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Parts History</div>
            <div style="padding:10px 14px;display:flex;flex-direction:column;gap:8px;">
              ${others.map(req => this._renderHistoryCard(req)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  _renderApprovalCard(req) {
    const totalFormatted = `₹${req.totalCost.toLocaleString('en-IN')}`;
    return `
      <div class="parts-approval-card" data-req-id="${esc(req.id)}" style="background:#fff;border:1.5px solid #fcd34d;border-radius:10px;padding:12px 14px;margin-bottom:10px;">
        <div style="margin-bottom:10px;">
          ${req.items.map(it => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #fef3c7;font-size:0.85rem;">
              <span style="color:#78350f;">${esc(it.name)} × <strong>${it.qty}</strong> ${esc(it.unit)}</span>
              <span style="font-weight:700;color:#92400e;">₹${(it.unitPrice * it.qty).toLocaleString('en-IN')}</span>
            </div>
          `).join('')}
          ${req.note ? `<p style="font-size:0.8rem;color:#78350f;margin-top:8px;font-style:italic;">"${esc(req.note)}"</p>` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-weight:800;font-size:1.1rem;color:#92400e;">${totalFormatted}</div>
            <div style="font-size:0.75rem;color:#a16207;">Added to job invoice on approval</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-sm parts-reject-btn" data-req-id="${esc(req.id)}"
              style="border:1.5px solid #dc2626;color:#dc2626;background:#fff;border-radius:8px;padding:6px 14px;font-weight:600;cursor:pointer;">
              Reject
            </button>
            <button class="btn btn-sm parts-approve-btn" data-req-id="${esc(req.id)}"
              style="background:#059669;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-weight:600;cursor:pointer;">
              <i data-lucide="check" style="width:14px;height:14px;vertical-align:-2px;"></i> Approve & Order
            </button>
          </div>
        </div>
      </div>
    `;
  },

  _renderHistoryCard(req) {
    const cfg = PART_STATUS_CONFIG[req.status] || PART_STATUS_CONFIG.pending_approval;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-color);">
        <div>
          <div style="font-size:0.85rem;font-weight:600;color:var(--text-primary);">${req.items.map(i => `${esc(i.name)} ×${i.qty}`).join(', ')}</div>
          <span class="badge" style="background:${cfg.bg};color:${cfg.color};font-size:0.72rem;padding:2px 8px;border-radius:999px;margin-top:4px;display:inline-block;">
            ${cfg.label}
          </span>
        </div>
        <span style="font-weight:700;color:var(--text-primary);">₹${req.totalCost.toLocaleString('en-IN')}</span>
      </div>
    `;
  },

  attachEvents(container, onUpdate) {
    container.querySelectorAll('.parts-approve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const reqId = btn.getAttribute('data-req-id');
        const updated = MaterialSourcingService.updateStatus(reqId, 'approved');
        Toast.show('Parts approved! Delivery in progress...', 'success');

        // Simulate delivery pipeline
        MaterialSourcingService.simulateDelivery(reqId, (upd) => {
          if (upd.status === 'delivered') {
            Toast.show('🎉 Parts delivered to job site!', 'success', 5000);
          }
          if (onUpdate) onUpdate();
        });

        if (onUpdate) onUpdate();
      });
    });

    container.querySelectorAll('.parts-reject-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const reqId = btn.getAttribute('data-req-id');
        MaterialSourcingService.rejectRequest(reqId);
        Toast.show('Parts request rejected.', 'info');
        if (onUpdate) onUpdate();
      });
    });
  },
};
