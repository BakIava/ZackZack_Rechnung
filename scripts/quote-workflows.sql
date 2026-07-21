-- Angebots-Workflows fuer Version 1.
--
-- Reihenfolge im Supabase SQL Editor:
--   1. Dieses Skript
--   2. scripts/finalize_document.sql
--
-- Das Skript trennt Angebote fachlich von Rechnungen, ohne den gemeinsamen
-- document_status_enum um einen abgeleiteten "converted"-Status zu erweitern.
-- "In Rechnung umgewandelt" wird aus einer unveraenderbaren Relation abgeleitet.

BEGIN;

-- Historische Inkonsistenzen niemals stillschweigend umschreiben. Sie muessen
-- vor der Migration fachlich geprueft werden.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.documents
    WHERE document_type = 'quote'
      AND (status = 'paid' OR paid_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'historical_paid_quotes_require_manual_review';
  END IF;
END;
$$;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS valid_until date;

-- Der bestehende History-Trigger schuetzt finalisierte Zeilen. Fuer den
-- einmaligen, transaktionalen Backfill bekommt er kurz eine lokale
-- Migrationsmarke; am Ende dieses Skripts wird die strengere Endfassung gesetzt.
CREATE OR REPLACE FUNCTION public.protect_document_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('zackzack.migrating', true), '') = 'on' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

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

SELECT set_config('zackzack.migrating', 'on', true);

UPDATE public.documents
SET valid_until = (
  coalesce(issue_date, created_at::date) + interval '1 month'
)::date
WHERE document_type = 'quote'
  AND valid_until IS NULL;

UPDATE public.documents
SET valid_until = NULL
WHERE document_type = 'invoice'
  AND valid_until IS NOT NULL;

SELECT set_config('zackzack.migrating', 'off', true);

