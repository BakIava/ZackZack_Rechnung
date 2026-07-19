# Umsatzsteuer auf Rechnungspositionen

Stand: 15. Juli 2026. Dieses Dokument ist Analyse, fachliche Spezifikation,
Architekturentscheidung, Migrations- und Testnachweis der Implementierung.

## 1. Vollständige Bestandsaufnahme

| Bereich | Ausgangslage | Fundstelle | Auswirkung / Ergebnis |
|---|---|---|---|
| ✓ Datenbank | Supabase/PostgreSQL, Geld in Integer-Cents; vor dieser Änderung nur `total_amount`, keine Steuerfelder | `db/001_initial_schema.sql`, `scripts/*.sql` | Firmen-, Dokument- und Positions-Snapshots ergänzt; Migration in `scripts/vat_line_items.sql` |
| ✓ Migrationen/DB-Funktionen | Dashboard-gepflegtes Schema, ausführbare SQL-Skripte; Finalisierung atomar per RPC | `scripts/finalize_document.sql` | RPC berechnet Zeilen und Summen vor Nummernvergabe erneut; History-Trigger schützt fiskalische Daten |
| ✗ ORM | Kein ORM; Supabase-Client ist die Datenzugriffsschicht | `lib/repositories/` | Kein ORM-Mapping anzupassen |
| ✓ Row-Modelle/Enums | Handgeschriebene DB-Typen als Single Source of Truth | `types/database.ts` | `TaxRate`, neue Spalten und Cent-Semantik ergänzt |
| ✓ Repositories | Tabellenzugriff ausschließlich in Repositories; Dokumentvorschau komponiert Daten | `lib/repositories/{companies,documents,document-items}.ts` | Steuerfelder werden vollständig gelesen/geschrieben; Browser-Read liefert nur kundensichtbare Felder |
| ✓ Services/Actions | Dünne Server-Actions für Draft, Positionen, Einstellungen, Finalisierung | `lib/documents/*.ts`, `lib/settings/actions.ts` | Jede Preis-/Mengen-/Steueränderung berechnet serverseitig neu |
| ✓ Domain | Marge und Zeilennetto vorhanden; bisherige Steuerdatei war nur ungenutztes Legacy-Spec-Modul | `lib/documents/margin.ts`, `lib/legal/mwst.ts` | Produktive zentrale Steuerdomäne ist jetzt `lib/documents/tax.ts`; Legacy-Modul bleibt unverändert |
| ✓ DTOs | `DocumentItem` blendet Einkauf/Marge aus; `DocumentPreview` ist PDF-Quelle | `types/document.ts` | Effektiver Satz, Steuer, Brutto und Steuergruppen ergänzt; interne Margenfelder bleiben ausgeschlossen |
| ✓ Validierung | Pflichtangabenprüfung rein funktional; zuvor nur von Schritt 3 aufgerufen | `lib/legal/dokument-pflicht.ts` | Finalisierungs-Action prüft jetzt bei jedem direkten Aufruf serverseitig; 250-Euro-Grenze nutzt Brutto |
| ✓ Rundung | Zeilennetto war `round(unit_price × amount)` | ehemals `computeLineTotal`, jetzt `calculateLineAmounts` | Zeilennetto zuerst, danach Zeilensteuer; Dokument ist Summe gerundeter Zeilen |
| ✓ Rechnung/Angebot | Gemeinsamer Drei-Schritt-Flow, Typ `invoice | quote`, persistente Drafts | `app/[locale]/create/`, `components/create/` | Steuerlogik gilt identisch für Rechnung und Angebot; Nummernlogik bleibt unverändert |
| ✓ PDF/Archiv | Server-PDF, archivierter finaler Beleg wird bevorzugt ausgeliefert | `lib/pdf/`, `lib/pdf/pdf-storage.ts` | MwSt.-Spalte, Steuergruppen, Netto/Brutto ergänzt; Archiv-first unverändert |
| ✓ Vorschau | Deutsche LTR-A4-Vorschau | `components/create/3/document-a4.tsx` | Gleiche Steuerdarstellung wie PDF |
| ✓ Export | Dokument-PDF-Route; daneben nur statischer Demo-PDF-Endpunkt | `app/api/documents/[document_id]/pdf`, `app/api/pdf` | Echter Export ist umgestellt; Demo-Endpunkt bleibt bewusst Beispieldaten-Code |
| ✓ Tests | Vitest für Domain, Legal, PDF-View-Model, i18n | `lib/**/*.test.ts`, `messages/messages.test.ts` | Steuer-, Rundungs- und direkte Finalisierungsfälle ergänzt; 108 Tests grün |
| ✓ Frontend/State | Steuer-UI 19/7/0/Standard war bereits als nicht persistierter Platzhalter vorhanden | `components/create/2/` | Platzhalter-State entfernt; Werte und Summen kommen aus Server-Actions |
| ✓ Einstellungen | §19-Schalter vorhanden, kein Standardsatz | `components/settings/settings-rechnung.tsx` | Standardsatz 19/7/0 für regelbesteuerte Firmen ergänzt |
| ✓ Leistungskatalog | Deutscher Snapshot, Preis und Einheit; kein Steuersatz | `services`, `lib/repositories/services.ts` | Beim Übernehmen gilt der Dokumentstandard; Katalogänderungen wirken nicht rückwirkend |
| ✓ Fremdleistungen | Einkauf inkl. MwSt + interner Aufschlag → Verkaufspreis; interne Daten nie im PDF | `lib/documents/margin.ts`, Positionsformulare | Berechneter Verkaufspreis ist gemäß Auftrag ein Nettopreis; Steuer wird danach wie bei jeder Position berechnet |
| ⚠ Duplizieren | Sichtbarer Button, aber keine Action/Logik | `components/documents/doc-detail.tsx` | Zielverhalten spezifiziert, nicht neu implementiert |
| ✗ Vorlagen | Kein Domänenmodell und keine Tabelle | repositoryweit keine Fundstelle | Nur Zielverhalten spezifiziert |
| ✗ Wiederkehrende Rechnungen | Nicht vorhanden | repositoryweit keine Fundstelle | Nicht betroffen, kein Scope-Zuwachs |
| ✗ Rabatte/Gutschriften | Nicht vorhanden und explizit nicht Teil der Aufgabe | Dokumenttypen und Eingabe-UI | Negative Beträge werden abgewiesen |
| ✓ RLS/Audit | Firmenbezogene RLS; finalisierte Daten bisher nur auf App-Ebene geschützt | initiales Schema, Repositories | Migration ergänzt DB-Trigger: Positionen finaler Belege sind unveränderbar; an Dokumenten bleiben nur Status/`paid_at` änderbar |
| ✓ Cache/Offline | Server-Actions benötigen Netz; statische Offline-Platzhalter | `app/sw.ts`, API-Platzhalter | Kein Offline-Schreibmodell anzupassen; Revalidierung des Flows bleibt erhalten |

