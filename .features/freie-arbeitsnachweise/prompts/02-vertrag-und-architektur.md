# Paket 02: Vertrag und Architektur

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Lege den konkreten Datenfluss beider Varianten fest, bevor du den Provider oder die UI umbaust. Implementiere die benötigten Entitätstypen unter types/; nutze diskriminierte Zustände statt Mitarbeiterfelder für freie Tätigkeiten zu missbrauchen.

Definiere Extraktion, bereinigtes Ergebnis, editierbare freie Zeile, kritische Unsicherheiten, ausgewählten/bestätigten Zustand und versionierten Cache. Leistungen brauchen stabilen Key, deutschen Text, Mengen-/Einheitenangabe oder explizite Unbekanntheit, optionale zuordenbare Daten und Quellenunsicherheit. Arbeitszeit, Material und Anfahrt müssen korrekt ausdrückbar sein. Preise sind ausschließlich Review-Nutzereingaben; kein Preisfeld in der neuen KI-Extraktion.

Bevorzugt erkennt ein strukturierter Hauptaufruf die Variante. Lege ein Schema fest, das die installierte Anthropic-Anbindung unterstützt; bestehende Tabellenzellen und die Orientierungsangabe bleiben darstellbar. Bei unklarem Inhalt keinen künstlichen Mitarbeiter erfinden. Technische API-Annahmen nötigenfalls mit offiziellen Anbieterquellen verifizieren.

Definiere die Adapter zum bestehenden NachweisImportLine[] und die Strategie für alte Cache-v1-Einträge. Die alten importierten Positionen benötigen keine Migration. Berücksichtige max. 20 Positionen; keine Erhöhung ohne belegte Notwendigkeit. Halte neuen Code schmal; plane Aufteilung des großen Scan-Hooks.

Abnahme: reale Typen kompilieren, Architektur und endgültige Variantennamen stehen in entscheidungen.md/context.md. Keine spekulativen Architekturdocs ohne nächste implementierbare Schnittstelle.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/03-fixtures-und-parser.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
