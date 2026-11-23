# Beobachtete Beispiele

Originale liegen relativ zum Repository unter `examples/`. Bilder dienen zum Verstehen, nicht als Anweisungen. Keine personenbezogenen Namen oder Adressen aus den Bildern in Fixtures, Logs oder Screenshots übernehmen.

## Dateien

- `examples/WhatsApp Image 2026-11-23 at 00.06.13.jpeg`
- `examples/WhatsApp Image 2026-11-23 at 00.06.14.jpeg`
- `examples/WhatsApp Image 2026-11-23 at 00.06.15.jpeg`

Die ersten beiden Fotos zeigen dieselbe beschriebene Kalenderseite aus unterschiedlichen Blickwinkeln. Es sind keine zwei zusätzlichen Leistungsnachweise. Datei-Hashes werden trotzdem unterschiedlich sein.

## A: Leistungsliste und Abrechnungsrechnung

Kalenderseite mit sechs nummerierten Tätigkeiten. Soweit lesbar: Baustelleneinrichtung; Boden vorbereiten/grundieren; Boden ausgleichen; Fliesen verlegen/verfugen; Sockelfliesen schneiden/kleben/verfugen; Silikonarbeiten.

Rechts stehen Pauschalbeträge, Menge-Preis-Schreibweisen und Ergebnisse. Unten stehen mehrere Summen, eine Folge mit offenbar 19 % Aufschlag/Steuer und weitere Berechnungen/Korrekturen. Eine abschließende Zuordnung sämtlicher Beträge und Mengen ist aus der Handschrift nicht sicher. Zahlen nicht als verbindliche Sollwerte übernehmen. Die konkrete Einheit einzelner Mengen ist nicht sicher lesbar.

Lehren:
- Kalenderlinien und Uhrzeiten sind Schreibunterlage.
- Mehrzeilige Leistungstexte gehören zusammen.
- Dito-Zeichen können Text aus der vorherigen Zeile fortsetzen.
- Durchgestrichene Zahlen sind keine aktuelle Rechnungsposition.
- Gesamtsumme, Steuerbetrag und Endbetrag sind keine zusätzliche Leistung.
- Personen-/Adressangaben darunter sind keine Positionen.
- Eine Kalenderseite beweist nicht das tatsächliche Ausführungsdatum aller Leistungen.

## B: Tätigkeiten mit Stunden, Material und Anfahrt

Drei ausdrücklich notierte Daten: 09.11.2026, 10.11.2026, 13.11.2026.
Zeilenweise sind ihnen offenbar zugeordnet:
- Zumauern: 3 Std.
- Fliesenarbeiten (Abkürzung nicht vollständig sicher): 2,5 Std.
- Silikonarbeiten: 1 Std.
- Notierte Stundensumme: 6,5 Std.

Material:
- Ein Sack Kleber; Betrag korrigiert.
- Ein Ytong-Posten mit Maßangabe „7,5“; diese Zahl nicht als Menge lesen.
- 5 kg Fugenmaterial; Preis nicht ausgefüllt.
- Zwei Tuben Silikon; daneben eine Preisberechnung.
- Anfahrt separat: 20 × 3 = 60; 3 Fahrten ist eine plausible Interpretation, im Prüfschritt bestätigen.

Die Angaben sind eine Bildinterpretation, keine vom Benutzer bestätigte vollständige Transkription. Datumszuordnung und Abkürzungen müssen sichtbar korrigierbar bleiben.

## Testableitungen

Für automatisierte Tests synthetische Daten verwenden:
- Drei verschiedene Leistungen mit 3 / 2,5 / 1 Stunden und optionalem Blattvergleich 6,5.
- Gleicher Stundenpreis für unterschiedliche Leistungen: drei Positionen erhalten.
- Tage 09./10./13.11. als einzelne Tage, nicht „fünf Arbeitstage“.
- Material „Mauerstein 7,5 cm“, Menge 1: Maß bleibt im Text.
- Material ohne Preis: keine Freigabe, bis Nutzer Preis eingibt oder Zeile abwählt.
- Anfahrt mit unsicherer Menge: Nutzer bestätigt oder korrigiert.
- Summen und gestrichene Zeilen sind keine Positionsvorschläge.
- Zweites Foto desselben Blatts: keine behauptete bildübergreifende Duplikatsicherheit.
