import { AuthService } from './authService.js';
import { SupabaseService } from './supabaseClient.js';
import { Toast } from './toast.js';

export const AuthModal = {
  show(role = 'customer', onAuthenticated) {
    // If the user already has a valid, verified session for this role, proceed directly
    if (AuthService.isAuthenticated()) {
      AuthService.setRole(role);
      const currentProfile = AuthService.getProfile();
      if (onAuthenticated) onAuthenticated(AuthService.getUser(), currentProfile);
      return;
    }

    const existingModal = document.getElementById('auth-modal');
    if (existingModal) existingModal.remove();

    const isWorker = role === 'worker';
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'auth-modal';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 480px; padding: 2rem;">
        <button class="modal-close" id="close-auth-modal" aria-label="Close">&times;</button>
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${isWorker ? '🛠️' : '🏠'}</div>
          <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 0.35rem;">
            ${isWorker ? 'Worker Sign In / Register' : 'Customer Sign In / Register'}
          </h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">
            Enter your credentials to securely access your LocalKaam account.
          </p>
        </div>

        <!-- Google OAuth Button -->
        <button type="button" class="btn btn-outline" id="google-signin-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.6rem; padding: 0.75rem; font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; border-radius: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="flex: 1; height: 1px; background: var(--border-color);"></div>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em;">OR</span>
          <div style="flex: 1; height: 1px; background: var(--border-color);"></div>
        </div>

        <!-- Auth Mode Tabs -->
        <div style="display: flex; border-bottom: 2px solid var(--border-color); margin-bottom: 1.25rem;">
          <button type="button" id="tab-signin-btn" style="flex: 1; padding: 0.6rem; background: none; border: none; border-bottom: 2px solid var(--accent-primary); font-weight: 700; color: var(--accent-primary); cursor: pointer; font-size: 0.9rem;">
            Sign In
          </button>
          <button type="button" id="tab-signup-btn" style="flex: 1; padding: 0.6rem; background: none; border: none; border-bottom: 2px solid transparent; font-weight: 600; color: var(--text-secondary); cursor: pointer; font-size: 0.9rem;">
            Create Account
          </button>
        </div>

        <!-- Error Notification Banner -->
        <div id="auth-error-display" style="display: none; margin-bottom: 1rem; padding: 0.65rem 0.85rem; background: rgba(239,68,68,0.1); border: 1px solid var(--danger); border-radius: 8px; font-size: 0.85rem; color: var(--danger); line-height: 1.4;"></div>

        <!-- Sign In Form -->
        <form id="form-signin" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Email Address</label>
            <input type="email" id="signin-email" class="form-control" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Password</label>
            <input type="password" id="signin-password" class="form-control" placeholder="••••••••" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary" id="btn-submit-signin" style="width: 100%; padding: 0.75rem; margin-top: 0.25rem;">
            Sign In
          </button>
        </form>

        <!-- Sign Up Form (hidden by default) -->
        <form id="form-signup" style="display: none; flex-direction: column; gap: 0.9rem;">
          <input type="hidden" id="signup-role" value="${isWorker ? 'worker' : 'customer'}">

          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Full Name</label>
            <input type="text" id="signup-fullname" class="form-control" placeholder="${isWorker ? 'Rajesh Kumar' : 'Aarav Mehta'}" required autocomplete="name">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Phone Number</label>
            <input type="tel" id="signup-phone" class="form-control" placeholder="+91 98765 43210" required autocomplete="tel">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Email Address</label>
            <input type="email" id="signup-email" class="form-control" placeholder="name@example.com" required autocomplete="email">
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Mumbai Locality</label>
            <select id="signup-locality" class="form-select">
              <option value="andheri">Andheri West</option>
              <option value="bandra">Bandra West</option>
              <option value="powai">Powai</option>
              <option value="juhu">Juhu</option>
              <option value="colaba">Colaba</option>
              <option value="dadar">Dadar West</option>
              <option value="thane">Thane West</option>
              <option value="malad">Malad West</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Password</label>
            <input type="password" id="signup-password" class="form-control" placeholder="Min. 6 characters" minlength="6" required autocomplete="new-password">
          </div>
          <button type="submit" class="btn btn-primary" id="btn-submit-signup" style="width: 100%; padding: 0.75rem; margin-top: 0.25rem;">
            Create ${isWorker ? 'Worker' : 'Customer'} Account
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#close-auth-modal').onclick = closeModal;

    const errorDiv = modal.querySelector('#auth-error-display');
    const showError = (msg) => {
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
    };
    const clearError = () => {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
    };

    // Google Sign-In with real OAuth provider
    modal.querySelector('#google-signin-btn').onclick = async () => {
      clearError();
      const btn = modal.querySelector('#google-signin-btn');
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span style="display:inline-block; animation: spin 1s linear infinite;">⏳</span> Redirecting to Google OAuth...';

      try {
        localStorage.setItem('localkaam_pending_auth_role', role);
      } catch (e) {}

      const { data, error } = await AuthService.signInWithGoogle();
      if (error) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        showError(error.message || 'Google OAuth failed. Please check Supabase Google provider configuration.');
      }
    };

    // Tab switching
    const tabSignIn = modal.querySelector('#tab-signin-btn');
    const tabSignUp = modal.querySelector('#tab-signup-btn');
    const formSignIn = modal.querySelector('#form-signin');
    const formSignUp = modal.querySelector('#form-signup');

    tabSignIn.onclick = () => {
      clearError();
      tabSignIn.style.borderBottomColor = 'var(--accent-primary)';
      tabSignIn.style.color = 'var(--accent-primary)';
      tabSignIn.style.fontWeight = '700';
      tabSignUp.style.borderBottomColor = 'transparent';
      tabSignUp.style.color = 'var(--text-secondary)';
      tabSignUp.style.fontWeight = '600';
      formSignIn.style.display = 'flex';
      formSignUp.style.display = 'none';
    };

    tabSignUp.onclick = () => {
      clearError();
      tabSignUp.style.borderBottomColor = 'var(--accent-primary)';
      tabSignUp.style.color = 'var(--accent-primary)';
      tabSignUp.style.fontWeight = '700';
      tabSignIn.style.borderBottomColor = 'transparent';
      tabSignIn.style.color = 'var(--text-secondary)';
      tabSignIn.style.fontWeight = '600';
      formSignUp.style.display = 'flex';
      formSignIn.style.display = 'none';
    };

    // Email Sign-In
    formSignIn.onsubmit = async (e) => {
      e.preventDefault();
      clearError();
      const submitBtn = modal.querySelector('#btn-submit-signin');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      const email = modal.querySelector('#signin-email').value.trim();
      const password = modal.querySelector('#signin-password').value;

      const { data, error } = await AuthService.signIn({ email, password });
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';

      if (error) {
        showError(error.message || 'Invalid email or password.');
      } else {
        closeModal();
        Toast.show('Successfully signed in!', 'success');
        if (onAuthenticated) {
          onAuthenticated(AuthService.getUser(), AuthService.getProfile());
        }
      }
    };

    // Email Registration
    formSignUp.onsubmit = async (e) => {
      e.preventDefault();
      clearError();
      const submitBtn = modal.querySelector('#btn-submit-signup');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      const fullName = modal.querySelector('#signup-fullname').value.trim();
      const phone = modal.querySelector('#signup-phone').value.trim();
      const email = modal.querySelector('#signup-email').value.trim();
      const locality = modal.querySelector('#signup-locality').value;
      const password = modal.querySelector('#signup-password').value;
      // Strict role sanitization: only customer or worker, never admin
      const signupRole = isWorker ? 'worker' : 'customer';

      const { data, error } = await AuthService.signUp({
        email,
        password,
        fullName,
        phone,
        role: signupRole,
        locality
      });

      submitBtn.disabled = false;
      submitBtn.textContent = `Create ${isWorker ? 'Worker' : 'Customer'} Account`;

      if (error) {
        showError(error.message || 'Registration failed. Please check your credentials.');
      } else {
        closeModal();
        if (data?.user && !data?.session) {
          Toast.show('Account created! Please check your email for a verification link.', 'info');
        } else {
          Toast.show(`Account created! Signed in as ${signupRole}.`, 'success');
        }
        if (onAuthenticated) {
          onAuthenticated(AuthService.getUser(), AuthService.getProfile());
        }
      }
    };
  }
};
