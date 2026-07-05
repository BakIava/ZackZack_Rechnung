-- Run this once in the Supabase SQL Editor.
--
-- Langzeit-Archiv für finalisierte Belege (Rechnungen/Angebote).
--
-- Rechtlicher Hintergrund: Rechnungen unterliegen der 10-jährigen
-- Aufbewahrungspflicht (§ 14b UStG, § 147 AO). Der Beleg wird beim
-- Festschreiben (finalize_document) als PDF gerendert und in diesen Bucket
-- gelegt; abgerufen wird er on-demand über
-- /api/documents/[document_id]/pdf. Existiert (noch) kein Archiv-Blob, rendert
-- die Route aus dem eingefrorenen Snapshot und archiviert nach (self-healing).
--
-- Zugriffsmodell: Der Bucket ist NICHT öffentlich. Lesen/Schreiben erfolgt
-- ausschließlich serverseitig über den Service-Role-Client
-- (lib/pdf/pdf-storage.ts). Die Autorisierung (Anmeldung + Firmenzugehörigkeit)
-- prüft die aufrufende Route über getDocumentPreview. Deshalb gibt es bewusst
-- KEINE anon/authenticated-Policies auf storage.objects für diesen Bucket:
-- direkter Client-Zugriff ist damit ausgeschlossen, alles läuft über den
-- autorisierten Server-Pfad. Der Service-Role-Key umgeht RLS ohnehin.
--
-- Aufbewahrung: Es gibt bewusst KEINE automatische Löschung. Finalisierte
-- Belege bleiben dauerhaft erhalten (>= 10 Jahre). Ein Löschjob wäre erst nach
-- Ablauf der Frist und nur dokumentengetrieben zulässig — nicht Teil des MVP.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Verify afterwards:
--   select id, public from storage.buckets where id = 'documents';
