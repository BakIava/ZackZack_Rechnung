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

  v_year := EXTRACT(YEAR FROM v_issue_date)::int;

  -- Sequenz erst hier verbrauchen: nie im Entwurf, ausschließlich atomar hier.
  v_seq := get_next_document_number(v_company_id, v_type, v_year);

  v_prefix := CASE v_type
                WHEN 'invoice' THEN 'R-'
                WHEN 'quote'   THEN 'A-'
                ELSE 'D-'
              END;

  v_number := v_prefix || v_year::text || '-' || lpad(v_seq::text, 3, '0');

  UPDATE documents
     SET document_number = v_number,
         status          = 'finalized'
   WHERE id = p_document_id;

  RETURN v_number;
END;
$$;

-- Nur eingeloggte Nutzer dürfen finalisieren; die Funktion prüft die
-- Firmenzugehörigkeit intern über get_user_company_id().
REVOKE ALL ON FUNCTION public.finalize_document(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_document(uuid) TO authenticated;
