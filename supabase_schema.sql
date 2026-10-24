-- ==============================================================================
-- LocalKaam - COMPLETE Supabase Setup Script
-- ==============================================================================
-- Run this ENTIRE script in your Supabase Dashboard: SQL Editor > New Query > Run
-- It creates all tables, RLS policies, triggers, seeds data, and enables realtime.
-- ==============================================================================

-- ========================
-- 1. CREATE TABLES
-- ========================

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

-- ========================
-- 2. ROW LEVEL SECURITY
-- ========================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (safe re-run)
DO $$ BEGIN DROP POLICY IF EXISTS "profiles_select" ON public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "profiles_insert" ON public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "profiles_update" ON public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "workers_select" ON public.workers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "workers_insert" ON public.workers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "workers_update" ON public.workers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "bookings_select" ON public.bookings; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "bookings_insert" ON public.bookings; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "bookings_update" ON public.bookings; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "reviews_select" ON public.reviews; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "reviews_insert" ON public.reviews; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "complaints_select" ON public.complaints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "complaints_insert" ON public.complaints; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Also drop any old policies from previous schema versions
DO $$ BEGIN DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Workers are viewable by everyone" ON public.workers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Workers can be created by authenticated or anon" ON public.workers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Workers can be updated" ON public.workers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Bookings are viewable by all participants" ON public.bookings; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Bookings can be updated by participants" ON public.bookings; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Customers can add reviews" ON public.reviews; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Complaints are viewable" ON public.complaints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Customers can file complaints" ON public.complaints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Workers can be created" ON public.workers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Bookings viewable" ON public.bookings; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Bookings can be updated" ON public.bookings; EXCEPTION WHEN OTHERS THEN NULL; END $$;

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

-- ========================
-- 3. AUTO-PROFILE TRIGGER
-- ========================

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

-- ========================
-- 4. SEED DATA
-- ========================

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

-- ========================
-- 5. ENABLE REALTIME
-- ========================

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.workers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ========================
-- DONE! All tables, RLS, triggers, seed data, and realtime are configured.
-- ========================
