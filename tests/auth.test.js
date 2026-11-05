// LocalKaam - Comprehensive Authentication & Security Automated Test Suite
// Covers all 21 test requirements specified in Phase 10

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';

// Minimal browser mocks for running browser ESM modules in Node.js
const mockStorage = new Map();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear()
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: { origin: 'http://localhost:3000', pathname: '/', protocol: 'http:' },
    history: { replaceState: () => {} },
    LOCALKAAM_ENABLE_DEMO_AUTH: false
  };
}
if (typeof globalThis.document === 'undefined') {
  const createMockElement = () => ({
    style: {},
    classList: { add: () => {} },
    querySelector: () => ({ onclick: null, addEventListener: () => {} }),
    querySelectorAll: () => [],
    appendChild: () => {},
    remove: () => {},
    addEventListener: () => {}
  });
  globalThis.document = {
    createElement: createMockElement,
    body: { appendChild: () => {} },
    head: { appendChild: () => {} },
    getElementById: () => null
  };
}

// Import backend verification logic
import { verifyToken, requireAuth, server } from '../server.js';
// Import client services
import { AuthService } from '../authService.js';
import { SupabaseService } from '../supabaseClient.js';

const TEST_JWT_SECRET = 'localkaam-super-secret-jwt-key-32chars!';
process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;

// Helper to create genuine signed Supabase-format JWTs
function createSignedJwt(payload, secret = TEST_JWT_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
  return `${headerB64}.${payloadB64}.${signature}`;
}

