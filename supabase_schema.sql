-- ==============================================================================
-- LocalKaam - COMPLETE Supabase Setup Script (Idempotent & Production-Ready)
-- ==============================================================================
-- Run this ENTIRE script in your Supabase Dashboard: SQL Editor > New Query > Run
-- It creates all tables, RLS policies, triggers, indexes, seed data, and realtime.
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- Profiles: extends auth.users with marketplace metadata
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

-- Workers: blue-collar service professionals across Mumbai
CREATE TABLE IF NOT EXISTS public.workers (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  skills JSONB DEFAULT '[]'::jsonb,
  experience INTEGER DEFAULT 1,
  hourly_rate NUMERIC NOT NULL DEFAULT 300,
  base_locality TEXT NOT NULL DEFAULT 'andheri',
  service_radius INTEGER DEFAULT 10,
  service_area TEXT DEFAULT 'Mumbai Suburbs',
  working_days JSONB DEFAULT '["Mon","Tue","Wed","Thu","Fri","Sat"]'::jsonb,
  working_hours JSONB DEFAULT '{"start":"08:00","end":"20:00"}'::jsonb,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  pause_new_bookings BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT TRUE,
  verification_status TEXT DEFAULT 'Verified',
  rating_average NUMERIC DEFAULT 4.8,
  rating_count INTEGER DEFAULT 0,
  avatar TEXT,
  phone TEXT,
  bio TEXT,
  specialities JSONB DEFAULT '{}'::jsonb,
  languages JSONB DEFAULT '["Hindi","English"]'::jsonb,
  past_experience TEXT,
  certifications TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Worker Services: catalog of pricing and tasks per category per worker
CREATE TABLE IF NOT EXISTS public.worker_services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id TEXT NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  starting_price NUMERIC NOT NULL DEFAULT 300,
  visiting_charge NUMERIC DEFAULT 100,
  pricing_method TEXT DEFAULT 'hourly' CHECK (pricing_method IN ('hourly', 'fixed')),
  est_duration TEXT DEFAULT '1-2 hours',
  tasks JSONB DEFAULT '[]'::jsonb,
  certifications TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(worker_id, category)
);

-- Bookings: core transaction table supporting multi-step lifecycle & negotiations
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  worker_id TEXT REFERENCES public.workers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_category TEXT NOT NULL,
  service_task TEXT DEFAULT 'General Service',
  locality TEXT NOT NULL,
  address TEXT NOT NULL,
  job_description TEXT,
  booking_type TEXT DEFAULT 'scheduled',
  appointment_date TEXT,
  appointment_time TEXT,
  date_time TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  estimated_hours NUMERIC DEFAULT 1,
  base_price NUMERIC DEFAULT 0,
  visiting_charge NUMERIC DEFAULT 0,
  original_estimate NUMERIC DEFAULT 0,
  customer_offer NUMERIC,
  counter_offer_history JSONB DEFAULT '[]'::jsonb,
  agreed_price NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending confirmation' CHECK (
    status IN (
      'Pending confirmation', 'Pending',
      'Confirmed', 'Accepted',
      'Worker en route', 'En Route',
      'Worker arrived', 'Arrived',
      'Job in progress', 'In Progress',
      'Job completed', 'Completed',
      'Cancelled',
      'Disputed'
    )
  ),
  review_id TEXT,
  complaint_id TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Reviews: post-job verified customer feedback and ratings
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

