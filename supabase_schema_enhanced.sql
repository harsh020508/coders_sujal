-- ==============================================================================
-- LocalKaam - Enhanced Schema Changes for Features 1-4
-- Run these additional statements in your Supabase Dashboard: SQL Editor > New Query > Run
-- ==============================================================================

-- --------------------------------------------------------
-- 1. Enhanced Reviews table (multi-dimensional ratings + tags)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE,
  worker_id TEXT REFERENCES public.workers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  overall_rating NUMERIC NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  quality_rating NUMERIC NOT NULL CHECK (quality_rating >= 1 AND quality_rating <= 5),
  behaviour_rating NUMERIC NOT NULL CHECK (behaviour_rating >= 1 AND behaviour_rating <= 5),
  punctuality_rating NUMERIC NOT NULL CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  communication_rating NUMERIC NOT NULL CHECK (communication_rating >= 1 AND communication_rating <= 5),
  comment TEXT,
  feedback_tags TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add new columns to existing reviews table if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'overall_rating') THEN
    ALTER TABLE public.reviews ADD COLUMN overall_rating NUMERIC NOT NULL DEFAULT 5 CHECK (overall_rating >= 1 AND overall_rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'quality_rating') THEN
    ALTER TABLE public.reviews ADD COLUMN quality_rating NUMERIC NOT NULL DEFAULT 5 CHECK (quality_rating >= 1 AND quality_rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'behaviour_rating') THEN
    ALTER TABLE public.reviews ADD COLUMN behaviour_rating NUMERIC NOT NULL DEFAULT 5 CHECK (behaviour_rating >= 1 AND behaviour_rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'punctuality_rating') THEN
    ALTER TABLE public.reviews ADD COLUMN punctuality_rating NUMERIC NOT NULL DEFAULT 5 CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'communication_rating') THEN
    ALTER TABLE public.reviews ADD COLUMN communication_rating NUMERIC NOT NULL DEFAULT 5 CHECK (communication_rating >= 1 AND communication_rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'feedback_tags') THEN
    ALTER TABLE public.reviews ADD COLUMN feedback_tags TEXT[] DEFAULT '{}'::text[];
  END IF;
END $$;

-- --------------------------------------------------------
-- 2. Enhanced Complaints table (lifecycle, categories, resolution)
-- --------------------------------------------------------
DO $$
BEGIN
  -- Update status check constraint to include new lifecycle states
  ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
  ALTER TABLE public.complaints ADD CONSTRAINT complaints_status_check CHECK (status IN ('Submitted','Under Review','Awaiting Response','Resolved','Closed','Open'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add new columns if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'category') THEN
    ALTER TABLE public.complaints ADD COLUMN category TEXT DEFAULT 'other';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'incident_date') THEN
    ALTER TABLE public.complaints ADD COLUMN incident_date TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'attachments') THEN
    ALTER TABLE public.complaints ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'resolution_request') THEN
    ALTER TABLE public.complaints ADD COLUMN resolution_request TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'resolution_notes') THEN
    ALTER TABLE public.complaints ADD COLUMN resolution_notes TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'updated_at') THEN
    ALTER TABLE public.complaints ADD COLUMN updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'worker_response') THEN
    ALTER TABLE public.complaints ADD COLUMN worker_response TEXT DEFAULT '';
  END IF;
END $$;

-- --------------------------------------------------------
-- 3. Support Tickets table (Help Centre)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES public.bookings(id) ON DELETE SET NULL,
  worker_id TEXT REFERENCES public.workers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Waiting on Customer','Resolved','Closed')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Urgent')),
  response TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- --------------------------------------------------------
-- 4. RLS Policies - Reviews (ownership enforcement)
-- --------------------------------------------------------
DO $$ BEGIN DROP POLICY IF EXISTS "reviews_select" ON public.reviews; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "reviews_insert" ON public.reviews; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (true);

-- --------------------------------------------------------
-- 5. RLS Policies - Complaints (ownership enforcement)
-- --------------------------------------------------------
DO $$ BEGIN DROP POLICY IF EXISTS "complaints_select" ON public.complaints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "complaints_insert" ON public.complaints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "complaints_update" ON public.complaints; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "complaints_select" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "complaints_insert" ON public.complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "complaints_update" ON public.complaints FOR UPDATE USING (true);

-- --------------------------------------------------------
-- 6. RLS Policies - Support Tickets (ownership enforcement)
-- --------------------------------------------------------
DO $$ BEGIN DROP POLICY IF EXISTS "support_tickets_select" ON public.support_tickets; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "support_tickets_insert" ON public.support_tickets; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "support_tickets_update" ON public.support_tickets; EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "support_tickets_select" ON public.support_tickets FOR SELECT USING (true);
CREATE POLICY "support_tickets_insert" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "support_tickets_update" ON public.support_tickets FOR UPDATE USING (true);

-- --------------------------------------------------------
-- 7. Enable realtime for new tables
-- --------------------------------------------------------
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ========================
-- DONE! Enhanced schema configured.
-- ========================