-- Umsatzsteuer auf Positionsebene (19/7/0 %) – einmal im Supabase SQL Editor ausführen.
-- Danach im selben Wartungsfenster scripts/finalize_document.sql ausführen;
-- die dortige RPC-Version setzt die für den History-Trigger nötige Transaktionsmarke.
--
-- Historische, bereits festgeschriebene Dokumente behalten ihre bisherigen
-- Beträge unverändert (0 % Snapshot). Bestehende Entwürfe werden dagegen auf
-- den Firmenstandard migriert und vollständig neu berechnet.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS default_tax_rate smallint NOT NULL DEFAULT 19;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS default_tax_rate smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount integer NOT NULL DEFAULT 0;

ALTER TABLE public.document_items
  ADD COLUMN IF NOT EXISTS tax_rate smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate_overridden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_amount integer NOT NULL DEFAULT 0;

-- Bestehende Belege reproduzierbar halten: bisher war total_amount zugleich
-- Netto und Brutto und es wurde keine Umsatzsteuer ausgewiesen.
UPDATE public.documents
SET subtotal_amount = total_amount,
    tax_amount = 0
WHERE status <> 'draft';

UPDATE public.document_items i
SET tax_rate = 0,
    tax_rate_overridden = false,
    tax_amount = 0,
    gross_amount = i.total_amount
WHERE EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = i.document_id AND d.status <> 'draft'
);

-- Offene Entwürfe übernehmen jetzt den aktuellen Firmenstandard.
UPDATE public.documents d
SET default_tax_rate = CASE
      WHEN d.is_kleinunternehmer THEN 0
      ELSE c.default_tax_rate
    END
FROM public.companies c
WHERE c.id = d.company_id
  AND d.status = 'draft';

WITH calculated AS (
  SELECT
    i.id,
    round(i.unit_price::numeric * i.amount)::integer AS net_amount,
    d.default_tax_rate AS rate
  FROM public.document_items i
  JOIN public.documents d ON d.id = i.document_id
  WHERE d.status = 'draft'
)
UPDATE public.document_items i
SET total_amount = c.net_amount,
    tax_rate = c.rate,
    tax_rate_overridden = false,
    tax_amount = round(c.net_amount::numeric * c.rate / 100)::integer,
    gross_amount = c.net_amount + round(c.net_amount::numeric * c.rate / 100)::integer
FROM calculated c
WHERE c.id = i.id;

WITH totals AS (
  SELECT
    d.id,
    coalesce(sum(i.total_amount), 0)::integer AS net_amount,
    coalesce(sum(i.tax_amount), 0)::integer AS tax_amount,
    coalesce(sum(i.gross_amount), 0)::integer AS gross_amount
  FROM public.documents d
  LEFT JOIN public.document_items i ON i.document_id = d.id
  WHERE d.status = 'draft'
  GROUP BY d.id
)
UPDATE public.documents d
SET subtotal_amount = t.net_amount,
    tax_amount = t.tax_amount,
    total_amount = t.gross_amount
FROM totals t
WHERE t.id = d.id;

ALTER TABLE public.documents ALTER COLUMN default_tax_rate SET DEFAULT 19;

DO $$ BEGIN
  ALTER TABLE public.companies
    ADD CONSTRAINT companies_default_tax_rate_valid
    CHECK (default_tax_rate IN (0, 7, 19));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_default_tax_rate_valid
    CHECK (default_tax_rate IN (0, 7, 19));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_tax_totals_valid
    CHECK (
      subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0
      AND subtotal_amount + tax_amount = total_amount
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.document_items
    ADD CONSTRAINT document_items_tax_rate_valid CHECK (tax_rate IN (0, 7, 19));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.document_items
    ADD CONSTRAINT document_items_tax_totals_valid
    CHECK (
      amount > 0 AND unit_price >= 0 AND total_amount >= 0
      AND tax_amount >= 0 AND gross_amount = total_amount + tax_amount
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_document_items_company_tax_rate
  ON public.document_items(company_id, tax_rate);

-- Finalisierte Dokumente sind fiskalisch unveränderbar. Status und paid_at
-- dürfen für Versand/Zahlungsstatus weiter gepflegt werden.
CREATE OR REPLACE FUNCTION public.protect_document_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'finalized_document_immutable';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status = 'draft' AND NEW.status <> 'draft'
     AND coalesce(current_setting('zackzack.finalizing', true), '') <> 'on' THEN
    RAISE EXCEPTION 'finalize_via_rpc_required';
  END IF;

  IF OLD.status <> 'draft'
     AND (to_jsonb(NEW) - ARRAY['status', 'paid_at', 'updated_at']::text[])
         IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['status', 'paid_at', 'updated_at']::text[]) THEN
    RAISE EXCEPTION 'finalized_document_immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_protect_history ON public.documents;
CREATE TRIGGER documents_protect_history
  BEFORE UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.protect_document_history();

CREATE OR REPLACE FUNCTION public.protect_document_item_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_document_id uuid := coalesce(NEW.document_id, OLD.document_id);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = v_document_id AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'finalized_document_immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS document_items_protect_history ON public.document_items;
CREATE TRIGGER document_items_protect_history
  BEFORE INSERT OR UPDATE OR DELETE ON public.document_items
  FOR EACH ROW EXECUTE FUNCTION public.protect_document_item_history();
