-- Rechnung korrigieren: eine festgeschriebene, noch unbezahlte Rechnung wird
-- wieder zum Entwurf. Die Nummer bleibt am Dokument stehen; finalize_document
-- übernimmt sie beim erneuten Festschreiben, statt eine neue zu ziehen. Der
-- Nummernkreis bleibt damit lückenlos, und die Rechnung behält ihre Nummer.
--
-- Produktentscheidung (2026-11-08): Die alte Fassung wird ersetzt. Die App
-- verwirft beim Wiederöffnen das archivierte PDF und archiviert beim erneuten
-- Festschreiben die neue Fassung. Der Dialog weist vorher darauf hin, eine
-- bereits verschickte Fassung selbst aufzubewahren.
--
-- Bezahlte Rechnungen, stornierte Rechnungen und Angebote bleiben gesperrt.
--
-- Reihenfolge im Supabase SQL Editor:
--   1. scripts/finalize_document.sql  (übernimmt eine vorhandene Nummer)
--   2. dieses Skript
--
-- Basis des Triggers ist die Endfassung aus scripts/quote-workflows.sql; neu
-- sind nur die drei mit "Korrektur:" markierten Regeln.

BEGIN;

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
    -- Korrektur: Ein wieder geöffneter Entwurf trägt bereits seine Nummer.
    -- Ihn zu löschen würde eine Lücke im Nummernkreis reißen.
    IF OLD.document_number IS NOT NULL THEN
      RAISE EXCEPTION 'numbered_document_delete_forbidden';
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

  -- Korrektur: Eine vergebene Nummer ist fest, auch im wieder geöffneten
  -- Entwurf. Weder die Nummer noch der Typ (und damit der Nummernkreis)
  -- dürfen sich ändern.
  IF OLD.document_number IS NOT NULL
     AND (NEW.document_number IS DISTINCT FROM OLD.document_number
          OR NEW.document_type IS DISTINCT FROM OLD.document_type) THEN
    RAISE EXCEPTION 'document_number_immutable';
  END IF;

  IF OLD.status = 'draft' AND NEW.status <> 'draft'
     AND coalesce(current_setting('zackzack.finalizing', true), '') <> 'on' THEN
    RAISE EXCEPTION 'finalize_via_rpc_required';
  END IF;

  -- Korrektur: Zurück zum Entwurf ausschließlich über reopen_invoice(). Ohne
  -- diese Regel ließe sich der Status per normalem UPDATE zurücksetzen.
  IF OLD.status <> 'draft' AND NEW.status = 'draft'
     AND coalesce(current_setting('zackzack.reopening', true), '') <> 'on' THEN
    RAISE EXCEPTION 'reopen_via_rpc_required';
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

CREATE OR REPLACE FUNCTION public.reopen_invoice(p_document_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_number public.documents.document_number%TYPE;
BEGIN
  v_company_id := public.get_user_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Nur eigene, festgeschriebene, unbezahlte Rechnungen. Der Lock serialisiert
  -- gleichzeitige Aufrufe (z. B. "bezahlt" und "korrigieren" parallel).
  SELECT document_number INTO v_number
  FROM public.documents
  WHERE id = p_document_id
    AND company_id = v_company_id
    AND document_type = 'invoice'
    AND status IN ('finalized', 'sent')
    AND paid_at IS NULL
    AND document_number IS NOT NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_reopenable';
  END IF;

  PERFORM set_config('zackzack.reopening', 'on', true);
  UPDATE public.documents
     SET status = 'draft'
   WHERE id = p_document_id;
  PERFORM set_config('zackzack.reopening', 'off', true);

  -- Logo-Snapshot verwerfen: Der Entwurf zeigt wieder das aktuelle Firmenlogo,
  -- finalize_document friert es beim erneuten Festschreiben neu ein. Erst nach
  -- dem Statuswechsel möglich, weil der Trigger festgeschriebene Zeilen schützt.
  UPDATE public.documents
     SET logo_url_snapshot = NULL,
         logo_snapshot_captured = false
   WHERE id = p_document_id;

  RETURN v_number;
END;
$$;

REVOKE ALL ON FUNCTION public.reopen_invoice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_invoice(uuid) TO authenticated;

COMMIT;

-- Verify afterwards:
--   select public.reopen_invoice('<unbezahlte-rechnung-id>');   -- liefert die Nummer
--   select status, document_number from documents where id = '<id>';  -- draft, Nummer unverändert
