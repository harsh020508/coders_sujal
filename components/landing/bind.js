// components/landing/bind.js — all landing interactions in one place.
import { prefersReducedMotion } from '../../animations/motion.js';

let gPending = false;
let gTimer = 0;

function openShortcuts(root) {
  const b = root.querySelector('#shortcuts-backdrop');
  if (b) { b.hidden = false; b.querySelector('#shortcuts-close')?.focus(); }
}
function closeShortcuts(root) {
  const b = root.querySelector('#shortcuts-backdrop');
  if (b) b.hidden = true;
}

export function bindLanding(root, { onCategory, onThemeToggle, onGetStarted, onSignin, onDemo }) {
  // Announcement dismiss
  root.querySelector('#announce-close')?.addEventListener('click', () => {
    root.querySelector('#announce-bar')?.remove();
    document.body.classList.add('ann-dismissed');
  });

  // Mega menus: click + Escape + outside; hover via CSS for fine pointers.
  const menus = root.querySelectorAll('.nav-menu-btn');
  const closeAll = () => menus.forEach(b => { b.setAttribute('aria-expanded', 'false'); b.parentElement?.classList.remove('is-open'); });
  menus.forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = btn.parentElement;
    const was = item.classList.contains('is-open');
    closeAll();
    if (!was) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    btn.parentElement.querySelectorAll('.mega a')?.forEach(a => a.addEventListener('click', closeAll, { once: true }));
  }));
  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAll(); closeShortcuts(root); }
    // Shortcuts: g then h / g then p, Shift+? cheatsheet.
    if (e.shiftKey && e.key === '?') { openShortcuts(root); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
    const k = e.key.toLowerCase();
    if (k === 'g') { gPending = true; clearTimeout(gTimer); gTimer = setTimeout(() => { gPending = false; }, 900); return; }
    if (gPending && k === 'h') { window.location.hash = ''; document.documentElement.scrollTo ? window.scrollTo({ top: 0, behavior: 'smooth' }) : window.scrollTo(0, 0); gPending = false; }
    if (gPending && k === 'p') { document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }); gPending = false; }
  });
  root.querySelector('#shortcuts-close')?.addEventListener('click', () => closeShortcuts(root));
  root.querySelector('#shortcuts-backdrop')?.addEventListener('click', (e) => { if (e.target.id === 'shortcuts-backdrop') closeShortcuts(root); });

  // Existing landing buttons
  root.querySelector('#nav-home-logo')?.addEventListener('click', () => window.location.hash = '');
  root.querySelector('#nav-signin-btn')?.addEventListener('click', onSignin);
  root.querySelector('#get-started-btn')?.addEventListener('click', onGetStarted);
  root.querySelector('#hero-find-pro-btn')?.addEventListener('click', onGetStarted);
  root.querySelector('#sp-cta-btn')?.addEventListener('click', onGetStarted);
  root.querySelector('#cta-find-pro-btn')?.addEventListener('click', onGetStarted);
  root.querySelector('#cta-demo-btn')?.addEventListener('click', onDemo || onGetStarted);
  root.querySelector('#hero-explore-btn')?.addEventListener('click', () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }));
  root.querySelector('#theme-toggle-btn')?.addEventListener('click', onThemeToggle);
  root.querySelector('#mobile-theme-toggle-btn')?.addEventListener('click', onThemeToggle);

  // Category pills + tiles
  root.querySelectorAll('[data-category]').forEach(el => el.addEventListener('click', () => onCategory(el.getAttribute('data-category'))));

  // Tabs: cross-fade + auto-advance with progress until interact.
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
    tabs.forEach((t, i) => t.addEventListener('click', () => { interacted = true; clearInterval(timer); show(i); }));
    tabWrap.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      interacted = true; clearInterval(timer);
      show(idx + (e.key === 'ArrowRight' ? 1 : -1));
      tabs[idx].focus(); e.preventDefault();
    });
    autoplay();
  }

  // Integrations filter chips
  const ft = root.querySelector('[data-marquee]');
  root.querySelectorAll('[data-filter]').forEach(chip => chip.addEventListener('click', () => {
    root.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    const f = chip.dataset.filter;
    root.querySelectorAll('.lk-logo').forEach(el => { el.hidden = f !== 'all' && el.dataset.group !== f; });
  }));

  // Testimonials carousel: arrows + dots + swipe.
  const car = root.querySelector('[data-carousel]');
  if (car) {
    const track = car.querySelector('.lk-track');
    const slides = Array.from(track.children);
    const dots = Array.from(car.querySelectorAll('[data-dot]'));
    let ci = 0;
    const go = (i) => { ci = (i + slides.length) % slides.length; track.style.transform = `translateX(-${ci * 100}%)`; dots.forEach((d, j) => d.classList.toggle('is-active', j === ci)); };
    car.querySelector('[data-prev]')?.addEventListener('click', () => go(ci - 1));
    car.querySelector('[data-next]')?.addEventListener('click', () => go(ci + 1));
    dots.forEach(d => d.addEventListener('click', () => go(Number(d.dataset.dot))));
    let sx = 0;
    car.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    car.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(ci + (dx < 0 ? 1 : -1)); }, { passive: true });
  }

  // FAQ accordion: one open at a time.
  root.querySelectorAll('[data-faq]').forEach(faq => {
    const items = Array.from(faq.querySelectorAll('.settings-faq'));
    items.forEach(item => item.querySelector('.lk-faq-q')?.addEventListener('click', () => {
      const open = item.querySelector('.settings-faq') && item.hasAttribute?.('open');
      const panel = item.querySelector('.lk-faq-a');
      const btn = item.querySelector('.lk-faq-q');
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      items.forEach(it => { it.querySelector('.lk-faq-q').setAttribute('aria-expanded', 'false'); it.querySelector('.lk-faq-a').hidden = true; });
      if (!isOpen) { btn.setAttribute('aria-expanded', 'true'); panel.hidden = false; }
    }));
  });

  return { /* keep hook for app.js */ };
}
