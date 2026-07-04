-- Run this once in the Supabase SQL Editor.
--
-- The app models five document statuses (see lib/documents/types.ts and
-- lib/db/schema.ts):
--
--   draft     → Entwurf, noch keine Rechnungsnummer
--   finalized → festgeschrieben, Rechnungsnummer vergeben
--   sent      → an den Kunden versendet
--   paid      → bezahlt
--   cancelled → storniert
--
-- Several queries filter directly on these values, e.g. the dashboard
-- (lib/dashboard/fetch.ts):
--
--   .in("status", ["finalized", "sent"])   -- offene Beträge
--   .eq("status", "paid")                  -- bezahlte Beträge
--
-- Postgres casts those string literals to document_status_enum for the
-- comparison. If the enum is missing a value the whole query aborts with:
--
--   22P02  invalid input value for enum document_status_enum: "paid"
--
-- This migration brings the enum in line with the application model.
-- ADD VALUE IF NOT EXISTS makes it idempotent, so re-running is harmless and
-- values that already exist are left untouched.

ALTER TYPE public.document_status_enum ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE public.document_status_enum ADD VALUE IF NOT EXISTS 'finalized';
ALTER TYPE public.document_status_enum ADD VALUE IF NOT EXISTS 'sent';
ALTER TYPE public.document_status_enum ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.document_status_enum ADD VALUE IF NOT EXISTS 'cancelled';

-- Note: an earlier version of this migration also added the value 'final'.
-- The code standardises on 'finalized', so 'final' is unused. Postgres cannot
-- drop a single enum value, so it may linger harmlessly. No row is written with
-- 'final', so nothing depends on it. To remove the leftover entirely, the whole
-- enum type has to be recreated (cast column to text, drop type, recreate) —
-- only worth doing if a perfectly clean enum is required.

-- Verify afterwards:
--   SELECT enum_range(NULL::public.document_status_enum);
