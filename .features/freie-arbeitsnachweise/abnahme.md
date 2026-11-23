# Abnahmekriterien

Jedes Kriterium am Ende mit tatsächlicher Evidenz (Testdatei/Befehl oder Screenshot) und Status ergänzen. Eine bloße Checkliste ersetzt keine Ausführung.

## Verhalten

- A01: Vorhandener Nachweis-Einstieg funktioniert für Stundentabelle und freie Notizen ohne zusätzlichen Pflichtschritt zur Typwahl.
- A02: Bestehende Tabellen lesen/rechnen/gruppieren weiterhin wie zuvor, inklusive Unsicherheiten, Summenwarnung und Mitarbeitergedächtnis.
- A03: Freie Notizen erzeugen getrennte Leistungs-, Material- und Anfahrtspositionen. Drei Tätigkeiten mit identischem Preis bleiben getrennt.
- A04: Mengen/Einheiten/Text/zugeordnete Tage lassen sich prüfen und korrigieren. Fehlende Angaben und kritische Unsicherheiten verhindern unbestätigte Übernahme.
- A05: Keine erfundenen Preise, Einheiten, Mengen oder Datumsbereiche; kein automatisch aus Summen abgeleiteter Preis. Neue freie Preise starten leer.
- A06: Summen, Steuerzeilen, Vordruck-Uhrzeiten, Adressen und gestrichene Werte werden nicht als Leistungen importiert.
- A07: Stunden werden durch Code berechnet; ein Blattvergleich ist nur bei semantisch passender Summe vorhanden. 3 + 2,5 + 1 = 6,5, ohne zusätzliche Summenposition.
- A08: Abwahl/Entfernung ist explizit. Eine ungültige ausgewählte Zeile verwirft den Import, statt still herauszufallen; null/NaN/Infinity/0 und Überlängen sind abgefangen.
- A09: Obergrenze 20 importierte Zeilen verständlich behandeln, nicht abschneiden. Text 200, Zusatz 500, Einheit 30; integer-Cents und bestehende Betragsgrenzen.
- A10: Doppelklick während Import gesperrt; bei gemeldetem Fehler ist Review mit Eingaben erneut erreichbar; Erfolg ersetzt die Positionsliste und Summen mit Serverantwort.
- A11: Original bleibt flüchtig. Cache firmenbezogen, fünf Scans/30 Tage, gleiche Datei wiederverwendbar; alte Scans sicher migriert/kompatibel oder begründet behandelt; kein worker-memory für freie Zeilen.
- A12: Bei Nummern weiter bestehende Doppelabrechnungswarnung. Ohne Nummer weder erfundene Nummer noch falsches Schutzversprechen. Keine automatische Mehrfoto-Zusammenführung.
- A13: Datei-/Auth-/Draft-/Kontingentprüfungen, Orientierung und Retry-Fallback bleiben für beide Varianten erhalten; keine zusätzliche Quotenreservierung pro internem Teilaufruf.
- A14: Unklarer/leer/fremder Inhalt hat verständlichen Fehler und manuellen Ausweg. Material-only und Leistungen ohne Stunden dürfen erfolgreich gelesen werden.
- A15: DE/TR/AR vollständig; Arabisch RTL, deutsche Positionstexte und Dokumentvorschau LTR. Mobile und Desktop ohne abgeschnittene Pflichtfelder.
- A16: Bestätigte Daten gehen über vorhandene Nachweis-Action und Repositories in normale freie Positionen, Dokumentsteuer und Summen bleiben serverseitig autoritativ.
- A17: Keine Änderungen an rechtlichen Schutzregeln, Finalisierung oder Nummernvergabe. Keine echten Namen/Adressen aus examples in automatisierten Fixtures oder Logs.

## Geforderte Evidenz

- Unit: neue Vertrags-/Parserfälle, Zahlen/Datum/Unsicherheit, Positionsbildung, Cache-Versionierung.
- Integration: Datei → beide Ergebnisvarianten → Reviewzustand → validierte Importzeilen → Action; Provider und DB isoliert.
- UI/Browser: beide Varianten, Fehler/Retry, fehlender Preis, Cache-Wiederöffnung, DE/TR/AR, mindestens mobile und Desktop; Screenshots angeben. Kein echter Provider für reproduzierbare Browserprüfung.
- Abschließend: npm run typecheck; npx eslint .; npm run build; npm run test.
- Echte KI-OCR auf Originalfotos ist NICHT durch Fixtures bewiesen. In der Übergabe ausdrücklich „nicht live geprüft“ vermerken.

## Abschlussstatus

