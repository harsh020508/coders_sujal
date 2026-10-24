export const Toast = {
  show(message, type = 'success') {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 400px;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#0284c7',
      warning: '#f59e0b'
    };
    
    toast.style.cssText = `
      background: ${bgColors[type] || bgColors.success};
      color: white;
      padding: 1rem 1.25rem;
      border-radius: 10px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2);
      font-size: 0.95rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(8px);
    `;

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message; // Safe textContent against XSS

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'background:transparent; border:none; color:white; font-size:1.2rem; cursor:pointer; opacity:0.8;';
    closeBtn.addEventListener('click', () => toast.remove());

    toast.appendChild(msgSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

if (typeof document !== 'undefined') {
  try {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes toastSlideIn {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes toastSlideOut {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  } catch(e) {}
}
