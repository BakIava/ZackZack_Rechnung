-- Nummernkreise pro Firma: eigenes Muster für Rechnungs- und Angebotsnummern,
-- damit Betriebe ihren bestehenden Kreis fortführen können (z. B. E/05/2026).
-- Einmal im Supabase SQL Editor ausführen, DANACH scripts/finalize_document.sql
-- (die RPC-Fassung liest die Muster). Beide Schritte vor dem Deploy.
--
-- Muster-Syntax (wird in zackzack_admin gepflegt, nie vom Handwerker):
--   {YYYY}  Jahr vierstellig (aus issue_date)      {YY}  Jahr zweistellig
--   {N…}    Zähler; Anzahl der N = Mindeststellen, z. B. {NNN} -> 041, 1000
--   sonst nur Buchstaben, Ziffern und / - _ .
-- Genau ein Zähler und genau ein Jahr: der Zähler beginnt pro Jahr neu
-- (number_sequences ist nach Jahr geschlüsselt), ohne Jahr im Muster wären
-- Nummern über Jahre hinweg doppelt.
--
-- Beispiele:  R-{YYYY}-{NNN} -> R-2026-041 (Standard)
--             E/{NN}/{YYYY}  -> E/05/2026
--
-- Rein additiv: die Defaults entsprechen exakt dem bisher fest verdrahteten
-- Format, bestehende Firmen nummerieren unverändert weiter.

