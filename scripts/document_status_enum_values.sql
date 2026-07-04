-- Run this once in the Supabase SQL Editor.
--
-- The app models five document statuses (see lib/documents/types.ts and
-- lib/db/schema.ts):
--
--   draft  → Entwurf, noch keine Rechnungsnummer
--   final  → festgeschrieben, Rechnungsnummer vergeben
--   sent   → an den Kunden versendet
--   paid   → bezahlt
--   cancelled → storniert
--
-- Several queries filter directly on these values, e.g. the dashboard
-- (lib/dashboard/fetch.ts):
--
--   .in("status", ["final", "sent"])   -- offene Beträge
--   .eq("status", "paid")              -- bezahlte Beträge
--
-- Postgres casts those string literals to document_status_enum for the
-- comparison. If the enum is missing a value the whole query aborts with:
--
--   22P02  invalid input value for enum document_status_enum: "paid"
--   22P02  invalid input value for enum document_status_enum: "final"
--
-- This migration brings the enum in line with the application model.
-- ADD VALUE IF NOT EXISTS makes it idempotent, so re-running is harmless and
-- values that already exist are left untouched.

ALTER TYPE public.document_status_enum ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.document_status_enum ADD VALUE IF NOT EXISTS 'final';
ALTER TYPE public.document_status_enum ADD VALUE IF NOT EXISTS 'sent';
ALTER TYPE public.document_status_enum ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.document_status_enum ADD VALUE IF NOT EXISTS 'cancelled';

-- Verify afterwards:
--   SELECT enum_range(NULL::public.document_status_enum);
