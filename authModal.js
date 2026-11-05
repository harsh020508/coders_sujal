import { AuthService } from './authService.js';
import { Toast } from './toast.js';

export const AuthModal = {
  show(role = 'customer', onAuthenticated) {
    let currentRole = role;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const renderModalContent = () => {
      const isWorker = currentRole === 'worker';
      return `
        <div class="modal-card" style="max-width: 460px;">
          <button class="modal-close" id="close-auth-modal" aria-label="Close modal">×</button>

          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="width: 54px; height: 54px; background: var(--color-highlighter-yellow); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 1.6rem; margin-bottom: 0.75rem; border: 1.5px solid var(--border-color); box-shadow: var(--shadow-sm);">
              ${isWorker ? '🛠️' : '🏠'}
            </div>
            <h2 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 0.25rem;">
              ${isWorker ? 'Worker Sign In' : 'Customer Sign In'}
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">
              Enter your details to access your ${isWorker ? 'professional workspace' : 'service marketplace'}.
            </p>

            <!-- Role Switch Tabs inside Modal -->
            <div style="display: flex; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 3px; margin-top: 1rem; gap: 4px;">
              <button type="button" class="btn ${!isWorker ? 'btn-primary' : 'btn-ghost'} btn-xs" id="auth-tab-customer" style="flex: 1; padding: 6px; font-size: 0.8rem; border-radius: 6px;">
                🏠 Customer
              </button>
              <button type="button" class="btn ${isWorker ? 'btn-primary' : 'btn-ghost'} btn-xs" id="auth-tab-worker" style="flex: 1; padding: 6px; font-size: 0.8rem; border-radius: 6px;">
                🛠️ Worker Pro
              </button>
            </div>
          </div>

          <form id="auth-form" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <label class="form-label">Full Name</label>
              <input type="text" id="auth-name" class="form-control" placeholder="${isWorker ? 'e.g. Rajesh Kumar' : 'e.g. Aarav Mehta'}" value="${isWorker ? 'Rajesh Kumar' : 'Aarav Mehta'}" required>
            </div>

            <div>
              <label class="form-label">Phone Number</label>
              <input type="tel" id="auth-phone" class="form-control" placeholder="+91 98765 43210" value="+91 98765 43210" required>
            </div>

            <div>
              <label class="form-label">Email Address</label>
              <input type="email" id="auth-email" class="form-control" placeholder="name@example.com" value="${isWorker ? 'worker@localkaam.in' : 'customer@localkaam.in'}" required>
            </div>

            <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
              <button type="submit" class="btn btn-primary btn-full" style="padding: 12px; font-size: 0.95rem;">
                Continue to ${isWorker ? 'Worker Workspace' : 'Marketplace'} →
              </button>

              <button type="button" class="btn btn-outline btn-full btn-sm" id="google-signin-btn" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span>🌐</span> Instant Google Sign-In
              </button>
            </div>
          </form>
        </div>
      `;
    };

    modal.innerHTML = renderModalContent();
    document.body.appendChild(modal);

    const attachModalEvents = () => {
      modal.querySelector('#close-auth-modal').onclick = () => modal.remove();

      modal.querySelector('#auth-tab-customer')?.addEventListener('click', () => {
        currentRole = 'customer';
        modal.innerHTML = renderModalContent();
        attachModalEvents();
      });

      modal.querySelector('#auth-tab-worker')?.addEventListener('click', () => {
        currentRole = 'worker';
        modal.innerHTML = renderModalContent();
        attachModalEvents();
      });

      const submitProfile = (profileData) => {
        AuthService.saveCachedUser({ id: `usr-${Date.now()}`, email: profileData.email }, {
          id: `usr-${Date.now()}`,
          full_name: profileData.full_name,
          phone: profileData.phone,
          email: profileData.email,
          role: profileData.role
        });
        modal.remove();
        Toast.show(`Welcome, ${profileData.full_name}!`, 'success');
        if (onAuthenticated) onAuthenticated();
      };

      modal.querySelector('#google-signin-btn').onclick = async () => {
        Toast.show('Signing in...', 'info');
        setTimeout(() => {
          submitProfile({
            full_name: currentRole === 'worker' ? 'Rajesh Kumar' : 'Aarav Mehta',
            phone: '+91 98211 44551',
            email: currentRole === 'worker' ? 'rajesh.kumar@gmail.com' : 'aarav.mehta@gmail.com',
            role: currentRole
          });
        }, 500);
      };

      modal.querySelector('#auth-form').onsubmit = (e) => {
        e.preventDefault();
        const full_name = modal.querySelector('#auth-name').value;
        const phone = modal.querySelector('#auth-phone').value;
        const email = modal.querySelector('#auth-email').value;

        submitProfile({ full_name, phone, email, role: currentRole });
      };
    };

    attachModalEvents();
  }
};
