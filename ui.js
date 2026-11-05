// ui.js
export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

export const icon = (name, size = 20, cls = '') =>
  `<i data-lucide="${esc(name)}" class="ui-icon ${cls}" width="${size}" height="${size}" aria-hidden="true"></i>`;

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

// Avatar: initials sit underneath; if the photo fails or is absent, initials show. Verified gets the ring + seal.
export function avatar(worker, size = 56) {
  const verified = worker.verificationStatus === 'Verified';
  return `<span class="ui-avatar ${verified ? 'ui-avatar--verified' : ''}" style="--size:${size}px">
    ${esc(initials(worker.name))}
    ${worker.avatar ? `<img src="${esc(worker.avatar)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
    ${verified ? `<span class="ui-avatar__seal" title="Verified">${icon('check', 12)}</span>` : ''}
  </span>`;
}

export const rating = (avg, count) =>
  `<span class="ui-rating" aria-label="Rated ${esc(avg)} out of 5 from ${esc(count)} reviews">${icon('star', 14)}<strong>${Number(avg || 0).toFixed(1)}</strong><span class="ui-muted">(${esc(count || 0)})</span></span>`;

const STATUS = {
  Verified: ['ok', 'badge-check', 'Verified'],
  Pending:  ['warn', 'clock', 'Verification pending'],
  Rejected: ['bad', 'x', 'Not verified'],
};
export function statusBadge(status = '') {
  const [tone, ic, label] = STATUS[status] || ['neutral', 'info', status || 'Unverified'];
  return `<span class="ui-badge ui-badge--${tone}">${icon(ic, 14)}${esc(label)}</span>`;
}

// Category image that degrades to a gradient (the tile already has a gradient background)
export const catImage = (cat) =>
  cat.image ? `<img src="${esc(cat.image)}" alt="" width="600" height="400" loading="lazy" decoding="async" onerror="this.remove()">` : '';

// Skeletons: size them like the real thing to avoid layout shift
export const skeletonCards = (n = 6) =>
  Array.from({ length: n }, () => `<div class="ui-card ui-card--pad ui-stack" aria-hidden="true">
    <div class="ui-row"><div class="ui-skel" style="width:56px;height:56px;border-radius:50%"></div>
    <div style="flex:1;display:grid;gap:8px"><div class="ui-skel" style="height:16px;width:60%"></div><div class="ui-skel" style="height:12px;width:40%"></div></div></div>
    <div class="ui-skel" style="height:12px"></div><div class="ui-skel" style="height:36px"></div></div>`).join('');

export const emptyState = ({ iconName = 'search-x', title, text, actionHtml = '' }) =>
  `<div class="ui-empty">
    <div class="ui-empty__icon">${icon(iconName, 24)}</div>
    <h3>${esc(title)}</h3><p>${esc(text)}</p>${actionHtml}
  </div>`;

// Task search over the existing data (no new data needed)
export function buildTaskIndex(categories = []) {
  return categories.flatMap(c => (c.subcategories || []).map(task => ({ task, categoryId: c.id, categoryName: c.name })));
}
export function searchTasks(index, q, limit = 6) {
  const s = (q || '').trim().toLowerCase();
  if (s.length < 2) return [];
  return index.filter(x => x.task.toLowerCase().includes(s) || x.categoryName.toLowerCase().includes(s)).slice(0, limit);
}

// Modal focus trap. Returns a release() function. Call release() when the modal closes.
export function trapFocus(modal, onClose) {
  const SEL = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  const prev = document.activeElement;
  const onKey = (e) => {
    if (e.key === 'Escape') { onClose?.(); return; }
    if (e.key !== 'Tab') return;
    const f = [...modal.querySelectorAll(SEL)].filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey);
  (modal.querySelector('[autofocus]') || modal.querySelector(SEL))?.focus();
  return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
}

// Button loading state: await withLoading(btn, () => doThing())
export async function withLoading(btn, fn) {
  btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
  try { return await fn(); } finally { btn.removeAttribute('aria-busy'); btn.disabled = false; }
}
