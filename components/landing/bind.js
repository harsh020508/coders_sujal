import { StorageService } from '../../storage.js';
import { initLandingMotion } from './motion.js';
import { T } from './data.js';

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

function refreshIconsSafely() {
  if (typeof window !== 'undefined') {
    if (typeof window.refreshIcons === 'function') {
      window.refreshIcons();
    } else if (typeof window.lucide?.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
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

  // 1. Announcement Bar
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

  // 2. Navigation Mega Menus & Keyboard Shortcuts
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
  root.querySelector('#shortcuts-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'shortcuts-backdrop') closeShortcuts(root);
  }, { signal });

  // 3. Navigation & Core CTAs
  const goHome = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const logo = root.querySelector('#nav-home-logo');
  logo?.addEventListener('click', goHome, { signal });
  logo?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); }
  }, { signal });

  root.querySelector('#nav-signin-btn')?.addEventListener('click', onSignin, { signal });
  root.querySelector('#get-started-btn')?.addEventListener('click', onGetStarted, { signal });
  root.querySelector('#hero-find-pro-btn')?.addEventListener('click', onGetStarted, { signal });
  root.querySelector('#hero-explore-btn')?.addEventListener('click', () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  }, { signal });
  root.querySelector('#essential-cta')?.addEventListener('click', () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  }, { signal });
  root.querySelector('#cta-find-pro-btn')?.addEventListener('click', onGetStarted, { signal });
  root.querySelector('#cta-demo-btn')?.addEventListener('click', onDemo || onGetStarted, { signal });
  root.querySelector('#cta-explore-btn')?.addEventListener('click', () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  }, { signal });

  const handleThemeToggle = () => {
    if (document.startViewTransition) document.startViewTransition(() => onThemeToggle());
    else onThemeToggle();
  };
  root.querySelector('#theme-toggle-btn')?.addEventListener('click', handleThemeToggle, { signal });

  root.querySelectorAll('#landing-lang-picker, #mobile-landing-lang-picker').forEach(el => {
    el.addEventListener('change', (e) => {
      import('../../i18n.js').then(({ i18n }) => i18n.setLanguage(e.target.value));
    }, { signal });
  });

  // 4. Hero Card Book Action
  const heroBookBtn = root.querySelector('#hero-card-book-btn');
  heroBookBtn?.addEventListener('click', () => {
    const cat = heroBookBtn.dataset.heroCategory || 'plumber';
    onCategory(cat);
  }, { signal });

  // 5. How It Works Step Tabs
  const howCards = Array.from(root.querySelectorAll('#how-it-works .lk-step-card[data-how-step]'));
  if (howCards.length > 0) {
    const activateHowStep = (index) => {
      howCards.forEach((card, i) => {
        const active = i === index;
        card.classList.toggle('is-active', active);
        card.setAttribute('aria-selected', active ? 'true' : 'false');

        const preview = root.querySelector(`#how-preview-${i}`);
        if (preview) {
          preview.classList.toggle('is-active', active);
          preview.hidden = !active;
        }
      });
    };

    howCards.forEach((card, idx) => {
      card.addEventListener('click', () => activateHowStep(idx), { signal });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateHowStep(idx);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIdx = (idx + 1) % howCards.length;
          howCards[nextIdx]?.focus();
          activateHowStep(nextIdx);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIdx = (idx - 1 + howCards.length) % howCards.length;
          howCards[prevIdx]?.focus();
          activateHowStep(prevIdx);
        }
      }, { signal });
    });
  }

  // 6. Interactive 0% Commission Price Calculator
  const priceRange = root.querySelector('#price-calc-range');
  const presetBtns = root.querySelectorAll('[data-price-preset]');
  const sliderDisplay = root.querySelector('#calc-slider-display');
  const calcAgreed = root.querySelector('#calc-agreed');
  const calcFee = root.querySelector('#calc-fee');
  const calcProReceives = root.querySelector('#calc-pro-receives');
  const calcOtherCut = root.querySelector('#calc-other-cut');

  const updatePriceCalc = (val) => {
    const amount = Number(val);
    const formatted = amount.toLocaleString('en-IN');
    const cut = Math.round(amount * 0.25).toLocaleString('en-IN');

    if (sliderDisplay) sliderDisplay.textContent = `₹${formatted}`;
    if (calcAgreed) calcAgreed.textContent = `₹${formatted}`;
    if (calcFee) calcFee.textContent = '₹0';
    if (calcProReceives) calcProReceives.textContent = `₹${formatted}`;
    if (calcOtherCut) calcOtherCut.textContent = `₹${cut} lost to platform cut`;

    presetBtns.forEach(btn => {
      const isMatch = Number(btn.dataset.pricePreset) === amount;
      btn.classList.toggle('is-active', isMatch);
    });
  };

  if (priceRange) {
    const onRangeInput = () => updatePriceCalc(priceRange.value);
    priceRange.addEventListener('input', onRangeInput, { signal });
    priceRange.addEventListener('change', onRangeInput, { signal });
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.pricePreset;
      if (priceRange) priceRange.value = p;
      updatePriceCalc(p);
    }, { signal });
  });

  // 7. Mumbai Neighbourhood Explorer
  const updateLocalityUI = (localityId) => {
    const d = T.localityDetails[localityId];
    if (!d) return;

    const locCurrent = root.querySelector('#locality-current');
    if (locCurrent) locCurrent.textContent = d.name;

    const locZone = root.querySelector('#locality-zone');
    if (locZone) locZone.textContent = d.zone;

    const locEta = root.querySelector('#locality-eta');
    if (locEta) locEta.textContent = d.eta;

    const locPros = root.querySelector('#locality-pros');
    if (locPros) locPros.textContent = `${d.activePros} active pros`;

    const featPro = root.querySelector('#locality-featured-pro');
    if (featPro) {
      const initials = d.topPro.name.split(' ').map(p => p[0]).join('');
      featPro.innerHTML = `
        <div class="lk-snippet-avatar">${initials}</div>
        <div class="lk-snippet-body">
          <div class="lk-snippet-header">
            <strong>${d.topPro.name}</strong>
            <span class="lk-snippet-rating"><i data-lucide="star" class="lucide-xs"></i> ${d.topPro.rating}</span>
          </div>
          <p class="lk-snippet-details">${d.topPro.trade} · ${d.topPro.jobs} jobs completed in ${d.name}</p>
        </div>
      `;
    }

    const servicesList = root.querySelector('#discovery-services-list');
    if (servicesList) {
      servicesList.innerHTML = d.popular.map(svc => `
        <button type="button" class="lk-discovery-service-btn" data-category="${svc.id}" aria-label="Book ${svc.name} in ${d.name}">
          <span>${svc.name}</span>
          <span class="lk-discovery-rate">${svc.rate}</span>
        </button>
      `).join('');
    }

    refreshIconsSafely();
  };

  root.querySelectorAll('[data-locality]').forEach(chip => {
    chip.addEventListener('click', () => {
      const loc = chip.dataset.locality;
      root.querySelectorAll('[data-locality]').forEach(c => {
        const active = c.dataset.locality === loc;
        c.classList.toggle('is-active', active);
        c.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      try { StorageService.setCustomerLocality(loc); } catch (e) {}
      updateLocalityUI(loc);
    }, { signal });
  });

  try {
    const saved = StorageService.getCustomerLocality();
    if (saved && T.localityDetails[saved]) {
      const savedChip = root.querySelector(`[data-locality="${saved}"]`);
      if (savedChip) {
        root.querySelectorAll('[data-locality]').forEach(c => {
          const active = c.dataset.locality === saved;
          c.classList.toggle('is-active', active);
          c.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      }
      updateLocalityUI(saved);
    }
  } catch (e) {}

  // 8. Event Delegation for All Category Buttons & Cards
  root.addEventListener('click', (e) => {
    const catBtn = e.target.closest('[data-category]');
    if (catBtn && root.contains(catBtn)) {
      const cat = catBtn.getAttribute('data-category');
      if (cat) onCategory(cat);
    }
  }, { signal });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const catBtn = e.target.closest('[data-category]');
      if (catBtn && root.contains(catBtn)) {
        if (catBtn.tagName === 'BUTTON' || catBtn.tagName === 'A') return;
        e.preventDefault();
        const cat = catBtn.getAttribute('data-category');
        if (cat) onCategory(cat);
      }
    }
  }, { signal });

  // 9. FAQ Accordion
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
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        item.classList.add('is-open');
        panel.hidden = false;
      }
    }, { signal }));
  });
}
