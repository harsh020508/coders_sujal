export const Toast = {
  _icons: {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
    warning: '⚠'
  },
  _colors: {
    success: { bg: '#10b981', border: '#059669' },
    error:   { bg: '#ef4444', border: '#dc2626' },
    info:    { bg: '#1a3300', border: '#264d00' },
    warning: { bg: '#d97706', border: '#b45309' }
  },

  show(message, type = 'success', duration = 4000) {
    if (typeof document === 'undefined') return;

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: clamp(16px, 3vw, 32px);
        right: clamp(12px, 3vw, 32px);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: min(380px, calc(100vw - 24px));
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const color = this._colors[type] || this._colors.success;
    const icon  = this._icons[type]  || '✓';

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${color.bg};
      color: white;
      padding: 12px 16px;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: all;
      border-left: 4px solid ${color.border};
      font-family: 'Inter', system-ui, sans-serif;
      max-width: 100%;
      word-break: break-word;
      line-height: 1.4;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;min-width:0;';

    const iconEl = document.createElement('span');
    iconEl.textContent = icon;
    iconEl.style.cssText = 'flex-shrink:0;font-size:1rem;line-height:1;';

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message; // Safe: textContent is XSS-safe
    msgSpan.style.cssText = 'flex:1;min-width:0;';

    inner.appendChild(iconEl);
    inner.appendChild(msgSpan);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.8);
      font-size: 1.3rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 2px;
      flex-shrink: 0;
    `;
    closeBtn.addEventListener('click', () => removeToast());

    toast.appendChild(inner);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    const removeToast = () => {
      toast.style.animation = 'toastSlideOut 0.25s ease forwards';
      setTimeout(() => { try { toast.remove(); } catch(e) {} }, 260);
    };

    const timer = setTimeout(removeToast, duration);
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', () => setTimeout(removeToast, 1500));
  }
};

// Inject keyframe animations once
if (typeof document !== 'undefined') {
  try {
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.innerHTML = `
        @keyframes toastSlideIn {
          from { transform: translateX(calc(100% + 20px)); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to   { transform: translateX(calc(100% + 20px)); opacity: 0; }
        }
        @media (max-width: 480px) {
          @keyframes toastSlideIn {
            from { transform: translateY(80px); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
          }
          @keyframes toastSlideOut {
            from { transform: translateY(0); opacity: 1; }
            to   { transform: translateY(80px); opacity: 0; }
          }
        }
      `;
      document.head.appendChild(style);
    }
  } catch(e) {}
}
