// icons.js: converts <i data-lucide> automatically whenever new ones appear anywhere in the DOM.
// Safe from infinite loops: Lucide swaps <i> for <svg>, and we only react to newly added <i data-lucide>.
let queued = false;
export function refreshIcons() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    try {
      if (typeof window !== 'undefined' && window.lucide?.createIcons) {
        window.lucide.createIcons();
      }
    } catch (e) {
      console.warn('lucide refresh warning:', e);
    }
  });
}

export function autoRefreshIcons(root = document.body) {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && (n.matches?.('i[data-lucide]') || n.querySelector?.('i[data-lucide]'))) {
          refreshIcons();
          return;
        }
      }
    }
  }).observe(root, { childList: true, subtree: true });
  refreshIcons();
}
