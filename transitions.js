// transitions.js — Apple-like page and element transitions (plain JS + CSS classes)

/**
 * Animate a container out, run a render function, then animate it in.
 * Usage: await fadeSlide(el, () => { el.innerHTML = newContent; });
 */
export async function fadeSlide(container, renderFn) {
  if (typeof window === 'undefined' || !container) { renderFn?.(); return; }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { renderFn?.(); return; }

  container.classList.add('ui-page-exit');
  await new Promise(r => setTimeout(r, 120));
  renderFn?.();
  container.classList.remove('ui-page-exit');
  container.classList.add('ui-page-enter');
  container.addEventListener?.('animationend', () => container.classList.remove('ui-page-enter'), { once: true });
}

/**
 * Slide an element in from a direction.
 * dir: 'up' | 'down' | 'left' | 'right'
 */
export function slideIn(el, dir = 'up') {
  if (!el || typeof window === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.classList.add('ui-page-enter');
  el.addEventListener?.('animationend', () => el.classList.remove('ui-page-enter'), { once: true });
}

/**
 * IntersectionObserver-based scroll reveal.
 * Adds .ui-reveal class to target elements and observes them.
 * Call once after rendering content. Automatically staggered via data-delay.
 *
 * @param {string|Element} selector - CSS selector or DOM element to scope to
 * @param {string} targets - CSS selector for children to reveal (default '.ui-card,.ui-cat,.ui-reveal-item')
 */
export function initScrollReveal(selector = 'body', targets = '.ui-card,.ui-cat,.ui-reveal-item') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof IntersectionObserver === 'undefined') return;

  const root = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!root) return;

  const els = root.querySelectorAll(targets);
  if (!els || !els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

  els.forEach((el, i) => {
    if (!el.classList.contains('ui-reveal')) el.classList.add('ui-reveal');
    if (!el.dataset.delay) el.dataset.delay = String(Math.min(i + 1, 6));
    observer.observe(el);
  });
}

/**
 * Smooth toast entrance using double-rAF (bypasses paint-frame issue).
 * Call after appending a toast element to the DOM.
 */
export function animateToastIn(el) {
  if (!el || typeof window === 'undefined') return;
  el.style.opacity = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.opacity = '';
    el.classList.add('ui-toast-animate');
  }));
}

/**
 * Remove a toast with exit animation.
 * Returns a Promise that resolves when removal is complete.
 */
export function animateToastOut(el) {
  return new Promise(resolve => {
    if (!el || typeof window === 'undefined') { el?.remove?.(); resolve(); return; }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.remove?.(); resolve(); return; }
    el.classList.add('ui-toast--exiting');
    el.addEventListener?.('animationend', () => { el.remove?.(); resolve(); }, { once: true });
    setTimeout(() => { el.remove?.(); resolve(); }, 400); // safety fallback
  });
}

/**
 * Stagger-reveal a list of elements (e.g. worker cards after fetch).
 * Assign increasing data-delay and add .ui-reveal, then trigger immediately
 * (for already-visible content that just rendered).
 */
export function staggerReveal(elements) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  Array.from(elements).forEach((el, i) => {
    el.classList.add('ui-reveal');
    el.dataset.delay = String(Math.min(i + 1, 6));
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-visible')));
  });
}
