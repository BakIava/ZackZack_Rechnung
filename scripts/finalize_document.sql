-- Run this once in the Supabase SQL Editor.
--
-- finalize_document() schreibt einen Entwurf endgültig fest: es vergibt die
-- fortlaufende, lückenlose Dokumentnummer (§14 UStG) und setzt den Status auf
-- 'finalized' – beides in EINER Transaktion. Schlägt der UPDATE fehl, rollt die
-- verbrauchte Sequenz mit zurück, sodass keine Lücke entsteht.
--
-- Voraussetzungen (existieren bereits in der DB):
--   * get_user_company_id()                          -> uuid   (aus JWT/Session)
--   * get_next_document_number(company_id, document_type, year) -> integer
--     (atomar, row-locking auf number_sequences)
--
-- Nummernformat:
--   invoice -> 'R-' || jahr || '-' || lpad(seq, 3, '0')   z. B. R-2026-041
--   quote   -> 'A-' || jahr || '-' || lpad(seq, 3, '0')   z. B. A-2026-088
--
-- Das Jahr stammt aus issue_date (NICHT aus now()), damit die Nummer konsistent
-- zum ausgewiesenen Rechnungsdatum bleibt.

CREATE OR REPLACE FUNCTION public.finalize_document(p_document_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  -- %TYPE übernimmt exakt den Spaltentyp (text oder enum), damit der Aufruf von
  -- get_next_document_number typkompatibel bleibt – egal wie document_type
  -- modelliert ist.
  v_type       documents.document_type%TYPE;
  v_issue_date date;
  v_year       int;
  v_seq        int;
  v_prefix     text;
  v_number     text;
  v_subtotal   integer;
  v_tax        integer;
  v_total      integer;
BEGIN
  v_company_id := get_user_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Nur ein eigener Entwurf ist finalisierbar. Der FOR-UPDATE-Lock serialisiert
  -- gleichzeitige Aufrufe auf DASSELBE Dokument: der zweite sieht danach
  -- status='finalized', findet die Zeile nicht mehr und schlägt sauber fehl
  -- (verhindert Doppel-Finalisierung).
  SELECT document_type, issue_date
    INTO v_type, v_issue_date
  FROM documents
  WHERE id = p_document_id
    AND company_id = v_company_id
    AND status = 'draft'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'document_not_finalizable';
  END IF;

  IF v_issue_date IS NULL THEN
    RAISE EXCEPTION 'issue_date_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM document_items WHERE document_id = p_document_id
  ) THEN
    RAISE EXCEPTION 'positions_missing';
  END IF;

  -- Autoritative Neuberechnung direkt vor dem Festschreiben. Nettobetrag und
  -- Steuer werden pro Zeile gerundet; die Dokumentbeträge sind reine Summen.
  WITH calculated AS (
    SELECT
      i.id,
      round(i.unit_price::numeric * i.amount)::integer AS net_amount,
      i.tax_rate AS rate
    FROM document_items i
    WHERE i.document_id = p_document_id
  )
  UPDATE document_items i
  SET total_amount = c.net_amount,
      tax_rate = c.rate,
      tax_amount = round(c.net_amount::numeric * c.rate / 100)::integer,
      gross_amount = c.net_amount + round(c.net_amount::numeric * c.rate / 100)::integer
  FROM calculated c
  WHERE c.id = i.id;

  SELECT
    coalesce(sum(total_amount), 0)::integer,
    coalesce(sum(tax_amount), 0)::integer,
    coalesce(sum(gross_amount), 0)::integer
  INTO v_subtotal, v_tax, v_total
  FROM document_items
  WHERE document_id = p_document_id;

  v_year := EXTRACT(YEAR FROM v_issue_date)::int;

  -- Sequenz erst hier verbrauchen: nie im Entwurf, ausschließlich atomar hier.
  v_seq := get_next_document_number(v_company_id, v_type, v_year);

  v_prefix := CASE v_type
                WHEN 'invoice' THEN 'R-'
                WHEN 'quote'   THEN 'A-'
                ELSE 'D-'
              END;

  v_number := v_prefix || v_year::text || '-' || lpad(v_seq::text, 3, '0');

  PERFORM set_config('zackzack.finalizing', 'on', true);

  UPDATE documents
     SET document_number = v_number,
         status          = 'finalized',
         subtotal_amount = v_subtotal,
         tax_amount      = v_tax,
         total_amount    = v_total,
         logo_url_snapshot = (
           SELECT c.logo_url FROM companies c WHERE c.id = v_company_id
         ),
         logo_snapshot_captured = true
   WHERE id = p_document_id;

  RETURN v_number;
END;
$$;

-- Nur eingeloggte Nutzer dürfen finalisieren; die Funktion prüft die
-- Firmenzugehörigkeit intern über get_user_company_id().
REVOKE ALL ON FUNCTION public.finalize_document(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_document(uuid) TO authenticated;
