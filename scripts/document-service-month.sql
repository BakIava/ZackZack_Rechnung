-- Run once in the Supabase SQL Editor before deploying the application code.
-- Leistungsmonat (§ 31 Abs. 4 UStDV): gespeichert als Leistungszeitraum vom
-- Monatsersten bis Monatsletzten plus Markierung, damit Vorschau und PDF
-- „Leistungsmonat: Oktober 2026" statt eines Datumsbereichs zeigen.
-- Existing rows are not rewritten: bestehende Zeitraeume bleiben Zeitraeume.

BEGIN;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS service_period_is_month boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_service_month_full
    CHECK (
      NOT service_period_is_month
      OR (
        service_period_start IS NOT NULL
        AND service_period_end IS NOT NULL
        AND service_period_start = date_trunc('month', service_period_start)::date
        AND service_period_end = (date_trunc('month', service_period_start) + interval '1 month')::date - 1
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

COMMIT;
