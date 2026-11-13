import { StorageService } from '../../storage.js';
import { initLandingMotion } from './motion.js';

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

  // Initialize Apple-grade fluid motion & interactive physics
  try {
    initLandingMotion(root, { signal });
  } catch (err) {
    console.warn('[Motion] Landing motion initialization note:', err);
  }

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
  root.querySelector('#essential-cta')?.addEventListener('click', () => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }), { signal });
  root.querySelector('#cta-find-pro-btn')?.addEventListener('click', onGetStarted, { signal });
  root.querySelector('#cta-demo-btn')?.addEventListener('click', onDemo || onGetStarted, { signal });
  root.querySelector('#cta-explore-btn')?.addEventListener('click', () => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }), { signal });
  root.querySelector('#hero-explore-btn')?.addEventListener('click', () => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }), { signal });
  root.querySelector('#theme-toggle-btn')?.addEventListener('click', () => {
    if (document.startViewTransition) document.startViewTransition(() => onThemeToggle());
    else onThemeToggle();
  }, { signal });
  root.querySelectorAll('#landing-lang-picker, #mobile-landing-lang-picker').forEach(el => {
    el.addEventListener('change', (e) => {
      import('../../i18n.js').then(({ i18n }) => i18n.setLanguage(e.target.value));
    }, { signal });
  });

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

  const categoryCards = root.querySelectorAll('[data-category]');
  categoryCards.forEach(el => {
    const go = () => onCategory(el.getAttribute('data-category'));
    el.addEventListener('click', go, { signal });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    }, { signal });
  });

  root.querySelectorAll('[data-faq]').forEach(faq => {
    const items = Array.from(faq.querySelectorAll('.lk-faq-item'));
    items.forEach(item => item.querySelector('.lk-faq-q')?.addEventListener('click', () => {
      const panel = item.querySelector('.lk-faq-a');
      const btn = item.querySelector('.lk-faq-q');
      if (!btn || !panel) return;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      items.forEach(it => {
        it.querySelector('.lk-faq-q')?.setAttribute('aria-expanded', 'false');
        it.classList.remove('is-open');
        const a = it.querySelector('.lk-faq-a');
        if (a) a.hidden = true;
      });
      if (!isOpen) { btn.setAttribute('aria-expanded', 'true'); item.classList.add('is-open'); panel.hidden = false; }
    }, { signal }));
  });
}
