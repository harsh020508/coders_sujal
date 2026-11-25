// components/landing/motion.js — Apple-grade 120fps GPU interactions & interactive physics.
// Handles decoupled 3D pointer tilt (.lk-pro-card-tilt), mouse-following spotlight (--mx/--my),
// and pro switcher interactions with zero layout thrashing and full prefers-reduced-motion respect.

import { HERO_PROS } from './Hero.js';

export function initLandingMotion(root, { signal } = {}) {
  if (typeof window === 'undefined' || !root) return () => {};

  const cleanups = [];
  const addListener = (target, event, handler, options = {}) => {
    if (!target) return;
    const opts = { signal, ...options };
    target.addEventListener(event, handler, opts);
    cleanups.push(() => {
      try { target.removeEventListener(event, handler, opts); } catch (e) {}
    });
  };

  // 1. Pro Card 3D Tilt Physics (Decoupled onto .lk-pro-card-tilt)
  const heroVisual = root.querySelector('.lk-hero-visual');
  const tiltTarget = root.querySelector('.lk-pro-card-tilt') || root.querySelector('.lk-pro-card');

  const prefersReduced = Boolean(
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const isFinePointer = Boolean(
    window.matchMedia && window.matchMedia('(pointer: fine)').matches
  );

  if (!prefersReduced && isFinePointer && heroVisual && tiltTarget) {
    let cachedRect = null;
    let targetRotX = 0;
    let targetRotY = 0;
    let currRotX = 0;
    let currRotY = 0;
    let isHovering = false;
    let rafActive = false;

    const updatePhysics = () => {
      if (signal && signal.aborted) return;
      currRotX += (targetRotX - currRotX) * 0.14;
      currRotY += (targetRotY - currRotY) * 0.14;

      tiltTarget.style.transform = `perspective(1000px) rotateX(${currRotX.toFixed(2)}deg) rotateY(${currRotY.toFixed(2)}deg)`;

      if (isHovering || Math.abs(currRotX) > 0.05 || Math.abs(currRotY) > 0.05) {
        requestAnimationFrame(updatePhysics);
      } else {
        tiltTarget.style.transform = '';
        rafActive = false;
      }
    };

    const onMouseEnter = () => {
      isHovering = true;
      cachedRect = tiltTarget.getBoundingClientRect();
      if (!rafActive) {
        rafActive = true;
        requestAnimationFrame(updatePhysics);
      }
    };

    const onMouseMove = (e) => {
      if (!cachedRect) cachedRect = tiltTarget.getBoundingClientRect();
      const cx = cachedRect.left + cachedRect.width / 2;
      const cy = cachedRect.top + cachedRect.height / 2;
      const nx = (e.clientX - cx) / (cachedRect.width / 2);
      const ny = (e.clientY - cy) / (cachedRect.height / 2);

      targetRotY = Math.max(-7, Math.min(7, nx * 6));
      targetRotX = Math.max(-7, Math.min(7, -ny * 6));
    };

    const onMouseLeave = () => {
      isHovering = false;
      targetRotX = 0;
      targetRotY = 0;
      cachedRect = null;
    };

    addListener(heroVisual, 'mouseenter', onMouseEnter);
    addListener(heroVisual, 'mousemove', onMouseMove, { passive: true });
    addListener(heroVisual, 'mouseleave', onMouseLeave);

    cleanups.push(() => {
      isHovering = false;
      tiltTarget.style.transform = '';
    });
  }

  // 2. Mouse-Following Spotlight Variables (--mx, --my) on .lk-card-spotlight Cards
  if (!prefersReduced && isFinePointer) {
    const spotlightCards = root.querySelectorAll(
      '.lk-card-spotlight, .lk-service-card, .lk-feature-card, .lk-step-card, .lk-quote, .lk-price-card, .lk-pro-card'
    );

    spotlightCards.forEach((card) => {
      let cardRect = null;
      let scheduled = false;
      let lastX = 0;
      let lastY = 0;

      const onCardEnter = () => {
        cardRect = card.getBoundingClientRect();
        card.style.setProperty('--spotlight-opacity', '1');
      };

      const onCardMove = (e) => {
        if (!cardRect) cardRect = card.getBoundingClientRect();
        lastX = e.clientX - cardRect.left;
        lastY = e.clientY - cardRect.top;

        if (!scheduled) {
          scheduled = true;
          requestAnimationFrame(() => {
            scheduled = false;
            card.style.setProperty('--mx', `${lastX.toFixed(1)}px`);
            card.style.setProperty('--my', `${lastY.toFixed(1)}px`);
          });
        }
      };

      const onCardLeave = () => {
        cardRect = null;
        card.style.setProperty('--spotlight-opacity', '0');
      };

      addListener(card, 'pointerenter', onCardEnter);
      addListener(card, 'pointermove', onCardMove, { passive: true });
      addListener(card, 'pointerleave', onCardLeave);

      cleanups.push(() => {
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
        card.style.removeProperty('--spotlight-opacity');
      });
    });
  }

  // 3. Hero Pro Showcase Tab Switcher (data-hero-pro="0|1|2")
  const proTabs = root.querySelectorAll('[data-hero-pro]');
  if (proTabs.length > 0) {
    const cardEl = root.querySelector('#hero-pro-card');
    const avatarEl = root.querySelector('#hero-pro-avatar');
    const nameEl = root.querySelector('#hero-pro-name');
    const metaEl = root.querySelector('#hero-pro-meta');
    const ratingEl = root.querySelector('#hero-pro-rating');
    const jobsEl = root.querySelector('#hero-pro-jobs');
    const priceEl = root.querySelector('#hero-pro-price');
    const etaEl = root.querySelector('#hero-pro-eta');
    const slotEl = root.querySelector('#hero-pro-slot');
    const statusEl = root.querySelector('#hero-pro-status');
    const substatusEl = root.querySelector('#hero-pro-substatus');
    const negoTextEl = root.querySelector('#hero-nego-text');
    const metaTextEl = root.querySelector('#hero-meta-text');
    const etaTextEl = root.querySelector('#hero-eta-text');
    const badgeTextEl = root.querySelector('#hero-badge-text');
    const bookBtnEl = root.querySelector('#hero-card-book-btn');
    const areaStatsEl = root.querySelector('#hero-pro-areastats');

    const switchPro = (targetIdx) => {
      const pro = HERO_PROS[targetIdx];
      if (!pro) return;

      proTabs.forEach((tab) => {
        const isMatch = Number(tab.dataset.heroPro) === targetIdx;
        tab.classList.toggle('is-active', isMatch);
        tab.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      });

      if (avatarEl) avatarEl.textContent = pro.avatar;
      if (nameEl) nameEl.textContent = pro.name;
      if (metaEl) metaEl.textContent = `${pro.trade} · ${pro.locality}`;
      if (ratingEl) ratingEl.textContent = pro.rating;
      if (jobsEl) jobsEl.textContent = `· ${pro.jobs}`;
      if (priceEl) priceEl.textContent = pro.startsFrom;
      if (etaEl) etaEl.textContent = pro.eta;
      if (slotEl) slotEl.textContent = pro.nextSlot;
      if (statusEl) statusEl.textContent = pro.status;
      if (substatusEl) substatusEl.textContent = pro.substatus;
      if (negoTextEl) negoTextEl.textContent = pro.negotiation;
      if (metaTextEl) metaTextEl.textContent = pro.meta;
      if (etaTextEl) etaTextEl.textContent = pro.eta;
      if (badgeTextEl) badgeTextEl.textContent = pro.badge;
      if (bookBtnEl) bookBtnEl.dataset.heroCategory = pro.category;
      if (areaStatsEl) {
        areaStatsEl.innerHTML = `<strong>${pro.areaStats.split(' ').slice(0, 2).join(' ')}</strong> ${pro.areaStats.split(' ').slice(2).join(' ')}`;
      }

      if (cardEl && !prefersReduced) {
        cardEl.classList.remove('lk-card-swapped');
        void cardEl.offsetWidth; // trigger reflow for animation restart
        cardEl.classList.add('lk-card-swapped');
      }

      if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    };

    const tabsArr = Array.from(proTabs);
    tabsArr.forEach((tab, index) => {
      addListener(tab, 'click', (e) => {
        e.preventDefault();
        const idx = Number(tab.dataset.heroPro);
        switchPro(idx);
      });

      addListener(tab, 'keydown', (e) => {
        let targetIdx = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          targetIdx = (index + 1) % tabsArr.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          targetIdx = (index - 1 + tabsArr.length) % tabsArr.length;
        } else if (e.key === 'Home') {
          e.preventDefault();
          targetIdx = 0;
        } else if (e.key === 'End') {
          e.preventDefault();
          targetIdx = tabsArr.length - 1;
        }

        if (targetIdx !== -1 && tabsArr[targetIdx]) {
          tabsArr[targetIdx].focus();
          const pIdx = Number(tabsArr[targetIdx].dataset.heroPro);
          switchPro(pIdx);
        }
      });
    });
  }

  // 4. Hero Quote / OTP Preview Toggle Button (#hero-card-quote-btn)
  const quoteBtn = root.querySelector('#hero-card-quote-btn');
  const negoPill = root.querySelector('#hero-negotiation-pill');
  const liveDetail = root.querySelector('#hero-live-detail');

  if (quoteBtn) {
    addListener(quoteBtn, 'click', (e) => {
      e.preventDefault();
      const isExpanded = quoteBtn.getAttribute('aria-expanded') === 'true';
      quoteBtn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
      if (negoPill) negoPill.classList.toggle('is-highlighted', !isExpanded);
      if (liveDetail) liveDetail.classList.toggle('is-highlighted', !isExpanded);
    });
  }

  return () => {
    cleanups.forEach((fn) => {
      try { fn(); } catch (e) {}
    });
  };
}
