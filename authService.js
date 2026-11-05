// LocalKaam - Secure Supabase Authentication & Session Management Service
// Strictly authenticates via Supabase Auth (JWT/OAuth), eliminating insecure localStorage mock bypasses.

import { SupabaseService } from './supabaseClient.js';
import { Toast } from './toast.js';

const PROFILE_DISPLAY_CACHE_KEY = 'localkaam_profile_display';

class AuthServiceManager {
  constructor() {
    this.currentUser = null;
    this.currentSession = null;
    this.currentProfile = null;
    this.cachedProfile = null;
    this.listeners = [];
    this.authListenerSubscription = null;
    this.isInitialized = false;

    // Load non-authoritative profile display cache (name, avatar only)
    this.loadCachedProfileDisplay();

    // Asynchronously initialize Supabase session validation
    this.initPromise = this.initSession();
  }

  /**
   * Loads non-authoritative display information.
   * NOTE: This does NOT establish authentication or populate currentUser.
   */
  loadCachedProfileDisplay() {
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(PROFILE_DISPLAY_CACHE_KEY);
        if (cached) {
          this.cachedProfile = JSON.parse(cached);
        }
      }
    } catch (e) {
      console.warn('[Auth] Error reading cached display profile:', e);
      this.cachedProfile = null;
    }
  }

  saveCachedProfileDisplay(profile) {
    this.cachedProfile = profile;
    try {
      if (typeof localStorage !== 'undefined') {
        if (profile) {
          localStorage.setItem(PROFILE_DISPLAY_CACHE_KEY, JSON.stringify({
            id: profile.id,
            full_name: profile.full_name,
            role: profile.role,
            locality: profile.locality,
            avatar_url: profile.avatar_url
          }));
        } else {
          localStorage.removeItem(PROFILE_DISPLAY_CACHE_KEY);
        }
      }
    } catch (e) {
      console.warn('[Auth] Error saving display profile cache:', e);
    }
  }

  clearCachedProfile() {
    this.cachedProfile = null;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(PROFILE_DISPLAY_CACHE_KEY);
        // Clear any old insecure cache keys from prior versions
        localStorage.removeItem('localkaam_cached_user');
      }
    } catch (e) {}
  }

  /**
   * Validates active session with Supabase and binds auth state listener.
   */
  async initSession() {
    const client = await SupabaseService.getClient();
    if (!client) {
      this.isInitialized = true;
      return null;
    }

    try {
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        console.warn('[Auth] getSession error during init:', sessionError);
        if (!this.currentSession || this._isSessionExpired(this.currentSession)) this.clearSessionState();
      } else if (session && session.user && !this._isSessionExpired(session)) {
        this.currentSession = session;
        this.currentUser = session.user;
        await this.syncUserProfile(session.user);
        this.notifyListeners('SIGNED_IN', session);
      } else if (!this.currentSession || this._isSessionExpired(this.currentSession)) {
        this.clearSessionState();
      }

      // Avoid duplicate listener attachments
      if (!this.authListenerSubscription) {
        const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
          console.log('[Auth] Auth state change event:', event, session?.user?.email || '(no user)');

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (session && session.user) {
              this.currentSession = session;
              this.currentUser = session.user;
              await this.syncUserProfile(session.user);
            } else if (!session) {
              // No session on SIGNED_IN usually means OAuth was cancelled server-side
              this.clearSessionState();
            }
          } else if (event === 'SIGNED_OUT') {
            this.clearSessionState();
          }

          this.notifyListeners(event, this.currentSession);
        });
        this.authListenerSubscription = subscription;
      }
    } catch (err) {
      console.warn('[Auth] Failed to initialize session:', err);
      this.clearSessionState();
    } finally {
      this.isInitialized = true;
    }

    return this.currentSession;
  }

  async waitForInit() {
    if (this.isInitialized) return this.currentSession;
    return this.initPromise;
  }

  clearSessionState() {
    this.currentUser = null;
    this.currentSession = null;
    this.currentProfile = null;
    this.clearCachedProfile();
  }

  _isSessionExpired(session) {
    if (!session || !session.access_token) return true;
    // Only check expiry if expires_at is present — fresh OAuth tokens may not have it yet
    if (session.expires_at) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      // Add 30s buffer to avoid race conditions on fresh tokens
      return session.expires_at <= (nowSeconds - 30);
    }
    return false; // If no expires_at, trust the session
  }

  /**
   * Synchronizes user profile from the trusted Supabase database.
   * Prevents self-escalated roles in client metadata from superseding DB state.
   */
  async syncUserProfile(user) {
    if (!user) {
      this.currentProfile = null;
      return;
    }

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
          console.warn('[Auth] Profile fetch failed:', error.code, error.message);
          this.currentProfile = this._buildSafeProfileFromUser(user);

          // If profile row doesn't exist yet, attempt creation with sanitized role
          if (error.code === 'PGRST116') {
            try {
              const safeProfile = this._buildSafeProfileFromUser(user);
              safeProfile.avatar_url = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
              await client.from('profiles').upsert(safeProfile);
              this.currentProfile = safeProfile;
            } catch (insertErr) {
              console.warn('[Auth] Safe profile upsert failed:', insertErr);
            }
          }
        } else if (profile && profile.id === user.id) {
          // Trusted database profile
          this.currentProfile = profile;
        } else {
          this.currentProfile = this._buildSafeProfileFromUser(user);
        }
      } catch (e) {
        console.warn('[Auth] syncUserProfile exception:', e);
        this.currentProfile = this._buildSafeProfileFromUser(user);
      }
    } else {
      this.currentProfile = this._buildSafeProfileFromUser(user);
    }

    this.saveCachedProfileDisplay(this.currentProfile);
  }

  /**
   * Sanitizes role: public metadata can NEVER yield 'admin' role.
   */
  _buildSafeProfileFromUser(user) {
    const meta = user.user_metadata || {};
    const requestedRole = (meta.role || '').toLowerCase();
    const sanitizedRole = requestedRole === 'worker' ? 'worker' : 'customer';

    return {
      id: user.id,
      email: user.email,
      role: sanitizedRole,
      full_name: meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'User'),
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
        console.error('[Auth] Error in auth listener callback:', e);
      }
    });
  }

  /**
   * Evaluates verified active session.
   * True only if user AND unexpired session token exist.
   */
  isAuthenticated() {
    if (!this.currentUser || !this.currentSession) return false;
    return !this._isSessionExpired(this.currentSession);
  }

  getUser() {
    return this.currentUser;
  }

  getSession() {
    return this.currentSession;
  }

  getAccessToken() {
    if (!this.isAuthenticated()) return null;
    return this.currentSession?.access_token || null;
  }

  getProfile() {
    return this.currentProfile || this.cachedProfile;
  }

  // ========================================================================
  setRole(role) {
    const validRole = role === 'worker' ? 'worker' : 'customer';
    if (!this.currentProfile) {
      if (this.currentUser) {
        this.currentProfile = this._buildSafeProfileFromUser(this.currentUser);
      } else {
        this.currentProfile = { role: validRole };
      }
    }
    this.currentProfile.role = validRole;
    this.saveCachedProfileDisplay(this.currentProfile);

    // Update role asynchronously in Supabase profiles if user is logged in
    (async () => {
      try {
        const client = await SupabaseService.getClient();
        if (client && this.currentUser) {
          await client.from('profiles').update({ role: validRole }).eq('id', this.currentUser.id);
        }
      } catch (e) {
        console.warn('[Auth] Async role update warning:', e);
      }
    })();
  }

  // EMAIL / PASSWORD REGISTRATION
  // ========================================================================
  async signUp({ email, password, fullName, phone, role = 'customer', locality = 'andheri' }) {
    const client = await SupabaseService.getClient();

    if (!client) {
      return {
        data: null,
        error: new Error('Supabase authentication is not configured. Please configure Supabase in settings.')
      };
    }

    // Role Escalation Prevention: Public registration may only create 'customer' or 'worker' accounts
    const sanitizedRole = role === 'worker' ? 'worker' : 'customer';

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role: sanitizedRole,
            locality
          }
        }
      });

      if (error) return { data: null, error };

      if (data.user) {
        // Upsert into public.profiles with strictly sanitized role
        try {
          await client.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            role: sanitizedRole,
            full_name: fullName,
            phone,
            locality
          });
        } catch (profileErr) {
          console.warn('[Auth] Profile upsert failed:', profileErr);
        }

        // If worker, register initial worker entry
        if (sanitizedRole === 'worker') {
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
            console.warn('[Auth] Worker initial upsert failed:', workerErr);
          }
        }

        if (data.session) {
          this.currentSession = data.session;
          this.currentUser = data.user;
          await this.syncUserProfile(data.user);
          this.notifyListeners('SIGNED_IN', data.session);
        }
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
      return {
        data: null,
        error: new Error('Supabase authentication is not configured. Please configure Supabase in settings.')
      };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { data: null, error };

      if (data.session && data.user) {
        this.currentSession = data.session;
        this.currentUser = data.user;
        await this.syncUserProfile(data.user);
        this.notifyListeners('SIGNED_IN', data.session);
      }
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // ========================================================================
  // GENUINE GOOGLE OAUTH
  // ========================================================================
  async signInWithGoogle() {
    const client = await SupabaseService.getClient();

    if (!client) {
      const err = new Error('Supabase is not configured. Please configure Supabase first to use Google Sign-In.');
      Toast.show(err.message, 'warning');
      return { data: null, error: err };
    }

    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      const err = new Error('Google Sign-In requires running through a local web server (e.g. http://localhost:3000), not file:// protocol.');
      Toast.show(err.message, 'warning');
      return { data: null, error: err };
    }

    try {
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
        console.error('[Auth] Google OAuth error:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('[Auth] Google Sign-In exception:', err);
      return { data: null, error: err };
    }
  }

  // ========================================================================
  // SECURE SIGN OUT
  // ========================================================================
  async signOut() {
    const client = await SupabaseService.getClient();
    if (client) {
      try {
        const { error } = await client.auth.signOut();
        if (error) {
          console.error('[Auth] Supabase signOut error:', error);
          return { success: false, error };
        }
      } catch (e) {
        console.error('[Auth] Supabase signOut exception:', e);
        return { success: false, error: e };
      }
    }

    // Only clear local user and profile state upon provider confirmation
    this.clearSessionState();
    this.notifyListeners('SIGNED_OUT', null);
    return { success: true, error: null };
  }

  // ========================================================================
  // DEVELOPMENT ONLY DEMO HELPERS (STRICTLY DISABLED IN PRODUCTION)
  // ========================================================================
  isDemoAllowed() {
    if (typeof window !== 'undefined') {
      return Boolean(window.LOCALKAAM_ENABLE_DEMO_AUTH === true);
    }
    return false;
  }

  signInDemoCustomer() {
    if (!this.isDemoAllowed()) {
      const err = new Error('Demo authentication is disabled in production.');
      Toast.show(err.message, 'error');
      return { data: null, error: err };
    }
    console.warn('[Security] Demo authentication invoked in development mode');
    return { data: null, error: new Error('Demo accounts are disabled.') };
  }

  signInDemoWorker() {
    if (!this.isDemoAllowed()) {
      const err = new Error('Demo authentication is disabled in production.');
      Toast.show(err.message, 'error');
      return { data: null, error: err };
    }
    console.warn('[Security] Demo authentication invoked in development mode');
    return { data: null, error: new Error('Demo accounts are disabled.') };
  }

  async showAuthModal(onSuccess) {
    const { AuthModal } = await import('./authModal.js');
    AuthModal.show('customer', onSuccess);
  }
}

export const AuthService = new AuthServiceManager();
