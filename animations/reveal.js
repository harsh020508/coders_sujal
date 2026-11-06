// animations/reveal.js — scroll-triggered reveals, hero split-text,
// parallax/scrub, counters + GPU progress bars.
// Falls back to the existing IntersectionObserver (transitions.js) if the
// GSAP CDN is unavailable, so content never stays hidden.
import { prefersReducedMotion } from './motion.js';
import { loadGsap } from './scroll.js';

let gsapFn = null;
let STFn = null;
let inited = false;

function splitHeroLine(h1) {
  if (!h1 || h1.dataset.splitDone) return [];
  h1.dataset.splitDone = '1';
  const inners = [];
  const makeFrag = (text) => {
    const frag = document.createDocumentFragment();
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
      const word = document.createElement('span');
      word.className = 'split-word';
      const inner = document.createElement('span');
      inner.className = 'split-inner';
      inner.textContent = part;
      word.appendChild(inner);
      frag.appendChild(word);
      inners.push(inner);
    });
    return frag;
  };
  // Split each child (text nodes, <br>, highlight <span>) preserving order/markup.
  const nodes = Array.from(h1.childNodes);
  nodes.forEach((node) => {
    if (node.nodeType === 3) {
      h1.replaceChild(makeFrag(node.textContent), node);
    } else if (node.nodeType === 1 && node.tagName === 'SPAN') {
      const text = node.textContent;
      node.textContent = '';
      node.appendChild(makeFrag(text));
    }
  });
  return inners;
}

function animateHeroSplit(scope) {
  if (!gsapFn) return;
  const h1 = scope.querySelector ? scope.querySelector('.landing-hero h1') : document.querySelector('.landing-hero h1');
  if (!h1) return;
  const inners = splitHeroLine(h1);
  if (!inners.length) return;
  gsapFn.fromTo(inners,
    { yPercent: 110, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.045, overwrite: true });
}

function tweenCounter(el, target, prefix, suffix) {
  if (prefersReducedMotion()) { el.textContent = prefix + target + suffix; return; }
  const dur = 900;
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
  // Landing stat cards: parse "~25m" / "₹0" / "0%" / "10+" and count up.
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
  // GPU-friendly: scaleX on a full bar, transform-origin left.
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

async function gsapReveals(scope) {
  if (inited) return;
  const loaded = await loadGsap();
  if (!loaded || prefersReducedMotion()) {
    inited = true;
    return;
  }
  inited = true;
  gsapFn = loaded.gsap;
  STFn = loaded.ScrollTrigger;

  animateHeroSplit(scope);

  // Hero visual parallax (subtle, scrubbed).
  const visual = scope.querySelector ? scope.querySelector('.hero-visual') : document.querySelector('.hero-visual');
  if (visual) {
    gsapFn.to(visual, {
      yPercent: -6, ease: 'none',
      scrollTrigger: { trigger: '.landing-hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
    });
  }

  // Timeline line draws itself as you scroll.
  const tlFill = scope.querySelector ? scope.querySelector('[data-timeline-fill]') : document.querySelector('[data-timeline-fill]');
  if (tlFill) {
    const io2 = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { tlFill.style.transform = 'scaleX(1)'; io2.disconnect(); }
    }, { threshold: 0.3 });
    io2.observe(tlFill.parentElement || tlFill);
  }
  // Batched card reveals: fade + rise + tiny scale, staggered by proximity.
  const targets = (scope.querySelectorAll ? scope.querySelectorAll('.ui-cat,.ui-card,.category-card,.step-card,.usp-card,.pricing-card,.ui-reveal,.service-card,.lk-bento-tile,.lk-mile,.lk-tile,.lk-resource') : []);
  const ioTargets = Array.from(targets).filter((el) => !el.dataset.gsapBound);
  ioTargets.forEach((el) => { el.dataset.gsapBound = '1'; });
  if (ioTargets.length && gsapFn) {
    gsapFn.set(ioTargets, { opacity: 0, y: 28, scale: 0.97 });
    STFn.batch(ioTargets, {
      start: 'top 88%',
      onEnter: (els) => gsapFn.to(els, {
        opacity: 1, y: 0, scale: 1, duration: 0.65, ease: 'expo.out', stagger: 0.06, overwrite: true
      })
    });
  }
}

export async function refreshReveals(root) {
  const scope = root && root.querySelector ? root : document;
  if (prefersReducedMotion()) return;
  try {
    await gsapReveals(scope);
    // Re-run batch on new nodes only (ScrollTrigger.batch is additive).
    const loaded = gsapFn && STFn ? { gsap: gsapFn, ScrollTrigger: STFn } : await loadGsap();
    if (loaded && loaded.gsap && loaded.ScrollTrigger) {
      gsapFn = loaded.gsap; STFn = loaded.ScrollTrigger;
      animateHeroSplit(scope);
      const targets = Array.from(scope.querySelectorAll('.ui-cat,.ui-card,.category-card,.ui-reveal,.lk-service-card,.lk-why-card,.lk-step-card'));
      const fresh = targets.filter((el) => !el.dataset.gsapBound);
      fresh.forEach((el) => { el.dataset.gsapBound = '1'; });
      if (fresh.length) {
        gsapFn.set(fresh, { opacity: 0, y: 28, scale: 0.97 });
        STFn.batch(fresh, {
          start: 'top 90%',
          onEnter: (els) => gsapFn.to(els, {
            opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'expo.out', stagger: 0.05, overwrite: true
          })
        });
        STFn.refresh();
        setTimeout(() => {
          fresh.forEach((el) => {
            if (getComputedStyle(el).opacity === '0') {
              el.style.opacity = '1';
              el.style.transform = 'none';
            }
          });
        }, 1800);
      }
    }
  } catch (e) {}
  initCounters(scope);
  initProgress(scope);
  // Lazy-decode images (never block).
  scope.querySelectorAll('img:not([loading])').forEach((img) => { img.loading = 'lazy'; img.decoding = 'async'; });
}
