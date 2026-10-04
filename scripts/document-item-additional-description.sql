-- Vor einem erneuten Ausfuehren von quote-workflows.sql anwenden.
-- Bestehende Positionen behalten NULL; es gibt keinen Katalog-Default.
ALTER TABLE public.document_items
  ADD COLUMN IF NOT EXISTS additional_description_de text NULL;
