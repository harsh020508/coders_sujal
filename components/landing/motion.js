// components/landing/motion.js — Lightweight 120fps GPU interactions.
// Fast, non-blocking, zero layout thrashing, composite-only transforms.

export function initLandingMotion(root, { signal } = {}) {
  if (typeof window === 'undefined' || !root) return () => {};

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  if (prefersReduced || !isFinePointer) return () => {};

  const heroVisual = root.querySelector('.lk-hero-visual');
  const proCard = root.querySelector('.lk-pro-card');
  if (!heroVisual || !proCard) return () => {};

  let cachedRect = null;
  let targetRotX = 0;
  let targetRotY = 0;
  let currRotX = 0;
  let currRotY = 0;
  let isHovering = false;
  let rafActive = false;

  const updatePhysics = () => {
    currRotX += (targetRotX - currRotX) * 0.14;
    currRotY += (targetRotY - currRotY) * 0.14;

    proCard.style.transform = `perspective(1000px) rotateX(${currRotX.toFixed(2)}deg) rotateY(${currRotY.toFixed(2)}deg)`;

    if (isHovering || Math.abs(currRotX) > 0.05 || Math.abs(currRotY) > 0.05) {
      requestAnimationFrame(updatePhysics);
    } else {
      proCard.style.transform = '';
      rafActive = false;
    }
  };

  const onMouseEnter = () => {
    isHovering = true;
    cachedRect = proCard.getBoundingClientRect();
    if (!rafActive) {
      rafActive = true;
      requestAnimationFrame(updatePhysics);
    }
  };

  const onMouseMove = (e) => {
    if (!cachedRect) cachedRect = proCard.getBoundingClientRect();
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

  heroVisual.addEventListener('mouseenter', onMouseEnter, { signal });
  heroVisual.addEventListener('mousemove', onMouseMove, { signal, passive: true });
  heroVisual.addEventListener('mouseleave', onMouseLeave, { signal });

  return () => {
    isHovering = false;
    proCard.style.transform = '';
  };
}
