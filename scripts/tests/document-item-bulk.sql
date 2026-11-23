-- Für eine leere, flüchtige PostgreSQL-Testdatenbank.
-- psql -X -f scripts/tests/document-item-bulk.sql
\set ON_ERROR_STOP on
BEGIN;

CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE FUNCTION public.get_user_company_id() RETURNS uuid
  LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('zackzack.test_company', true), '')::uuid $$;

CREATE TABLE public.documents (
  id uuid PRIMARY KEY, company_id uuid NOT NULL, status text NOT NULL,
  default_tax_rate smallint NOT NULL, subtotal_amount integer NOT NULL,
  tax_amount integer NOT NULL CHECK (tax_amount <= 300), total_amount integer NOT NULL
);

CREATE TABLE public.document_items (
  id uuid PRIMARY KEY, document_id uuid NOT NULL REFERENCES public.documents(id), company_id uuid NOT NULL,
  position integer NOT NULL CHECK (position > 0), description_de text NOT NULL,
  total_amount integer NOT NULL, tax_rate smallint NOT NULL, tax_rate_overridden boolean NOT NULL,
  tax_amount integer NOT NULL, gross_amount integer NOT NULL,
  service_id uuid, additional_description_de text, amount numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'Stk.', unit_price integer NOT NULL DEFAULT 100,
  purchase_price integer, surcharge integer, surcharge_type text,
  UNIQUE (document_id, position)
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_documents ON public.documents TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY own_items ON public.document_items TO authenticated USING (company_id = public.get_user_company_id());
GRANT SELECT, UPDATE ON public.documents TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.document_items TO authenticated;

INSERT INTO public.documents VALUES
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'draft',     7, 1050, 68, 1118),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'draft',     0,  100,  0,  100),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'finalized', 0,  100,  0,  100),
  ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'draft',     0, 5000,  0, 5000),
  ('10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'draft',    19,    0,  0,    0);

INSERT INTO public.document_items
  (id, document_id, company_id, position, description_de, total_amount, tax_rate, tax_rate_overridden, tax_amount, gross_amount)
VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 'Montage',     50,  7, true,    4,   54),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 2, 'Abzug',      -50, 19, true,  -10,  -60),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 3, 'Anfahrt',   1050,  7, false,  74, 1124),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 1, 'Fremde Firma',100,  0, false,   0,  100),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 1, 'Finalisiert', 100,  0, false,   0,  100),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 1, 'Grenztest',  5000,  0, false,   0, 5000),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 1, 'Abzug',     -5000, 19, false,-950,-5950),
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 2, 'Werkzeug',   5000, 19, false, 950, 5950);

\ir ../document-item-bulk.sql

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.apply_draft_item_selection(uuid,uuid[],text,smallint)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anonymous execution granted';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  draft uuid := '10000000-0000-0000-0000-000000000001';
  foreign_draft uuid := '10000000-0000-0000-0000-000000000002';
  finalized uuid := '10000000-0000-0000-0000-000000000003';
  high_value_draft uuid := '10000000-0000-0000-0000-000000000004';
  first_id uuid := '30000000-0000-0000-0000-000000000001';
  second_id uuid := '30000000-0000-0000-0000-000000000002';
  third_id uuid := '30000000-0000-0000-0000-000000000003';
  foreign_id uuid := '30000000-0000-0000-0000-000000000004';
  finalized_id uuid := '30000000-0000-0000-0000-000000000005';
  high_value_id uuid := '30000000-0000-0000-0000-000000000006';
  result jsonb;
