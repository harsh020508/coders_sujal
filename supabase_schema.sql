-- ==============================================================================
-- LocalKaam - COMPLETE Supabase Setup Script (Customer & Worker Marketplace)
-- ==============================================================================
-- Run this ENTIRE script in your Supabase Dashboard: SQL Editor > New Query > Run
-- It creates all tables, RLS policies, triggers, seed data, and enables realtime.
-- ==============================================================================

-- ========================
-- 1. CREATE TABLES
-- ========================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'worker')),
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
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Pending confirmation','Confirmed','Accepted','Worker en route','Worker arrived','Job in progress','Job completed','Completed','Rejected','Cancelled','Disputed')),
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
-- 2. ROW LEVEL SECURITY (RLS)
-- ========================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid() OR auth.role() = 'service_role');
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid() OR auth.role() = 'service_role');

-- WORKERS POLICIES
DROP POLICY IF EXISTS "workers_select" ON public.workers;
DROP POLICY IF EXISTS "workers_insert" ON public.workers;
DROP POLICY IF EXISTS "workers_update" ON public.workers;

CREATE POLICY "workers_select" ON public.workers FOR SELECT USING (true);
CREATE POLICY "workers_insert" ON public.workers FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');
CREATE POLICY "workers_update" ON public.workers FOR UPDATE USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- BOOKINGS POLICIES
DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;

CREATE POLICY "bookings_select" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "bookings_insert" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE USING (true);

-- REVIEWS & COMPLAINTS POLICIES
DROP POLICY IF EXISTS "reviews_select" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert" ON public.reviews;
DROP POLICY IF EXISTS "complaints_select" ON public.complaints;
DROP POLICY IF EXISTS "complaints_insert" ON public.complaints;

CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "complaints_select" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "complaints_insert" ON public.complaints FOR INSERT WITH CHECK (true);

-- ========================
-- 3. TRIGGERS & FUNCTIONS
-- ========================

-- Trigger to create profile when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'LocalKaam User'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update worker rating when a review is created
CREATE OR REPLACE FUNCTION public.update_worker_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.workers
  SET
    rating_count = rating_count + 1,
    rating_average = ROUND(
      ((rating_average * rating_count) + NEW.rating) / (rating_count + 1),
      1
    )
  WHERE id = NEW.worker_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_worker_rating();

-- ========================
-- 4. INDEXES
-- ========================

CREATE INDEX IF NOT EXISTS idx_workers_user_id ON public.workers(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_available ON public.workers(available);
CREATE INDEX IF NOT EXISTS idx_workers_category ON public.workers(category);
CREATE INDEX IF NOT EXISTS idx_bookings_worker_id ON public.bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_worker_id ON public.reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_complaints_worker_id ON public.complaints(worker_id);

-- ========================
-- 5. REALTIME REPLICATION
-- ========================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'workers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'complaints'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
  END IF;
END $$;

-- ========================
-- 6. SEED DATA (Active Workers)
-- ========================

INSERT INTO public.workers (
  id, name, category, skills, experience, hourly_rate, base_locality, service_radius, working_days, working_hours, available, verification_status, rating_average, rating_count, avatar, phone, bio
) VALUES
  (
    'w1', 'Rajesh Sharma', 'electrician',
    '["Fan repair","Switchboard repair","Inverter installation","Wiring","Appliance connection"]'::jsonb,
    8, 350, 'andheri', 10,
    '["Mon","Tue","Wed","Thu","Fri","Sat"]'::jsonb,
    '{"start":"09:00","end":"19:00"}'::jsonb,
    true, 'Verified', 4.8, 34,
    'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
    '+91 98201 11223',
    'Experienced electrician with 8+ years fixing household wiring and appliance setups across Andheri.'
  ),
  (
    'w2', 'Sunil Pawar', 'plumber',
    '["Tap repair","Pipe leakage","Flush tank repair","Drain cleaning","Basin installation"]'::jsonb,
    11, 400, 'bandra', 12,
    '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb,
    '{"start":"08:00","end":"20:00"}'::jsonb,
    true, 'Verified', 4.9, 52,
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    '+91 98202 22334',
    'Certified master plumber specializing in quick emergency leak fixes and bathroom sanitaryware.'
  ),
  (
    'w3', 'Mohammed Ansari', 'carpenter',
    '["Door lock repair","Furniture assembly","Hinges repair","Custom wooden shelf","Modular kitchen fixes"]'::jsonb,
    6, 300, 'dadar', 8,
    '["Tue","Wed","Thu","Fri","Sat","Sun"]'::jsonb,
    '{"start":"09:30","end":"18:30"}'::jsonb,
    true, 'Verified', 4.6, 21,
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    '+91 98203 33445',
    'Punctual carpenter skilled with both traditional woodwork and modern Ikea/flat-pack assembly.'
  ),
  (
    'w4', 'Ganesh Jadhav', 'painter',
    '["Touch-up painting","Waterproofing patch","Room repainting","Wood polish","Exterior balcony paint"]'::jsonb,
    5, 250, 'borivali', 15,
    '["Mon","Wed","Thu","Fri","Sat"]'::jsonb,
    '{"start":"09:00","end":"17:00"}'::jsonb,
    true, 'Verified', 4.7, 18,
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    '+91 98204 44556',
    'Clean, mess-free painter for spot corrections and fresh coat wall painting.'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  skills = EXCLUDED.skills,
  experience = EXCLUDED.experience,
  hourly_rate = EXCLUDED.hourly_rate,
  base_locality = EXCLUDED.base_locality,
  service_radius = EXCLUDED.service_radius,
  available = EXCLUDED.available,
  verification_status = EXCLUDED.verification_status,
  rating_average = EXCLUDED.rating_average,
  rating_count = EXCLUDED.rating_count;
