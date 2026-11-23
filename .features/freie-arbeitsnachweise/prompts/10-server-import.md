# Paket 10: Serverseitigen Positionsimport absichern

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Prüfe addNachweisItems und parseNachweisImportLines für die neuen bestätigten Positionen. Möglichst denselben validierten Transport und denselben Insert verwenden. Keine Speicherung modellinterner Felder oder Reviewzustände in document_items.

Serverseitig weiterhin jede Zeile prüfen: kind free, deutscher Beschreibungstext, Menge, Einheit, Integer-Cents und Limits; bei einer ungültigen Zeile kein Insert. Bestehende Grenzen nicht unbemerkt ausweiten. Client-Prüfung ersetzt keine Actionvalidierung. Wenn neue Typen null für unbekannt führen, muss die Umwandlung vor dem Import diese Angaben explizit auflösen.

Auth, Firmenzuordnung, Draft-Guard, serverseitigen Dokumentsteuersatz und Berechnung erhalten. Vorhandenes RLS-/Repository-Muster respektieren. Keine Kundendaten aus Foto anlegen. Neue Supabase-Abfragen ausschließlich in Repositories.

Teste mehrere verschiedene Leistungen mit gleichem Preis, Material und Anfahrt, Reihenfolge am Dokumentende, einen gemeinsamen Zeilen-Insert, serverseitige Betragsberechnung und Summen-Neuberechnung. Auch 7/19/0%-Dokumentstandard soweit bestehende Testkonfiguration unterstützt; kein Foto überschreibt Steuerkonfiguration.

Abnahme: Actiontests beweisen korrekten Import und Ablehnung ungültiger/nicht bearbeitbarer Dokumente. Kein Umbau von finalize_document oder SQL nötig. Insert und Summenupdate nicht fälschlich als gemeinsame Transaktion dokumentieren.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/11-sprachen-und-rtl.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
