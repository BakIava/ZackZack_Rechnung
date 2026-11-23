# Paket 05: Positionsbildung und fachliche Prüfung

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Implementiere reine, Supabase-freie Logik für freie Notizen: Ergebnis → editierbare Zeilen → Vorschläge → bestätigte NachweisImportLine[]. Entitätstypen importieren, nicht erneut definieren.

Jede unterschiedliche Leistung bleibt eine eigene Position, auch bei identischem Preis. Für dieses Feature keine automatische Gruppierung ähnlicher Tagesnotizen. Explizit vermerkte Gesamtstunden nur als Vergleich verwenden, nicht doppelt zählen. Mengen unterschiedlicher Einheiten nicht summieren. Summen/Steuer/Gestrichenes sind keine Leistungen.

Unbekannte Mengen und Einheiten dürfen nicht still als 1/Stk. gelten. Explizite Pauschalen sind darstellbar. Preise starten leer und werden aus Nutzereingaben als Integer-Cents übernommen. Texte, Mengen, Einheiten, Tage und Unsicherheiten müssen im Review korrigierbar sein. Dates müssen echte Kalendertage sein; Datumszuordnung nicht aus Drucklayout behaupten.

Definiere eine einzige verlässliche Bereitschaftsprüfung, die UI und Importvorbereitung nutzen. Keine ausgewählte ungültige oder unbestätigte kritische Zeile still herausfiltern. Abwahl ist explizit. Bei mehr als 20 Zeilen blockieren und zur Auswahl/Korrektur führen.

Erzeuge nur ehrliche deutsche Zusatztexte. Ohne Nachweisnummer keine erfundene „Nr.“. Nicht zusammenhängende Tage dürfen keine lückenlose tägliche Leistung behaupten. Mitarbeiter-/Kundenkontext nicht in Positionstexte kopieren.

Abnahme: Verhaltenstests decken alle genannten Fälle und die Abnahme A03–A09 ab; bestehende Tabellen-Positionstests bleiben grün.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/06-server-pipeline.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
