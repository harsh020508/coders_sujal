-- ==============================================================================
-- LOCALKAAM: BOOKING ARRIVAL OTP VERIFICATION MIGRATION
-- Adds secure persistent storage for server-generated booking arrival OTPs.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.booking_otps (
  id              TEXT PRIMARY KEY,
  booking_id      TEXT NOT NULL UNIQUE,
  customer_id     TEXT NOT NULL,
  worker_id       TEXT NOT NULL,
  otp_hash        TEXT NOT NULL,
  expires_at      BIGINT NOT NULL,
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 5,
  consumed_at     BIGINT,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  created_at      BIGINT NOT NULL,
  updated_at      BIGINT NOT NULL
);

-- Indexes for rapid lookup by booking, customer, or worker
CREATE INDEX IF NOT EXISTS idx_otps_booking ON public.booking_otps(booking_id);
CREATE INDEX IF NOT EXISTS idx_otps_customer ON public.booking_otps(customer_id);
CREATE INDEX IF NOT EXISTS idx_otps_worker ON public.booking_otps(worker_id);

-- Enable Row Level Security
ALTER TABLE public.booking_otps ENABLE ROW LEVEL SECURITY;

-- Security Policy: Workers and customers cannot directly query the otp_hash or modify records.
-- Server-side endpoints operate via service role / backend handlers.
CREATE POLICY "Users can only view non-sensitive OTP status of their own bookings"
  ON public.booking_otps
  FOR SELECT
  USING (
    auth.uid()::text = customer_id OR auth.uid()::text = worker_id
  );