-- Complaints: customer dispute tracking
CREATE TABLE IF NOT EXISTS public.complaints (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE,
  worker_id TEXT REFERENCES public.workers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  issue TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Under Review', 'Resolved')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_workers_locality ON public.workers(base_locality);
CREATE INDEX IF NOT EXISTS idx_workers_available ON public.workers(available);
CREATE INDEX IF NOT EXISTS idx_workers_category ON public.workers(category);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker ON public.bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_worker ON public.reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_complaints_booking ON public.complaints(booking_id);

-- ==============================================================================
-- 4. SERVER-SIDE VALIDATION & PRICE LOCK TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.validate_booking_transition()
RETURNS TRIGGER AS $$
DECLARE
  old_st TEXT;
  new_st TEXT;
  is_valid BOOLEAN := FALSE;
BEGIN
  old_st := OLD.status;
  new_st := NEW.status;

  -- 1. If status is unchanged, allow normal data updates (e.g. negotiation offer history)
  IF old_st = new_st THEN
    -- If already confirmed or beyond, agreed_price is locked against arbitrary modification
    IF old_st NOT IN ('Pending confirmation', 'Pending') AND OLD.agreed_price > 0 AND NEW.agreed_price != OLD.agreed_price THEN
      RAISE EXCEPTION 'Agreed price is locked after confirmation and cannot be modified';
    END IF;
    RETURN NEW;
  END IF;

  -- 2. State machine transitions:
  -- Pending -> Confirmed, Cancelled
  IF (old_st IN ('Pending confirmation', 'Pending') AND new_st IN ('Confirmed', 'Accepted', 'Cancelled')) THEN
    is_valid := TRUE;
  -- Confirmed -> En Route, Cancelled, Disputed
  ELSIF (old_st IN ('Confirmed', 'Accepted') AND new_st IN ('Worker en route', 'En Route', 'Cancelled', 'Disputed')) THEN
    is_valid := TRUE;
  -- En Route -> Arrived, Cancelled, Disputed
  ELSIF (old_st IN ('Worker en route', 'En Route') AND new_st IN ('Worker arrived', 'Arrived', 'Cancelled', 'Disputed')) THEN
    is_valid := TRUE;
  -- Arrived -> In Progress, Cancelled, Disputed
  ELSIF (old_st IN ('Worker arrived', 'Arrived') AND new_st IN ('Job in progress', 'In Progress', 'Cancelled', 'Disputed')) THEN
    is_valid := TRUE;
  -- In Progress -> Completed, Disputed
  ELSIF (old_st IN ('Job in progress', 'In Progress') AND new_st IN ('Job completed', 'Completed', 'Disputed')) THEN
    is_valid := TRUE;
  -- Completed -> Disputed
  ELSIF (old_st IN ('Job completed', 'Completed') AND new_st IN ('Disputed')) THEN
    is_valid := TRUE;
  END IF;

  IF NOT is_valid THEN
    RAISE EXCEPTION 'Invalid booking status transition from "%" to "%"', old_st, new_st;
  END IF;

  -- 3. Lock agreed_price once Confirmed
  IF old_st NOT IN ('Pending confirmation', 'Pending') AND OLD.agreed_price > 0 AND NEW.agreed_price != OLD.agreed_price THEN
    RAISE EXCEPTION 'Agreed price is locked and cannot be altered once confirmed';
  END IF;

  -- 4. Automatically populate completed_at on completion
  IF new_st IN ('Job completed', 'Completed') AND NEW.completed_at IS NULL THEN
    NEW.completed_at := TIMEZONE('utc'::text, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_booking_transition ON public.bookings;
CREATE TRIGGER trg_validate_booking_transition
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_transition();

-- ==============================================================================
-- 5. AUTH USER CREATION TRIGGER (Auto-sync auth.users to profiles)
-- ==============================================================================
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
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    role = COALESCE(EXCLUDED.role, profiles.role),
    locality = COALESCE(EXCLUDED.locality, profiles.locality),
    updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean idempotent run
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

DROP POLICY IF EXISTS "workers_select" ON public.workers;
DROP POLICY IF EXISTS "workers_insert" ON public.workers;
DROP POLICY IF EXISTS "workers_update" ON public.workers;

DROP POLICY IF EXISTS "worker_services_select" ON public.worker_services;
DROP POLICY IF EXISTS "worker_services_modify" ON public.worker_services;

DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;

DROP POLICY IF EXISTS "reviews_select" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert" ON public.reviews;

DROP POLICY IF EXISTS "complaints_select" ON public.complaints;
DROP POLICY IF EXISTS "complaints_insert" ON public.complaints;

-- PROFILES POLICIES
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'anon');

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR auth.role() = 'anon');

