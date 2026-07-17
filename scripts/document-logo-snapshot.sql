-- Run once before deploying the application code that reads logo snapshots.
-- The snapshot makes a finalized document independent from later logo changes.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS logo_url_snapshot text,
  ADD COLUMN IF NOT EXISTS logo_snapshot_captured boolean NOT NULL DEFAULT false;

-- Historical documents did not store the logo used at finalization. Freeze the
-- currently configured logo as the best available migration value. Existing
-- archived PDF bytes remain untouched and continue to win on PDF retrieval.
UPDATE public.documents AS d
SET logo_url_snapshot = c.logo_url,
    logo_snapshot_captured = true
FROM public.companies AS c
WHERE d.company_id = c.id
  AND d.status <> 'draft'
  AND d.logo_snapshot_captured = false;

-- After this migration, run scripts/finalize_document.sql so every future
-- finalization captures companies.logo_url atomically with the status change.
