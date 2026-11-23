# Paket 09: Übernahme, Mehrfachklicks und Fehlerbehandlung

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Verdrahte die neue Reviewansicht mit der vorhandenen Step2-Übernahme. Verwende die gemeinsame Bereitschaftsprüfung; keine Schaltfläche aktivieren, wenn ausgewählte Zeilen unvollständig/ungeprüft oder zu viele sind.

Übernahme während eines laufenden Requests sperren. Erfolg erst nach bestätigter Serverantwort anzeigen, Positionen und Summen daraus übernehmen. Bei gemeldetem Fehler müssen Zeilen, Nutzerpreise, Auswahl und Korrekturen erhalten bleiben beziehungsweise zuverlässig wieder erreichbar sein. Der bisherige Pfad schließt das Modal vor der Actionantwort: löse das gezielt und abwärtskompatibel für relevante Aufrufer, ohne alle anderen Formulare umzugestalten.

Einen Netzwerkfehler mit unbekanntem Serverausgang nicht blind automatisch erneut senden; keine DB-Idempotenz behaupten. Manuelles Wiederholen braucht verständliches Verhalten und darf keine versprochene genau-einmal-Garantie vortäuschen. Keine große neue Idempotenz-/DB-Infrastruktur.

Ein neuer Upload, Tabwechsel oder Abbrechen darf keine alten Fehler-/Ergebniszustände in einen anderen Nachweis übertragen. Die vorhandene Nummernwarnung bleibt bei passenden Nachweisen sichtbar, ohne erfundene Nummern für freie Notizen.

Abnahme: sinnvolle Komponenten-/Integrationstests für Erfolg, Fehler mit erhaltenem Zustand, schnelles Doppelklicken und später eintreffende Antworten. Gemeinsame onImport-Schnittstelle und tatsächlicher Fehlerpfad dokumentiert.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/10-server-import.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
