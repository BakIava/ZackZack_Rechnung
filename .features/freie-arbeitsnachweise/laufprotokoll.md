# Laufprotokoll

## Vorbereitung — 23.11.2026

- Bestehenden Upload, Provider-Vertrag, Prüfung, Positionsbildung, Cache und Import im Code gelesen.
- Drei Originalfotos visuell betrachtet; zwei zeigen dieselbe Seite.
- Kontext, Defaults, Abnahmekriterien und 14 Umsetzungsprompts vorbereitet.
- Keine Implementierung gestartet; keine echten KI-Aufrufe oder Änderungen an Kundendaten.
- Historisch aus der vorangegangenen Analyse: `npm run test -- nachweis` → 8 Dateien / 80 Tests grün. Dieser Befund ersetzt keine neue Baseline.
- Bereits unversionierte Verzeichnisse: examples/ und output/. Erhalten.

## Eintrag je Paket

Folgendes Schema bei jedem Paket als neuen Abschnitt ausfüllen:

- Paket / Datum / Status:
- Gelieferte Änderung und wichtige Dateipfade:
- Entscheidungen / Abweichungen:
- Ausgeführte Befehle und tatsächliche Ergebnisse:
- Nicht ausgeführte Prüfungen mit konkretem Grund:
- Offene Fehler und nächste Aktion:

Keine Secrets, Bildinhalte, Kundenobjekte oder vollständige Providerantworten protokollieren.

## Paket 01 — 23.11.2026 — erledigt
Typecheck und ESLint Exit 0; Vitest Exit 1: 677/678, Nummernkreis-Test vergleicht LF mit CRLF. Originalfotos lokal geprüft, keine Übertragung an Provider. Bestehende unversionierte .features/, examples/, output/ erhalten. Playwright startet lokalen Next-Server; Nachweis-Test mit Development-Harness und synthetischen Ergebnissen.

## Paket 02 — 23.11.2026 — erledigt
types/nachweis.ts definiert tabelle/frei von Extraktion über Review bis Cache. Typecheck Exit 0. Import bleibt maximal 20 NachweisImportLine[].

## Paket 03 — 23.11.2026 — erledigt
nachweis-varianten-contract.ts, nachweis-datum.ts und synthetische Fixtures angelegt. npm run test -- nachweis Exit 0 (97 Tests). Schema behält unbekannte Angaben als null; unzulässige Felder wie Preise und Zeilenstatus werden abgelehnt.

## Paket 04 — 23.11.2026 — erledigt
nachweis-extractor.ts verwendet den Variantenvertrag im strukturierten Hauptaufruf; der bisherige Tabellenadapter wird in Paket 06 entfernt. SDK-Mocks decken beide Varianten, Refusal, Truncation und ungültiges JSON ab. Nachweistests 102/102 und Typecheck Exit 0.

## Paket 05 — 23.11.2026 — erledigt
nachweis-frei.ts erstellt stabile freie Zeilen, deutsche Einzeltage und vollständige Import-DTOs. Nullpreise und Unsicherheit bleiben sichtbar; Bereitschaft blockiert ungültige Auswahl oder mehr als 20 Zeilen. Nachweistests 121/121, Typecheck Exit 0.

## Paket 06 — 23.11.2026 — erledigt
readNachweis und processNachweis liefern tabelle/frei; freie Materialbelege zulässig, leere Notizen erhalten no_work_found. Korrekturdurchlauf lässt ein gültiges Erstergebnis bei Fehlschlag/Leere bestehen. Mandanten-/Draft-Guards vor Verarbeitung, Provider gemeinsam auf 54 s begrenzt. Nachweis- und i18n-Tests 126/126, Typecheck Exit 0. UI-Adapter wird in Paket 07 ersetzt.

## Paket 07 — 23.11.2026 — erledigt
Cache v2 mit v1-Leseadapter in nachweis-cache.ts/nachweis-cache-parser.ts, fünf Scans/30 Tage je Firma, Ergebnis samt Korrekturen und Auswahl. use-nachweis-scan.ts hält den Leseablauf mit Anfragegeneration; Tabellensteuerung separat. Neulesen ersetzt den alten Cache erst bei Erfolg. Nachweistests 127/127, Typecheck Exit 0; Browser-Rennen in Paket 13.

