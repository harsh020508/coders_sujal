-- ==============================================================================
-- LocalKaam - Migration: Real-Time Order Status Notifications
-- ==============================================================================
-- Run this script in Supabase Dashboard (SQL Editor) to add notifications support.

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY DEFAULT ('notif_' || gen_random_uuid()::text),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('ORDER_ACCEPTED', 'WORKER_ARRIVED', 'ORDER_COMPLETED')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_booking_notification UNIQUE (booking_id, notification_type)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON public.notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

-- 3. Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;

-- Customers can view only their own notifications
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR user_id IS NULL
  );

-- Customers can update only their own notifications (e.g. mark as read)
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  );

-- Notifications insertion originates strictly from trusted database trigger or service role
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' 
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

-- 4. Automatic Database Trigger on Bookings
CREATE OR REPLACE FUNCTION public.handle_booking_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
BEGIN
  -- Only trigger on genuine status changes and when customer_id exists
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.customer_id IS NOT NULL THEN
    -- EVENT 1: ORDER ACCEPTED
    IF OLD.status IN ('Pending confirmation', 'Pending') AND NEW.status IN ('Confirmed', 'Accepted') THEN
      v_type := 'ORDER_ACCEPTED';
      v_title := 'Order Accepted!';
      v_message := 'Good news! Your service provider has accepted your order and will be arriving shortly.';

    -- EVENT 2: WORKER ARRIVED
    ELSIF OLD.status NOT IN ('Worker arrived', 'Arrived') AND NEW.status IN ('Worker arrived', 'Arrived') THEN
      v_type := 'WORKER_ARRIVED';
      v_title := 'Your Worker Has Arrived!';
      v_message := 'Your service provider has reached your location and is ready to start the service.';

    -- EVENT 3: ORDER COMPLETED
    ELSIF OLD.status NOT IN ('Job completed', 'Completed') AND NEW.status IN ('Job completed', 'Completed') THEN
      v_type := 'ORDER_COMPLETED';
      v_title := 'Order Completed Successfully!';
      v_message := 'Your service has been completed. Thank you for choosing LocalKaam!';
    END IF;

    -- If a matched transition occurred, insert notification safely with duplicate prevention
    IF v_type IS NOT NULL THEN
      INSERT INTO public.notifications (
        id, user_id, booking_id, notification_type, title, message, is_read, created_at
      )
      VALUES (
        'notif_' || NEW.id || '_' || v_type,
        NEW.customer_id,
        NEW.id,
        v_type,
        v_title,
        v_message,
        FALSE,
        TIMEZONE('utc'::text, NOW())
      )
      ON CONFLICT (booking_id, notification_type) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_status_notification ON public.bookings;
CREATE TRIGGER trg_booking_status_notification
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_status_notification();

-- 5. Realtime Publication
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