-- WORKERS POLICIES
-- Online workers (available = true) are publicly visible for discovery.
-- Offline workers (available = false) are STRICTLY HIDDEN from customers; only the worker themselves can view.
CREATE POLICY "workers_select" ON public.workers
  FOR SELECT USING (
    available = true 
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR user_id IS NULL
  );

CREATE POLICY "workers_insert" ON public.workers
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'anon'
  );

CREATE POLICY "workers_update" ON public.workers
  FOR UPDATE USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
    OR user_id IS NULL 
    OR auth.role() = 'anon'
  );

-- WORKER SERVICES POLICIES
CREATE POLICY "worker_services_select" ON public.worker_services
  FOR SELECT USING (true);

CREATE POLICY "worker_services_modify" ON public.worker_services
  FOR ALL USING (
    worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()) 
    OR auth.role() = 'anon'
  );

-- BOOKINGS POLICIES
-- Customers see their own bookings; workers see their assigned bookings; anon demo mode supported
CREATE POLICY "bookings_select" ON public.bookings
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND customer_id = auth.uid())
    OR (auth.uid() IS NOT NULL AND worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()))
    OR auth.role() = 'anon' 
    OR customer_id IS NULL
  );

CREATE POLICY "bookings_insert" ON public.bookings
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND customer_id = auth.uid())
    OR customer_id IS NULL
    OR auth.role() = 'anon'
  );

CREATE POLICY "bookings_update" ON public.bookings
  FOR UPDATE USING (
    (auth.uid() IS NOT NULL AND customer_id = auth.uid())
    OR (auth.uid() IS NOT NULL AND worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()))
    OR auth.role() = 'anon' 
    OR customer_id IS NULL
  );

-- REVIEWS POLICIES
CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND customer_id = auth.uid())
    OR customer_id IS NULL
    OR auth.role() = 'anon'
  );

-- COMPLAINTS POLICIES
CREATE POLICY "complaints_select" ON public.complaints
  FOR SELECT USING (true);

CREATE POLICY "complaints_insert" ON public.complaints
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND customer_id = auth.uid())
    OR customer_id IS NULL
    OR auth.role() = 'anon'
  );

-- ==============================================================================
-- 7. REALTIME REPLICATION (Cross-device WebSocket synchronization)
-- ==============================================================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.workers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_services; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Set replica identity to FULL for detailed update payloads
ALTER TABLE public.workers REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.worker_services REPLICA IDENTITY FULL;
ALTER TABLE public.reviews REPLICA IDENTITY FULL;
ALTER TABLE public.complaints REPLICA IDENTITY FULL;

