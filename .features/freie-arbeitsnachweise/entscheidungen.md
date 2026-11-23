# Entscheidungen und Annahmen

## Bereits aus dem Gespräch belegt

- Gemeinsamer Bedienablauf ist gewünscht: Upload → Lesen → Prüfen → Übernehmen.
- Benutzer dokumentiert einen Auftrag über mehrere Tage; die Beispiele enthalten unterschiedliche Abrechnungsarten.
- Der aktuelle Auftrag führt die 14 Umsetzungspakete in Reihenfolge aus.

## Vorgaben dieses Umsetzungspakets

Diese Punkte sind pragmatische Defaults für den unbeaufsichtigten Lauf; der Benutzer hat sie nicht einzeln bestätigt.

| ID | Vorgabe | Grund |
|---|---|---|
| D01 | Preise weiter manuell, freie Preise starten leer | Bestehender Vertrag „Preise nie vom Modell“; Einkauf/Verkauf und Netto/Brutto auf Foto unklar |
| D02 | Automatische interne Unterscheidung, gemeinsamer Einstieg | Gewünschter Ablauf ohne neue Bedienhürde |
| D03 | Ein strukturierter Hauptleseaufruf bevorzugt | Bestehendes Zeitbudget; keine zusätzliche verpflichtende Klassifizierungsrunde |
| D04 | Keine automatische Gruppierung freier Leistungen | Gleicher Preis bedeutet keine identische Tätigkeit |
| D05 | Kein Batch-/Mehrfoto-Merge | Zwei Fotos desselben Blatts; erhebliche Doppelzählungsgefahr |
| D06 | Keine neue DB-Tabelle/Migration | Normale freie Positionen reichen für bestätigte Ergebnisse |
| D07 | Fehlende/unklare Mengen explizit auflösen | Keine stillen finanziellen Annahmen |
| D08 | Keine Live-KI für automatische Tests | Reproduzierbarkeit, keine unbeaufsichtigte Datenweitergabe/Kosten |
| D09 | Kein Commit/Deployment und keine produktiven Kundeneingriffe | Ziel ist lokale Implementierung mit prüfbarer Übergabe |
| D10 | Ungeklärte Daten nicht als bestätigte Fakten darstellen | Handschrift und Datumszuordnung sind teilweise unsicher |

## Während der Umsetzung ergänzen

Pro Entscheidung: Datum, ID, Anlass, gewählte Lösung, verworfene naheliegende Alternative (nur falls relevant), betroffene Dateien, Prüfnachweis. Änderungen an Defaults begründen. Keine nachträgliche Umdeutung von Annahmen als Benutzerfreigabe.

- D11 (23.11.2026): Varianten tabelle und frei über Anthropic output_config.format mit verschachteltem anyOf und eindeutigen Diskriminatoren. SDK und offizielle Structured-Outputs-Dokumentation geprüft (https://platform.claude.com/docs/en/build-with-claude/structured-outputs). Tabellenparser und Import-DTO bleiben Adapter. Cache v2 kapselt den jeweiligen Review; v1 wird beim Lesen geprüft und umhüllt.

- D12: SDK weiterhin mit maxRetries 1 und unveränderter Modellkonfiguration; Teilanfrage-Timeouts 8 s / 42 s, in der Action zusätzlich gemeinsamer Abbruch (Paket 06).

- D13: Nur bestätigte ausgewählte freie Zeilen werden gemeinsam importierbar. Freie Datumszusätze nennen ausschließlich die zugeordneten einzelnen ISO-Tage in deutscher Schreibweise; ein Blattvergleich dient nur der Kontrolle.

- D14: Der Cache liest gültige v1-Einträge kompatibel; beim nächsten Speichern schreibt er v2. Beim Neu-Lesen bleibt der alte Stand bis zu einem erfolgreichen Ersatz erhalten. Nur Bytegleichheit dient zur Wiedererkennung.

- D15: Bei sicher abgelehnter Übernahme bleibt erneuter manueller Versuch offen. Bei unbekanntem Ausgang stoppt die aktuelle Prüfung weitere Schreibversuche. Dokument neu laden und vorhandene Positionen prüfen; keine DB-Idempotenz.

- D16: PostgREST-Transport-/Serverfehler und fehlgeschlagene Bestätigung nach Insert werden konservativ als unklar behandelt. Nachweis-spezifisch fehlerhafte Index-/Summenreads erkennen; andere Positionsaktionen behalten das bestehende Fehlerverhalten. Relative Float-Toleranz akzeptiert gültige Hundertstelschritte wie 2,53 und 8,04.

- D17: Gemeinsamer PositionPickerModal für App und Test-Harness. Schmaler Picker verwendet zwei Tabspalten; Zahlen-/Tagesfelder verstehen arabische Ziffern. Deutsche Datumsbeispiele werden bidirektional isoliert.

- D18: Playwright-Harness unter /[locale]/nachweis-test nur bei NODE_ENV=development. Getrennte Konfiguration, Loopback und synthetische Antworten mit Provider-/DB-Ersatz; lokales Chrome wegen fehlender Playwright-Browserinstallation.
