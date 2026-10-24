// LocalKaam - Supabase Setup & Configuration Modal
import { SupabaseService } from './supabaseClient.js';
import { StorageService } from './storage.js';
import { Toast } from './toast.js';

const SCHEMA_SQL = `-- LocalKaam - COMPLETE Supabase Setup Script
-- Run this in your Supabase Dashboard: SQL Editor > New Query > Run

-- 1. CREATE TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'worker', 'admin')),
  full_name TEXT,
  phone TEXT,
  locality TEXT DEFAULT 'andheri',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workers (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  skills JSONB DEFAULT '[]'::jsonb,
  experience INTEGER DEFAULT 1,
  hourly_rate NUMERIC NOT NULL DEFAULT 300,
  base_locality TEXT NOT NULL DEFAULT 'andheri',
  service_radius NUMERIC DEFAULT 10,
  working_days JSONB DEFAULT '["Mon","Tue","Wed","Thu","Fri","Sat"]'::jsonb,
  working_hours JSONB DEFAULT '{"start":"09:00","end":"19:00"}'::jsonb,
  available BOOLEAN DEFAULT TRUE,
  verification_status TEXT DEFAULT 'Verified',
  rating_average NUMERIC DEFAULT 4.8,
  rating_count INTEGER DEFAULT 0,
  avatar TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  worker_id TEXT REFERENCES public.workers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service TEXT NOT NULL,
  locality TEXT NOT NULL,
  address TEXT NOT NULL,
  job_description TEXT,
  booking_type TEXT DEFAULT 'instant',
  date_time TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  estimated_hours NUMERIC DEFAULT 1,
  original_estimate NUMERIC DEFAULT 0,
  customer_offer NUMERIC,
  counter_offer_history JSONB DEFAULT '[]'::jsonb,
  agreed_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Accepted','In Progress','Completed','Rejected','Cancelled')),
  review_id TEXT,
  complaint_id TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE,
  worker_id TEXT REFERENCES public.workers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.complaints (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE,
  worker_id TEXT REFERENCES public.workers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  issue TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open','Under Review','Resolved')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "workers_select" ON public.workers FOR SELECT USING (true);
CREATE POLICY "workers_insert" ON public.workers FOR INSERT WITH CHECK (true);
CREATE POLICY "workers_update" ON public.workers FOR UPDATE USING (true);

CREATE POLICY "bookings_select" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "bookings_insert" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE USING (true);

CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "complaints_select" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "complaints_insert" ON public.complaints FOR INSERT WITH CHECK (true);

-- 3. AUTO-PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, locality)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'locality', 'andheri')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. SEED DATA
INSERT INTO public.workers (id, name, category, skills, experience, hourly_rate, base_locality, service_radius, working_days, working_hours, available, verification_status, rating_average, rating_count, avatar, phone, bio)
VALUES
('w1','Ramesh Kumar','plumber','["Leaking Tap","Pipe Fitting","Water Tank","Geyser Repair"]'::jsonb,8,300,'andheri',10,'["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb,'{"start":"08:00","end":"20:00"}'::jsonb,true,'Verified',4.8,42,'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80','+91 98211 44551','Expert plumber with 8+ years experience fixing residential leaks.'),
('w2','Suresh Sharma','electrician','["Wiring","Switchboard","Fan Installation","MCB Tripping"]'::jsonb,6,350,'bandra',8,'["Mon","Tue","Wed","Thu","Fri","Sat"]'::jsonb,'{"start":"09:00","end":"19:00"}'::jsonb,true,'Verified',4.9,38,'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80','+91 98332 11223','Licensed electrical contractor.'),
('w3','Vijay Patil','carpenter','["Door Locks","Bed Repair","Wardrobe Hinges","Custom Shelves"]'::jsonb,10,400,'powai',12,'["Mon","Tue","Wed","Thu","Fri","Sat"]'::jsonb,'{"start":"09:00","end":"18:00"}'::jsonb,true,'Verified',4.7,29,'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80','+91 98922 33445','Master carpenter.'),
('w4','Sunita Gawde','cleaner','["Deep Cleaning","Bathroom Scrub","Kitchen Degreasing","Sofa Shampoo"]'::jsonb,5,250,'juhu',10,'["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb,'{"start":"08:00","end":"18:00"}'::jsonb,true,'Verified',4.9,56,'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80','+91 97001 22334','Deep cleaning specialist.'),
('w5','Manoj Verma','painter','["Wall Painting","Waterproofing","Texture Design","Wood Polish"]'::jsonb,7,350,'malad',15,'["Mon","Tue","Wed","Thu","Fri","Sat"]'::jsonb,'{"start":"09:00","end":"19:00"}'::jsonb,false,'Pending',4.6,19,'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80','+91 99201 88990','Skilled painter.'),
('w6','Anita Joshi','cook','["North Indian","Maharashtrian","Healthy Meals","Snacks"]'::jsonb,9,300,'colaba',10,'["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb,'{"start":"07:00","end":"21:00"}'::jsonb,true,'Verified',5.0,64,'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80','+91 98112 55667','Experienced home chef.'),
('w7','Deepak Shinde','plumber','["Drain Unclogging","Tap Leak","Flush Tank","Shower Valve"]'::jsonb,4,280,'dadar',8,'["Mon","Tue","Wed","Thu","Fri","Sat"]'::jsonb,'{"start":"08:30","end":"19:30"}'::jsonb,true,'Verified',4.5,22,'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80','+91 98200 77889','Reliable plumber.'),
('w8','Pooja Kulkarni','maid','["Dusting","Mopping","Utensils","Ironing"]'::jsonb,6,200,'thane',10,'["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb,'{"start":"07:00","end":"19:00"}'::jsonb,true,'Verified',4.8,45,'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80','+91 97688 44332','Punctual househelp.')
ON CONFLICT (id) DO NOTHING;

-- 5. ENABLE REALTIME
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.workers, public.bookings, public.reviews, public.complaints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

export const SupabaseSetupModal = {
  show(onConfigured) {
    const existing = document.getElementById('supabase-setup-modal');
    if (existing) existing.remove();

    const currentConfig = SupabaseService.getConfig();
    const isLive = SupabaseService.isConfigured();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'supabase-setup-modal';

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 650px; max-height: 90vh; overflow-y: auto; padding: 2rem;">
        <button class="modal-close" id="setup-close-btn">&times;</button>
        
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
          <div style="font-size: 1.8rem;">⚡</div>
          <div>
            <h2 style="font-size: 1.4rem; font-weight: 800;">Supabase Configuration & Database</h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">PostgreSQL Database, Authentication, and Realtime Sync.</p>
          </div>
        </div>

        <div style="margin: 1rem 0; padding: 0.75rem 1rem; border-radius: 8px; background: ${isLive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; border: 1px solid ${isLive ? 'var(--success)' : 'var(--warning)'}; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.2rem;">${isLive ? '🟢' : '🟡'}</span>
            <span style="font-weight: 600; font-size: 0.9rem; color: ${isLive ? 'var(--success)' : 'var(--warning)'};">
              ${isLive ? 'Supabase Connected & Active' : 'Offline / Local Demo Mode (Supabase not configured)'}
            </span>
          </div>
          ${isLive ? `<button class="btn btn-outline btn-sm" id="btn-disconnect-supabase" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">Disconnect</button>` : ''}
        </div>

        <!-- Supabase Form -->
        <form id="supabase-config-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Supabase Project URL</label>
            <input type="url" id="supabase-url-input" class="form-control" placeholder="https://your-project.supabase.co" value="${currentConfig.url || ''}" required>
            <small style="color: var(--text-secondary); font-size: 0.75rem;">Found in Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL</small>
          </div>

          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.35rem;">Supabase Public Anon API Key</label>
            <input type="password" id="supabase-key-input" class="form-control" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value="${currentConfig.anonKey || ''}" required>
            <small style="color: var(--text-secondary); font-size: 0.75rem;">Found in Supabase Dashboard &gt; Project Settings &gt; API &gt; Project API keys &gt; 'anon' 'public'</small>
          </div>

          <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
            <button type="button" class="btn btn-outline" id="btn-test-connection" style="flex: 1;">
              🔍 Test Connection
            </button>
            <button type="submit" class="btn btn-primary" id="btn-save-config" style="flex: 1;">
              💾 Save &amp; Connect
            </button>
          </div>
        </form>

        <div style="margin-top: 1rem; display: flex; gap: 0.75rem;">
          <button type="button" class="btn btn-outline btn-sm" id="btn-seed-data" style="flex: 1; font-size: 0.82rem;">
            🌱 Seed 8 Mumbai Workers to Database
          </button>
          <button type="button" class="btn btn-outline btn-sm" id="btn-sync-now" style="flex: 1; font-size: 0.82rem;">
            🔄 Force Sync Database Now
          </button>
        </div>

        <!-- Google OAuth Guide -->
        <div style="margin-top: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; background: var(--bg-secondary);">
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            How to Enable Google Sign-In in Supabase
          </div>
          <ol style="font-size: 0.82rem; color: var(--text-secondary); margin-left: 1.25rem; line-height: 1.6;">
            <li>Go to <a href="https://supabase.com/dashboard" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">Supabase Dashboard</a> &gt; <strong>Authentication</strong> &gt; <strong>Providers</strong> &gt; <strong>Google</strong>.</li>
            <li>Toggle <strong>Enable Google provider</strong> to <strong>ON</strong>.</li>
            <li>In Google Cloud Console, add your Supabase redirect URI: <code style="background: var(--bg-card); padding: 2px 4px; border-radius: 4px;">${currentConfig.url || 'https://your-project.supabase.co'}/auth/v1/callback</code></li>
            <li>Enter your <strong>Google Client ID</strong> and <strong>Client Secret</strong> in Supabase, then click <strong>Save</strong>.</li>
          </ol>
        </div>

        <!-- SQL Schema Guide Accordion -->
        <div style="margin-top: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; background: var(--bg-secondary);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span style="font-weight: 700; font-size: 0.9rem;">📜 Supabase SQL Schema (Tables, RLS &amp; Seed)</span>
            <button class="btn btn-primary btn-sm" id="btn-copy-sql" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">
              📋 Copy SQL Schema
            </button>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
            Go to <a href="https://supabase.com/dashboard" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">Supabase Dashboard</a> &gt; <strong>SQL Editor</strong> &gt; <strong>New Query</strong>, paste this script, and click <strong>Run</strong>.
          </p>
          <pre style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.75rem; font-size: 0.75rem; max-height: 180px; overflow-y: auto; color: var(--text-primary); font-family: monospace;">${SCHEMA_SQL}</pre>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#setup-close-btn').onclick = close;

    // Disconnect button
    const disconnectBtn = modal.querySelector('#btn-disconnect-supabase');
    if (disconnectBtn) {
      disconnectBtn.onclick = () => {
        SupabaseService.clearConfig();
        Toast.show('Supabase credentials cleared. Switched to offline demo mode.', 'info');
        close();
        if (onConfigured) onConfigured();
      };
    }

    // Test Connection
    modal.querySelector('#btn-test-connection').onclick = async () => {
      const url = modal.querySelector('#supabase-url-input').value;
      const key = modal.querySelector('#supabase-key-input').value;

      if (!url || !key) {
        Toast.show('Please fill in both Supabase URL and Anon Key first', 'warning');
        return;
      }

      Toast.show('Testing connection to Supabase...', 'info');
      const res = await SupabaseService.testConnection(url, key);
      if (res.success) {
        Toast.show(res.message, res.warning ? 'warning' : 'success');
      } else {
        Toast.show(res.message, 'error');
      }
    };

    // Save & Connect
    modal.querySelector('#supabase-config-form').onsubmit = async (e) => {
      e.preventDefault();
      const url = modal.querySelector('#supabase-url-input').value;
      const key = modal.querySelector('#supabase-key-input').value;

      const saveBtn = modal.querySelector('#btn-save-config');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Connecting...';

      const testRes = await SupabaseService.testConnection(url, key);
      if (!testRes.success) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save & Connect';
        Toast.show(testRes.message, 'error');
        return;
      }

      SupabaseService.saveConfig(url, key);
      Toast.show('Supabase successfully configured and connected!', 'success');
      await StorageService.syncFromSupabase();

      saveBtn.disabled = false;
      close();
      if (onConfigured) onConfigured();
    };

    // Seed Data
    modal.querySelector('#btn-seed-data').onclick = async () => {
      if (!SupabaseService.isConfigured()) {
        Toast.show('Please save and connect your Supabase credentials first', 'warning');
        return;
      }
      Toast.show('Seeding Mumbai professionals to Supabase...', 'info');
      const res = await SupabaseService.seedDatabaseIfEmpty();
      if (res.success) {
        Toast.show(res.message, 'success');
        await StorageService.syncFromSupabase();
      } else {
        Toast.show(`Seeding error: ${res.message}`, 'error');
      }
    };

    // Force Sync
    modal.querySelector('#btn-sync-now').onclick = async () => {
      if (!SupabaseService.isConfigured()) {
        Toast.show('Supabase is not configured yet', 'warning');
        return;
      }
      Toast.show('Syncing data from Supabase...', 'info');
      const ok = await StorageService.syncFromSupabase();
      if (ok) {
        Toast.show('Database synchronized successfully!', 'success');
        if (onConfigured) onConfigured();
      } else {
        Toast.show('Sync failed. Please check connection and credentials.', 'error');
      }
    };

    // Copy SQL
    modal.querySelector('#btn-copy-sql').onclick = () => {
      navigator.clipboard.writeText(SCHEMA_SQL).then(() => {
        Toast.show('SQL Schema copied to clipboard!', 'success');
      }).catch(() => {
        Toast.show('Could not copy to clipboard. Select text manually.', 'warning');
      });
    };
  }
};
