-- Belegvorlagen pro Firma + Vorlagen-Snapshot finalisierter Belege.
-- Einmal im Supabase SQL Editor ausführen, DANACH scripts/finalize_document.sql
-- (die neue RPC-Fassung schreibt den Snapshot). Beide Schritte vor dem Deploy
-- des App-Codes, der die Spalten liest.
--
-- Rein additiv:
--  * companies.document_template_id: NOT NULL mit Default 'standard'. ADD COLUMN
--    füllt bestehende Zeilen mit dem Default — alle bestehenden Firmen rendern
--    unverändert die Standardvorlage. Kein UPDATE nötig.
--  * documents.template_id / template_version: nullable, KEIN Backfill. Der
--    History-Trigger (protect_document_history) verbietet Änderungen an
--    finalisierten Zeilen; ADD COLUMN feuert keine Zeilen-Trigger. Belege ohne
--    Snapshot gelten im Code als Altbelege und rendern — nur falls ihr Archiv-PDF
--    fehlt — mit `standard@1` (LEGACY_DOCUMENT_TEMPLATE).
--  * Die zulässigen Werte entsprechen DOCUMENT_TEMPLATE_IDS (types/database.ts);
--    lib/documents/document-templates-migration.test.ts prüft den Gleichlauf.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS document_template_id text NOT NULL DEFAULT 'standard';

DO $$ BEGIN
  ALTER TABLE public.companies
    ADD CONSTRAINT companies_document_template_id_valid
    CHECK (document_template_id IN ('standard', 'ths-classic', 'erhan-excel'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS template_id text NULL,
  ADD COLUMN IF NOT EXISTS template_version smallint NULL;

DO $$ BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_template_id_valid
    CHECK (template_id IS NULL OR template_id IN ('standard', 'ths-classic', 'erhan-excel'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Snapshot nur vollständig: beide Felder gesetzt oder beide leer.
DO $$ BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_template_snapshot_complete
    CHECK ((template_id IS NULL) = (template_version IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_template_version_positive
    CHECK (template_version IS NULL OR template_version >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Verify afterwards:
--   select document_template_id, count(*) from companies group by 1;   -- nur 'standard'
--   select count(*) from documents where template_id is not null;      -- 0 bis zur ersten Finalisierung
