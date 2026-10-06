-- Ein eigener Einsatzort pro Rechnung oder Angebot; kein Feld am Kundenstamm.
-- Vor Auslieferung des App-Codes im Supabase SQL Editor ausführen.
alter table public.documents
  add column if not exists service_location jsonb;