## 2. Abgeleitetes fachliches Modell

- Eine Firma besitzt `kleinunternehmer` und `default_tax_rate` (0, 7 oder 19).
- Ein neuer Entwurf friert beides als `is_kleinunternehmer` und
  `default_tax_rate` ein. Spätere Einstellungsänderungen ändern ihn nicht.
- Jede neue Position speichert den effektiven Satz und
  `tax_rate_overridden=false`. „Standard“ ist damit kein vierter Satz, sondern
  die Herkunft des gespeicherten effektiven Satzes.
- Eine Positionsauswahl 19/7/0 setzt `tax_rate_overridden=true`; die Auswahl
  „Standard“ setzt das Flag zurück und kopiert den Dokumentstandard erneut.
- Bei §19 ist der geerbte Dokumentstandard 0 %. Die Satz-Auswahl bleibt sichtbar;
  einzelne Positionen dürfen ausdrücklich auf 7 % oder 19 % überschrieben werden.
  Der feste §19-Hinweis erscheint nur, solange keine Position einen positiven
  Steuersatz verwendet.
- `unit_price` und `document_items.total_amount` sind netto. `tax_amount` und
  `gross_amount` sind zeilenweise Snapshots. Auf Dokumentebene bedeuten
  `subtotal_amount` netto, `tax_amount` Steuer und `total_amount` brutto.
