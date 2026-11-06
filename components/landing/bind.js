import { prefersReducedMotion } from '../../animations/motion.js';
import { StorageService } from '../../storage.js';

let gPending = false;
let gTimer = 0;
let landingAbort = null;

function openShortcuts(root) {
  const b = root.querySelector('#shortcuts-backdrop');
  if (b) { b.hidden = false; b.querySelector('#shortcuts-close')?.focus(); }
}
function closeShortcuts(root) {
  const b = root.querySelector('#shortcuts-backdrop');
  if (b) b.hidden = true;
}

export function bindLanding(root, { onCategory, onThemeToggle, onGetStarted, onSignin, onDemo }) {
  if (landingAbort) landingAbort.abort();
  landingAbort = new AbortController();
  const { signal } = landingAbort;

  try {
    if (sessionStorage.getItem('lk_announce_dismissed') === '1') {
      root.querySelector('#announce-bar')?.remove();
      document.body.classList.add('ann-dismissed');
    }
  } catch (e) {}

  root.querySelector('#announce-close')?.addEventListener('click', () => {
    root.querySelector('#announce-bar')?.remove();
    document.body.classList.add('ann-dismissed');
    try { sessionStorage.setItem('lk_announce_dismissed', '1'); } catch (e) {}
  }, { signal });

  const menus = root.querySelectorAll('.nav-menu-btn');
  const closeAll = () => menus.forEach(b => { b.setAttribute('aria-expanded', 'false'); b.parentElement?.classList.remove('is-open'); });
  menus.forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = btn.parentElement;
    const was = item.classList.contains('is-open');
    closeAll();
    if (!was) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
  }, { signal }));
  document.addEventListener('click', closeAll, { signal });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAll(); closeShortcuts(root); }
    if (e.shiftKey && e.key === '?') { openShortcuts(root); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
    const k = e.key.toLowerCase();
    if (k === 'g') { gPending = true; clearTimeout(gTimer); gTimer = setTimeout(() => { gPending = false; }, 900); return; }
    if (gPending && k === 'h') { window.scrollTo({ top: 0, behavior: 'smooth' }); gPending = false; }
    if (gPending && k === 'p') { document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }); gPending = false; }
  }, { signal });
  root.querySelector('#shortcuts-close')?.addEventListener('click', () => closeShortcuts(root), { signal });
  root.querySelector('#shortcuts-backdrop')?.addEventListener('click', (e) => { if (e.target.id === 'shortcuts-backdrop') closeShortcuts(root); }, { signal });

  const goHome = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const logo = root.querySelector('#nav-home-logo');
  logo?.addEventListener('click', goHome, { signal });
  logo?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); }
  }, { signal });
  root.querySelector('#nav-signin-btn')?.addEventListener('click', onSignin, { signal });
  root.querySelector('#get-started-btn')?.addEventListener('click', onGetStarted, { signal });
  root.querySelector('#hero-find-pro-btn')?.addEventListener('click', onGetStarted, { signal });
  root.querySelector('#sp-cta-btn')?.addEventListener('click', onGetStarted, { signal });
  root.querySelector('#essential-cta')?.addEventListener('click', () => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }), { signal });
  root.querySelector('#cta-find-pro-btn')?.addEventListener('click', onGetStarted, { signal });
  root.querySelector('#cta-demo-btn')?.addEventListener('click', onDemo || onGetStarted, { signal });
  root.querySelector('#cta-explore-btn')?.addEventListener('click', () => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }), { signal });
  root.querySelector('#hero-explore-btn')?.addEventListener('click', () => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }), { signal });
  root.querySelector('#theme-toggle-btn')?.addEventListener('click', onThemeToggle, { signal });

  root.querySelectorAll('[data-locality]').forEach(chip => chip.addEventListener('click', () => {
    root.querySelectorAll('[data-locality]').forEach(c => { c.classList.remove('is-active'); c.setAttribute('aria-pressed', 'false'); });
    chip.classList.add('is-active'); chip.setAttribute('aria-pressed', 'true');
    try { StorageService.setCustomerLocality(chip.dataset.locality); } catch (e) {}
    const label = root.querySelector('#locality-current');
    if (label) label.textContent = chip.textContent.trim();
  }, { signal }));
  try {
    const saved = StorageService.getCustomerLocality();
    const savedChip = root.querySelector(`[data-locality="${saved}"]`);
    if (savedChip) {
      savedChip.classList.add('is-active');
      savedChip.setAttribute('aria-pressed', 'true');
      const label = root.querySelector('#locality-current');
      if (label) label.textContent = savedChip.textContent.trim();
    }
  } catch (e) {}

  root.querySelectorAll('[data-category]').forEach(el => el.addEventListener('click', () => onCategory(el.getAttribute('data-category')), { signal }));

  const tabWrap = root.querySelector('[data-tabs]');
  if (tabWrap) {
    const tabs = Array.from(tabWrap.querySelectorAll('[role="tab"]'));
    const panels = Array.from(tabWrap.querySelectorAll('.lk-tabpanel'));
    let idx = 0; let timer = 0; let interacted = false;
    const show = (i) => {
      idx = (i + tabs.length) % tabs.length;
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === idx)); t.classList.toggle('is-active', j === idx); });
      panels.forEach((p, j) => { p.classList.toggle('is-active', j === idx); p.hidden = j !== idx; });
      tabs.forEach((t, j) => { const bar = t.querySelector('.lk-tab-progress span'); if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = j === idx ? `lk-tab-prog 5s linear forwards` : 'none'; } });
    };
    const autoplay = () => { if (interacted || prefersReducedMotion()) return; timer = setInterval(() => show(idx + 1), 5000); };
    tabs.forEach((t, i) => t.addEventListener('click', () => { interacted = true; clearInterval(timer); show(i); }, { signal }));
    tabWrap.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      interacted = true; clearInterval(timer);
      show(idx + (e.key === 'ArrowRight' ? 1 : -1));
      tabs[idx].focus(); e.preventDefault();
    }, { signal });
    autoplay();
    signal.addEventListener('abort', () => clearInterval(timer));
  }

  root.querySelectorAll('[data-filter]').forEach(chip => chip.addEventListener('click', () => {
    root.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    const f = chip.dataset.filter;
    root.querySelectorAll('.lk-logo').forEach(el => { el.hidden = f !== 'all' && el.dataset.group !== f; });
  }, { signal }));

  const car = root.querySelector('[data-carousel]');
  if (car) {
    const track = car.querySelector('.lk-track');
    const slides = Array.from(track.children);
    const dots = Array.from(car.querySelectorAll('[data-dot]'));
    let ci = 0;
    const go = (i) => { ci = (i + slides.length) % slides.length; track.style.transform = `translateX(-${ci * 100}%)`; dots.forEach((d, j) => d.classList.toggle('is-active', j === ci)); };
    car.querySelector('[data-prev]')?.addEventListener('click', () => go(ci - 1), { signal });
    car.querySelector('[data-next]')?.addEventListener('click', () => go(ci + 1), { signal });
    dots.forEach(d => d.addEventListener('click', () => go(Number(d.dataset.dot)), { signal }));
    let sx = 0;
    car.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true, signal });
    car.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(ci + (dx < 0 ? 1 : -1)); }, { passive: true, signal });
  }

  root.querySelectorAll('[data-faq]').forEach(faq => {
    const items = Array.from(faq.querySelectorAll('.settings-faq'));
    items.forEach(item => item.querySelector('.lk-faq-q')?.addEventListener('click', () => {
      const panel = item.querySelector('.lk-faq-a');
      const btn = item.querySelector('.lk-faq-q');
      if (!btn || !panel) return;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      items.forEach(it => {
        it.querySelector('.lk-faq-q')?.setAttribute('aria-expanded', 'false');
        const a = it.querySelector('.lk-faq-a');
        if (a) a.hidden = true;
      });
      if (!isOpen) { btn.setAttribute('aria-expanded', 'true'); panel.hidden = false; }
    }, { signal }));
  });
}
