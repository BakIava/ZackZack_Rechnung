-- Run once in the Supabase SQL Editor, then re-run scripts/finalize_document.sql.
-- Erst danach den App-Code deployen: vorher lehnt die DB Abzüge ab.
--
-- Negative Positionen (Abzüge): z. B. eine bereits berechnete Abschlagsrechnung
-- in der Schlussrechnung, eine Anzahlung oder ein Rabatt.
--   * Einzelpreis, Netto und Steuer einer Position dürfen negativ sein.
--     Die Menge bleibt positiv – das Vorzeichen trägt allein der Einzelpreis.
--   * Belegsummen dürfen nur im Entwurf negativ sein (Abzug zuerst erfasst).
--     finalize_document lehnt negative Summen ab ('amounts_negative'): ein
--     negativer Beleg wäre eine Gutschrift bzw. Stornorechnung.
--   * services.default_price hat laut scripts/ keinen Vorzeichen-CHECK;
--     Katalog-Einträge dürfen damit ebenfalls ein Abzug sein.
--
-- Vorher prüfen, ob es im Dashboard weitere Vorzeichen-CHECKs gibt, die nicht
-- aus scripts/ stammen (dann zusätzlich entfernen):
--   SELECT conrelid::regclass AS tabelle, conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid IN (
--     'public.documents'::regclass,
--     'public.document_items'::regclass,
--     'public.services'::regclass
--   )
--     AND contype = 'c'
--   ORDER BY 1, 2;
--
-- Bestandszeilen werden nicht umgeschrieben; alle erfüllen die neuen Regeln.

BEGIN;

ALTER TABLE public.document_items
  DROP CONSTRAINT IF EXISTS document_items_tax_totals_valid;

ALTER TABLE public.document_items
  ADD CONSTRAINT document_items_tax_totals_valid
  CHECK (
    amount > 0
    AND gross_amount = total_amount + tax_amount
  );

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_tax_totals_valid;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_tax_totals_valid
  CHECK (
    subtotal_amount + tax_amount = total_amount
    AND (
      status = 'draft'
      OR (subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0)
    )
  );

COMMIT;