- Finalisierte Dokumente und Positionen sind unveränderbar. Versand-, Zahlungs-
  und Stornostatus dürfen separat fortgeschrieben werden; das PDF-Archiv bleibt
  der maßgebliche Beleg.

## 3. Fachliches Zielmodell und Invarianten

1. Erlaubte Sätze sind exakt 0, 7 und 19 Prozent.
2. Ein Standard ist eine Referenz/Herkunft, niemals ein numerischer vierter Satz.
3. Jeder gespeicherte Geldbetrag ist eine ganze Anzahl Cents.
4. Menge besitzt höchstens zwei Nachkommastellen und ist strikt größer als 0.
5. Nettoverkaufspreis ist nicht negativ; Rabatte, Gutschriften und negative
   Positionen werden nicht über diesen Pfad modelliert.
6. `gross_amount = total_amount + tax_amount` je Position.
7. Dokumentbrutto ist Dokumentnetto plus Dokumentsteuer.
8. Steuergruppen sind Summen bereits gerundeter Positionen desselben Satzes.
9. §19 setzt den Dokumentstandard auf 0 %. Ohne positiven Positionssatz werden
   Steuerdetails ausgeblendet und der §19-Hinweis gezeigt; ein Override aktiviert
   stattdessen die normale Steuerdarstellung.
10. Einkauf, Aufschlag und Marge erreichen weder DTO noch Vorschau/PDF.
11. Dokumentinhalt bleibt immer Deutsch/LTR; Bedienoberfläche bleibt DE/TR/AR
    und RTL-fähig.
12. Die Finalisierungs-RPC berechnet alle Werte erneut, bevor sie die lückenlose
    Nummer vergibt. Ein manipulierter Cachewert kann so nicht final werden.

### Änderung, Duplizieren und Vorlagen

- Preis, Menge oder Satz eines Drafts lösen eine vollständige Neuberechnung der
  Position und der Dokument-Summen aus.
- Eine künftige Duplizierung muss Stammdaten, Positionen und Satz-Herkunft in
  einen neuen Draft kopieren, alle Geldwerte neu berechnen und darf weder Nummer
  noch Status noch archiviertes PDF übernehmen.
- Eine künftige Vorlage soll bevorzugt die Herkunft „Standard“ speichern und
  beim Erzeugen den dann gültigen Firmenstandard auflösen. Explizite 19/7/0-
  Overrides bleiben explizit.
- Wiederkehrende Rechnungen folgen derselben Vorlagenregel; es existiert dafür
  aktuell kein Modell.

## 4. Berechnungsspezifikation

Für jede Position mit Nettostückpreis `P` in Cents, Menge `M` und effektivem
Satz `R`:

```text
Positionsnetto  = round(P × M)
Positionssteuer = round(Positionsnetto × R / 100)
Positionsbrutto = Positionsnetto + Positionssteuer
```

`round` ist kaufmännische Rundung auf den nächsten Cent. Da negative Werte
abgewiesen werden, entsteht keine sprachabhängige/asymmetrische Negativrundung.

```text
Rechnungsnetto  = Summe(Positionsnetto)
Steuer(R)       = Summe(Positionssteuer aller Positionen mit R)
Rechnungssteuer = Summe(Steuergruppen)
Rechnungsbrutto = Rechnungsnetto + Rechnungssteuer
```

### Rechenbeispiele

