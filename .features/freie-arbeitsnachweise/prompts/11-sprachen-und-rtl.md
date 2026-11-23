# Paket 11: DE/TR/AR und RTL vollständig prüfen

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Prüfe alle neuen/angepassten UI-Texte in messages/de.json, tr.json und ar.json. Keine hartcodierten UI-Sätze oder neue setup-Sonderübersetzungen. Kurze klare Sprache für nicht technikaffine Handwerker; leere Ergebnisse müssen sowohl Stunden- als auch freie Leistungsnotizen berücksichtigen.

Prüfe Arabisch bereits im tatsächlichen Review, einschließlich Zahlen-/Preis-/Datumsfelder, Einheitenwahl, Auswahl, Unsicherheitsmarkierung, langen deutschen Positionstexten, Fehlermeldungen und Importbutton. UI RTL, deutsche Dokumenttexte und Vorschläge gezielt LTR/lang=de. Keine physisch gerichteten CSS-Abstände/Ausrichtungen.

Prüfe die mobile und Desktop-Bedienung: keine horizontal abgeschnittenen Felder, erreichbare Buttons, richtige Tabreihenfolge, Labels und Statusmeldungen. Erst echte Ursache korrigieren, keine globalen overflow-Verstecke für kaputtes Layout. Geteilte Styles nur beim tatsächlich zuständigen Baustein.

Abnahme: Message-Paritätstest grün; relevante Screens in allen drei Sprachen geprüft (AR besonders gründlich). Screenshots/Prüfnachweise oder konkrete externe Blockade im Protokoll; keine Behauptung einer Browserprüfung allein aus CSS-Lektüre.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/12-integration-und-regression.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
