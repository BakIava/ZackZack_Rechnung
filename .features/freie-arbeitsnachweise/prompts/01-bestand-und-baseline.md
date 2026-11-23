# Paket 01: Bestand und Baseline

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Lies die in context.md genannten tatsächlichen Dateien und AGENTS.md. Prüfe auch lokale Anweisungen in betroffenen Unterordnern. Öffne die Originalfotos, wenn verfügbar, und gleiche beispiele.md ab; unsichere Handschrift nicht zur Gewissheit erklären.

Ermittle git status und vorhandene Tests. Verändere keine schon vorhandenen Benutzerdateien oder generierten Artefakte. Führe eine frische Baseline aus: npm run typecheck, npx eslint ., npm run test. Build erfolgt spätestens im Abschluss; führe ihn jetzt zusätzlich aus, wenn eine bestehende Build-Blockade sonst die Umsetzung irreführen würde.

Dokumentiere Fehler als Ausgangslage mit Befehl und knapper Ursache. Suche passende Test-/UI-Harnesses im Projekt. Bestimme, wie Browserprüfungen ohne echten Anthropic-Aufruf und ohne produktive Kundendaten durchgeführt werden können. Kein Test darf beiläufig echte Dokumente löschen.

Abnahme: context.md entspricht dem tatsächlichen Bestand; Baseline und vorhandene Änderungen sind dokumentiert; der konkrete Startpunkt für Paket 02 steht fest. Eine externe Baseline-Blockade darf unabhängige Arbeit nicht aufhalten.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/02-vertrag-und-architektur.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