| Fall | Rechnung | Ergebnis |
|---|---|---|
| 19 %, ganzzahlig | 100,00 € × 2 | netto 200,00 €, Steuer 38,00 €, brutto 238,00 € |
| Dezimalmenge | 3,33 € × 1,50 = 4,995 € | netto 5,00 €, Steuer 0,95 €, brutto 5,95 € |
| Gemischt | 100,00 € @19 + 50,00 € @7 + 20,00 € @0 | netto 170,00 €, Steuergruppen 19,00 €/3,50 €/0,00 €, brutto 192,50 € |
| §19 Standard | 100,00 € ohne Override | effektiv 0 %, netto=brutto 100,00 €, Steuer 0,00 € |
| §19 Override | 100,00 € mit explizit 19 % | Steuer 19,00 €, brutto 119,00 €, kein §19-Hinweis |
| Nullpreis | 0,00 € × 1 @19 | alle Beträge 0,00 €, zulässig |
| Null-/Negativmenge | 0 oder -1 | Validierungsfehler `amount_invalid` |
| Negativpreis | -0,01 € | Validierungsfehler `unit_price_invalid` |

Mehrere kleine Positionen dürfen gegenüber einer einmaligen Steuerberechnung
auf die Gruppennettosumme um einzelne Cents abweichen. Das ist beabsichtigt:
gespeicherte Zeilen, Vorschau, PDF und Wiederholungsberechnung bleiben dadurch
identisch.

## 5. Datenmodellvarianten

### A – nur effektiver Satz je Position

Einfach und schnell, aber die Herkunft „Standard“ geht verloren. Bei Bearbeitung
ist nicht erkennbar, ob 19 % ausdrücklich oder geerbt waren. Historisierung ist
gut, UX und spätere Vorlagenlogik sind schwächer.

### B – nullable Override, Satz immer dynamisch auflösen

`tax_rate_override NULL` bedeutet Standard. Wenige Felder, aber historische
Dokumente hängen ohne zusätzlichen Dokument-Snapshot an veränderlichen
Firmendaten; Reporting und PDF benötigen immer Auflösung. Fehleranfälliger.

### C – effektiver Snapshot plus Herkunftsflag (gewählt)

Dokument speichert den Standard, Position speichert effektiven Satz und
`tax_rate_overridden`. Dazu werden Netto/Steuer/Brutto als prüfbare Snapshots
gespeichert. Diese Variante ist eindeutig, historisch reproduzierbar,
reportingfreundlich und performant. Der geringe Speichermehrbedarf und die
Pflicht zur konsistenten Neuberechnung werden durch Constraints, zentrale
Domainfunktion und Finalisierungs-RPC kontrolliert.

## 6. Impact-Analyse

| Einstufung | Bereiche |
|---|---|
| zwingend erforderlich | DB-Spalten/Constraints/Migration, DB-Typen, Draft-Snapshot, Positions-Actions, Summen, Finalisierungs-RPC, Vorschau, PDF, Settings, i18n, Tests |
| wahrscheinlich betroffen und umgesetzt | Dokumentenliste/-detail (Brutto-Semantik), Pflichtgrenze 250 € brutto, PDF-Archiv-Neurendering nur für noch nicht archivierte Belege |
| prüfen bei Einführung | echte Duplizier-Action, Vorlagen, wiederkehrende Rechnungen, Reporting/Steuerexport, Gutschriften, Steuerbefreiungsgründe, E-Rechnung |
| nicht betroffen | Auth/OTP, Kundenerfassung, Nummernformat/-sequenz, PDF-Storage-Pfad, RLS-Firmenscope, Service-Übersetzungen, Offline-Platzhalter, Mapbox/Anthropic-Integrationen |

Der Index `(company_id, tax_rate)` unterstützt künftiges Steuerreporting. Es
werden keine personenbezogenen Daten geloggt. Cache-Revalidierung bleibt auf
dem bestehenden Create-Flow.

## 7. Umsetzungsplan und Status