Alle lokalen Pflichtprüfungen bestanden. Typecheck, ESLint, Produktionsbuild und Vitest Exit 0. Vitest: 102 Dateien, 740 Tests. Finaler Chrome-Lauf: 9/9. Der Produktionsbuild wurde nach der Sandbox-Schreibsperre erfolgreich wiederholt. Live-OCR und echte DB-Persistenz blieben außerhalb des Prüfumfangs.

| Kriterium | Evidenz |
|---|---|
| A01 | e2e/nachweis-frei.spec.ts verwendet denselben Nachweis-Reiter für beide Varianten. |
| A02 | nachweis-extraction-contract.test.ts, nachweis-pruefung.test.ts, nachweis-positionen.test.ts und nachweis-gedaechtnis.test.ts; Chrome prüft Tabellenübernahme, Summenwarnung, korrigierte Stunden und Mitarbeiterpreis im neuen Scan. |
| A03 | nachweis-frei.test.ts und nachweis-actions.test.ts erhalten getrennte Zeilen gleichen Preises sowie Material/Anfahrt. |
| A04 | nachweis-frei.test.ts und Chrome AR zeigen Sperre vor Datums-/Unsicherheitskorrektur. |
| A05 | Variantenparser und Cachetests: freie Preise leer, unbekannte Menge/Einheit erhalten. |
| A06 | Variantenprompt, Parser-Ablehnung zusätzlicher Metadaten und Nachweis-Actiontests mit synthetischer Extraktion. Handschriftliche Semantik nicht live geprüft. |
| A07 | nachweis-frei.test.ts berechnet 6,5 Std.; separate Stundensumme wird nicht importiert. |
| A08 | nachweis-frei.test.ts, nachweis-import.test.ts und Chrome AR (Auswahl und ungültige Tage). |
| A09 | nachweis-frei.test.ts und nachweis-import.test.ts prüfen 20 Zeilen und Feldgrenzen. Chrome zeigt alle 21 Zeilen und sperrt die Übernahme. |
| A10 | Chrome: Doppelklick, gemeldeter Fehler, Wiederholung, unbestätigter Ausgang und Lesungsrennen; Actions liefern Items und Summen. |
| A11 | nachweis-cache.test.ts und nachweis-gedaechtnis.test.ts prüfen v1/v2, Scope, 30 Tage, fünf Einträge, Preise und Auswahl; Chrome prüft bytegleiche Wiederverwendung, Öffnen aus der Liste und Neulesen mit Fehler und anschließendem Erfolg. |
| A12 | nachweis-actions.test.ts und nachweis-positionen.test.ts prüfen beide Nummernzusätze; Browser zeigt Warnung für TEST-42. |
| A13 | nachweis-service.test.ts und nachweis-actions.test.ts prüfen Guards, Quotenreservierung, PDF und Orientierung/Fallback. |
| A14 | nachweis-service.test.ts deckt leere Liste und Material ohne Stunden ab; Chrome prüft ungültige Datei, leere Extraktion und manuellen Ausweg. |
| A15 | Message-Parität und Chrome DE/TR/AR, AR 360 px ohne Überbreite, Felder und Vorschläge Deutsch/LTR. |
| A16 | nachweis-actions.test.ts verbindet Datei, Parser, Review und Insert, prüft 0/7/19 % und Summen-Update. |
| A17 | Keine SQL-, Finalisierungs- oder PDF-Änderung. Test für Nummernkreise normalisiert CRLF; dieselbe Assertion. Neue Fixtures und Screenshots sind synthetisch. Produktions-Smoke ohne Sitzung führt vom Testpfad zur Anmeldung. |

### Screenshots des finalen Chrome-Laufs

- [tr-desktop.png](<../../test-results/nachweis-abschluss-2026-11-23/nachweis-frei-Türkisch-Men-51d14-chale-prüfen-und-übernehmen/tr-desktop.png>)
- [de-tabelle.png](<../../test-results/nachweis-abschluss-2026-11-23/nachweis-frei-Tabellenrevi-7a4d9--gemerkten-Mitarbeiterpreis/de-tabelle.png>)
- [de-desktop.png](<../../test-results/nachweis-abschluss-2026-11-23/nachweis-frei-Serverfehler-f9972-olg-enthält-alle-Positionen/de-desktop.png>)
- [de-cache.png](<../../test-results/nachweis-abschluss-2026-11-23/nachweis-frei-Cache-Wieder-e7ca6-it-fehlgeschlagenem-Versuch/de-cache.png>)
- [ar-mobil-importfehler.png](<../../test-results/nachweis-abschluss-2026-11-23/nachweis-frei-Arabisch-mob-c6fd3-atur-Ziffern-und-Prüffehler/ar-mobil-importfehler.png>)
- [ar-mobil-felder.png](<../../test-results/nachweis-abschluss-2026-11-23/nachweis-frei-Arabisch-mob-c6fd3-atur-Ziffern-und-Prüffehler/ar-mobil-felder.png>)