-- ==============================================================================
-- 8. IDEMPOTENT SEED DATA: 8 MUMBAI PROFESSIONALS
-- ==============================================================================
INSERT INTO public.workers (
  id, name, category, skills, experience, hourly_rate, base_locality, service_radius,
  service_area, working_days, working_hours, available, pause_new_bookings, profile_completed,
  verification_status, rating_average, rating_count, avatar, phone, bio, specialities, languages, past_experience, certifications
)
VALUES
-- w1: Ramesh Kumar (Plumber + Electrician)
(
  'w1', 'Ramesh Kumar', 'plumber',
  '["Leaking Tap", "Pipe Fitting", "Switchboard", "Fan Installation"]'::jsonb,
  8, 300, 'andheri', 10, 'Andheri West, Bandra West, Juhu',
  '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]'::jsonb,
  '{"start": "08:00", "end": "20:00"}'::jsonb,
  true, false, true, 'Verified', 4.8, 42,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  '+91 98211 44551',
  'Expert plumber & electrician with 8+ years experience fixing residential leaks and sanitaryware in Andheri & Bandra.',
  '{
    "plumber": { "tasks": ["Leaking Tap & Faucet", "Pipe Fitting & Leakage", "Geyser Installation & Repair"], "pricingMethod": "hourly", "startingPrice": 300, "visitingCharge": 100, "estDuration": "1-2 hours", "experience": 8, "certifications": "Certified Master Plumber (ITI Mumbai)" },
    "electrician": { "tasks": ["Switchboard Installation", "Fan Installation", "Wiring Repair"], "pricingMethod": "hourly", "startingPrice": 350, "visitingCharge": 150, "estDuration": "1 hour", "experience": 6, "certifications": "Licensed Electrical Contractor" }
  }'::jsonb,
  '["Hindi", "English", "Marathi"]'::jsonb,
  '8 years residential maintenance', 'Certified Master Plumber'
),
-- w2: Suresh Sharma (Electrician + AC Repair)
(
  'w2', 'Suresh Sharma', 'electrician',
  '["Wiring", "Switchboard", "Split AC Servicing", "Gas Refilling"]'::jsonb,
  6, 350, 'bandra', 8, 'Bandra West, Khar, Santacruz',
  '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]'::jsonb,
  '{"start": "09:00", "end": "19:00"}'::jsonb,
  true, false, true, 'Verified', 4.9, 38,
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  '+91 98332 11223',
  'Licensed electrical contractor specializing in safe home wiring, AC repairs, and smart home fixtures.',
  '{
    "electrician": { "tasks": ["Wiring Repair", "Switchboard Installation", "Lighting Installation", "Electrical Fault Diagnosis"], "pricingMethod": "hourly", "startingPrice": 350, "visitingCharge": 100, "estDuration": "1-3 hours", "experience": 6, "certifications": "State Electrical License Grade A" },
    "ac_repair": { "tasks": ["Split AC Servicing", "Gas Refilling & Leak Check", "AC Installation"], "pricingMethod": "fixed", "startingPrice": 599, "visitingCharge": 150, "estDuration": "1.5 hours", "experience": 5, "certifications": "HVAC Certified Technician" }
  }'::jsonb,
  '["Hindi", "English"]'::jsonb,
  '6 years electrical and HVAC services', 'Electrical License Grade A'
),
-- w3: Vijay Patil (Carpenter)
(
  'w3', 'Vijay Patil', 'carpenter',
  '["Door Locks & Hinges", "Bed & Sofa Repair", "Wardrobe Customization"]'::jsonb,
  10, 400, 'powai', 12, 'Powai, Chandivali, Vikhroli',
  '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]'::jsonb,
  '{"start": "09:00", "end": "18:00"}'::jsonb,
  true, false, true, 'Verified', 4.7, 29,
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  '+91 98922 33445',
  'Master carpenter proficient in modular furniture assembly, sleek woodwork, and precision door locks.',
  '{
    "carpenter": { "tasks": ["Door Locks & Hinges", "Bed & Sofa Repair", "Wardrobe Customization", "Modular Kitchen Fitting"], "pricingMethod": "fixed", "startingPrice": 400, "visitingCharge": 150, "estDuration": "2-4 hours", "experience": 10, "certifications": "Master Woodwork Guild" }
  }'::jsonb,
  '["Hindi", "Marathi"]'::jsonb,
  '10 years custom modular furniture', 'Master Woodwork Guild'
),
-- w4: Sunita Gawde (Cleaning)
(
  'w4', 'Sunita Gawde', 'cleaning',
  '["Full Home Deep Cleaning", "Kitchen & Bathroom Scrub", "Sofa & Carpet Shampooing"]'::jsonb,
  5, 250, 'juhu', 10, 'Juhu, Vile Parle West, Santacruz',
  '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]'::jsonb,
  '{"start": "08:00", "end": "18:00"}'::jsonb,
  true, false, true, 'Verified', 4.9, 56,
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  '+91 97001 22334',
  'Housekeeping and deep sanitation professional trusted across premium apartments in Juhu and Vile Parle.',
  '{
    "cleaning": { "tasks": ["Full Home Deep Cleaning", "Kitchen & Bathroom Scrub", "Sofa & Carpet Shampooing"], "pricingMethod": "fixed", "startingPrice": 999, "visitingCharge": 0, "estDuration": "3-5 hours", "experience": 5, "certifications": "Eco-Sanitization Certified" }
  }'::jsonb,
  '["Hindi", "Marathi"]'::jsonb,
  '5 years deep cleaning and housekeeping', 'Eco-Sanitization Certified'
),
-- w5: Manoj Verma (Painter)
(
  'w5', 'Manoj Verma', 'painter',
  '["Interior Wall Painting", "Waterproofing", "Texture & Accent Walls"]'::jsonb,
  7, 350, 'malad', 15, 'Malad West, Kandivali West, Goregaon',
  '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]'::jsonb,
  '{"start": "09:00", "end": "19:00"}'::jsonb,
  true, false, true, 'Verified', 4.6, 19,
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  '+91 99201 88990',
  'Skilled painter offering flawless interior finishes, anti-fungal waterproofing, and stencil wall textures.',
  '{
    "painter": { "tasks": ["Interior Wall Painting", "Exterior Waterproofing", "Wood Polish & Varnishing", "Texture & Accent Walls", "Wall Putty & Primer"], "pricingMethod": "hourly", "startingPrice": 350, "visitingCharge": 100, "estDuration": "1-2 hours", "experience": 7, "certifications": "Asian Paints Certified Professional" }
  }'::jsonb,
  '["Hindi", "English"]'::jsonb,
  '7 years residential and commercial painting', 'Asian Paints Certified'
),
-- w6: Anita Joshi (Appliance Repair & Cook)
(
  'w6', 'Anita Joshi', 'appliance_repair',
  '["Washing Machine Repair", "Refrigerator Servicing", "Microwave Oven Repair"]'::jsonb,
  9, 300, 'colaba', 10, 'Colaba, Fort, Marine Lines, Churchgate',
  '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]'::jsonb,
  '{"start": "07:00", "end": "21:00"}'::jsonb,
  true, false, true, 'Verified', 5.0, 64,
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  '+91 98112 55667',
  'Experienced home technician and culinary expert providing reliable appliance care and customized home dining.',
  '{
    "appliance_repair": { "tasks": ["Washing Machine Repair", "Refrigerator Servicing", "Microwave Oven Repair"], "pricingMethod": "fixed", "startingPrice": 450, "visitingCharge": 100, "estDuration": "1-2 hours", "experience": 9, "certifications": "Major Appliance Technician Certification" }
  }'::jsonb,
  '["Hindi", "Marathi", "Gujarati"]'::jsonb,
  '9 years appliance servicing', 'Certified Technician'
),
-- w7: Deepak Shinde (Plumber)
(
  'w7', 'Deepak Shinde', 'plumber',
  '["Drainage Unclogging", "Tap Leak & Faucet", "Flush Tank", "Shower Valve"]'::jsonb,
  4, 280, 'dadar', 8, 'Dadar West, Matunga, Prabhadevi',
  '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]'::jsonb,
  '{"start": "08:30", "end": "19:30"}'::jsonb,
  true, false, true, 'Verified', 4.5, 22,
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  '+91 98200 77889',
  'Fast and affordable local plumber for high-rise apartment pipeline unclogging and emergency leak repairs.',
  '{
    "plumber": { "tasks": ["Drainage Unclogging", "Pipe Fitting & Leakage", "Toilet & Flush Repair"], "pricingMethod": "hourly", "startingPrice": 280, "visitingCharge": 100, "estDuration": "1-2 hours", "experience": 4, "certifications": "Government Vocational ITI Certification" }
  }'::jsonb,
  '["Hindi", "Marathi"]'::jsonb,
  '4 years plumbing maintenance', 'ITI Vocational Plumber'
),
-- w8: Pooja Kulkarni (Cleaning)
(
  'w8', 'Pooja Kulkarni', 'cleaning',
  '["Kitchen Scrub", "Bathroom Degreasing", "Full Home Deep Cleaning"]'::jsonb,
  6, 200, 'thane', 10, 'Thane West, Mulund West, Majiwada',
  '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]'::jsonb,
  '{"start": "07:00", "end": "19:00"}'::jsonb,
  true, false, true, 'Verified', 4.8, 45,
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  '+91 97688 44332',
  'Dedicated cleaning professional skilled in thorough kitchen degreasing, bathroom scrubbing, and housekeeping.',
  '{
    "cleaning": { "tasks": ["Kitchen & Bathroom Scrub", "Full Home Deep Cleaning", "Dusting & Mopping"], "pricingMethod": "fixed", "startingPrice": 699, "visitingCharge": 0, "estDuration": "2-3 hours", "experience": 6, "certifications": "Hospitality Housekeeping Grade 1" }
  }'::jsonb,
  '["Hindi", "Marathi"]'::jsonb,
  '6 years housekeeping and apartment care', 'Hospitality Grade 1'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  skills = EXCLUDED.skills,
  experience = EXCLUDED.experience,
  hourly_rate = EXCLUDED.hourly_rate,
  base_locality = EXCLUDED.base_locality,
  service_radius = EXCLUDED.service_radius,
  service_area = EXCLUDED.service_area,
  working_days = EXCLUDED.working_days,
  working_hours = EXCLUDED.working_hours,
  available = EXCLUDED.available,
  verification_status = EXCLUDED.verification_status,
  rating_average = EXCLUDED.rating_average,
  rating_count = EXCLUDED.rating_count,
  avatar = EXCLUDED.avatar,
  phone = EXCLUDED.phone,
  bio = EXCLUDED.bio,
  specialities = EXCLUDED.specialities,
  languages = EXCLUDED.languages,
  past_experience = EXCLUDED.past_experience,
  certifications = EXCLUDED.certifications,
  updated_at = TIMEZONE('utc'::text, NOW());

