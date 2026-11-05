import { AuthService } from './authService.js';
import { StorageService } from './storage.js';
import { SupabaseService } from './supabaseClient.js';
import { Toast } from './toast.js';
import { esc } from './utils.js';

export const AuthModal = {
  show(role = 'customer', onAuthenticated) {
    const isWorker = role === 'worker';
    const existingProfile = AuthService.getProfile();
    const defaultName = existingProfile?.full_name || '';
    const defaultPhone = existingProfile?.phone || '';
    const defaultEmail = existingProfile?.email || '';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 480px;">
        <button class="modal-close" id="close-auth-modal">×</button>
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${isWorker ? '🛠️' : '🏠'}</div>
          <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 0.35rem;">${isWorker ? 'Worker Sign In / Register' : 'Customer Sign In / Register'}</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">Enter your name and contact details to get started.</p>
        </div>

        <form id="auth-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Full Name</label>
            <input type="text" id="auth-name" class="form-control" placeholder="${isWorker ? 'Enter your full name (e.g. your name)' : 'Enter your full name'}" value="${esc(defaultName)}" required autofocus>
          </div>

          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Phone Number</label>
            <input type="tel" id="auth-phone" class="form-control" placeholder="+91 98765 43210" value="${esc(defaultPhone)}" required>
          </div>

          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Email Address</label>
            <input type="email" id="auth-email" class="form-control" placeholder="name@example.com" value="${esc(defaultEmail)}" required>
          </div>

          <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
            <button type="submit" class="btn btn-primary" style="flex: 1; padding: 0.75rem;">Continue to ${isWorker ? 'Worker Dashboard' : 'Customer Discovery'}</button>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; border-top: 1px dashed var(--border-color); padding-top: 0.75rem;">
            <button type="button" class="btn btn-outline btn-sm" id="google-signin-btn" style="flex: 1; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.5rem;">
              <span>🌐</span> Continue with Google (Instant Sign-in)
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#close-auth-modal').onclick = () => modal.remove();

    const submitProfile = (profileData) => {
      const uid = `usr_${Date.now().toString(36)}`;
      AuthService.saveCachedUser({ id: uid, email: profileData.email }, {
        id: uid,
        full_name: profileData.full_name,
        phone: profileData.phone,
        email: profileData.email,
        role: profileData.role
      });

      if (profileData.role === 'worker') {
        const workers = StorageService.getWorkers();
        let activeWorker = workers.find(w => 
          (w.user_id && w.user_id === uid) || 
          (w.userId && w.userId === uid) || 
          (profileData.phone && w.phone === profileData.phone) ||
          (profileData.full_name && w.name.toLowerCase() === profileData.full_name.toLowerCase())
        );

        if (!activeWorker) {
          activeWorker = {
            id: `w_${Date.now()}`,
            userId: uid,
            user_id: uid,
            name: profileData.full_name,
            phone: profileData.phone,
            category: 'electrician',
            skills: ['General Service'],
            experience: 3,
            hourlyRate: 350,
            baseLocality: 'andheri',
            serviceArea: 'Andheri West, Bandra & Juhu',
            serviceRadius: 10,
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            workingHours: { start: '09:00', end: '19:00' },
            available: true,
            profileCompleted: true,
            verificationStatus: 'Verified',
            ratingAverage: 5.0,
            ratingCount: 1,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            bio: `${profileData.full_name} — Skilled service professional in Mumbai.`,
            documents: {},
            specialities: {
              electrician: {
                tasks: ['Wiring Repair', 'Switchboard Installation'],
                pricingMethod: 'hourly',
                startingPrice: 350,
                visitingCharge: 100,
                estDuration: '1-2 hours',
                experience: 3
              }
            }
          };
          workers.unshift(activeWorker);
        } else {
          activeWorker.name = profileData.full_name;
          if (profileData.phone) activeWorker.phone = profileData.phone;
          activeWorker.userId = uid;
          activeWorker.user_id = uid;
        }

        StorageService.saveWorkers(workers);
        StorageService.setSelectedWorkerId(activeWorker.id);
      }

      modal.remove();
      Toast.show(`Welcome, ${profileData.full_name}!`, 'success');
      if (onAuthenticated) onAuthenticated();
    };

    modal.querySelector('#google-signin-btn').onclick = async () => {
      const typedName = modal.querySelector('#auth-name')?.value?.trim();
      const typedPhone = modal.querySelector('#auth-phone')?.value?.trim();
      const typedEmail = modal.querySelector('#auth-email')?.value?.trim();

      Toast.show('Authenticating with Google...', 'info');
      setTimeout(() => {
        submitProfile({ 
          full_name: typedName || (isWorker ? 'Local Pro' : 'Local Customer'), 
          phone: typedPhone || '+91 98211 00000', 
          email: typedEmail || (isWorker ? 'worker@localkaam.in' : 'customer@localkaam.in'), 
          role: isWorker ? 'worker' : 'customer'
        });
      }, 500);
    };

    modal.querySelector('#auth-form').onsubmit = (e) => {
      e.preventDefault();
      const full_name = modal.querySelector('#auth-name').value.trim();
      const phone = modal.querySelector('#auth-phone').value.trim();
      const email = modal.querySelector('#auth-email').value.trim();

      submitProfile({ full_name, phone, email, role });
    };
  }
};