BEGIN
  BEGIN
    PERFORM public.apply_draft_item_selection(draft, ARRAY[first_id], 'delete');
    RAISE EXCEPTION 'missing company accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'bulk_items_not_authenticated' THEN RAISE; END IF;
  END;
  PERFORM set_config('zackzack.test_company', '20000000-0000-0000-0000-000000000001', true);

  BEGIN
    PERFORM public.apply_draft_item_selection(draft, ARRAY[first_id, first_id], 'delete');
    RAISE EXCEPTION 'duplicate selection accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'bulk_items_invalid' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.apply_draft_item_selection(draft, ARRAY[first_id, foreign_id], 'delete');
    RAISE EXCEPTION 'foreign item accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'bulk_items_selection_changed' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.apply_draft_item_selection(foreign_draft, ARRAY[foreign_id], 'delete');
    RAISE EXCEPTION 'foreign draft accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'bulk_items_draft_not_found' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.apply_draft_item_selection(finalized, ARRAY[finalized_id], 'delete');
    RAISE EXCEPTION 'finalized document accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'bulk_items_draft_not_found' THEN RAISE; END IF;
  END;

  result := public.apply_draft_item_selection(draft, ARRAY[first_id, second_id], 'vat', 19::smallint);
  IF jsonb_array_length(result) <> 3 OR
     (result->0->>'tax_amount')::integer <> 10 OR
     (result->1->>'tax_amount')::integer <> -10 OR
     (result->2->>'tax_amount')::integer <> 74 OR
     (SELECT total_amount FROM public.documents WHERE id = draft) <> 1124 THEN
    RAISE EXCEPTION 'incorrect signed per-line rounding or persisted total';
  END IF;

  result := public.apply_draft_item_selection(draft, ARRAY[first_id], 'vat', 0::smallint);
  IF (result->0->>'tax_rate_overridden')::boolean IS DISTINCT FROM true OR (result->0->>'tax_amount')::integer <> 0 THEN
    RAISE EXCEPTION 'explicit zero not preserved as override';
  END IF;

  result := public.apply_draft_item_selection(draft, ARRAY[first_id, second_id], 'vat');
  IF (result->0->>'tax_rate')::integer <> 7 OR
     (result->0->>'tax_rate_overridden')::boolean IS DISTINCT FROM false OR
     (result->1->>'tax_amount')::integer <> -4 THEN
    RAISE EXCEPTION 'default rate or override flag incorrect';
  END IF;

  -- Erst die Position wird geändert, dann scheitert bewusst der Dokument-Update.
  BEGIN
    PERFORM public.apply_draft_item_selection(high_value_draft, ARRAY[high_value_id], 'vat', 19::smallint);
    RAISE EXCEPTION 'expected totals constraint failure';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF (SELECT tax_rate FROM public.document_items WHERE id = high_value_id) <> 0 OR
     (SELECT total_amount FROM public.documents WHERE id = high_value_draft) <> 5000 THEN
    RAISE EXCEPTION 'position change was not rolled back';
  END IF;

  -- Ohne den Abzug würde der neue Steuerbetrag die Testgrenze überschreiten.
  BEGIN
    PERFORM public.apply_draft_item_selection(
      '10000000-0000-0000-0000-000000000005',
      ARRAY['30000000-0000-0000-0000-000000000007'::uuid], 'delete'
    );
    RAISE EXCEPTION 'expected delete rollback';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF (SELECT array_agg(position ORDER BY position) FROM public.document_items
      WHERE document_id = '10000000-0000-0000-0000-000000000005') IS DISTINCT FROM ARRAY[1, 2] THEN
    RAISE EXCEPTION 'delete or renumber was not rolled back';
  END IF;

  result := public.apply_draft_item_selection(draft, ARRAY[first_id, third_id], 'delete');
  IF jsonb_array_length(result) <> 1 OR (result->0->>'id')::uuid <> second_id OR
     (result->0->>'position')::integer <> 1 OR
     (SELECT total_amount FROM public.documents WHERE id = draft) <> -54 THEN
    RAISE EXCEPTION 'delete or renumber incorrect';
  END IF;

  BEGIN
    PERFORM public.apply_draft_item_selection(draft, ARRAY[first_id, second_id], 'delete');
    RAISE EXCEPTION 'stale selection accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'bulk_items_selection_changed' THEN RAISE; END IF;
  END;

  result := public.apply_draft_item_selection(draft, ARRAY[second_id], 'delete');
  IF result IS DISTINCT FROM '[]'::jsonb OR
     (SELECT subtotal_amount <> 0 OR tax_amount <> 0 OR total_amount <> 0 FROM public.documents WHERE id = draft) THEN
    RAISE EXCEPTION 'empty draft totals incorrect';
  END IF;
END;
$$;

ROLLBACK;
