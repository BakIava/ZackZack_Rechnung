-- Vor dem Deployment im Supabase SQL Editor ausfuehren: das Preview-Repository
-- liest die Spalte, ohne sie schlaegt das Laden jeder Belegvorschau fehl.
-- Webadresse der Firma (optional, ohne Schema, z. B. "fliesen-erhan.de").
-- Erfasst wird sie vorerst nur im Supabase-Dashboard; Onboarding schreibt sie nicht.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS website text NULL;
