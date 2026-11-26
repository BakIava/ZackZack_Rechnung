-- Entwurf löschen: entfernt einen eigenen Rechnungs- oder Angebotsentwurf samt
-- Positionen in einer Transaktion. Vor der App-Version in Supabase anwenden.
--
-- Löschbar ist nur ein Entwurf ohne Nummer, der nicht Ziel einer
-- Dokumentverknüpfung ist. Gesperrt bleiben damit wieder geöffnete Rechnungen
-- (tragen ihre Nummer; Löschen risse eine Lücke in den Nummernkreis), aus einem
-- Angebot umgewandelte Rechnungsentwürfe und angepasste Angebotsentwürfe.
-- Festgeschriebene Belege sind ohnehin unlöschbar (GoBD). Der Trigger
-- protect_document_history prüft dasselbe zusätzlich.
--
-- Warum eine Funktion: Erst die Positionen, dann das Dokument – beides muss
-- gemeinsam gelingen oder gemeinsam scheitern. Ein Entwurf ohne Positionen
-- darf nicht übrig bleiben, wenn das Löschen des Dokuments abgelehnt wird.
CREATE OR REPLACE FUNCTION public.delete_draft_document(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_company_id uuid := public.get_user_company_id();
  v_deleted integer;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'draft_delete_not_authenticated';
  END IF;

  -- Derselbe Entwurfs-Lock wird auch beim Festschreiben gehalten.
  PERFORM d.id
  FROM public.documents AS d
  WHERE d.id = p_document_id
    AND d.company_id = v_company_id
    AND d.status = 'draft'
    AND d.document_number IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'draft_not_deletable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.document_relations AS r
    WHERE r.target_document_id = p_document_id
  ) THEN
    RAISE EXCEPTION 'draft_not_deletable';
  END IF;

  DELETE FROM public.document_items AS i
  WHERE i.document_id = p_document_id AND i.company_id = v_company_id;

  DELETE FROM public.documents AS d
  WHERE d.id = p_document_id AND d.company_id = v_company_id AND d.status = 'draft';

  -- Hat RLS das Löschen still verhindert, auch die Positionen zurückrollen.
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted <> 1 THEN
    RAISE EXCEPTION 'draft_not_deletable';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_draft_document(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_draft_document(uuid) TO authenticated;

-- Verify afterwards:
--   select public.delete_draft_document('<entwurf-id>');                 -- ohne Fehler
--   select count(*) from documents where id = '<entwurf-id>';            -- 0
--   select count(*) from document_items where document_id = '<entwurf-id>';  -- 0
--   select public.delete_draft_document('<festgeschriebene-id>');        -- draft_not_deletable
