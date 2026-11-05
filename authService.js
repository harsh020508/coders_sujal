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

  _isOAuthCallbackUrl() {
    try {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      return Boolean(hash.includes('access_token') || hash.includes('error') || search.includes('code=') || search.includes('error='));
    } catch (e) { return false; }
  }

  _readPendingAuthRole() {
    try {
      const pending = localStorage.getItem('localkaam_pending_auth_role');
      return (pending === 'worker' || pending === 'customer') ? pending : null;
    } catch (e) { return null; }
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
        // Do not wipe state while an OAuth/PKCE callback is still being exchanged;
        // handleOAuthCallback() will establish the session shortly.
        if (!this._isOAuthCallbackUrl()) this.clearSessionState();
        else console.log('[Auth] OAuth callback pending; keeping local state until exchange completes.');
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
    this._roleOverride = null;
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
              // Prefer the pending OAuth role over generic user metadata
              const pendingRole = this._readPendingAuthRole() || safeProfile.role;
              safeProfile.role = pendingRole === 'worker' ? 'worker' : 'customer';
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

    // An explicit setRole() (e.g. pending OAuth role) must win over a
    // racing syncUserProfile() from the auth listener.
    if (this._roleOverride && this.currentProfile) {
      this.currentProfile.role = this._roleOverride;
    } else {
      const pendingRole = this._readPendingAuthRole();
      if (pendingRole && this.currentProfile) this.currentProfile.role = pendingRole;
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
  isGuest() {
    return String(this.currentUser?.id || '').startsWith('guest_');
  }

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
  loginGuest(role = 'customer') {
    const isWorker = role === 'worker';
    const guestUser = {
      id: isWorker ? 'guest_worker_01' : 'guest_customer_01',
      email: isWorker ? 'rajesh.kumar@localkaam.demo' : 'aarav.mehta@localkaam.demo',
      user_metadata: {
        full_name: isWorker ? 'Rajesh Kumar (Worker)' : 'Aarav Mehta (Customer)',
        role: role,
        phone: '+91 98765 43210',
        locality: 'andheri'
      }
    };
    this.currentUser = guestUser;
    this.currentSession = {
      access_token: 'demo_guest_token_' + role + '_' + Date.now(),
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
      user: guestUser
    };
    this.currentProfile = {
      id: guestUser.id,
      email: guestUser.email,
      role: role,
      full_name: guestUser.user_metadata.full_name,
      phone: guestUser.user_metadata.phone,
      locality: 'andheri',
      avatar_url: ''
    };
    this.saveCachedProfileDisplay(this.currentProfile);
    this.notifyListeners('SIGNED_IN', this.currentSession);
    return { user: guestUser, profile: this.currentProfile };
  }

  setRole(role) {
    const validRole = role === 'worker' ? 'worker' : 'customer';
    this._roleOverride = validRole;
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
              category: 'general',
              skills: ['General Service'],
              experience: 1,
              hourly_rate: 300,
              base_locality: locality,
              service_radius: 10,
              working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
              working_hours: { start: '09:00', end: '18:00' },
              available: false,
              verification_status: 'Pending',
              rating_average: 0,
              rating_count: 0,
              phone,
              bio: `${fullName} - Service professional in ${locality}. Verification pending.`
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

  // Exchange the OAuth/PKCE callback URL for a session and resolve the
  // dashboard role. Safe to call on every boot: it no-ops when there is
  // no callback or an existing session is already loaded.
  async handleOAuthCallback() {
    const client = await SupabaseService.getClient();
    if (!client) return { session: null, targetRole: null, error: new Error('Supabase is not configured.') };

    let session = null;
    let oauthError = null;

    const pollForSession = async (tries, delayMs) => {
      for (let i = 0; i < tries; i++) {
        try {
          const { data } = await client.auth.getSession();
          if (data && data.session && data.session.user) return data.session;
        } catch (e) { /* keep polling */ }
        await new Promise((r) => setTimeout(r, delayMs));
      }
      return null;
    };

    // 0. If the client's auto-exchange already produced a session, use it.
    //    Calling exchangeCodeForSession again would replay an already-used
    //    code and fail with "Unable to exchange external code".
    session = await pollForSession(5, 400);

    // 1. PKCE flow: Supabase returns ?code=xxx — getSession() alone
    //    will never produce a session until the code is exchanged.
    if (!session) {
      try {
        const params = new URLSearchParams(window.location.search || '');
        const code = params.get('code');
        const urlError = params.get('error_description') || params.get('error');
        if (urlError) oauthError = new Error(decodeURIComponent(urlError));
        if (code && typeof client.auth.exchangeCodeForSession === 'function') {
          console.log('[Auth] Exchanging PKCE code for session…');
          const { data, error } = await client.auth.exchangeCodeForSession(code);
          if (error) {
            // Code replay / verifier missing is often harmless when the
            // auto-exchange succeeded — fall through to polling.
            console.warn('[Auth] exchangeCodeForSession error (will still poll for session):', error.message || error);
            oauthError = oauthError || error;
          } else if (data && data.session) {
            session = data.session;
            console.log('[Auth] PKCE exchange succeeded.');
          }
        }
      } catch (e) {
        console.warn('[Auth] PKCE exchange exception (will still poll for session):', e);
        oauthError = oauthError || e;
      }
    }

    // 2. Implicit flow / persisted session / slow SDK parse: poll longer.
    if (!session) {
      session = await pollForSession(30, 400);
    }

    // Also honour a session already established by initSession().
    if (!session && this.currentSession && this.currentUser) {
      session = this.currentSession;
    }

    if (!session || !session.user) {
      if (oauthError) console.warn('[Auth] OAuth callback did not yield a session:', oauthError.message || oauthError);
      return { session: null, targetRole: null, error: oauthError || new Error('Sign-in could not be completed. Please try again.') };
    }

    // 3. Resolve the role: the pre-OAuth pending choice wins so the app
    //    never silently drops the user back on the landing page.
    const pendingRole = this._readPendingAuthRole();
    try { localStorage.removeItem('localkaam_pending_auth_role'); } catch (e) {}

    this.currentSession = session;
    this.currentUser = session.user;
    await this.syncUserProfile(session.user);

    const metaRole = String((session.user.user_metadata || {}).role || '').toLowerCase();
    const targetRole = pendingRole
      || (metaRole === 'worker' ? 'worker' : null)
      || (this.currentProfile && this.currentProfile.role === 'worker' ? 'worker' : 'customer');

    this.setRole(targetRole);
    // Make sure a Google worker landing via OAuth gets its own worker
    // entry instead of falling back to sample worker "w1" in the dashboard.
    if (targetRole === 'worker') this.ensureLocalWorkerEntry(session.user).catch(() => {});

    this.notifyListeners('SIGNED_IN', session);
    return { session, targetRole, error: null };
  }

  // Best-effort: create a local worker placeholder linked to this auth user
  // so the worker dashboard renders onboarding (not another sample worker).
  async ensureLocalWorkerEntry(user) {
    try {
      const { StorageService } = await import('./storage.js');
      const workers = StorageService.getWorkers() || [];
      const userId = String(user.id || '');
      const partial = userId ? userId.substring(0, 8) : '';
      const found = workers.some((w) => {
        if (!w) return false;
        if (w.user_id && String(w.user_id) === userId) return true;
        if (w.userId && String(w.userId) === userId) return true;
        if (partial && w.id === `w_${partial}`) return true;
        return false;
      });
      if (found) return null;
      const profile = this.currentProfile || {};
      const fallback = {
        id: partial ? `w_${partial}` : `w-${Date.now()}`,
        user_id: userId || null,
        userId: userId || null,
        name: profile.full_name || (user.email ? user.email.split('@')[0] : 'New Professional'),
        phone: profile.phone || (user.user_metadata && user.user_metadata.phone) || '',
        bio: profile.bio || 'Newly registered professional.',
        baseLocality: profile.locality || 'andheri',
        serviceArea: 'Mumbai Suburbs',
        serviceRadius: 10,
        available: false,
        pauseNewBookings: false,
        profileCompleted: false,
        verificationStatus: 'Pending',
        ratingAverage: 0,
        ratingCount: 0,
        specialities: {},
        skills: [],
        avatar: profile.avatar_url || (user.user_metadata && (user.user_metadata.avatar_url || user.user_metadata.picture)) || ''
      };
      workers.push(fallback);
      StorageService.saveWorkers(workers);
      StorageService.setSelectedWorkerId(fallback.id);
      return fallback;
    } catch (e) {
      console.warn('[Auth] Could not create local worker entry:', e);
      return null;
    }
  }

  // ========================================================================
  // SECURE SIGN OUT
  // ========================================================================
  async signOut() {
    if (this.isGuest()) {
      this.clearSessionState();
      this.notifyListeners('SIGNED_OUT', null);
      return { success: true, error: null };
    }
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
  // ACCOUNT MANAGEMENT
  // ========================================================================
  isDemoAccount() {
    if (!this.currentUser) return true;
    const id = String(this.currentUser.id || '');
    return id.startsWith('demo_') || id.startsWith('usr_');
  }

  isSupabaseAccount() {
    return Boolean(this.currentUser && !this.isDemoAccount());
  }

  async updateProfile(updates = {}) {
    const current = this.getProfile();
    if (!current) {
      return { profile: null, error: { message: 'No signed-in profile was found.' }, synced: false };
    }

    const result = {
      profile: null,
      error: null,
      syncError: null,
      synced: false,
      emailConfirmation: false
    };

    const client = await SupabaseService.getClient();
    const canSync = Boolean(client && this.isSupabaseAccount());

    if (canSync) {
      try {
        const profilePatch = { id: this.currentUser.id, email: this.currentUser.email };
        ['full_name', 'phone', 'locality', 'avatar_url'].forEach((key) => {
          if (updates[key] !== undefined) profilePatch[key] = updates[key];
        });

        const { error: profileError } = await client
          .from('profiles')
          .upsert(profilePatch, { onConflict: 'id' });

        if (profileError) {
          result.syncError = profileError;
        } else {
          result.synced = true;
        }

        // Username and bio are stored in auth metadata because they are not
        // part of the current public.profiles schema.
        const metadataPatch = {};
        ['username', 'bio'].forEach((key) => {
          if (updates[key] !== undefined) metadataPatch[key] = updates[key];
        });
        if (updates.full_name !== undefined) metadataPatch.full_name = updates.full_name;
        if (updates.phone !== undefined) metadataPatch.phone = updates.phone;
        if (updates.locality !== undefined) metadataPatch.locality = updates.locality;

        if (Object.keys(metadataPatch).length) {
          const { error: metadataError } = await client.auth.updateUser({ data: metadataPatch });
          if (metadataError) result.syncError = result.syncError || metadataError;
        }

        if (updates.email && updates.email !== this.currentUser.email) {
          const { error: emailError } = await client.auth.updateUser({ email: updates.email });
          if (emailError) {
            result.error = emailError;
          } else {
            result.emailConfirmation = true;
          }
        }
      } catch (err) {
        result.syncError = err;
      }
    }

    const updatedProfile = { ...current, ...updates };
    // If Supabase requires email confirmation, keep showing the verified email
    // until the user completes the confirmation flow.
    if (result.emailConfirmation) updatedProfile.email = current.email;

    this.currentProfile = updatedProfile;
    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        email: updatedProfile.email || this.currentUser.email,
        user_metadata: {
          ...(this.currentUser.user_metadata || {}),
          ...(updates.full_name !== undefined ? { full_name: updates.full_name } : {}),
          ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
          ...(updates.locality !== undefined ? { locality: updates.locality } : {}),
          ...(updates.username !== undefined ? { username: updates.username } : {}),
          ...(updates.bio !== undefined ? { bio: updates.bio } : {})
        }
      };
    }
    this.saveCachedProfileDisplay(this.currentProfile);
    this.notifyListeners('USER_UPDATED', { user: this.currentUser });
    result.profile = this.currentProfile;
    return result;
  }

  async changePassword(newPassword) {
    if (!newPassword || String(newPassword).length < 8) {
      return { data: null, error: { message: 'Password must be at least 8 characters long.' } };
    }
    const client = await SupabaseService.getClient();
    if (!client || !this.isSupabaseAccount()) {
      return {
        data: null,
        error: { message: 'Password changes require a Supabase account. Local demo accounts do not have a password.' }
      };
    }
    try {
      const { data, error } = await client.auth.updateUser({ password: newPassword });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async getSessionInfo() {
    const client = await SupabaseService.getClient();
    if (!client || !this.isSupabaseAccount()) {
      return {
        mode: 'local',
        session: null,
        user: this.currentUser,
        profile: this.currentProfile,
        error: null
      };
    }
    try {
      const { data, error } = await client.auth.getSession();
      return {
        mode: 'supabase',
        session: data?.session || null,
        user: data?.session?.user || this.currentUser,
        profile: this.currentProfile,
        error
      };
    } catch (err) {
      return { mode: 'supabase', session: null, user: this.currentUser, profile: this.currentProfile, error: err };
    }
  }

  async signOutAllDevices() {
    const client = await SupabaseService.getClient();
    if (client && this.isSupabaseAccount()) {
      try {
        await client.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('Global sign out error:', err);
      }
    }
    this.clearSessionState();
    this.notifyListeners('SIGNED_OUT', null);
    return { success: true };
  }

  // ========================================================================
  // DEMO (OFFLINE) HELPERS
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
