-- Run once in the Supabase SQL Editor before deploying the application code.
-- Existing rows are not rewritten: historical service_date values remain intact.

BEGIN;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS service_period_start date,
  ADD COLUMN IF NOT EXISTS service_period_end date;

DO $$
BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_service_period_complete
    CHECK (
      (service_period_start IS NULL AND service_period_end IS NULL)
      OR (service_period_start IS NOT NULL AND service_period_end IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_service_period_order
    CHECK (
      service_period_start IS NULL
      OR service_period_end IS NULL
      OR service_period_start <= service_period_end
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_service_timing_exclusive
    CHECK (
      service_date IS NULL
      OR (service_period_start IS NULL AND service_period_end IS NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

COMMIT;
