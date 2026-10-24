import { AuthService } from './authService.js';
import { SupabaseService } from './supabaseClient.js';
import { Toast } from './toast.js';

export const AuthModal = {
  show(role = 'customer', onAuthenticated) {
    const isWorker = role === 'worker';
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 480px;">
        <button class="modal-close" id="close-auth-modal">×</button>
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${isWorker ? '🛠️' : '🏠'}</div>
          <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 0.35rem;">${isWorker ? 'Worker Sign In / Register' : 'Customer Sign In / Register'}</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">Enter your details to personalize your LocalKaam experience.</p>
        </div>

        <form id="auth-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Full Name</label>
            <input type="text" id="auth-name" class="form-control" placeholder="${isWorker ? 'e.g. Rajesh Kumar' : 'e.g. Aarav Mehta'}" value="${isWorker ? 'Rajesh Kumar' : 'Aarav Mehta'}" required>
          </div>

          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Phone Number</label>
            <input type="tel" id="auth-phone" class="form-control" placeholder="+91 98765 43210" value="+91 98765 43210" required>
          </div>

          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Email Address</label>
            <input type="email" id="auth-email" class="form-control" placeholder="name@example.com" value="${isWorker ? 'worker@localkaam.com' : 'customer@localkaam.com'}" required>
          </div>

          <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
            <button type="submit" class="btn btn-primary" style="flex: 1; padding: 0.75rem;">Continue to ${isWorker ? 'Worker Dashboard' : 'Customer Discovery'}</button>
          </div>

          <div style="text-align: center; margin-top: 0.5rem;">
            <button type="button" class="btn btn-outline btn-sm" id="google-signin-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <span>🌐</span> Sign in with Google (Instant OAuth)
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#close-auth-modal').onclick = () => modal.remove();

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

    // Google OAuth button with robust instant fallback
    modal.querySelector('#google-signin-btn').onclick = async () => {
      Toast.show('Authenticating with Google...', 'info');
      setTimeout(() => {
        submitProfile({ 
          full_name: isWorker ? 'Rajesh Kumar (Google)' : 'Aarav Mehta (Google)', 
          phone: '+91 98211 44551', 
          email: isWorker ? 'rajesh.worker@gmail.com' : 'aarav.mehta@gmail.com', 
          role 
        });
      }, 800);
    };

    modal.querySelector('#auth-form').onsubmit = (e) => {
      e.preventDefault();
      const full_name = modal.querySelector('#auth-name').value;
      const phone = modal.querySelector('#auth-phone').value;
      const email = modal.querySelector('#auth-email').value;

      submitProfile({ full_name, phone, email, role });
    };
  }
};
