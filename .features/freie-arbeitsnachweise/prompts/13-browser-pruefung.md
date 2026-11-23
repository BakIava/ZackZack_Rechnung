# Paket 13: Reproduzierbare Browserprüfung

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Prüfe den vollständigen UI-Ablauf mit deterministischen synthetischen Antworten und ohne echten Provider oder produktive Kundendaten.

Nutze die in Paket 01 gefundene Testmöglichkeit. Wenn nötig ergänze einen eng begrenzten lokalen Test-Harness, der dieselben produktiven Komponenten verwendet und ausschließlich in Development/Test erreichbar ist. Kein frei erreichbarer Produktionsendpunkt mit Auth-/Draft-Bypass, keine neue NEXT_PUBLIC-Schalter-Hintertür. Testharness darf nicht als reale Persistenzprüfung ausgegeben werden.

Browserfälle: bestehende Tabelle; freie drei Tätigkeiten; Preise/Mengen korrigieren; unbekannte Einheit/Datum bestätigen; Material/Anfahrt; Summe nicht als Position; Import deaktiviert bis vollständig; erfolgreicher Import; gemeldeter Importfehler mit Eingaben; Doppelklick gesperrt; zuletzt gelesen und Neu-Lesen; Datei-/Providerfehler und manueller Ausweg.

Mindestens DE Desktop und AR Mobile visuell prüfen, TR ebenfalls bedienbar überprüfen. Screenshots mit synthetischen Daten unter test-results/ oder output/ ablegen; diese Verzeichnisse sind nicht aufzuräumen. Nutze vorhandenes Playwright passend. Browserwerkzeuge können fehlen; dann vorbereitete Tests so weit möglich ausführen und Blockade ausdrücklich protokollieren.

Abnahme: tatsächliche Testbefehle/Browsernachweise mit Ergebnis, Screenshots und Abdeckung aufführen. Wenn KI nur gemockt wurde, „echte OCR nicht geprüft“ festhalten. Eine externe Browserblockade bleibt eine offene Pflichtprüfung.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/14-abschluss-und-uebergabe.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