1. **✓ Domain/Typen:** Satzunion, Rundung, Gruppen und DTOs. Akzeptanz: reine,
   deterministische Cent-Funktionen und keine Margenfelder im Kundendto.
2. **✓ Migration:** Snapshots, Summen, Constraints, Backfill, History-Trigger.
   Akzeptanz: historische finale Belege unverändert; Drafts neu gerechnet.
3. **✓ Repositories/Actions:** Standard übernehmen, Override setzen/zurücksetzen,
   jede Mutation neu berechnen. Akzeptanz: Client sendet Eingabe, nicht Ergebnis.
4. **✓ Finalisierung:** serverseitige Pflichtprüfung und autoritative SQL-
   Neuberechnung vor Nummernvergabe. Akzeptanz: direkter Action/RPC-Pfad kann
   keinen positionslosen oder inkonsistenten Beleg festschreiben.
5. **✓ UI/i18n:** Firmenstandard, echte Satzwahl, Server-Summen, DE/TR/AR.
   Akzeptanz: §19 erbt 0 %, erlaubt aber dieselben Overrides; RTL nutzt das
   bestehende logische Layout.
6. **✓ Vorschau/PDF/Detail:** Satz je Zeile, Steuergruppen, Netto/Brutto.
   Akzeptanz: gleiche Werte in UI und PDF; visuell auf A4 geprüft.
7. **✓ Verifikation:** Typecheck, ESLint, Vitest, Build und PDF-Rendercheck.

Deployment-Reihenfolge im Wartungsfenster: zuerst
`scripts/vat_line_items.sql`, unmittelbar danach `scripts/finalize_document.sql`,
dann Anwendung deployen. Vorher DB-Backup/Snapshot erstellen.

## 8. Testplan

| Ebene/Fall | Ausgangslage und Aktion | Erwartung |
|---|---|---|
| Unit 19/7/0 | Nettopreis/Menge berechnen | centgenaues Netto, Steuer, Brutto |
| Unit Rundung | 3,33 € × 1,50 @19 | 5,00 / 0,95 / 5,95 € |
| Unit gemischt | je eine Position 19/7/0 | drei sortierte Gruppen, korrekte Gesamtsumme |
| Unit §19 | §19-Draft ohne/mit Override | Standard 0 %; explizite 7/19 % bleiben erhalten |
| Unit Grenzen | 0-/Negativmenge, Negativpreis, >2 Nachkommastellen | stabiler Validierungsfehler |
| Action Standard | Position in neuen Draft einfügen | Satz=Dokumentstandard, Override=false |
| Action Override | Satz auf 7 setzen, dann Standard wählen | erst 7/true, danach Snapshotstandard/false |
| Action Änderung | Preis/Menge ändern | Zeile und Dokument vollständig neu gerechnet |
| Fremdleistung | Einkauf+Aufschlag einfügen | nur Nettoverkaufspreis besteuert; Einkauf/Marge nicht im DTO |
| Katalog | Service übernehmen, Service später ändern | Positionssnapshot und Satz bleiben unverändert |
| Finalisierung | Action direkt ohne UI aufrufen | vollständige Pflichtprüfung; bei Erfolg SQL-Neuberechnung und Nummer atomar |
| Status/History | finale Position ändern/löschen | DB-Trigger verweigert; Status/`paid_at` bleibt änderbar |
| Migration final | alter finaler Nicht-§19-Beleg | bisherige Summe und PDF reproduzierbar, 0-%-Snapshot |
| Migration Draft | alter Draft | Firmenstandard übernommen, alle Summen neu gerechnet |
| PDF gemischt | 5 Positionen, drei Sätze rendern | Satz je Zeile, Gruppen, Netto/Brutto, kein Überlauf |
| PDF §19 Standard | §19-Beleg ohne positiven Satz rendern | keine Steuerspalten/-gruppen, fester §19-Hinweis |
| PDF §19 Override | §19-Beleg mit 7/19-%-Position rendern | Steuerspalte/-gruppen, kein §19-Hinweis |
| i18n | Message-Parität | identische Keys DE/TR/AR |
| Regression | vollständige Suite/Build | bestehende Nummern-, PDF-, Legal-, Margen- und Kundenfälle grün |

