# Paket 14: Abschlussprüfung und Übergabe

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Prüfe den gesamten eigenen Diff auf fachliche und technische Fehler. Fokus: Tabellenregression, falsche Preise/Mengen/Datumsauslegung, doppelte Summen, Cacheverlust, as-Casts/any, fehlende Übersetzungen, RTL, Datenzugriff außerhalb Repositories, PII-Logs und produktive Testhintertüren. Behebe gefundene Fehler, ergänze nur dafür notwendige Tests.

Führe abschließend alle vier Pflichtbefehle aus: npm run typecheck, npx eslint ., npm run build, npm run test. Falls sinnvoll unabhängige reine Prüfungen parallel; Build nicht mit einem laufenden Dev-Server gegen dasselbe .next-Verzeichnis konkurrieren lassen. Gezielte Browserprüfungen nach relevanten UI-Änderungen wiederholen. Befehle, Exitstatus und echte Einschränkungen dokumentieren.

Keine Commits, Pushes, Deployments, produktiven SQL-Änderungen oder echten KI-Aufrufe. Vorhandene Benutzeränderungen/examples/output erhalten. Kommentare und bestehende Projektdokumentation, die durch dieses Feature sachlich falsch geworden sind, gezielt berichtigen; keine globale Neufassung von AGENTS.md.

Abnahme.md mit tatsächlicher Evidenz je Kriterium füllen. Context.md auf endgültige Architektur, Dateien, verbleibende Risiken und nächsten Schritt aktualisieren. Laufprotokoll und entscheidungen.md müssen zum Code passen. Nur vollständig belegte Pakete als erledigt markieren. Keine grünen Ergebnisse aus historischen Läufen übernehmen.

Abnahme: Feature vollständig lokal umgesetzt und geprüft oder Gesamtstatus ehrlich „implementiert, Prüfung teilweise blockiert“. Kurze deutsche Übergabe mit Verhalten, wichtigen Pfaden, Prüfungen, OCR-Live-Prüfung und konkreten offenen Punkten. Kein offener Pflichtpunkt als optionales „kann ich später machen“ verstecken.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Erst jetzt die abschließende Übergabe für den gesamten Lauf verfassen.
