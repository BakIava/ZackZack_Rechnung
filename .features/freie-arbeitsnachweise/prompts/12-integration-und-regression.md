# Paket 12: Integration und fachliche Regression

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Führe die neuen Teile mit gezielten Integrationstests zusammen. Testgrenzen sollen reale Adapter/Parser/Positionsbildung verwenden; nicht alles mocken und nur einen künstlichen Erfolgswert zurückgeben.

Decke ab: freie Extraktion → bereinigter Reviewzustand → Korrektur/Bestätigung/Preis → gültige Importzeilen → Action/Repository-Grenze; denselben Pfad für eine Tabellen-Fixture. Provider und DB bleiben kontrolliert isoliert. Material-only, fehlende Menge/Preis, >20 Zeilen, unklare Tage, durchgestrichene Summen, gleiche Preise für unterschiedliche Tätigkeiten, Cache-Wiederöffnung und Fehlversuch einschließen.

Beweise, dass keine Mitarbeiter-/Kundennamen als Nebeneffekt der Metadaten ins finale Positions-DTO gelangen. Teste Preisgrenzen/NaN/Infinity und erhalte Beschreibungen/Einheiten/Zusatztexte innerhalb des Serververtrags. Erfundene semantische OCR-Leistung nicht durch konstruierte Fixtures als bewiesen ausgeben.

Führe npm run typecheck, npx eslint . und npm run test aus und behebe featurebedingte Fehler. Keine Tests abschalten oder Assertions abschwächen, um grün zu werden. Neue Tests nur für relevante Risiken; keine Duplikate ohne Mehrwert.

Abnahme: fachliche Abnahme A01–A17 den vorhandenen Tests/noch ausstehenden UI-Nachweisen zuordnen. Offene Fälle konkret schließen oder begründet kennzeichnen.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/13-browser-pruefung.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
