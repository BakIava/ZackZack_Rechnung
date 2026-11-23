# Paket 07: Reviewzustand und Browser-Cache

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Teile den vorhandenen use-nachweis-scan-Hook sinnvoll auf, bevor neue Logik seine zulässige Größe überschreitet. Ein gemeinsamer Upload-/Leseablauf bleibt; variantenspezifischer Reviewzustand erhält passende Aktionen.

Implementiere Bearbeiten, Auswahl/Bestätigung, Zurücksetzen, Wiederöffnen und Neu-Lesen für freie Zeilen. Freie Preise dürfen nicht aus Mitarbeitergedächtnis oder dem globalen letzten Stundenpreis gesetzt werden. Tabellen-Komfort bleibt.

Versioniere das Cacheformat mit defensiver Validierung. Alte gültige Tabellen-Scans kompatibel lesen/migrieren; neue Varianten eindeutig speichern. Beschädigte/nicht unterstützte Einträge sicher ignorieren, keinen gesamten localStorage löschen. Firmen-Scope, fünf Scans/30 Tage, Originaldatei-Hash und fehlertoleranten Storage-Zugriff erhalten. Scans nur als Ergebnisdaten speichern, keine Originaldatei.

Achte auf stabile eindeutige Zeilenkeys nach Wiederöffnung und Hinzufügen; Zähler darf keine bereits gecachten Keys erneut vergeben. Bei schnell wechselnden Reads, Zurücksetzen, Tabwechsel oder unmount darf ein veraltetes Promise kein neueres Ergebnis überschreiben. Keine falsche Zusage, dass derselbe Inhalt in anderem Foto per Hash erkannt wird.

Abnahme: Cachemigration, beschädigte Daten, Scope-Trennung, Ablauf/Begrenzung, Bearbeitung/Wiederöffnung, neue Keys und konkurrierende Ergebnisse sinnvoll getestet. Tatsächliche Cache- und Hookstruktur in context.md dokumentiert.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/08-pruefoberflaeche.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
