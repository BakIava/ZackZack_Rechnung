-- Run this once in the Supabase SQL Editor.
--
-- Rechtssichere Empfängeranschrift (§ 14 Abs. 4 Nr. 1 UStG): Straße und
-- Hausnummer werden getrennt erfasst. Dieselbe Trennung besteht bereits für die
-- eigene Firma (companies.street / street_no) und für den eingefrorenen
-- Empfänger-Snapshot (documents.customer_snapshot ist JSONB und trägt street_no
-- bereits – dort ist kein DDL nötig).
--
-- customers.street_no existiert in den meisten Umgebungen schon (Queries lesen
-- die Spalte). ADD COLUMN IF NOT EXISTS macht die Migration idempotent.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS street_no text;

-- Optionaler Best-Effort-Backfill (auskommentiert lassen, wenn nicht gewünscht):
-- verschiebt eine am Ende der Straße stehende Hausnummer in street_no, aber nur
-- für Datensätze, die noch keine getrennte Nummer haben. Nur ausführen, wenn ein
-- kurzer Blick auf die Daten das Muster bestätigt – die Trennung per Regex ist
-- heuristisch und kann Sonderfälle (z. B. „Straße des 17. Juni 135") verfehlen.
--
-- UPDATE public.customers
--    SET street    = trim(regexp_replace(street, '\s+\S*\d\S*$', '')),
--        street_no = trim(regexp_replace(street, '^.*\s(\S*\d\S*)$', '\1'))
--  WHERE street_no IS NULL
--    AND street ~ '\s\S*\d\S*$';

-- documents.customer_snapshot (JSONB): keine Schemaänderung. Neue/aktualisierte
-- Kundenauswahlen frieren street_no ab (siehe updateDraftCustomer). Bereits
-- finalisierte Dokumente bleiben unverändert (GoBD) – ihr Snapshot ist bewusst
-- eingefroren.
