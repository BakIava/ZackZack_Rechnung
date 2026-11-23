-- Sammelaktionen für Positions-IDs eines Rechnungs- oder Angebotsentwurfs.
-- Vor der App-Version in Supabase anwenden. Bestehende Spalten und RLS bleiben erhalten.
CREATE OR REPLACE FUNCTION public.apply_draft_item_selection(
  p_document_id uuid,
  p_item_ids uuid[],
  p_action text,
  p_tax_rate smallint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_company_id uuid := public.get_user_company_id();
  v_expected integer := coalesce(cardinality(p_item_ids), 0);
  v_affected integer;
  v_remaining integer;
  v_default_tax_rate smallint;
  v_rate smallint;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'bulk_items_not_authenticated';
  END IF;

  IF p_action IS NULL OR p_action NOT IN ('delete', 'vat') OR
     (p_action = 'delete' AND p_tax_rate IS NOT NULL) OR
     (p_tax_rate IS NOT NULL AND p_tax_rate NOT IN (0, 7, 19)) THEN
    RAISE EXCEPTION 'bulk_items_invalid';
  END IF;

  IF v_expected = 0 OR
     (SELECT count(DISTINCT id) FROM unnest(p_item_ids) AS ids(id)) <> v_expected THEN
    RAISE EXCEPTION 'bulk_items_invalid';
  END IF;

  -- Derselbe Entwurfs-Lock wird auch beim Festschreiben gehalten.
  SELECT coalesce(d.default_tax_rate, 19)
    INTO v_default_tax_rate
  FROM public.documents AS d
  WHERE d.id = p_document_id AND d.company_id = v_company_id AND d.status = 'draft'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bulk_items_draft_not_found';
  END IF;

  PERFORM i.id
  FROM public.document_items AS i
  WHERE i.document_id = p_document_id AND i.company_id = v_company_id
  ORDER BY i.id
  FOR UPDATE;

  IF (SELECT count(*) FROM public.document_items AS i
      WHERE i.document_id = p_document_id AND i.company_id = v_company_id
        AND i.id = ANY (p_item_ids)) <> v_expected THEN
    RAISE EXCEPTION 'bulk_items_selection_changed';
  END IF;

  IF p_action = 'delete' THEN
    DELETE FROM public.document_items AS i
    WHERE i.document_id = p_document_id AND i.company_id = v_company_id
      AND i.id = ANY (p_item_ids);
  ELSE
    v_rate := coalesce(p_tax_rate, v_default_tax_rate);

    UPDATE public.document_items AS i
    SET tax_rate = v_rate,
        tax_rate_overridden = p_tax_rate IS NOT NULL,
        tax_amount = round(i.total_amount::numeric * v_rate / 100)::integer,
        gross_amount = i.total_amount + round(i.total_amount::numeric * v_rate / 100)::integer
    WHERE i.document_id = p_document_id AND i.company_id = v_company_id
      AND i.id = ANY (p_item_ids);
  END IF;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> v_expected THEN
    RAISE EXCEPTION 'bulk_items_selection_changed';
  END IF;

  IF p_action = 'delete' THEN
    SELECT count(*) INTO v_remaining
    FROM public.document_items AS i
    WHERE i.document_id = p_document_id AND i.company_id = v_company_id;

    -- Zwischenwerte über der höchsten Position erhalten die Reihenfolge und
    -- vermeiden Kollisionen mit einem nicht aufschiebbaren Positionsindex.
    WITH ranked AS (
      SELECT i.id,
        max(i.position) OVER () + row_number() OVER (ORDER BY i.position, i.id) AS temporary_position
      FROM public.document_items AS i
      WHERE i.document_id = p_document_id AND i.company_id = v_company_id
    )
    UPDATE public.document_items AS i
    SET position = ranked.temporary_position
    FROM ranked
    WHERE i.id = ranked.id AND i.document_id = p_document_id AND i.company_id = v_company_id;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    IF v_affected <> v_remaining THEN
      RAISE EXCEPTION 'bulk_items_selection_changed';
    END IF;

    WITH ranked AS (
      SELECT i.id, row_number() OVER (ORDER BY i.position, i.id) AS final_position
      FROM public.document_items AS i
      WHERE i.document_id = p_document_id AND i.company_id = v_company_id
    )
    UPDATE public.document_items AS i
    SET position = ranked.final_position
    FROM ranked
    WHERE i.id = ranked.id AND i.document_id = p_document_id AND i.company_id = v_company_id;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    IF v_affected <> v_remaining THEN
      RAISE EXCEPTION 'bulk_items_selection_changed';
    END IF;
  END IF;

  UPDATE public.documents AS d
  SET subtotal_amount = totals.net_amount,
      tax_amount = totals.tax_amount,
      total_amount = totals.gross_amount
  FROM (
    SELECT coalesce(sum(i.total_amount), 0) AS net_amount,
           coalesce(sum(i.tax_amount), 0) AS tax_amount,
           coalesce(sum(i.gross_amount), 0) AS gross_amount
    FROM public.document_items AS i
    WHERE i.document_id = p_document_id AND i.company_id = v_company_id
  ) AS totals
  WHERE d.id = p_document_id AND d.company_id = v_company_id AND d.status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bulk_items_draft_not_found';
  END IF;

  -- Eine JSON-Liste liefert den abgesicherten Stand derselben Transaktion.
  RETURN (
    SELECT coalesce(jsonb_agg(to_jsonb(item) ORDER BY item.position, item.id), '[]'::jsonb)
    FROM (
      SELECT i.id, i.service_id, i.position, i.description_de, i.additional_description_de, i.amount,
        i.unit, i.unit_price, i.total_amount, i.tax_rate, i.tax_rate_overridden,
        i.tax_amount, i.gross_amount, i.purchase_price, i.surcharge, i.surcharge_type
      FROM public.document_items AS i
      WHERE i.document_id = p_document_id AND i.company_id = v_company_id
    ) AS item
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_draft_item_selection(uuid, uuid[], text, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_draft_item_selection(uuid, uuid[], text, smallint) TO authenticated;
