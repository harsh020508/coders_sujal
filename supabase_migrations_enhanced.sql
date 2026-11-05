-- ==============================================================================
-- LocalKaam - Database Migrations for New Features
-- ==============================================================================
-- Migration 1: Enhanced Reviews (sub-ratings, feedback tags)
-- Migration 2: Enhanced Complaints (categories, lifecycle, resolution)
-- Migration 3: Support Tickets (Help Centre)

-- Migration 1: Reviews enhancements
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS quality_rating NUMERIC DEFAULT 5 CHECK (quality_rating >= 1 AND quality_rating <= 5);

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS behaviour_rating NUMERIC DEFAULT 5 CHECK (behaviour_rating >= 1 AND behaviour_rating <= 5);

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS punctuality_rating NUMERIC DEFAULT 5 CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5);

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS communication_rating NUMERIC DEFAULT 5 CHECK (communication_rating >= 1 AND communication_rating <= 5);

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS feedback_tags TEXT[] DEFAULT '{}'::text[];

-- Migration 2: Complaints enhancements
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';

ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS incident_date TIMESTAMPTZ;

ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS resolution_request TEXT DEFAULT '';

ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS resolution_notes TEXT DEFAULT '';

ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS worker_response TEXT DEFAULT '';

ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Migration 3: Support Tickets
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

-- Enable realtime for support_tickets
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- End of migrations
