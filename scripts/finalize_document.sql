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
-- Nummernformat: Muster pro Firma und Typ (companies.invoice_number_pattern /
-- quote_number_pattern), gebaut von format_document_number().
-- scripts/document-number-patterns.sql muss vorher gelaufen sein.
--   Standard: R-{YYYY}-{NNN} -> R-2026-041,  A-{YYYY}-{NNN} -> A-2026-088
--   Eigener Kreis z. B.: E/{NN}/{YYYY} -> E/05/2026
--
-- Das Jahr stammt aus issue_date (NICHT aus now()), damit die Nummer konsistent
-- zum ausgewiesenen Rechnungsdatum bleibt.

-- Vorlagen-Snapshot (scripts/document-templates.sql muss vorher gelaufen sein):
-- Die Layoutversion kennt nur der App-Code (lib/pdf/templates/template-catalog.ts).
-- Die Finalisieren-Action übergibt Vorlage + Version, mit der der Entwurf
-- gerendert wurde; die ID muss der aktuellen Firmenwahl entsprechen.
-- NULL/NULL (z. B. ältere App-Version während des Deploys) = kein Snapshot;
-- solche Belege gelten als Altbelege und rendern mit standard@1.
--
-- Die Signatur ändert sich: die alte Zwei-Parameter-Fassung muss weg, sonst
-- wären Aufrufe mit zwei benannten Parametern mehrdeutig.

DROP FUNCTION IF EXISTS public.finalize_document(uuid);
DROP FUNCTION IF EXISTS public.finalize_document(uuid, boolean);

CREATE OR REPLACE FUNCTION public.finalize_document(
  p_document_id uuid,
  p_confirm_expired_quote boolean DEFAULT false,
  p_template_id text DEFAULT NULL,
  p_template_version smallint DEFAULT NULL
)
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
  v_pattern    text;
  v_number     text;
  v_subtotal   integer;
  v_tax        integer;
  v_total      integer;
  v_valid_until date;
  v_customer_snapshot jsonb;
  v_company_template text;
  v_today       date := timezone('Europe/Berlin', now())::date;
BEGIN
  v_company_id := get_user_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Nur ein eigener Entwurf ist finalisierbar. Der FOR-UPDATE-Lock serialisiert
  -- gleichzeitige Aufrufe auf DASSELBE Dokument: der zweite sieht danach
  -- status='finalized', findet die Zeile nicht mehr und schlägt sauber fehl
  -- (verhindert Doppel-Finalisierung).
  SELECT document_type, issue_date, valid_until, customer_snapshot
    INTO v_type, v_issue_date, v_valid_until, v_customer_snapshot
  FROM documents
  WHERE id = p_document_id
    AND company_id = v_company_id
    AND status = 'draft'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'document_not_finalizable';
  END IF;

  -- Vorlagen-Snapshot: vollständig, positiv versioniert und identisch mit der
  -- Firmenwahl (ein direkter RPC-Aufruf kann keine fremde Vorlage einfrieren).
  -- Ändert sich die Firmenwahl zwischen Vorschau und Klick, schlägt dies fehl.
  IF (p_template_id IS NULL) <> (p_template_version IS NULL) THEN
    RAISE EXCEPTION 'template_snapshot_incomplete';
  END IF;

  IF p_template_id IS NOT NULL THEN
    SELECT c.document_template_id INTO v_company_template
    FROM companies c
    WHERE c.id = v_company_id;

    IF p_template_id IS DISTINCT FROM v_company_template THEN
      RAISE EXCEPTION 'template_mismatch';
    END IF;

    IF p_template_version < 1 THEN
      RAISE EXCEPTION 'template_version_invalid';
    END IF;
  END IF;

  IF v_issue_date IS NULL THEN
    RAISE EXCEPTION 'issue_date_missing';
  END IF;

  IF v_type = 'quote' AND v_valid_until IS NULL THEN
    RAISE EXCEPTION 'valid_until_missing';
  END IF;

  IF v_type = 'quote' AND v_valid_until < v_issue_date THEN
    RAISE EXCEPTION 'valid_until_before_issue_date';
  END IF;

  IF v_type = 'quote' AND v_valid_until < v_today
     AND NOT p_confirm_expired_quote THEN
    RAISE EXCEPTION 'expired_quote_confirmation_required';
  END IF;

  IF v_type = 'invoice' AND v_valid_until IS NOT NULL THEN
    RAISE EXCEPTION 'invoice_has_valid_until';
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

  -- Angebote brauchen immer einen vollständigen Adressaten. Bei Rechnungen
  -- greift die Kleinbetragsgrenze von 250,00 EUR brutto (§ 33 UStDV).
  -- Geprüft wird ausschließlich der eingefrorene Empfänger-Snapshot.
  IF v_type = 'quote' OR v_total > 25000 THEN
    IF v_customer_snapshot IS NULL OR NOT COALESCE((
      (
        v_customer_snapshot->>'customer_type' = 'business'
        AND NULLIF(btrim(v_customer_snapshot->>'company_name'), '') IS NOT NULL
      )
      OR
      (
        v_customer_snapshot->>'customer_type' = 'private'
        AND NULLIF(
          btrim(concat_ws(
            ' ',
            v_customer_snapshot->>'firstname',
            v_customer_snapshot->>'lastname'
          )),
          ''
        ) IS NOT NULL
      )
    ), false) THEN
      RAISE EXCEPTION 'customer_name_missing';
    END IF;

    IF v_customer_snapshot IS NULL
       OR NULLIF(btrim(v_customer_snapshot->>'street'), '') IS NULL
       OR NULLIF(btrim(v_customer_snapshot->>'street_no'), '') IS NULL
       OR NULLIF(btrim(v_customer_snapshot->>'postcode'), '') IS NULL
       OR NULLIF(btrim(v_customer_snapshot->>'city'), '') IS NULL THEN
      RAISE EXCEPTION 'customer_address_missing';
    END IF;
  END IF;

  v_year := EXTRACT(YEAR FROM v_issue_date)::int;

  SELECT CASE v_type
           WHEN 'invoice' THEN c.invoice_number_pattern
           WHEN 'quote'   THEN c.quote_number_pattern
         END
    INTO v_pattern
  FROM companies c
  WHERE c.id = v_company_id;

  IF v_pattern IS NULL THEN
    RAISE EXCEPTION 'number_pattern_missing';
  END IF;

  -- Sequenz erst hier verbrauchen: nie im Entwurf, ausschließlich atomar hier.
  v_seq := get_next_document_number(v_company_id, v_type, v_year);

  v_number := format_document_number(v_pattern, v_seq, v_year);

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
         logo_snapshot_captured = true,
         template_id       = p_template_id,
         template_version  = p_template_version
   WHERE id = p_document_id;

  RETURN v_number;
END;
$$;

-- Nur eingeloggte Nutzer dürfen finalisieren; die Funktion prüft die
-- Firmenzugehörigkeit intern über get_user_company_id().
REVOKE ALL ON FUNCTION public.finalize_document(uuid, boolean, text, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_document(uuid, boolean, text, smallint) TO authenticated;
