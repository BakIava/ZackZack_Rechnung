# Aktueller Feature-Kontext

Zuletzt aktualisiert: 23.11.2026. Gesamtstatus: lokal implementiert und abgenommen.
Aktives Paket: keines. Nächste Aktion: kein offener lokaler Pflichtschritt.

## Auftrag und Ergebnis

Der Startauftrag wurde in allen 14 Paketen abgearbeitet. Schritt 2 → Nachweis → Foto/PDF → Lesen → Prüfen → Übernehmen funktioniert für Stundentabellen und freie Kalender-/Baustellennotizen. Bei freien Notizen bleiben Leistungen, Material und Anfahrt einzeln, auch bei gleichem Preis. Die Nutzerin oder der Nutzer setzt Netto-Einzelpreise, korrigiert Menge, Einheit und Text. Nach dem Scan sind alle Leistungszeilen zugeklappt; höchstens eine lässt sich gleichzeitig bearbeiten. Unerwünschte Zeilen werden über den Papierkorb entfernt. Explizite Pauschalen können Menge 1 haben. Unbekannte Mengen/Einheiten bleiben offen. Mehr als 20 Zeilen blockieren die Übernahme; nichts wird abgeschnitten. Erkannte Einzeltage erscheinen als Positionszusatz. Zusammenhängende Zeiträume werden daraus nicht abgeleitet. Auftraggeber und Adressen werden nicht als Kunden angelegt.

## Architektur und Fortsetzung

- **Verträge** in `types/nachweis.ts`: Varianten `tabelle` und `frei` in `NachweisExtraktion`, `NachweisLeseErgebnis` und `NachweisReviewDaten`. Nur bestehende `NachweisImportLine[]` werden an den Positionsimport gesendet.
- **Server lesen**: `lib/documents/nachweis-actions.ts` prüft Anmeldung und Draft. `nachweis-service.ts` prüft Signatur und 4 MiB, reserviert einmal Kontingent, bereitet PDF/Bild vor und behält bei einer fehlgeschlagenen oder leeren Korrekturlesung das gültige Erstergebnis. Die Action begrenzt die Providerphase auf 54 s. Pro Lesung ein strukturierter Hauptaufruf in `lib/integrations/anthropic/nachweis-extractor.ts` mit Variantenvertrag und separater Orientierungsvorprüfung. Die Modelle und übrigen Umgebungsvariablen bleiben wie konfiguriert.
- **Fachlogik**: `lib/documents/nachweis-frei.ts` erstellt Ergebniskeys, leere Nutzerpreise, Prüfvorschläge und vollständige DTO-Listen. `nachweis-pruefung.ts` und `nachweis-positionen.ts` führen die Tabellenrechnung und Preisgruppierung fort. Der freie Stundenvergleich verwendet nur ausdrücklich notierte Gesamtstunden. Die Nummernsuche unterstützt vorhandene Tabellen- und freie Nummern; der Datei-Hash erkennt nur bytegleiche Uploads.
- **Review und Cache**: `components/create/2/nachweis-scan.tsx`, `use-nachweis-scan.ts`, `nachweis-freier-review.tsx`, `nachweis-tabellen-review.tsx`. Eine Anfragegeneration schützt bei Wechsel und Abbruch vor alten Antworten. `lib/documents/nachweis-cache.ts` und `nachweis-cache-parser.ts` lesen valide v1-Tabellen und schreiben v2. Fünf Scans je Firma für 30 Tage ab letzter Speicherung. Ergebnis und Korrekturen liegen lokal im Browser; Originaldateien werden flüchtig verarbeitet. Neulesen ersetzt den gemerkten Stand erst nach Erfolg. Mitarbeitergedächtnis und letzter Stundenpreis gelten nur für Tabellen.
- **Import**: `addNachweisItems` validiert jede Zeile und schreibt sie gemeinsam ab der nächsten Position. Server berechnet Netto, Dokumentsteuer und Summen. Insert und Summenupdate sind getrennte Schritte. Bei möglichem bereits erfolgtem Insert bleibt die Übernahme unbestätigt; Dokument neu laden und Positionen prüfen. Bei gemeldetem Ablehnungsfehler bleiben alle Eingaben im Review. Das Modal schließt nach bestätigter Antwort.
- **Test-Harness**: `app/[locale]/nachweis-test` nur in Development. `playwright.nachweis.config.ts` nutzt den gemeinsamen produktiven Picker und Modalrahmen sowie synthetische Antworten. Kein produktiver DB-Zugriff. Reproduktion in [README.md](README.md).

