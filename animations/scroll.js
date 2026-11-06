// animations/scroll.js — High-performance native 60fps/120fps scrolling + navbar behavior + progress.
import { prefersReducedMotion } from './motion.js';

let lastY = 0;
let ticking = false;

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
  document.body.classList.toggle('is-scrolled', y > 8);
  if (navbar) navbar.classList.toggle('is-scrolled', y > 8);
  const down = y > lastY + 4;
  const up = y < lastY - 4;
  if (y > 140 && down) document.body.classList.add('nav-hidden');
  if (up || y <= 140) document.body.classList.remove('nav-hidden');
  lastY = y;
  onScrollProgress();
}

function requestTick() {
  if (!ticking) {
    requestAnimationFrame(() => {
      onScrollNavbar();
      ticking = false;
    });
    ticking = true;
  }
}

function ensureProgressBar() {
  if (document.getElementById('scroll-progress')) return;
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
}

// Preloader removed completely for instant first paint
function ensurePreloader() {
  return;
}

async function smoothAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    const hash = a.getAttribute('href');
    if (!hash || hash.length < 2) return;
    const id = hash.slice(1);
    if (['landing', 'customer', 'worker', 'settings', 'role-select'].includes(id)) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const offset = 90;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });
  }, true);
}

export async function initScroll() {
  ensureProgressBar();
  await smoothAnchors();
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick, { passive: true });
  requestTick();
  return null;
}

export function getLenis() { return null; }
export function stopScroll() {}
export async function loadGsap() { return null; }