Die reinen Domain-, Pflicht- und Regressionstests sind automatisiert. Die SQL-
Migration muss zusätzlich in einer Staging-Kopie mit echten anonymisierten
Daten und konkurrierender Doppel-Finalisierung ausgeführt werden, weil das Repo
keinen lokalen Postgres/Supabase-Integrationstest-Harness besitzt.

## 9. ASSUMPTIONs und Entscheidungen

### ASSUMPTION A – historische Nicht-§19-Belege

Vor der Änderung wurden auch Nicht-§19-Belege ohne Steuerwerte erzeugt. Es fehlt
die Information, ob alte Preise netto oder als Endpreise gemeint waren. Varianten:
rückwirkend 19 % aufschlagen oder unverändert einfrieren. Gewählt ist unverändert
mit 0-%-Snapshot, weil nur das den archivierten Beleg reproduziert. Überprüfung:
Staging-Migration gegen archivierte PDFs und Buchhaltungsexport abgleichen.

### ASSUMPTION B – Fremdleistung

Der Einkauf ist laut bestehendem Modell „inkl. MwSt“, der Auftrag verlangt aber,
dass Verkaufspreise netto gespeichert werden. Der bestehende Ergebniswert aus
Einkauf plus Aufschlag wird deshalb als Nettoverkaufspreis behandelt und erst
danach besteuert. Alternative wäre, ihn als Bruttoziel rückwärts zu entnetten;
das würde bestehende Margen-UX und Preise verändern. Überprüfung: Produkt/
Steuerberatung klärt, ob „Kunde zahlt“ künftig netto oder brutto eingegeben wird.

### ASSUMPTION C – 0 %

0 % wird als echter Nullsteuersatz (z. B. qualifizierte PV-Leistung nach §12
Abs. 3 UStG), nicht als allgemeine Steuerbefreiung modelliert. Daher gibt es
keinen automatischen Befreiungstext. Für steuerfreie Umsätze nach §4 UStG wäre
ein eigener Befreiungsgrund Pflicht und ein separates Modell nötig.

### ASSUMPTION D – Rundung

Gewählt ist Zeilenrundung statt einmaliger Gruppenrundung. Beide Verfahren
können Centdifferenzen erzeugen; Zeilenrundung passt zum vorhandenen
Positionssnapshot und macht PDF/DB reproduzierbar. Die UStDV erlaubt bei
maschineller Ermittlung eine Steuer-Gesamtsumme für gemischte Sätze, wenn der
Satz je Position angegeben wird; diese Implementierung zeigt zusätzlich die
Gruppen.

### Rechtliche Primärquellen

- [§ 12 UStG – 19 %, 7 % und Nullsteuersatz](https://www.gesetze-im-internet.de/ustg_1980/__12.html)
- [§ 14 UStG – Rechnungsangaben](https://www.gesetze-im-internet.de/ustg_1980/__14.html)
- [§ 19 UStG – Kleinunternehmer](https://www.gesetze-im-internet.de/ustg_1980/__19.html)
- [§ 32 UStDV – mehrere Steuersätze/maschinelle Ermittlung](https://www.gesetze-im-internet.de/ustdv_1980/__32.html)
- [§ 33 UStDV – Kleinbetragsrechnung bis 250 Euro](https://www.gesetze-im-internet.de/ustdv_1980/__33.html)

Die Anwendung unterstützt mit 0/7/19 nur die technische Satzwahl. Ob eine
konkrete Handwerkerleistung 7 oder 0 Prozent erfüllt, bleibt eine fachlich-
steuerliche Entscheidung des Unternehmens und ist keine automatische
Steuerberatung der Software.
