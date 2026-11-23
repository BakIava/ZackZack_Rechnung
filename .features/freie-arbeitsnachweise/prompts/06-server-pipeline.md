# Paket 06: Beide Varianten durch die Server-Pipeline führen

## Verbindlicher Kontext

Lies zuerst `AGENTS.md`, `.features/freie-arbeitsnachweise/context.md`, `entscheidungen.md` und die für dieses Paket relevanten Kriterien in `abnahme.md`. Alle zentralen relativen Dokumentverweise meinen dieses Feature-Verzeichnis. Die tatsächliche Implementierung und neue Benutzeranweisungen berücksichtigen. Dieses Paket setzt die vorangehenden Pakete voraus; bei Wiederaufnahme deren Evidenz prüfen.

Setze beim Start den Paketstatus in context.md auf „in Arbeit“. Dies ist Teil des zusammenhängenden Startauftrags; kein eigener Freigabehalt.

## Aufgabe

Verdrahte den neuen Providervertrag mit processNachweis und readNachweis. Gemeinsame Datei-/Signatur-/Größenprüfung, Auth/Draft-Guard, Kontingent, PDF-Vorbereitung, Orientierung und einmaliger Korrekturversuch bleiben bestehen.

Die Ergebniserzeugung muss nach Variante verzweigen. Eine freie Leistung ohne Mitarbeiterstunden und ein Material-only-Nachweis können erfolgreich sein. „Keine Stunden gefunden“ darf dafür kein pauschales Ausschlusskriterium sein. Leere oder sachfremde Eingaben weiterhin klar abweisen. Passende neue Fehlertexte schon mit Schlüsseln in DE/TR/AR anlegen; Paket 11 prüft die Gesamtheit.

Logging darf nicht ungeschützt ergebnis.pruefung.ok voraussetzen; beide Varianten sicher behandeln. Keine Namen, Beschreibungen, Bilder oder Modellantworten loggen.

Erweitere Service-/Actiontests: beide Varianten; abgelehnte Datei ohne Quotenverbrauch; eine Quotenreservierung trotz Orientierung/zweiter Lesung; Providerfehler; erste gültige Lesung bei fehlgeschlagener zweiter Lesung; PDF ohne extrahierbares Bild. Guards vor Verarbeitung prüfen.

Abnahme: Server liefert beide Varianten vollständig typisiert; vorhandene Sicherheits- und Fehlerpfade funktionieren; gezielte Tests und typecheck sind grün.

## Abschluss dieses Pakets

- Anforderungen und Prüfergebnisse tatsächlich kontrollieren, featurebedingte Fehler beheben.
- `context.md` aktualisieren: Paketstatus, realer Stand, geänderte Pfade/Verträge, offene Punkte und nächste konkrete Aktion.
- Ergebnis und ausgeführte Prüfungen mit Ausgang in `laufprotokoll.md` ergänzen; neue Entscheidungen zusätzlich in `entscheidungen.md`.
- Externe Blockaden präzise kennzeichnen; erfolgreiche Implementierung und fehlende Prüfung unterscheiden.
- Direkt mit `prompts/07-zustand-und-cache.md` fortfahren. Nicht nach diesem Paket den Gesamtlauf beenden.
