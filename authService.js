// LocalKaam - Supabase Authentication & Profile Service
// Supports: Email/Password, Google OAuth, Demo Quick Login
import { SupabaseService } from './supabaseClient.js';
import { Toast } from './toast.js';

const AUTH_STORAGE_KEY = 'localkaam_cached_user';

class AuthServiceManager {
  constructor() {
    this.currentUser = null;
    this.currentProfile = null;
    this.listeners = [];
    this.loadCachedUser();
    this.initAuthListener();
  }

  loadCachedUser() {
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(AUTH_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.currentUser = parsed.user || null;
          this.currentProfile = parsed.profile || null;
        }
      }
    } catch (e) {
      console.warn('Error reading cached auth:', e);
    }
  }

  saveCachedUser(user, profile) {
    this.currentUser = user;
    this.currentProfile = profile;
    try {
      if (typeof localStorage !== 'undefined') {
        if (user) {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, profile }));
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch (e) {}
  }

  async initAuthListener() {
    const client = await SupabaseService.getClient();
    if (!client) return;

    try {
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        console.warn('[Auth] getSession error:', sessionError);
      } else if (session && session.user) {
        console.log('[Auth] Existing session found for:', session.user.email);
        await this.syncUserProfile(session.user);
        this.notifyListeners('SIGNED_IN', session);
      }

      client.auth.onAuthStateChange(async (event, session) => {
        console.log('[Auth] State changed:', event, session?.user?.email || '(no user)');
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session && session.user) {
            await this.syncUserProfile(session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          this.saveCachedUser(null, null);
        }
        this.notifyListeners(event, session);
      });
    } catch (err) {
      console.warn('Failed to initialize auth state listener:', err);
    }
  }

  async syncUserProfile(user) {
    this.currentUser = user;
    const client = await SupabaseService.getClient();
    if (client) {
      try {
        const { data: profile, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          // Table might not exist (PGRST116 = not found, 42P01 = relation doesn't exist)
          console.warn('[Auth] Profile fetch failed (table may not exist yet):', error.code, error.message);
          this.currentProfile = this._buildProfileFromUser(user);

          // Try to insert profile if table exists but row doesn't
          if (error.code === 'PGRST116') {
            try {
              const profileData = this._buildProfileFromUser(user);
              profileData.avatar_url = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
              await client.from('profiles').upsert(profileData);
              console.log('[Auth] Auto-created profile for user:', user.email);
            } catch (insertErr) {
              console.warn('[Auth] Profile auto-create failed:', insertErr);
            }
          }
        } else if (profile) {
          this.currentProfile = profile;
        } else {
          this.currentProfile = this._buildProfileFromUser(user);
        }
      } catch (e) {
        console.warn('[Auth] syncUserProfile exception:', e);
        this.currentProfile = this._buildProfileFromUser(user);
      }
    } else {
      this.currentProfile = this._buildProfileFromUser(user);
    }
    this.saveCachedUser(this.currentUser, this.currentProfile);
  }

  _buildProfileFromUser(user) {
    const meta = user.user_metadata || {};
    return {
      id: user.id,
      email: user.email,
      role: meta.role || 'customer',
      full_name: meta.full_name || meta.name || meta.full_name || (user.email ? user.email.split('@')[0] : 'User'),
      phone: meta.phone || '',
      locality: meta.locality || 'andheri',
      avatar_url: meta.avatar_url || meta.picture || ''
    };
  }

  onAuthStateChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(event, session) {
    this.listeners.forEach(cb => {
      try {
        cb(event, session, this.currentUser, this.currentProfile);
      } catch (e) {
        console.error('Error in auth listener callback:', e);
      }
    });
  }

  isAuthenticated() {
    return Boolean(this.currentUser);
  }

  getUser() {
    return this.currentUser;
  }

  getProfile() {
    return this.currentProfile || (this.currentUser ? this._buildProfileFromUser(this.currentUser) : null);
  }

  // ========================================================================
  // EMAIL / PASSWORD SIGN UP
  // ========================================================================
  async signUp({ email, password, fullName, phone, role = 'customer', locality = 'andheri' }) {
    const client = await SupabaseService.getClient();

    if (!client) {
      return this._demoSignUp(email, fullName, phone, role, locality);
    }

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role,
            locality
          }
        }
      });

      if (error) return { data: null, error };

      if (data.user) {
        // Upsert into public.profiles
        try {
          await client.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            role,
            full_name: fullName,
            phone,
            locality
          });
        } catch (profileErr) {
          console.warn('Profile upsert failed (table may not exist yet):', profileErr);
        }

        // If registering as a worker, also create initial worker entry
        if (role === 'worker') {
          try {
            await client.from('workers').upsert({
              id: `w_${data.user.id.substring(0, 8)}`,
              user_id: data.user.id,
              name: fullName,
              category: 'plumber',
              skills: ['General Service'],
              experience: 1,
              hourly_rate: 300,
              base_locality: locality,
              service_radius: 10,
              working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
              working_hours: { start: '09:00', end: '18:00' },
              available: true,
              verification_status: 'Verified',
              rating_average: 5.0,
              rating_count: 1,
              phone,
              bio: `${fullName} - Verified local service professional in ${locality}.`
            });
          } catch (workerErr) {
            console.warn('Worker upsert failed (table may not exist yet):', workerErr);
          }
        }

        await this.syncUserProfile(data.user);
        this.notifyListeners('SIGNED_IN', data.session);
      }

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // ========================================================================
  // EMAIL / PASSWORD SIGN IN
  // ========================================================================
  async signIn({ email, password }) {
    const client = await SupabaseService.getClient();

    if (!client) {
      return this._demoSignIn(email);
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { data: null, error };

      if (data.user) {
        await this.syncUserProfile(data.user);
        this.notifyListeners('SIGNED_IN', data.session);
      }
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // ========================================================================
  // GOOGLE OAUTH SIGN IN
  // ========================================================================
  async signInWithGoogle() {
    const client = await SupabaseService.getClient();

    if (!client) {
      Toast.show('Supabase is not connected. Please configure Supabase first to use Google Sign-In.', 'warning');
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      const err = { message: 'Google Sign-In requires running through a local web server (e.g. http://localhost:8000), not direct file:// protocol. Run: python -m http.server 8000' };
      Toast.show(err.message, 'warning');
      return { data: null, error: err };
    }

    try {
      // Use the current page URL as the redirect destination
      const redirectUrl = window.location.origin + window.location.pathname;
      console.log('[Auth] Google OAuth redirectTo:', redirectUrl);

      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        // Check for provider-not-enabled error
        if (error.message && error.message.toLowerCase().includes('provider')) {
          return { data: null, error: { message: 'Google Sign-In is not enabled in your Supabase project. Go to Supabase Dashboard → Authentication → Providers → Google and enable it.' } };
        }
        return { data: null, error };
      }

      // signInWithOAuth returns a URL and redirects the browser.
      // If we reach here, the redirect should happen automatically.
      return { data, error: null };
    } catch (err) {
      console.error('Google Sign-In exception:', err);
      return { data: null, error: err };
    }
  }

  // ========================================================================
  // SIGN OUT
  // ========================================================================
  async signOut() {
    const client = await SupabaseService.getClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    this.saveCachedUser(null, null);
    this.notifyListeners('SIGNED_OUT', null);
    return { success: true };
  }

  // ========================================================================
  // DEMO (OFFLINE) HELPERS
  // ========================================================================
  _demoSignUp(email, fullName, phone, role, locality) {
    const mockId = 'usr_' + Math.random().toString(36).substring(2, 9);
    const mockUser = { id: mockId, email, user_metadata: { full_name: fullName, phone, role, locality } };
    const mockProfile = { id: mockId, email, full_name: fullName, phone, role, locality };
    this.saveCachedUser(mockUser, mockProfile);
    this.notifyListeners('SIGNED_IN', { user: mockUser });
    return { data: { user: mockUser, profile: mockProfile }, error: null };
  }

  _demoSignIn(email) {
    const mockId = 'usr_' + Math.random().toString(36).substring(2, 9);
    const isWorker = email.toLowerCase().includes('worker');
    const mockUser = {
      id: mockId, email,
      user_metadata: { full_name: isWorker ? 'Ramesh Kumar' : 'Aarav Mehta', role: isWorker ? 'worker' : 'customer' }
    };
    const mockProfile = {
      id: mockId, email,
      role: isWorker ? 'worker' : 'customer',
      full_name: isWorker ? 'Ramesh Kumar' : 'Aarav Mehta',
      phone: '+91 98765 43210', locality: 'andheri'
    };
    this.saveCachedUser(mockUser, mockProfile);
    this.notifyListeners('SIGNED_IN', { user: mockUser });
    return { data: { user: mockUser, profile: mockProfile }, error: null };
  }

  signInDemoCustomer() {
    const mockUser = {
      id: 'demo_customer_101', email: 'customer.demo@localkaam.in',
      user_metadata: { full_name: 'Aarav Mehta', role: 'customer', phone: '+91 98765 43210', locality: 'andheri' }
    };
    const mockProfile = {
      id: 'demo_customer_101', email: 'customer.demo@localkaam.in',
      role: 'customer', full_name: 'Aarav Mehta', phone: '+91 98765 43210', locality: 'andheri'
    };
    this.saveCachedUser(mockUser, mockProfile);
    this.notifyListeners('SIGNED_IN', { user: mockUser });
    Toast.show('Signed in as Demo Customer (Aarav Mehta)!', 'success');
  }

  signInDemoWorker() {
    const mockUser = {
      id: 'demo_worker_w1', email: 'ramesh.worker@localkaam.in',
      user_metadata: { full_name: 'Ramesh Kumar', role: 'worker', phone: '+91 98211 44551', locality: 'andheri' }
    };
    const mockProfile = {
      id: 'demo_worker_w1', email: 'ramesh.worker@localkaam.in',
      role: 'worker', full_name: 'Ramesh Kumar', phone: '+91 98211 44551', locality: 'andheri'
    };
    this.saveCachedUser(mockUser, mockProfile);
    this.notifyListeners('SIGNED_IN', { user: mockUser });
    Toast.show('Signed in as Demo Worker (Ramesh Kumar - Plumber)!', 'success');
  }

  // ========================================================================
  // AUTH MODAL UI — Email + Password + Google + Demo
  // ========================================================================
  showAuthModal(onSuccess) {
    const existing = document.getElementById('auth-modal');
    if (existing) existing.remove();

    const isSupabaseLive = SupabaseService.isConfigured();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'auth-modal';

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 460px; padding: 2rem;">
        <button class="modal-close" id="auth-close-btn">&times;</button>
        
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div class="nav-logo" style="margin: 0 auto 0.75rem auto; width: 44px; height: 44px; font-size: 1.3rem;">LK</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">Welcome to LocalKaam</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">
            ${isSupabaseLive ? '🟢 Supabase Auth Active' : '⚡ Demo Mode — connect Supabase in ⚡ settings'}
          </p>
        </div>

        <!-- Google Sign-In Button -->
        <button id="google-signin-btn" class="btn btn-outline" style="width: 100%; padding: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.6rem; font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; border-radius: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
          <div style="flex: 1; height: 1px; background: var(--border-color);"></div>
          <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">OR</span>
          <div style="flex: 1; height: 1px; background: var(--border-color);"></div>
        </div>

        <!-- Auth Tabs -->
        <div style="display: flex; border-bottom: 2px solid var(--border-color); margin-bottom: 1.25rem;">
          <button id="tab-signin-btn" class="auth-tab-btn active" style="flex: 1; padding: 0.6rem; background: none; border: none; border-bottom: 2px solid var(--accent-primary); font-weight: 700; color: var(--accent-primary); cursor: pointer; font-size: 0.9rem;">
            Sign In
          </button>
          <button id="tab-signup-btn" class="auth-tab-btn" style="flex: 1; padding: 0.6rem; background: none; border: none; border-bottom: 2px solid transparent; font-weight: 600; color: var(--text-secondary); cursor: pointer; font-size: 0.9rem;">
            Create Account
          </button>
        </div>

        <!-- Sign In Form -->
        <form id="form-signin" style="display: flex; flex-direction: column; gap: 0.85rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.3rem;">Email Address</label>
            <input type="email" id="signin-email" class="form-control" placeholder="aarav@example.com" required>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.3rem;">Password</label>
            <input type="password" id="signin-password" class="form-control" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn btn-primary" id="btn-submit-signin" style="width: 100%; padding: 0.7rem; margin-top: 0.25rem;">
            Sign In
          </button>
        </form>

        <!-- Sign Up Form (hidden by default) -->
        <form id="form-signup" style="display: none; flex-direction: column; gap: 0.85rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.3rem;">Account Type</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-size: 0.85rem;">
                <input type="radio" name="signup-role" value="customer" checked> 🏠 Customer
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-size: 0.85rem;">
                <input type="radio" name="signup-role" value="worker"> 🛠️ Worker
              </label>
            </div>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.3rem;">Full Name</label>
            <input type="text" id="signup-fullname" class="form-control" placeholder="e.g. Ramesh Kumar" required>
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.3rem;">Email Address</label>
            <input type="email" id="signup-email" class="form-control" placeholder="ramesh@example.com" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.3rem;">Phone</label>
              <input type="tel" id="signup-phone" class="form-control" placeholder="+91 98211 44551" required>
            </div>
            <div>
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.3rem;">Locality</label>
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
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.3rem;">Password</label>
            <input type="password" id="signup-password" class="form-control" placeholder="Min. 6 characters" minlength="6" required>
          </div>
          <button type="submit" class="btn btn-primary" id="btn-submit-signup" style="width: 100%; padding: 0.7rem; margin-top: 0.25rem;">
            Create Account
          </button>
        </form>

        <!-- Error display area -->
        <div id="auth-error-display" style="display: none; margin-top: 0.75rem; padding: 0.6rem 0.75rem; background: rgba(239,68,68,0.1); border: 1px solid var(--danger); border-radius: 8px; font-size: 0.85rem; color: var(--danger);"></div>

        <!-- Quick Demo Login -->
        <div style="margin-top: 1.25rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color);">
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); text-align: center; margin-bottom: 0.6rem;">
            ⚡ Quick 1-Click Demo Login (no account needed)
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-outline btn-sm" id="quick-customer-btn" style="flex: 1; font-size: 0.8rem;">
              🏠 Customer (Aarav)
            </button>
            <button class="btn btn-outline btn-sm" id="quick-worker-btn" style="flex: 1; font-size: 0.8rem;">
              🛠️ Worker (Ramesh)
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    const showError = (msg) => {
      const errorDiv = modal.querySelector('#auth-error-display');
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
      setTimeout(() => { errorDiv.style.display = 'none'; }, 6000);
    };

    modal.querySelector('#auth-close-btn').onclick = close;

    // ---- Google Sign-In ----
    modal.querySelector('#google-signin-btn').onclick = async () => {
      const btn = modal.querySelector('#google-signin-btn');
      btn.disabled = true;
      btn.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Redirecting to Google...';

      if (!isSupabaseLive) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Continue with Google';
        showError('Google Sign-In requires Supabase to be configured and Google OAuth enabled in your Supabase Dashboard.');
        return;
      }

      const { error } = await this.signInWithGoogle();
      if (error) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Continue with Google';
        showError(error.message || 'Google Sign-In failed. Make sure Google OAuth is enabled in your Supabase Dashboard under Authentication > Providers.');
      }
      // If success, the browser redirects to Google; the modal won't be visible after return.
    };

    // ---- Tab switching ----
    const tabSignIn = modal.querySelector('#tab-signin-btn');
    const tabSignUp = modal.querySelector('#tab-signup-btn');
    const formSignIn = modal.querySelector('#form-signin');
    const formSignUp = modal.querySelector('#form-signup');

    tabSignIn.onclick = () => {
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
      tabSignUp.style.borderBottomColor = 'var(--accent-primary)';
      tabSignUp.style.color = 'var(--accent-primary)';
      tabSignUp.style.fontWeight = '700';
      tabSignIn.style.borderBottomColor = 'transparent';
      tabSignIn.style.color = 'var(--text-secondary)';
      tabSignIn.style.fontWeight = '600';
      formSignUp.style.display = 'flex';
      formSignIn.style.display = 'none';
    };

    // ---- Email Sign In ----
    formSignIn.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = modal.querySelector('#btn-submit-signin');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      const email = modal.querySelector('#signin-email').value;
      const password = modal.querySelector('#signin-password').value;

      const { data, error } = await this.signIn({ email, password });
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';

      if (error) {
        showError(error.message || 'Sign in failed. Check your email and password.');
      } else {
        Toast.show('Successfully signed in!', 'success');
        close();
        if (onSuccess) onSuccess(this.currentUser, this.currentProfile);
      }
    };

    // ---- Email Sign Up ----
    formSignUp.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = modal.querySelector('#btn-submit-signup');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      const fullName = modal.querySelector('#signup-fullname').value;
      const email = modal.querySelector('#signup-email').value;
      const phone = modal.querySelector('#signup-phone').value;
      const locality = modal.querySelector('#signup-locality').value;
      const password = modal.querySelector('#signup-password').value;
      const role = modal.querySelector('input[name="signup-role"]:checked')?.value || 'customer';

      const { data, error } = await this.signUp({ email, password, fullName, phone, role, locality });
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';

      if (error) {
        showError(error.message || 'Sign up failed. Please try a different email or stronger password.');
      } else {
        // Check if email confirmation is required
        if (data?.user && !data?.session) {
          Toast.show('Account created! Check your email for a confirmation link.', 'info');
        } else {
          Toast.show(`Account created! Signed in as ${role}.`, 'success');
        }
        close();
        if (onSuccess) onSuccess(this.currentUser, this.currentProfile);
      }
    };

    // ---- Quick Demo Logins ----
    modal.querySelector('#quick-customer-btn').onclick = () => {
      this.signInDemoCustomer();
      close();
      if (onSuccess) onSuccess(this.currentUser, this.currentProfile);
    };
    modal.querySelector('#quick-worker-btn').onclick = () => {
      this.signInDemoWorker();
      close();
      if (onSuccess) onSuccess(this.currentUser, this.currentProfile);
    };
  }
}

export const AuthService = new AuthServiceManager();