DO $$
BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_valid_until_matches_type
    CHECK (
      (document_type = 'quote' AND valid_until IS NOT NULL)
      OR (document_type = 'invoice' AND valid_until IS NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_quote_valid_until_not_before_issue
    CHECK (
      document_type <> 'quote'
      OR issue_date IS NULL
      OR valid_until >= issue_date
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_quote_not_payable
    CHECK (
      document_type <> 'quote'
      OR (status <> 'paid' AND paid_at IS NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.document_relation_type_enum AS ENUM (
    'converted_to_invoice',
    'based_on_quote'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.document_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  source_document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
  target_document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
  relation_type public.document_relation_type_enum NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_relations_distinct_documents
    CHECK (source_document_id <> target_document_id),
  CONSTRAINT document_relations_target_unique UNIQUE (target_document_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS document_relations_one_invoice_per_quote
  ON public.document_relations(source_document_id)
  WHERE relation_type = 'converted_to_invoice';

CREATE INDEX IF NOT EXISTS document_relations_company_source
  ON public.document_relations(company_id, source_document_id);

ALTER TABLE public.document_relations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.document_relations FROM anon, authenticated;
GRANT SELECT ON TABLE public.document_relations TO authenticated;

DROP POLICY IF EXISTS document_relations_select_own ON public.document_relations;
CREATE POLICY document_relations_select_own
  ON public.document_relations
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id());

-- Kein INSERT/UPDATE/DELETE fuer authenticated: Schreiben erfolgt nur in den
-- SECURITY-DEFINER-RPCs weiter unten.

CREATE OR REPLACE FUNCTION public.validate_document_relation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_source_company uuid;
  v_source_type public.documents.document_type%TYPE;
  v_source_status public.documents.status%TYPE;
  v_target_company uuid;
  v_target_type public.documents.document_type%TYPE;
  v_target_status public.documents.status%TYPE;
BEGIN
  SELECT company_id, document_type, status
    INTO v_source_company, v_source_type, v_source_status
  FROM public.documents
  WHERE id = NEW.source_document_id;

  SELECT company_id, document_type, status
    INTO v_target_company, v_target_type, v_target_status
  FROM public.documents
  WHERE id = NEW.target_document_id;

  IF v_source_company IS NULL OR v_target_company IS NULL
     OR v_source_company <> NEW.company_id
     OR v_target_company <> NEW.company_id THEN
    RAISE EXCEPTION 'document_relation_company_mismatch';
  END IF;

  IF v_source_type <> 'quote' OR v_source_status NOT IN ('finalized', 'sent') THEN
    RAISE EXCEPTION 'document_relation_source_invalid';
  END IF;

  IF NEW.relation_type = 'converted_to_invoice'
     AND (v_target_type <> 'invoice' OR v_target_status <> 'draft') THEN
    RAISE EXCEPTION 'document_relation_invoice_target_invalid';
  END IF;

  IF NEW.relation_type = 'based_on_quote'
     AND (v_target_type <> 'quote' OR v_target_status <> 'draft') THEN
    RAISE EXCEPTION 'document_relation_quote_target_invalid';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS document_relations_validate ON public.document_relations;
CREATE TRIGGER document_relations_validate
  BEFORE INSERT ON public.document_relations
  FOR EACH ROW EXECUTE FUNCTION public.validate_document_relation();

CREATE OR REPLACE FUNCTION public.protect_document_relation_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'document_relation_immutable';
END;
$$;

DROP TRIGGER IF EXISTS document_relations_protect_history ON public.document_relations;
CREATE TRIGGER document_relations_protect_history
  BEFORE UPDATE OR DELETE ON public.document_relations
  FOR EACH ROW EXECUTE FUNCTION public.protect_document_relation_history();

-- Strengere Endfassung des Dokument-Schutzes: Angebote sind keine Forderungen;
-- Typ und Existenz eines verknuepften Zieldokuments bleiben ebenfalls stabil.
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
    IF EXISTS (
      SELECT 1 FROM public.document_relations r
      WHERE r.target_document_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'linked_document_delete_forbidden';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.document_type = 'quote'
     AND (NEW.status = 'paid' OR NEW.paid_at IS NOT NULL) THEN
    RAISE EXCEPTION 'quote_not_payable';
  END IF;

  IF OLD.status = 'draft'
     AND OLD.document_type IS DISTINCT FROM NEW.document_type
     AND EXISTS (
       SELECT 1 FROM public.document_relations r
       WHERE r.target_document_id = OLD.id
     ) THEN
    RAISE EXCEPTION 'linked_document_type_immutable';
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

CREATE OR REPLACE FUNCTION public.project_quote_invoice_total(
  p_quote_id uuid,
  p_default_tax_rate smallint
)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(sum(
    round(i.unit_price::numeric * i.amount)::integer
    + round(
        round(i.unit_price::numeric * i.amount)::numeric
        * (CASE WHEN i.tax_rate_overridden THEN i.tax_rate ELSE p_default_tax_rate END)
        / 100
      )::integer
  ), 0)::integer
  FROM public.document_items i
  WHERE i.document_id = p_quote_id;
$$;

CREATE OR REPLACE FUNCTION public.get_quote_conversion_preview(p_quote_id uuid)
RETURNS TABLE (
  existing_invoice_id uuid,
  quote_total integer,
  invoice_total integer,
  valid_until date,
  is_expired boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_quote public.documents%ROWTYPE;
  v_default_rate smallint;
  v_today date := timezone('Europe/Berlin', now())::date;
BEGIN
  v_company_id := public.get_user_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_quote
  FROM public.documents
  WHERE id = p_quote_id
    AND company_id = v_company_id
    AND document_type = 'quote'
    AND status IN ('finalized', 'sent');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quote_not_convertible';
  END IF;

  SELECT CASE WHEN c.kleinunternehmer THEN 0 ELSE c.default_tax_rate END
    INTO v_default_rate
  FROM public.companies c
  WHERE c.id = v_company_id;

  RETURN QUERY
  SELECT
    (
      SELECT r.target_document_id
      FROM public.document_relations r
      WHERE r.source_document_id = p_quote_id
        AND r.relation_type = 'converted_to_invoice'
    ),
    v_quote.total_amount,
    public.project_quote_invoice_total(p_quote_id, v_default_rate),
    v_quote.valid_until,
    v_quote.valid_until < v_today;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(
  p_quote_id uuid,
  p_expected_invoice_total integer,
  p_confirm_expired boolean DEFAULT false
)
RETURNS TABLE (
  document_id uuid,
  created boolean,
  quote_total integer,
  invoice_total integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_quote public.documents%ROWTYPE;
  v_existing_id uuid;
  v_invoice_id uuid;
  v_is_kleinunternehmer boolean;
  v_default_rate smallint;
  v_projected_total integer;
  v_projected_subtotal integer;
  v_projected_tax integer;
  v_today date := timezone('Europe/Berlin', now())::date;
BEGIN
  v_company_id := public.get_user_company_id();
  v_user_id := auth.uid();
  IF v_company_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_quote
  FROM public.documents
  WHERE id = p_quote_id
    AND company_id = v_company_id
    AND document_type = 'quote'
    AND status IN ('finalized', 'sent')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quote_not_convertible';
  END IF;

  SELECT r.target_document_id INTO v_existing_id
  FROM public.document_relations r
  WHERE r.source_document_id = p_quote_id
    AND r.relation_type = 'converted_to_invoice';

  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_id, false, v_quote.total_amount,
      (SELECT d.total_amount FROM public.documents d WHERE d.id = v_existing_id);
    RETURN;
  END IF;

  IF v_quote.valid_until < v_today AND NOT p_confirm_expired THEN
    RAISE EXCEPTION 'expired_quote_confirmation_required';
  END IF;

  SELECT c.kleinunternehmer,
         CASE WHEN c.kleinunternehmer THEN 0 ELSE c.default_tax_rate END
    INTO v_is_kleinunternehmer, v_default_rate
  FROM public.companies c
  WHERE c.id = v_company_id;

  v_projected_total := public.project_quote_invoice_total(p_quote_id, v_default_rate);
  IF p_expected_invoice_total IS DISTINCT FROM v_projected_total THEN
    RAISE EXCEPTION 'conversion_preview_stale';
  END IF;

  SELECT
    coalesce(sum(round(i.unit_price::numeric * i.amount)::integer), 0)::integer,
    coalesce(sum(round(
      round(i.unit_price::numeric * i.amount)::numeric
      * (CASE WHEN i.tax_rate_overridden THEN i.tax_rate ELSE v_default_rate END)
      / 100
    )::integer), 0)::integer
  INTO v_projected_subtotal, v_projected_tax
  FROM public.document_items i
  WHERE i.document_id = p_quote_id;

  INSERT INTO public.documents (
    company_id,
    customer_id,
    created_by,
    document_type,
    document_number,
    status,
    issue_date,
    service_date,
    valid_until,
    customer_snapshot,
    total_amount,
    subtotal_amount,
    tax_amount,
    is_kleinunternehmer,
    default_tax_rate,
    paid_at
  ) VALUES (
    v_company_id,
    v_quote.customer_id,
    v_user_id,
    'invoice',
    NULL,
    'draft',
    v_today,
    NULL,
    NULL,
    v_quote.customer_snapshot,
    v_projected_total,
    v_projected_subtotal,
    v_projected_tax,
    v_is_kleinunternehmer,
    v_default_rate,
    NULL
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.document_items (
    document_id,
    company_id,
    service_id,
    position,
    description_de,
    amount,
    unit,
    unit_price,
    total_amount,
    tax_rate,
    tax_rate_overridden,
    tax_amount,
    gross_amount,
    purchase_price,
    surcharge,
    surcharge_type
  )
  SELECT
    v_invoice_id,
    v_company_id,
    i.service_id,
    i.position,
    i.description_de,
    i.amount,
    i.unit,
    i.unit_price,
    round(i.unit_price::numeric * i.amount)::integer,
    CASE WHEN i.tax_rate_overridden THEN i.tax_rate ELSE v_default_rate END,
    i.tax_rate_overridden,
    round(
      round(i.unit_price::numeric * i.amount)::numeric
      * (CASE WHEN i.tax_rate_overridden THEN i.tax_rate ELSE v_default_rate END)
      / 100
    )::integer,
    round(i.unit_price::numeric * i.amount)::integer
      + round(
          round(i.unit_price::numeric * i.amount)::numeric
          * (CASE WHEN i.tax_rate_overridden THEN i.tax_rate ELSE v_default_rate END)
          / 100
        )::integer,
    i.purchase_price,
    i.surcharge,
    i.surcharge_type
  FROM public.document_items i
  WHERE i.document_id = p_quote_id
  ORDER BY i.position;

  INSERT INTO public.document_relations (
    company_id, source_document_id, target_document_id, relation_type
  ) VALUES (
    v_company_id, p_quote_id, v_invoice_id, 'converted_to_invoice'
  );

  RETURN QUERY SELECT v_invoice_id, true, v_quote.total_amount, v_projected_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.duplicate_quote(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_quote public.documents%ROWTYPE;
  v_new_id uuid;
  v_is_kleinunternehmer boolean;
  v_default_rate smallint;
  v_subtotal integer;
  v_tax integer;
  v_total integer;
  v_today date := timezone('Europe/Berlin', now())::date;
BEGIN
  v_company_id := public.get_user_company_id();
  v_user_id := auth.uid();
  IF v_company_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_quote
  FROM public.documents
  WHERE id = p_quote_id
    AND company_id = v_company_id
    AND document_type = 'quote'
    AND status IN ('finalized', 'sent')
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'quote_not_adjustable';
  END IF;

  SELECT c.kleinunternehmer,
         CASE WHEN c.kleinunternehmer THEN 0 ELSE c.default_tax_rate END
    INTO v_is_kleinunternehmer, v_default_rate
  FROM public.companies c
  WHERE c.id = v_company_id;

  SELECT
    coalesce(sum(round(i.unit_price::numeric * i.amount)::integer), 0)::integer,
    coalesce(sum(round(
      round(i.unit_price::numeric * i.amount)::numeric
      * (CASE WHEN i.tax_rate_overridden THEN i.tax_rate ELSE v_default_rate END)
      / 100
    )::integer), 0)::integer
  INTO v_subtotal, v_tax
  FROM public.document_items i
  WHERE i.document_id = p_quote_id;
  v_total := v_subtotal + v_tax;

  INSERT INTO public.documents (
    company_id,
    customer_id,
    created_by,
    document_type,
    document_number,
    status,
    issue_date,
    service_date,
    valid_until,
    customer_snapshot,
    total_amount,
    subtotal_amount,
    tax_amount,
    is_kleinunternehmer,
    default_tax_rate,
    paid_at
  ) VALUES (
    v_company_id,
    v_quote.customer_id,
    v_user_id,
    'quote',
    NULL,
    'draft',
    v_today,
    NULL,
    (v_today + interval '1 month')::date,
    v_quote.customer_snapshot,
    v_total,
    v_subtotal,
    v_tax,
    v_is_kleinunternehmer,
    v_default_rate,
    NULL
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.document_items (
    document_id,
    company_id,
    service_id,
    position,
    description_de,
    amount,
    unit,
    unit_price,
    total_amount,
    tax_rate,
    tax_rate_overridden,
    tax_amount,
    gross_amount,
    purchase_price,
    surcharge,
    surcharge_type
  )
  SELECT
    v_new_id,
    v_company_id,
    i.service_id,
    i.position,
    i.description_de,
    i.amount,
    i.unit,
    i.unit_price,
    round(i.unit_price::numeric * i.amount)::integer,
    CASE WHEN i.tax_rate_overridden THEN i.tax_rate ELSE v_default_rate END,
    i.tax_rate_overridden,
    round(
      round(i.unit_price::numeric * i.amount)::numeric
      * (CASE WHEN i.tax_rate_overridden THEN i.tax_rate ELSE v_default_rate END)
      / 100
    )::integer,
    round(i.unit_price::numeric * i.amount)::integer
      + round(
          round(i.unit_price::numeric * i.amount)::numeric
          * (CASE WHEN i.tax_rate_overridden THEN i.tax_rate ELSE v_default_rate END)
          / 100
        )::integer,
    i.purchase_price,
    i.surcharge,
    i.surcharge_type
  FROM public.document_items i
  WHERE i.document_id = p_quote_id
  ORDER BY i.position;

  INSERT INTO public.document_relations (
    company_id, source_document_id, target_document_id, relation_type
  ) VALUES (
    v_company_id, p_quote_id, v_new_id, 'based_on_quote'
  );

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.project_quote_invoice_total(uuid, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quote_conversion_preview(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.convert_quote_to_invoice(uuid, integer, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.duplicate_quote(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_quote_conversion_preview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(uuid, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_quote(uuid) TO authenticated;

COMMIT;