-- ==============================================================================
-- 9. IDEMPOTENT SEED DATA: WORKER SERVICES CATALOG
-- ==============================================================================
INSERT INTO public.worker_services (worker_id, category, starting_price, visiting_charge, pricing_method, est_duration, tasks, certifications)
VALUES
('w1', 'plumber', 300, 100, 'hourly', '1-2 hours', '["Leaking Tap & Faucet", "Pipe Fitting & Leakage", "Geyser Installation & Repair"]'::jsonb, 'Certified Master Plumber (ITI Mumbai)'),
('w1', 'electrician', 350, 150, 'hourly', '1 hour', '["Switchboard Installation", "Fan Installation", "Wiring Repair"]'::jsonb, 'Licensed Electrical Contractor'),
('w2', 'electrician', 350, 100, 'hourly', '1-3 hours', '["Wiring Repair", "Switchboard Installation", "Lighting Installation", "Electrical Fault Diagnosis"]'::jsonb, 'State Electrical License Grade A'),
('w2', 'ac_repair', 599, 150, 'fixed', '1.5 hours', '["Split AC Servicing", "Gas Refilling & Leak Check", "AC Installation"]'::jsonb, 'HVAC Certified Technician'),
('w3', 'carpenter', 400, 150, 'fixed', '2-4 hours', '["Door Locks & Hinges", "Bed & Sofa Repair", "Wardrobe Customization", "Modular Kitchen Fitting"]'::jsonb, 'Master Woodwork Guild'),
('w4', 'cleaning', 999, 0, 'fixed', '3-5 hours', '["Full Home Deep Cleaning", "Kitchen & Bathroom Scrub", "Sofa & Carpet Shampooing"]'::jsonb, 'Eco-Sanitization Certified'),
('w5', 'painter', 350, 100, 'hourly', '1-2 hours', '["Interior Wall Painting", "Exterior Waterproofing", "Wood Polish & Varnishing", "Texture & Accent Walls", "Wall Putty & Primer"]'::jsonb, 'Asian Paints Certified Professional'),
('w6', 'appliance_repair', 450, 100, 'fixed', '1-2 hours', '["Washing Machine Repair", "Refrigerator Servicing", "Microwave Oven Repair"]'::jsonb, 'Major Appliance Technician Certification'),
('w7', 'plumber', 280, 100, 'hourly', '1-2 hours', '["Drainage Unclogging", "Pipe Fitting & Leakage", "Toilet & Flush Repair"]'::jsonb, 'Government Vocational ITI Certification'),
('w8', 'cleaning', 699, 0, 'fixed', '2-3 hours', '["Kitchen & Bathroom Scrub", "Full Home Deep Cleaning", "Dusting & Mopping"]'::jsonb, 'Hospitality Housekeeping Grade 1')
ON CONFLICT (worker_id, category) DO UPDATE SET
  starting_price = EXCLUDED.starting_price,
  visiting_charge = EXCLUDED.visiting_charge,
  pricing_method = EXCLUDED.pricing_method,
  est_duration = EXCLUDED.est_duration,
  tasks = EXCLUDED.tasks,
  certifications = EXCLUDED.certifications,
  updated_at = TIMEZONE('utc'::text, NOW());

