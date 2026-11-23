# Paket 03: Synthetische Fixtures und defensive Parser

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Erstelle anonymisierte Fixtures für beide Fälle aus beispiele.md und zusätzliche Grenzfälle. Reale Namen, Adressen und Originalbilder bleiben aus Test-Fixtures heraus.

Implementiere den defensiven Parser für den neuen Extraktionsvertrag. Prüfe Variante, Array-/Textgrenzen, endliche Zahlen, gültige positive Mengen oder klar modellierte unbekannte Werte, Einheiten und Datumswerte. Ungültige Modellantworten nicht durch as-Casts vertrauenswürdig machen. Schema und Parser müssen zueinander passen. Unbekannte Varianten und fehlende Pflichtfelder erhalten stabile Fehler.

Fixturen mindestens: drei Tätigkeiten 3/2,5/1 Std.; mengenbasierte Leistung; explizite Pauschale; Material ohne Menge/Preis; Maßangabe im Text; Anfahrt mit Unsicherheit; Notizen ohne Stunden; reine Summen/irrelevanter Inhalt; gestrichene Werte; mehrere einzelne Tage; ungültiges Datum; unbekannte Variante. Tabellen-Fixture weiterverwenden.

Kein blindes Schnappschusstesten des Schemaobjekts. Teste tatsächliche Annahme/Ablehnung und Erhalt fachlich wichtiger Information. Preise dürfen aus einer Antwort nicht unbemerkt ins Review gelangen.

Abnahme: gezielte Parser-/Fixturetests grün; unbekannte Mengen, Unsicherheiten und einzelne Tage sind ohne Informationsverlust darstellbar.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/04-ki-extraktion.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