CREATE OR REPLACE FUNCTION public.is_valid_document_number_pattern(p_pattern text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  -- Literale schließen geschweifte Klammern aus; damit stehen Jahr und Zähler
  -- jeweils genau einmal im Muster (Reihenfolge beliebig).
  SELECT p_pattern IS NOT NULL
     AND length(p_pattern) <= 40
     AND p_pattern ~ (
       '^[A-Za-z0-9/._-]*'
       || '(\{YY(YY)?\}[A-Za-z0-9/._-]*\{N{1,9}\}'
       || '|\{N{1,9}\}[A-Za-z0-9/._-]*\{YY(YY)?\})'
       || '[A-Za-z0-9/._-]*$'
     );
$$;

-- Baut die Belegnummer aus Muster, Zählerstand und Jahr. Reine Funktion ohne
-- Datenzugriff; aufgerufen von finalize_document und seed_document_number.
CREATE OR REPLACE FUNCTION public.format_document_number(
  p_pattern text,
  p_seq integer,
  p_year integer
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_digits  int;
  v_counter text;
BEGIN
  IF NOT public.is_valid_document_number_pattern(p_pattern) THEN
    RAISE EXCEPTION 'number_pattern_invalid';
  END IF;

  IF p_seq IS NULL OR p_seq < 1 THEN
    RAISE EXCEPTION 'number_sequence_invalid';
  END IF;

  IF p_year IS NULL OR p_year < 1000 OR p_year > 9999 THEN
    RAISE EXCEPTION 'number_year_invalid';
  END IF;

  v_digits  := length(substring(p_pattern FROM '\{(N+)\}'));
  v_counter := p_seq::text;
  -- Nur auffüllen, nie kürzen: lpad() würde längere Zähler abschneiden.
  IF length(v_counter) < v_digits THEN
    v_counter := lpad(v_counter, v_digits, '0');
  END IF;

  RETURN replace(
    replace(
      regexp_replace(p_pattern, '\{N+\}', v_counter),
      '{YYYY}', p_year::text
    ),
    '{YY}', right(p_year::text, 2)
  );
END;
$$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS invoice_number_pattern text NOT NULL DEFAULT 'R-{YYYY}-{NNN}',
  ADD COLUMN IF NOT EXISTS quote_number_pattern text NOT NULL DEFAULT 'A-{YYYY}-{NNN}';

DO $$ BEGIN
  ALTER TABLE public.companies
    ADD CONSTRAINT companies_invoice_number_pattern_valid
    CHECK (public.is_valid_document_number_pattern(invoice_number_pattern));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.companies
    ADD CONSTRAINT companies_quote_number_pattern_valid
    CHECK (public.is_valid_document_number_pattern(quote_number_pattern));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Rechnung und Angebot dürfen nicht dasselbe Muster teilen, sonst trügen
-- R- und A-Beleg mit gleichem Zählerstand dieselbe Nummer.
DO $$ BEGIN
  ALTER TABLE public.companies
    ADD CONSTRAINT companies_number_patterns_distinct
    CHECK (invoice_number_pattern <> quote_number_pattern);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Letzte Absicherung der Einmaligkeit (§ 14 Abs. 4 Nr. 4 UStG): auch ein
-- falsch gesetzter Startwert kann keine Nummer doppelt vergeben.
CREATE UNIQUE INDEX IF NOT EXISTS documents_company_type_number_unique
  ON public.documents (company_id, document_type, document_number)
  WHERE document_number IS NOT NULL;

-- Startwert für einen bestehenden Nummernkreis setzen: p_last_number ist die
-- LETZTE bereits außerhalb der App vergebene Nummer (E/05/2026 -> 5), die App
-- vergibt danach 6. Rückgabe = Vorschau der nächsten Nummer.
--
-- Nur solange in diesem Kreis (Firma/Typ/Jahr) noch kein Beleg der App eine
-- Nummer trägt — danach wäre jede Änderung eine Lücke oder eine Doppelung.
-- Ausschließlich service_role (zackzack_admin), nie für eingeloggte Nutzer.
CREATE OR REPLACE FUNCTION public.seed_document_number(
  p_company_id uuid,
  p_document_type public.number_sequences.document_type%TYPE,
  p_year integer,
  p_last_number integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern text;
BEGIN
  IF p_document_type IS NULL OR p_document_type::text NOT IN ('invoice', 'quote') THEN
    RAISE EXCEPTION 'document_type_invalid';
  END IF;

  IF p_year IS NULL OR p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'number_year_invalid';
  END IF;

  IF p_last_number IS NULL OR p_last_number < 0 THEN
    RAISE EXCEPTION 'number_sequence_invalid';
  END IF;

  SELECT CASE p_document_type::text
           WHEN 'invoice' THEN c.invoice_number_pattern
           ELSE c.quote_number_pattern
         END
    INTO v_pattern
  FROM companies c
  WHERE c.id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  -- Sperrt eine bestehende Zählerzeile: eine parallele Finalisierung
  -- (get_next_document_number sperrt dieselbe Zeile) läuft vorher zu Ende,
  -- deren Beleg sieht die Prüfung darunter dann.
  PERFORM 1
  FROM number_sequences s
  WHERE s.company_id = p_company_id
    AND s.document_type = p_document_type
    AND s.year = p_year
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM documents d
    WHERE d.company_id = p_company_id
      AND d.document_type::text = p_document_type::text
      AND d.document_number IS NOT NULL
      AND EXTRACT(YEAR FROM d.issue_date)::int = p_year
  ) THEN
    RAISE EXCEPTION 'number_sequence_in_use';
  END IF;

  INSERT INTO number_sequences (company_id, document_type, year, last_number)
  VALUES (p_company_id, p_document_type, p_year, p_last_number)
  ON CONFLICT (company_id, document_type, year)
  DO UPDATE SET last_number = EXCLUDED.last_number;

  RETURN public.format_document_number(v_pattern, p_last_number + 1, p_year);
END;
$$;

REVOKE ALL ON FUNCTION public.seed_document_number(uuid, public.number_sequences.document_type%TYPE, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_document_number(uuid, public.number_sequences.document_type%TYPE, integer, integer)
  TO service_role;

-- Verify afterwards:
--   select invoice_number_pattern, quote_number_pattern, count(*)
--     from companies group by 1, 2;                                  -- nur die Defaults
--   select public.format_document_number('E/{NN}/{YYYY}', 5, 2026);  -- E/05/2026
--   select public.format_document_number('R-{YYYY}-{NNN}', 41, 2026); -- R-2026-041
--
-- Bestehenden Kreis fortführen (zackzack_admin bzw. SQL Editor als service_role):
--   update companies set invoice_number_pattern = 'E/{NN}/{YYYY}' where id = '<firma>';
--   select public.seed_document_number('<firma>', 'invoice', 2026, 5); -- -> E/06/2026
