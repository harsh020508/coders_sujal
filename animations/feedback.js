// animations/feedback.js — delight: confetti, shake-to-error, magnetic
// buttons, card tilt, floating ambient blobs. Desktop-only where noted.
import { prefersReducedMotion } from './motion.js';
import { loadGsap } from './scroll.js';

const ACCENT_FALLBACK = ['#1a3300', '#ffe95c', '#a8d879'];

function accentColors() {
  try {
    const p = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim();
    const h = getComputedStyle(document.documentElement).getPropertyValue('--accent-hover').trim();
    const l = getComputedStyle(document.documentElement).getPropertyValue('--accent-light').trim();
    const out = [p, h, l].filter(Boolean);
    return out.length ? out : ACCENT_FALLBACK;
  } catch (e) { return ACCENT_FALLBACK; }
}

export function burstConfetti(x, y, count = 42) {
  if (prefersReducedMotion()) return;
  try {
    const canvas = document.createElement('canvas');
    canvas.className = 'lk-confetti';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const colors = accentColors();
    const parts = Array.from({ length: count }, () => ({
      x, y,
      vx: (Math.random() - 0.5) * 11,
      vy: Math.random() * -9 - 4,
      g: 0.32,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1
    }));
    const t0 = performance.now();
    const tick = (now) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      parts.forEach((p) => {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.011;
        if (p.life > 0 && p.y < canvas.height + 20) alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (alive && now - t0 < 2400) requestAnimationFrame(tick);
      else canvas.remove();
    };
    requestAnimationFrame(tick);
  } catch (e) {}
}

export function shake(el) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove('lk-shake');
  void el.offsetWidth;
  el.classList.add('lk-shake');
  setTimeout(() => el.classList.remove('lk-shake'), 450);
}

async function magneticAndTilt() {
  // Intentionally disabled: pointer-following magnetic/tilt transforms made
  // buttons feel like they lag or trail the cursor. Hover lifts + squish in
  // motion.css cover the delight without any cursor tracking.
  return;
}

function ambientBlobs() {
  if (prefersReducedMotion()) return;
  if (document.getElementById('ambient-blobs')) return;
  const wrap = document.createElement('div');
  wrap.id = 'ambient-blobs';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>';
  document.body.prepend(wrap);
}

export async function initPolish() {
  ambientBlobs();
  await magneticAndTilt();
  // Confetti on success toasts + primary booking/complete CTAs (light touch).
  window.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('.btn-success, #booking-done-btn, .complete-job-btn') : null;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    setTimeout(() => burstConfetti(r.left + r.width / 2, r.top + r.height / 2, 36), 220);
  }, true);
  document.addEventListener('lk-toast-success', () => {
    const c = document.getElementById('toast-container');
    if (c) { const r = c.getBoundingClientRect(); burstConfetti(r.right - 60, r.top + 30, 18); }
  });
}

export function bindFocusTraps() {
  // Minimal focus trap for any .ui-overlay/.modal-overlay dialog.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const modal = document.querySelector('.ui-overlay .ui-modal, .modal-overlay .modal-card');
    if (!modal || !modal.offsetParent) return;
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}
