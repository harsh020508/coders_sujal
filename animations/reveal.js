// animations/reveal.js — High-performance GPU scroll reveals, counters & progress bars.
import { prefersReducedMotion } from './motion.js';

let revealObserver = null;
let dataRevealObserver = null;

function getRevealObserver() {
  if (revealObserver) return revealObserver;
  if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return null;

  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.style.willChange = 'transform, opacity';
        el.classList.add('is-revealed');
        el.addEventListener('transitionend', () => {
          el.style.willChange = 'auto';
        }, { once: true });
        revealObserver.unobserve(el);
      }
    }
  }, {
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.1
  });

  return revealObserver;
}

function getDataRevealObserver() {
  if (dataRevealObserver) return dataRevealObserver;
  if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return null;

  dataRevealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.classList.add('is-visible');
        dataRevealObserver.unobserve(el);
      }
    }
  }, {
    rootMargin: '0px 0px -48px 0px',
    threshold: 0.08
  });

  return dataRevealObserver;
}

function tweenCounter(el, target, prefix, suffix) {
  if (prefersReducedMotion()) { el.textContent = prefix + target + suffix; return; }
  const dur = 700;
  const t0 = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = prefix + Math.round(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = prefix + target + suffix;
  };
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) { requestAnimationFrame(tick); io.disconnect(); }
  }, { threshold: 0.4 });
  io.observe(el);
}

function initCounters(scope) {
  scope.querySelectorAll('.stat-card h3').forEach((el) => {
    if (el.dataset.countBound) return;
    el.dataset.countBound = '1';
    const raw = el.textContent.trim();
    const m = raw.match(/^([~₹%]?)(-?\d+(?:\.\d+)?)(m|%|\+|)$/);
    if (!m) return;
    const target = parseFloat(m[2]);
    const prefix = raw.startsWith('₹') ? '₹' : (raw.startsWith('~') ? '~' : '');
    const suffix = raw.endsWith('m') ? 'm' : raw.endsWith('%') ? '%' : raw.endsWith('+') ? '+' : '';
    tweenCounter(el, target, prefix, suffix);
  });
  scope.querySelectorAll('[data-count]').forEach((el) => {
    if (el.dataset.countBound) return;
    el.dataset.countBound = '1';
    const target = parseFloat(el.dataset.count);
    if (Number.isNaN(target)) return;
    tweenCounter(el, target, el.dataset.countPrefix || '', el.dataset.countSuffix || '');
  });
}

function initProgress(scope) {
  scope.querySelectorAll('.dash-hbar-fill, .rating-distribution .progress-bar, .distribution-bar').forEach((bar) => {
    const w = bar.style && bar.style.width ? parseFloat(bar.style.width) : 0;
    if (!w) return;
    const track = bar.parentElement;
    if (track && !track.classList.contains('hbar-track-wrap')) {
      bar.style.width = '100%';
      bar.style.transformOrigin = 'left center';
      bar.style.transform = `scaleX(${w / 100})`;
    }
  });
}

export async function refreshReveals(root) {
  const scope = root && root.querySelector ? root : document;
  const obs = getRevealObserver();
  const dataObs = getDataRevealObserver();

  const targets = scope.querySelectorAll(
    '.ui-cat, .ui-card, .category-card, .step-card, .usp-card, .pricing-card, .ui-reveal, .service-card, .lk-service-card, .lk-why-card, .lk-step-card, .lk-feature-card, .lk-quote, .lk-price-card'
  );

  targets.forEach((el) => {
    if (el.dataset.revealBound) return;
    el.dataset.revealBound = '1';
    el.classList.add('lk-reveal-init');
    if (obs) {
      obs.observe(el);
    } else {
      el.classList.add('is-revealed');
    }
  });

  // Handle [data-reveal] attribute-based reveals (landing page sections)
  scope.querySelectorAll('[data-reveal]:not([data-reveal-bound])').forEach((el) => {
    el.dataset.revealBound = '1';
    if (prefersReducedMotion()) {
      el.classList.add('is-visible');
    } else if (dataObs) {
      dataObs.observe(el);
    } else {
      el.classList.add('is-visible');
    }
  });

  initCounters(scope);
  initProgress(scope);

  scope.querySelectorAll('img:not([loading])').forEach((img) => {
    img.loading = 'lazy';
    img.decoding = 'async';
  });
}
