# Paket 08: Prüfoberfläche für freie Leistungen

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Integriere eine passende Reviewansicht im bestehenden Nachweis-Reiter. Tabellenreview erhalten. Freie Notizen zeigen einzelne übersichtliche Leistungszeilen mit deutschem Text, Menge, Einheit, Preis und optionalen zugeordneten Tagen; Material und Anfahrt sind verständlich erkennbar.

Text/Menge/Einheit/Datum müssen korrigierbar sein. Unsichere oder unbekannte kritische Angaben sichtbar markieren und explizites Prüfen/Bestätigen oder Abwählen ermöglichen. Auswahl und Löschen leicht verständlich, keine versteckten Datenverluste. „Das kommt aufs Dokument“ zeigt genau die resultierenden ausgewählten Positionen und aktuelle berechnete Summe.

Preise sind vom Nutzer eingegebene Netto-Einzelpreise gemäß bestehender App-Konvention. Keine Vorbelegung aus handschriftlichen Beträgen oder Mitarbeiterdaten. Keine technische Typ-/Schemaanzeige im Produkt. Bei fehlenden Werten klar zeigen, was noch zu tun ist.

Große bedienbare Felder/Buttons, sichtbare Labels, Tastaturzugang, hilfreiche Fehler. Neue Texte sofort in DE/TR/AR anlegen; Dokumenttexte LTR/deutsch. Logische CSS-Properties, keine Inline-Styles, eine passende CSS-Datei pro Komponente. JSX-Blöcke >40 Zeilen sinnvoll teilen, neue Komponenten max. 300 LOC.

Nutze vorhandene Primitives, wo passend; bestehendes Design nicht unnötig umbauen. Teste früh eine arabische/mobile Ansicht mit synthetischen Daten.

Abnahme: beide Reviewarten sind über denselben Einstieg tatsächlich erreichbar. Korrekturen und Abwahl verändern Vorschläge konsistent; kein toter UI-Prototyp.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/09-uebernahme-und-fehler.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
