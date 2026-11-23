# Freie Arbeitsnachweise im bestehenden Nachweis-Workflow

Stand: 23.11.2026. Dieses Verzeichnis dokumentiert die Umsetzung und Abnahme. Der aktuelle Stand steht in context.md.

## Ziel

Auch handschriftliche Kalender- und Baustellennotizen im vorhandenen Reiter „Nachweis“ lesen, prüfen und als freie Rechnungs- oder Angebotspositionen übernehmen. Der bestehende Stundentabellen-Workflow bleibt erhalten.

## Ein vollständiger Lauf

Den Inhalt von [start.md](start.md) als Auftrag in einem Codex-Chat mit diesem Checkout verwenden. Der Auftrag arbeitet alle 14 Dateien unter `prompts/` in numerischer Reihenfolge ab. Es sind keine 14 manuellen Starts vorgesehen. Die Ergebnisse des ausgeführten Laufs stehen in laufprotokoll.md.

1. [context.md](context.md): aktueller Stand, Architektur, Grenzen, Paketstatus und nächster Schritt.
2. [beispiele.md](beispiele.md): Bildbeobachtungen und Unsicherheiten.
3. [abnahme.md](abnahme.md): überprüfbare Fertig-Kriterien.
4. [entscheidungen.md](entscheidungen.md): Vorgaben und im Lauf getroffene Entscheidungen.
5. [laufprotokoll.md](laufprotokoll.md): ausgeführte Arbeit und tatsächliche Prüfergebnisse.
6. `prompts/01-…14-…`: konkrete Aufgaben mit Abnahmekriterien.

## Kontext aktuell halten

Jeder Paketprompt verpflichtet zum Lesen und Aktualisieren von `context.md`. Nach jedem Paket und vor einem Kontextwechsel werden Status, Dateipfade, neue Erkenntnisse, Prüfungen und der nächste konkrete Schritt gespeichert. Entscheidungen gehören zusätzlich in `entscheidungen.md`, Prüfergebnisse in `laufprotokoll.md`.

Das ist eine Arbeitsanweisung für den laufenden Agenten. Die Dateien aktualisieren sich nicht von selbst, wenn kein Agent daran arbeitet. Keine Hintergrundautomation erforderlich.

## Browserprüfung wiederholen

Die Prüfsuite startet einen lokalen Next-Development-Server und verwendet synthetische PDF-Dateien und Antworten. Mit installiertem Playwright-Chromium genügt:

```powershell
npx playwright test -c playwright.nachweis.config.ts --output test-results/nachweis-neuer-lauf
```

Alternativ vor dem Befehl `$env:PLAYWRIGHT_CHANNEL = 'chrome'` für ein installiertes Chrome setzen. Ein neuer Ausgabeordner erhält vorhandene Screenshots. Die Belege des abgeschlossenen Laufs stehen in abnahme.md.

## Festgelegter Umfang

- Ein Upload-Einstieg, interne Unterscheidung zwischen Stundentabelle und freien Notizen.
- Bei freien Notizen bearbeitbare Leistungspositionen mit Stunden, Mengen oder Pauschalen; Material und Anfahrt.
- Preise werden weiterhin vom Nutzer eingegeben. Keine automatische Übernahme oder Herleitung handschriftlicher Preise.
- Ein Datei-Upload je Lesevorgang; weitere Nachweise können nacheinander übernommen werden.
- Keine automatische Zusammenführung mehrerer Fotos oder Tage; kein neues Auftragsverwaltungssystem.
- Keine DB-Migration, kein Deployment, keine Commits, kein Versand, keine echten Kundenänderungen.
- Deterministische Tests ohne bezahlte KI-Aufrufe. Fehlende Live-Prüfungen ausdrücklich ausweisen.

Die fachlichen Vorgaben sind in `context.md` ausführlicher begründet. Neue Benutzeranweisungen und `AGENTS.md` bleiben maßgeblich.
