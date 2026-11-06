// animations/scroll.js — inertia scroll (Lenis) + navbar behaviour + progress.
// Tweak: Lenis lerp (0.1 = silkier, 0.2 = snappier), navbar hide threshold.
import { prefersReducedMotion, MOTION } from './motion.js';

let lenis = null;
let rafId = 0;
let lastY = 0;
let gsapFn = null;
let ScrollTriggerFn = null;

async function loadGsap() {
  if (gsapFn && ScrollTriggerFn) return { gsap: gsapFn, ScrollTrigger: ScrollTriggerFn };
  try {
    const gsapMod = await import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js');
    const stMod = await import('https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js');
    gsapFn = gsapMod.gsap || gsapMod.default || gsapMod;
    ScrollTriggerFn = stMod.ScrollTrigger || stMod.default || stMod;
    gsapFn.registerPlugin(ScrollTriggerFn);
    return { gsap: gsapFn, ScrollTrigger: ScrollTriggerFn };
  } catch (e) {
    return null;
  }
}
export { loadGsap };

async function loadLenis() {
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.mjs');
    return mod.default || mod.Lenis || mod;
  } catch (e) {
    return null;
  }
}

function onScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const p = max > 0 ? h.scrollTop / max : 0;
  bar.style.transform = `scaleX(${p.toFixed(4)})`;
}

function onScrollNavbar() {
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  const navbar = document.querySelector('.navbar');
  // Blur/intensity once past the top.
  document.body.classList.toggle('is-scrolled', y > 8);
  if (navbar) navbar.classList.toggle('is-scrolled', y > 8);
  // Hide on scroll down, show on scroll up (Apple style); never hide near top.
  const down = y > lastY + 4;
  const up = y < lastY - 4;
  if (y > 140 && down) document.body.classList.add('nav-hidden');
  if (up || y <= 140) document.body.classList.remove('nav-hidden');
  lastY = y;
  onScrollProgress();
}

function ensureProgressBar() {
  if (document.getElementById('scroll-progress')) return;
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
}

function ensurePreloader() {
  if (document.getElementById('lk-preloader')) return;
  if (prefersReducedMotion()) return;
  const el = document.createElement('div');
  el.id = 'lk-preloader';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="lk-preloader-logo">LK</div><div class="lk-preloader-bar"><span></span></div>';
  document.body.appendChild(el);
  const finish = () => {
    el.classList.add('lk-done');
    setTimeout(() => el.remove(), 550);
  };
  // Short + skippable: never blocks longer than ~900ms or blocks at all.
  const timer = setTimeout(finish, 900);
  el.addEventListener('click', () => { clearTimeout(timer); finish(); });
  if (document.readyState === 'complete') { clearTimeout(timer); finish(); }
  else window.addEventListener('load', () => setTimeout(finish, 250), { once: true });
}

async function smoothAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    const hash = a.getAttribute('href');
    if (!hash || hash.length < 2) return;
    const id = hash.slice(1);
    if (['landing', 'customer', 'worker', 'settings', 'role-select'].includes(id)) return; // SPA routes
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const offset = 90; // navbar height + breathing room
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    if (lenis) lenis.scrollTo(Math.max(0, top), { duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, true);
}

export async function initScroll() {
  ensureProgressBar();
  ensurePreloader();
  await smoothAnchors();
  window.addEventListener('scroll', onScrollNavbar, { passive: true });
  window.addEventListener('resize', onScrollProgress, { passive: true });
  onScrollNavbar();

  if (prefersReducedMotion()) return null;
  const LenisCtor = await loadLenis();
  if (!LenisCtor) return null;
  try {
    lenis = new LenisCtor({
      lerp: 0.1, // silkier inertia
      wheelMultiplier: 1,
      smoothWheel: true,
      touchMultiplier: 1.4
    });
    const raf = (time) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);
    // Keep ScrollTrigger in sync when GSAP loads later.
    lenis.on('scroll', () => { try { ScrollTriggerFn?.update(); } catch (e) {} });
    // Modals/drawers can opt out by adding .lenis-stopped (body scroll lock).
    const obs = new MutationObserver(() => {
      const locked = document.body.style.overflow === 'hidden';
      if (locked) lenis.stop(); else lenis.start();
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return lenis;
  } catch (e) {
    lenis = null;
    return null;
  }
}

export function getLenis() { return lenis; }

export function stopScroll() {
  try { lenis?.stop(); } catch (e) {}
  cancelAnimationFrame(rafId);
}