## Paket 08 — 23.11.2026 — erledigt
Freie Zeilen mit Menge, Einheit, Netto-Einzelpreis, optionalen Tagen, Bestätigung und Auswahl/Löschen im bestehenden Picker. Beide Varianten nutzen gemeinsamen Reviewrahmen. Typecheck und 129 Nachweis-/i18n-Tests grün. AR bei 390 px tatsächlich in Chrome geprüft (Playwright Exit 0, Screenshot unter test-results/nachweis-frei-frueh). Datumshilfe durch bidi-Isolation korrigiert; Wiederprüfung in Paket 11/13.

## Paket 09 — 23.11.2026 — erledigt
Step2 erwartet bestätigte asynchrone Übernahme, übernimmt Items/Summen vom Server und schließt erst bei Erfolg. Review sperrt Mehrfachklicks, Rückkehr, Tabwechsel und Änderungen während des Requests; gemeldete Fehler behalten Eingaben. Nummernsuche berücksichtigt Stunden- und Arbeitsnachweise. Vier Chrome-Tests grün, darunter Doppelklick, Fehler, erneuter manueller Versuch, unbekannter Ausgang und verspätete Lesung.

## Paket 10 — 23.11.2026 — erledigt
Import-Parser prüft nichtleere Einheit, Menge vor Rundung, Preis in Integer-Cents und bestehende Grenzen. Ein Insert am Dokumentende und nachfolgend serverseitige Neuberechnung bleiben getrennte Schritte. 0/7/19 % und mehrere getrennte gleichpreisige Zeilen geprüft; fehlende Bestätigung nach möglichem Insert führt zu nachweisOutcomeUnknown. Typecheck und 151 gezielte Tests grün.

## Paket 11 — 23.11.2026 — erledigt
Message-Parität Exit 0 (2 Tests). DE/TR am Desktop und AR bei 360 px im produktiven Modalrahmen geprüft. Erster Chrome-Lauf zeigte 6 px Überbreite in der Tab-Leiste; zwei Spalten unter 460 px beheben die Ursache. Wiederholung 5/5, Screenshots unter test-results/nachweis-sprachen-korrigiert visuell geprüft. Tastatur, lange LTR-Texte, arabische Zahlen/Tage, Datumsfehler und Importfehler belegt.

## Paket 12 — 23.11.2026 — erledigt
Durchgängige PDF-Integration in nachweis-actions.test.ts: beide Varianten durch Parser, Review, Import und Repository-Mocks; getrennte gleichpreisige Positionen, Datumsfehler, Fehlerwiederholung und Tabellen-Mitarbeiter intern. Vollsuite grün: Typecheck, ESLint 0 ohne Warnung, Vitest 740/740 (102 Dateien). Baseline-Assertion im Nummernkreis-Test prüft weiter denselben SQL-Text, normalisiert jetzt CRLF. A01–A17 mit Evidenz in abnahme.md zugeordnet.

## Paket 13 — 23.11.2026 — erledigt
Chrome 9/9 mit gemeinsamem produktivem Modal und Picker, über Development-Harness mit synthetischen Antworten. Einschließlich Tabelle und Mitarbeiterpreis, Cache/Neu-Lesen, Datei-/Providerfehler und manueller Ausweg, 21 Zeilen, Doppelklick und DE/TR/AR. Screenshots unter test-results/nachweis-abnahme-2026-11-23; keine Live-OCR und keine reale DB-Persistenz im Browser.

## Paket 14 — 23.11.2026 — erledigt
Letzter Code-Diff geprüft; numerische Vorschau verwendet dieselben Grenzen wie der Import, Tabellen zeigen das 20-Zeilen-Limit. npm run typecheck Exit 0, npx eslint . Exit 0 ohne Warnungen, npm run test Exit 0 (102 Dateien, 740 Tests). npm run build: erster Sandboxlauf Exit 1 (EPERM beim Anlegen eines Unterordners in .next/types), kontrollierte Wiederholung Exit 0 (38 statische Seiten, Serwist). Finaler Chrome-Lauf 9/9, sechs Screenshots. Produktions-Smoke: GET /de/nachweis-test ohne Session 307 nach /de/login. git diff --check Exit 0.
