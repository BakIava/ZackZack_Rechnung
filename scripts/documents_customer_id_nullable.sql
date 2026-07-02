-- Run this once in the Supabase SQL Editor.
--
-- Drafts are created at the start of the create-flow, BEFORE a customer is
-- chosen (Step 1 only writes customer_snapshot when the user clicks "Weiter").
-- The app reads customer data exclusively from documents.customer_snapshot
-- (frozen copy) so that a document never changes when the customer record is
-- edited or deleted. A NOT NULL documents.customer_id therefore blocks draft
-- creation and contradicts the snapshot design.

-- 1) Allow drafts without a customer yet.
ALTER TABLE public.documents
  ALTER COLUMN customer_id DROP NOT NULL;

-- 2) Keep documents when a customer is deleted ("Alle Dokumente bleiben
--    erhalten"). Re-point the FK to ON DELETE SET NULL.
--    Adjust the constraint name if yours differs
--    (check: \d public.documents  →  look for the customer_id FK).
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_customer_id_fkey;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers (id)
  ON DELETE SET NULL;