## Paketstatus

| Paket | Datei | Status |
| 01 | prompts/01-bestand-und-baseline.md | erledigt |
| 02 | prompts/02-vertrag-und-architektur.md | erledigt |
| 03 | prompts/03-fixtures-und-parser.md | erledigt |
| 04 | prompts/04-ki-extraktion.md | erledigt |
| 05 | prompts/05-positionen-und-pruefung.md | erledigt |
| 06 | prompts/06-server-pipeline.md | erledigt |
| 07 | prompts/07-zustand-und-cache.md | erledigt |
| 08 | prompts/08-pruefoberflaeche.md | erledigt |
| 09 | prompts/09-uebernahme-und-fehler.md | erledigt |
| 10 | prompts/10-server-import.md | erledigt |
| 11 | prompts/11-sprachen-und-rtl.md | erledigt |
| 12 | prompts/12-integration-und-regression.md | erledigt |
| 13 | prompts/13-browser-pruefung.md | erledigt |
| 14 | prompts/14-abschluss-und-uebergabe.md | erledigt |

## Abschlussprüfungen

- `npm run typecheck` und `npx eslint .` Exit 0.
- `npm run test` Exit 0, 740 Tests in 102 Dateien. Der vorherige CRLF-Baselinefehler wurde im Test normalisiert, ohne die SQL-Assertion zu ändern.
- `npm run build` Exit 0 nach Wiederholung außerhalb der Sandbox. Der erste Lauf scheiterte mit EPERM beim Schreiben nach `.next/types`. Serwist gebündelt und 38 statische Seiten generiert.
- Chrome über `npx playwright test -c playwright.nachweis.config.ts --output test-results/nachweis-abschluss-2026-11-23` mit `PLAYWRIGHT_CHANNEL=chrome`: Exit 0, 9 Tests. DE Desktop, TR und AR bei 360 px mit sechs Screenshots.
- Gebauter Produktionsserver ohne Anmeldung: `GET /de/nachweis-test` liefert 307 nach `/de/login`. `git diff --check` Exit 0.

## Grenzen

Die Live-OCR auf Originalfotos war ausgeschlossen und wurde nicht geprüft. Auch reale Supabase-Persistenz außerhalb der Repository-Grenze wurde nicht ausgeführt. Die Abnahme nutzt synthetische Antworten und Repository-Mocks. Ein späterer Live-Test braucht eine freigegebene Testumgebung sowie synthetische oder ausdrücklich freigegebene Testbilder. Entscheidungen und Einzelevidenz stehen in [entscheidungen.md](entscheidungen.md), [laufprotokoll.md](laufprotokoll.md) und [abnahme.md](abnahme.md).

## Nachtrag zur Einheitenauswahl

Freie Nachweiszeilen verwenden denselben UnitPicker und dieselbe FLOW_UNITS-Standardliste wie „Freie Position“. Eine bereits erkannte oder geladene abweichende Einheit bleibt zeilenbezogen verfügbar. Der gemeinsame Picker klappt bei Platzmangel nach oben. Chrome 10/10 unter test-results/nachweis-einheitenauswahl-final. Vitest 740/740 mit vier Workern; der PDF-Logo-Test lief isoliert ebenfalls grün, nachdem er in der Standardparallelisierung das Zeitlimit erreicht hatte.
