// toast.js - Aligned with Frontend Playbook Section 6.9
import { icon } from './ui.js';

export const Toast = {
  _icons: {
    success: 'circle-check',
    error:   'triangle-alert',
    info:    'info',
    warning: 'triangle-alert'
  },

  show(message, type = 'success', duration = null) {
    if (typeof document === 'undefined') return;

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'ui-toasts';
      container.setAttribute?.('role', 'status');
      container.setAttribute?.('aria-live', 'polite');
      document.body?.appendChild?.(container);
    }

    // Keep at most 3 toasts visible
    const existing = container?.querySelectorAll ? container.querySelectorAll('.ui-toast') : [];
    if (existing && existing.length >= 3) {
      existing[0]?.remove?.();
    }

    const toastType = type === 'error' ? 'bad' : (type === 'info' || type === 'warning' ? 'info' : 'ok');
    const toast = document.createElement('div');
    toast.className = `ui-toast ui-toast--${toastType}`;
    if (type === 'error') {
      toast.setAttribute?.('role', 'alert');
    }

    const lucideName = this._icons[type] || 'info';
    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
        <span style="flex-shrink:0;display:grid;place-items:center;">
          ${icon(lucideName, 18)}
        </span>
        <span class="toast-msg" style="flex:1;min-width:0;line-height:1.4;"></span>
      </div>
      <button type="button" aria-label="Close notification" style="background:none;border:none;color:rgba(255,255,255,0.7);cursor:pointer;padding:0 2px;font-size:1.1rem;line-height:1;display:grid;place-items:center;">
        ${icon('x', 14)}
      </button>
    `;

    // Safely assign text content
    const msgEl = toast.querySelector?.('.toast-msg');
    if (msgEl) msgEl.textContent = message;

    const closeBtn = toast.querySelector?.('button');
    const removeToast = () => {
      if (typeof window === 'undefined') { try { toast.remove?.(); } catch(e) {} return; }
      toast.classList?.add?.('ui-toast--exiting');
      const done = () => { try { toast.remove?.(); } catch(e) {} };
      toast.addEventListener?.('animationend', done, { once: true });
      setTimeout(done, 400); // safety fallback
    };

    closeBtn?.addEventListener?.('click', removeToast);
    container?.appendChild?.(toast);

    if (typeof window !== 'undefined' && window.refreshIcons) {
      window.refreshIcons();
    }

    const autoTime = duration !== null ? duration : (type === 'error' ? 6000 : 3500);
    const timer = setTimeout(removeToast, autoTime);
    toast.addEventListener?.('mouseenter', () => clearTimeout(timer));
    toast.addEventListener?.('mouseleave', () => setTimeout(removeToast, 1500));
  }
};