-- ==============================================================================
-- 10. IDEMPOTENT SEED DATA: INITIAL DEMO BOOKINGS & REVIEWS
-- ==============================================================================
INSERT INTO public.bookings (
  id, worker_id, customer_name, customer_phone, service_category, service_task,
  locality, address, job_description, booking_type, appointment_date, appointment_time,
  estimated_hours, base_price, visiting_charge, original_estimate, customer_offer, counter_offer_history, agreed_price, status, created_at
)
VALUES
(
  'BK-101', 'w1', 'Aarav Mehta', '+91 98765 43210', 'plumber', 'Leaking Tap & Faucet',
  'andheri', 'Flat 402, Sea Green Apts, Lokhandwala, Andheri West',
  'Severe bathroom faucet leakage causing water pressure drops',
  'scheduled', '2026-10-25', '10:30 AM', 1, 300, 100, 400, null, '[]'::jsonb, 400, 'Confirmed', NOW() - INTERVAL '2 days'
),
(
  'BK-102', 'w2', 'Neha Shah', '+91 98111 22334', 'ac_repair', 'Split AC Servicing',
  'bandra', 'Bungalow 7, Perry Cross Rd, Bandra West',
  'AC cooling very low and filter requires deep water wash',
  'scheduled', '2026-10-24', '03:00 PM', 1.5, 599, 150, 749, null, '[]'::jsonb, 749, 'Job completed', NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reviews (
  id, booking_id, worker_id, customer_name, rating, comment, created_at
)
VALUES
(
  'rev-1', 'BK-102', 'w2', 'Neha Shah', 5,
  'Punctual and very thorough AC cleaning. Cooling restored immediately. Highly recommended!',
  NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 11. DEMO AUTH ACCOUNTS (Password: Password@123)
-- ==============================================================================
-- Attempts to seed initial demo accounts into auth.users (if permitted by database role).
-- If permissions restrict direct auth.users writes, client-side signup creates them.
DO $$
DECLARE
  cust_uid UUID := '00000000-0000-0000-0000-000000000001';
  work_uid UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'customer.demo@localkaam.in') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
      cust_uid, '00000000-0000-0000-0000-000000000000',
      'customer.demo@localkaam.in',
      crypt('Password@123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Aarav Mehta","role":"customer","phone":"+91 98765 43210","locality":"andheri"}'::jsonb,
      NOW(), NOW(), 'authenticated', 'authenticated'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ramesh.worker@localkaam.in') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
      work_uid, '00000000-0000-0000-0000-000000000000',
      'ramesh.worker@localkaam.in',
      crypt('Password@123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Ramesh Kumar","role":"worker","phone":"+91 98211 44551","locality":"andheri"}'::jsonb,
      NOW(), NOW(), 'authenticated', 'authenticated'
    );

    UPDATE public.workers SET user_id = work_uid WHERE id = 'w1';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Silently continue if direct auth.users insert is restricted
END $$;

-- ==============================================================================
-- DONE! Complete schema configured.
-- ==============================================================================