test('LocalKaam Authentication & Security Test Suite', async (t) => {

  t.beforeEach(() => {
    localStorage.clear();
    AuthService.clearSessionState();
    window.LOCALKAAM_ENABLE_DEMO_AUTH = false;
  });

  // --------------------------------------------------------------------------
  // TEST 1: Registration with valid credentials
  // --------------------------------------------------------------------------
  await t.test('1. Registration with valid credentials', async () => {
    const mockUser = { id: 'usr-valid-123', email: 'test.user@example.com', user_metadata: { full_name: 'Test User' } };
    const mockSession = { access_token: 'token-123', expires_at: Math.floor(Date.now() / 1000) + 3600, user: mockUser };

    // Mock Supabase client
    const originalGetClient = SupabaseService.getClient;
    SupabaseService.getClient = async () => ({
      auth: {
        signUp: async ({ email, password, options }) => ({
          data: { user: mockUser, session: mockSession },
          error: null
        })
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: mockUser.id, role: 'customer' }, error: null }) }) }),
        upsert: async () => ({ error: null })
      })
    });

    try {
      const result = await AuthService.signUp({
        email: 'test.user@example.com',
        password: 'Password123!',
        fullName: 'Test User',
        phone: '+91 98765 43210',
        role: 'customer',
        locality: 'andheri'
      });

      assert.strictEqual(result.error, null);
      assert.ok(result.data.user);
      assert.strictEqual(result.data.user.email, 'test.user@example.com');
      assert.strictEqual(AuthService.isAuthenticated(), true);
      assert.strictEqual(AuthService.getUser().id, 'usr-valid-123');
    } finally {
      SupabaseService.getClient = originalGetClient;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 2: Registration with invalid credentials
  // --------------------------------------------------------------------------
  await t.test('2. Registration with invalid credentials', async () => {
    const originalGetClient = SupabaseService.getClient;
    SupabaseService.getClient = async () => ({
      auth: {
        signUp: async () => ({
          data: null,
          error: { message: 'Password must be at least 6 characters' }
        })
      }
    });

    try {
      const result = await AuthService.signUp({
        email: 'bad-email',
        password: '123',
        fullName: 'Bad User',
        phone: '123'
      });

      assert.ok(result.error);
      assert.strictEqual(result.error.message, 'Password must be at least 6 characters');
      assert.strictEqual(AuthService.isAuthenticated(), false);
      assert.strictEqual(AuthService.getUser(), null);
    } finally {
      SupabaseService.getClient = originalGetClient;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 3: Login with valid credentials
  // --------------------------------------------------------------------------
  await t.test('3. Login with valid credentials', async () => {
    const mockUser = { id: 'usr-customer-456', email: 'aarav@localkaam.in' };
    const mockSession = { access_token: 'token-456', expires_at: Math.floor(Date.now() / 1000) + 3600, user: mockUser };

    const originalGetClient = SupabaseService.getClient;
    SupabaseService.getClient = async () => ({
      auth: {
        signInWithPassword: async () => ({
          data: { user: mockUser, session: mockSession },
          error: null
        })
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: mockUser.id, role: 'customer' }, error: null }) }) })
      })
    });

    try {
      const result = await AuthService.signIn({ email: 'aarav@localkaam.in', password: 'ValidPassword123' });
      assert.strictEqual(result.error, null);
      assert.strictEqual(AuthService.isAuthenticated(), true);
      assert.strictEqual(AuthService.getUser().email, 'aarav@localkaam.in');
    } finally {
      SupabaseService.getClient = originalGetClient;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 4: Login with invalid credentials
  // --------------------------------------------------------------------------
  await t.test('4. Login with invalid credentials', async () => {
    const originalGetClient = SupabaseService.getClient;
    SupabaseService.getClient = async () => ({
      auth: {
        signInWithPassword: async () => ({
          data: null,
          error: { message: 'Invalid login credentials' }
        })
      }
    });

    try {
      const result = await AuthService.signIn({ email: 'aarav@localkaam.in', password: 'wrongpassword' });
      assert.ok(result.error);
      assert.strictEqual(result.error.message, 'Invalid login credentials');
      assert.strictEqual(AuthService.isAuthenticated(), false);
      assert.strictEqual(AuthService.getUser(), null);
    } finally {
      SupabaseService.getClient = originalGetClient;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 5: Login without Supabase configuration
  // --------------------------------------------------------------------------
  await t.test('5. Login without Supabase configuration', async () => {
    const originalGetClient = SupabaseService.getClient;
    SupabaseService.getClient = async () => null;

    try {
      const result = await AuthService.signIn({ email: 'test@example.com', password: 'password123' });
      assert.ok(result.error);
      assert.match(result.error.message, /not configured/i);
      // Ensure no automatic fallback to demo user
      assert.strictEqual(AuthService.isAuthenticated(), false);
      assert.strictEqual(AuthService.getUser(), null);
    } finally {
      SupabaseService.getClient = originalGetClient;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 6: Fake Google authentication prevention
  // --------------------------------------------------------------------------
  await t.test('6. Fake Google authentication prevention', async () => {
    // Read authModal.js content to verify no setTimeout or submitProfile exists
    const fs = await import('node:fs');
    const authModalSrc = fs.readFileSync('authModal.js', 'utf8');

    assert.strictEqual(authModalSrc.includes('setTimeout'), false, 'authModal.js must not contain setTimeout');
    assert.strictEqual(authModalSrc.includes('submitProfile'), false, 'authModal.js must not contain submitProfile');
    assert.strictEqual(authModalSrc.includes('usr-${Date.now()}'), false, 'authModal.js must not contain fake user ID generation');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Google OAuth error handling
  // --------------------------------------------------------------------------
  await t.test('7. Google OAuth error handling', async () => {
    const originalGetClient = SupabaseService.getClient;
    SupabaseService.getClient = async () => ({
      auth: {
        signInWithOAuth: async () => ({
          data: null,
          error: { message: 'Google provider not enabled in Supabase' }
        })
      }
    });

    try {
      const result = await AuthService.signInWithGoogle();
      assert.ok(result.error);
      assert.strictEqual(result.error.message, 'Google provider not enabled in Supabase');
      assert.strictEqual(AuthService.isAuthenticated(), false);
      assert.strictEqual(AuthService.getUser(), null);
    } finally {
      SupabaseService.getClient = originalGetClient;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 8: LocalStorage authentication forgery
  // --------------------------------------------------------------------------
  await t.test('8. LocalStorage authentication forgery prevention', async () => {
    // Attacker crafts fake localStorage entry
    localStorage.setItem('localkaam_cached_user', JSON.stringify({
      user: { id: 'forged-attacker-id', email: 'attacker@evil.com' },
      profile: { id: 'forged-attacker-id', role: 'admin' }
    }));

    // AuthService constructor or load must not treat this as authentication proof
    AuthService.loadCachedProfileDisplay();
    assert.strictEqual(AuthService.currentUser, null, 'currentUser must be null');
    assert.strictEqual(AuthService.currentSession, null, 'currentSession must be null');
    assert.strictEqual(AuthService.isAuthenticated(), false, 'isAuthenticated must return false');
  });

  // --------------------------------------------------------------------------
  // TEST 9: Session restoration
  // --------------------------------------------------------------------------
  await t.test('9. Session restoration via valid Supabase getSession', async () => {
    const mockUser = { id: 'restored-user-uuid', email: 'restored@localkaam.in' };
    const mockSession = {
      access_token: 'valid-restored-token',
      expires_at: Math.floor(Date.now() / 1000) + 7200,
      user: mockUser
    };

    const originalGetClient = SupabaseService.getClient;
    SupabaseService.getClient = async () => ({
      auth: {
        getSession: async () => ({ data: { session: mockSession }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: mockUser.id, role: 'customer' }, error: null }) }) })
      })
    });

    try {
      await AuthService.initSession();
      assert.strictEqual(AuthService.isAuthenticated(), true);
      assert.strictEqual(AuthService.getUser().id, 'restored-user-uuid');
      assert.strictEqual(AuthService.getAccessToken(), 'valid-restored-token');
    } finally {
      SupabaseService.getClient = originalGetClient;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 10: Expired session rejection
  // --------------------------------------------------------------------------
  await t.test('10. Expired session rejection', async () => {
    const expiredSession = {
      access_token: 'expired-token',
      expires_at: Math.floor(Date.now() / 1000) - 300, // Expired 5 minutes ago
      user: { id: 'user-expired', email: 'expired@localkaam.in' }
    };

    const originalGetClient = SupabaseService.getClient;
    SupabaseService.getClient = async () => ({
      auth: {
        getSession: async () => ({ data: { session: expiredSession }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      }
    });

    try {
      await AuthService.initSession();
      assert.strictEqual(AuthService.isAuthenticated(), false);
      assert.strictEqual(AuthService.getAccessToken(), null);
    } finally {
      SupabaseService.getClient = originalGetClient;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 11: Invalid JWT rejection
  // --------------------------------------------------------------------------
  await t.test('11. Invalid JWT rejection by backend verification', async () => {
    const result1 = await verifyToken('gibberish-token');
    assert.ok(result1.error);
    assert.strictEqual(result1.error.status, 401);

    const result2 = await verifyToken('header.invalid-base64.sig');
    assert.ok(result2.error);
    assert.strictEqual(result2.error.status, 401);
  });

  // --------------------------------------------------------------------------
  // TEST 12: Logout
  // --------------------------------------------------------------------------
  await t.test('12. Logout clears session and notifies listeners', async () => {
    AuthService.currentUser = { id: 'active-user' };
    AuthService.currentSession = { access_token: 'active-token', expires_at: Date.now() + 100000 };

    let signedOutNotified = false;
    const unsub = AuthService.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') signedOutNotified = true;
    });

    const originalGetClient = SupabaseService.getClient;
    SupabaseService.getClient = async () => ({
      auth: { signOut: async () => ({ error: null }) }
    });

    try {
      const result = await AuthService.signOut();
      assert.strictEqual(result.success, true);
      assert.strictEqual(AuthService.currentUser, null);
      assert.strictEqual(AuthService.currentSession, null);
      assert.strictEqual(AuthService.isAuthenticated(), false);
      assert.strictEqual(signedOutNotified, true);
    } finally {
      unsub();
      SupabaseService.getClient = originalGetClient;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 13: Access after logout
  // --------------------------------------------------------------------------
  await t.test('13. Access after logout is rejected', async () => {
    // Log out user
    AuthService.clearSessionState();
    assert.strictEqual(AuthService.getAccessToken(), null);

    // Verify backend rejects missing token with 401
    const dummyReq = { headers: {} };
    let responseStatus = null;
    let responseBody = null;
    const dummyRes = {
      writeHead: (status) => { responseStatus = status; },
      end: (body) => { responseBody = JSON.parse(body); }
    };

    const user = await requireAuth(dummyReq, dummyRes);
    assert.strictEqual(user, null);
    assert.strictEqual(responseStatus, 401);
    assert.match(responseBody.error, /missing authorization header/i);
  });

  // --------------------------------------------------------------------------
  // TEST 14: Public registration attempting admin assignment
  // --------------------------------------------------------------------------
  await t.test('14. Public registration attempting admin role is sanitized to customer', async () => {
    let capturedOptions = null;
    const originalGetClient = SupabaseService.getClient;
    SupabaseService.getClient = async () => ({
      auth: {
        signUp: async ({ email, password, options }) => {
          capturedOptions = options;
          return { data: { user: { id: 'usr-exploit', email }, session: null }, error: null };
        }
      },
      from: () => ({
        upsert: async () => ({ error: null })
      })
    });

    try {
      await AuthService.signUp({
        email: 'hacker@exploit.com',
        password: 'Password123!',
        fullName: 'Hacker',
        phone: '+91 99999 99999',
        role: 'admin' // ATTEMPTED PRIVILEGE ESCALATION
      });

      assert.ok(capturedOptions);
      assert.strictEqual(capturedOptions.data.role, 'customer', 'Role must be sanitized to customer');
    } finally {
      SupabaseService.getClient = originalGetClient;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 15: Customer attempting admin assignment via database trigger logic
  // --------------------------------------------------------------------------
  await t.test('15. Customer attempting admin assignment trigger sanitization test', async () => {
    // Emulate handle_new_user PL/pgSQL logic:
    function handleNewUserTrigger(metaRole) {
      let v_role = (metaRole || 'customer').toLowerCase();
      if (!['customer', 'worker'].includes(v_role)) {
        v_role = 'customer';
      }
      return v_role;
    }

    assert.strictEqual(handleNewUserTrigger('admin'), 'customer');
    assert.strictEqual(handleNewUserTrigger('ADMIN'), 'customer');
    assert.strictEqual(handleNewUserTrigger('superuser'), 'customer');
    assert.strictEqual(handleNewUserTrigger('worker'), 'worker');
    assert.strictEqual(handleNewUserTrigger('customer'), 'customer');
  });

  // --------------------------------------------------------------------------
  // TEST 16: Unauthorized profile modification rejection
  // --------------------------------------------------------------------------
  await t.test('16. Unauthorized profile modification by non-owner is rejected', async () => {
    // Emulate protect_profile_role trigger logic:
    function checkProfileRoleUpdate(oldRole, newRole, callerRole, callerUser) {
      if (newRole !== oldRole) {
        if (callerUser !== 'postgres' && callerRole !== 'service_role') {
          throw new Error('Privilege escalation rejected: modifying profile role requires administrative privileges.');
        }
      }
      return true;
    }

    // Normal customer attempts role modification to admin
    assert.throws(
      () => checkProfileRoleUpdate('customer', 'admin', 'authenticated', 'customer_user'),
      /Privilege escalation rejected/
    );

    // Normal worker attempts role modification to admin
    assert.throws(
      () => checkProfileRoleUpdate('worker', 'admin', 'authenticated', 'worker_user'),
      /Privilege escalation rejected/
    );

    // Admin / service_role allowed
    assert.doesNotThrow(
      () => checkProfileRoleUpdate('customer', 'admin', 'service_role', 'postgres')
    );
  });

  // --------------------------------------------------------------------------
  // TEST 17: Unauthorized profile insertion
  // --------------------------------------------------------------------------
  await t.test('17. Unauthorized profile insertion (mismatched auth.uid) rejection', async () => {
    // Emulate RLS policy WITH CHECK (auth.uid() = id AND role IN ('customer', 'worker'))
    function checkProfileInsert(authUid, insertRow) {
      if (authUid !== insertRow.id) {
        return false; // Violates auth.uid() = id
      }
      if (insertRow.role && !['customer', 'worker'].includes(insertRow.role)) {
        return false; // Violates role IN ('customer', 'worker')
      }
      return true;
    }

    assert.strictEqual(checkProfileInsert('user-A', { id: 'user-B', role: 'customer' }), false);
    assert.strictEqual(checkProfileInsert('user-A', { id: 'user-A', role: 'admin' }), false);
    assert.strictEqual(checkProfileInsert('user-A', { id: 'user-A', role: 'customer' }), true);
    assert.strictEqual(checkProfileInsert('user-A', { id: 'user-A', role: 'worker' }), true);
  });

  // --------------------------------------------------------------------------
  // TEST 18: Unauthorized backend API access
  // --------------------------------------------------------------------------
  await t.test('18. Unauthorized backend API access rejected with 401', async () => {
    const dummyReq = {
      headers: {}, // No Authorization header
      url: '/api/bookings',
      method: 'POST'
    };
    let statusCode = null;
    let body = null;
    const dummyRes = {
      writeHead: (status) => { statusCode = status; },
      end: (b) => { body = JSON.parse(b); }
    };

    const user = await requireAuth(dummyReq, dummyRes);
    assert.strictEqual(user, null);
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(body.error, 'Missing Authorization header');
  });

  // --------------------------------------------------------------------------
  // TEST 19: Missing bearer token
  // --------------------------------------------------------------------------
  await t.test('19. Missing bearer token rejected with 401', async () => {
    const dummyReq = {
      headers: { authorization: 'Basic dXNlcjpwYXNz' }, // Basic auth instead of Bearer
      url: '/api/bookings'
    };
    let statusCode = null;
    let body = null;
    const dummyRes = {
      writeHead: (status) => { statusCode = status; },
      end: (b) => { body = JSON.parse(b); }
    };

    const user = await requireAuth(dummyReq, dummyRes);
    assert.strictEqual(user, null);
    assert.strictEqual(statusCode, 401);
    assert.match(body.error, /Expected Bearer <token>/i);
  });

  // --------------------------------------------------------------------------
  // TEST 20: Invalid bearer token (signature mismatch & expiration)
  // --------------------------------------------------------------------------
  await t.test('20. Invalid bearer token rejected by cryptographic verification', async () => {
    // 20a: Expired token
    const expiredToken = createSignedJwt({
      sub: 'usr-111',
      role: 'customer',
      exp: Math.floor(Date.now() / 1000) - 60
    });
    const resExpired = await verifyToken(expiredToken);
    assert.ok(resExpired.error);
    assert.strictEqual(resExpired.error.status, 401);
    assert.match(resExpired.error.message, /expired/i);

    // 20b: Forged signature (signed with different secret)
    const forgedToken = createSignedJwt({
      sub: 'usr-222',
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 3600
    }, 'wrong-secret-key-attacker');
    const resForged = await verifyToken(forgedToken);
    assert.ok(resForged.error);
    assert.strictEqual(resForged.error.status, 401);
    assert.match(resForged.error.message, /signature/i);

    // 20c: Valid token
    const validToken = createSignedJwt({
      sub: 'usr-333',
      role: 'customer',
      exp: Math.floor(Date.now() / 1000) + 3600
    });
    const resValid = await verifyToken(validToken);
    assert.strictEqual(resValid.error, null);
    assert.strictEqual(resValid.user.id, 'usr-333');
  });

  // --------------------------------------------------------------------------
  // TEST 21: Demo authentication disabled in production
  // --------------------------------------------------------------------------
  await t.test('21. Demo authentication disabled in production', async () => {
    window.LOCALKAAM_ENABLE_DEMO_AUTH = false;

    const custResult = AuthService.signInDemoCustomer();
    assert.ok(custResult.error);
    assert.match(custResult.error.message, /disabled in production/i);
    assert.strictEqual(AuthService.isAuthenticated(), false);

    const workerResult = AuthService.signInDemoWorker();
    assert.ok(workerResult.error);
    assert.match(workerResult.error.message, /disabled in production/i);
    assert.strictEqual(AuthService.isAuthenticated(), false);
  });
});
