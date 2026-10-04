# Paket 1: Dokument-Renderer-Spike

Status: **angenommen – Variante A**  
Stand: 30. September 2026

## Fragestellung

Verglichen wurden:

- **A:** ein gemeinsamer `@react-pdf/renderer`-Baum für Browser-Vorschau und Node-PDF
- **B:** kanonisches HTML für die Vorschau und serverseitige HTML→PDF-Erzeugung mit Chromium

Die Untersuchung verändert weder den produktiven Create-Flow noch Finalisierung,
Archivierung oder die bestehende PDF-Route. Der neue Harness und seine API-Routen
antworten nur unter `NODE_ENV=development` und liegen zusätzlich hinter der
vorhandenen Session-Middleware. Der E2E-Login verwendet ausschließlich das bereits
vorhandene Dev-Test-Konto; es wurde keine neue Login-Ausnahme ergänzt.

## Bestehender Stand

### HTML-Vorschau

`DocumentA4` ist eine eigenständige HTML/CSS-Darstellung. Sie berechnet mehrere
Anzeigewerte selbst und verwendet nicht `buildPdfViewModel`. Das sichtbare Dokument
und das PDF teilen Labels und Formatierer, aber weder denselben Komponentenbaum noch
dasselbe Layoutsystem. Die HTML-Vorschau besitzt derzeit keine echte Seitenlogik;
sie ist ein fortlaufender Papierblock.

### React-PDF und Archiv

`DocumentPdf` verwendet `buildPdfViewModel`, React-PDF-Primitives und ein separates
React-PDF-Stylesheet. `renderDocumentPdfBuffer` registriert lokale Hanken-Grotesk-TTFs
und rendert im Node-Runtime-Pfad. Die produktive Route ist ausdrücklich
`runtime = "nodejs"` und `force-dynamic`.

Finalisierte Belege werden archiv-first behandelt: Die private Supabase-Ablage wird
zuerst gelesen; nur bei fehlendem oder leerem Archivobjekt wird neu gerendert und per
Service Role unter `<document-id>.pdf` gespeichert. Das archivierte Byteobjekt bleibt
damit der Beleg. Diese Kette wurde im Spike nicht geändert.

### Fonts und Logos

- Node lädt `HankenGrotesk-Regular.ttf` und `HankenGrotesk-Bold.ttf` per absolutem
  Dateipfad. `next.config.ts` nimmt den Fontordner per
  `outputFileTracingIncludes` in die produktive PDF-Funktion auf.
- Browser-React-PDF lädt im Harness exakt dieselben TTF-Dateien über eine
  authentifizierte, dev-only Route. Der gemeinsame Familienname liegt nun in einem
  Node-neutralen Modul; die produktive Node-Registrierung bleibt unverändert.
- Die produktive Logoaufbereitung akzeptiert nur URLs aus dem konfigurierten
  Supabase-Logo-Bucket, prüft Typ und Größe, rastert PNG/JPEG/SVG mit `sharp` und
  übergibt eine eingebettete Data-URL. Fehler oder fehlende Logos ergeben das
  Monogramm. Diese Aufbereitung bleibt serverseitig.

React-PDF unterstützt URL-Quellen im Browser und absolute Pfade in Node; registrierte
TTF/WOFF-Dateien und getrennte Gewichte sind offiziell vorgesehen
([React-PDF Fonts](https://react-pdf.org/docs/v4/fonts)).

## Praktischer Aufbau

Die Playwright-Infrastruktur startet Next auf `127.0.0.1:3100`, verwendet ein
Chromium-Projekt und meldet sich über den vorhandenen lokalen Dev-Test-Login an.
Der Harness rendert künstliche Daten ohne echte Kundeninformationen:

- ein einseitiges Dokument über `PDFViewer`
- ein 36 Positionen langes Dokument über `usePDF`
- Umlaute und türkische Zeichen: `Straße`, `Größe`, `Jürgen`, `Yılmaz`,
  `İstanbul`, `ş`, `ğ`, `ı`
- fehlendes Logo und damit den echten Monogramm-Fallback `YG`
- denselben Mehrseiter serverseitig über `renderToBuffer`
- dieselben Mehrseitendaten als `DocumentA4`, danach `page.pdf()` in Chromium

`PDFViewer` ist eine web-only iframe-Vorschau. `usePDF` stellt Blob, Blob-URL,
Ladezustand und Fehler bereit. Eine neue Dokumentinstanz rendert bei `usePDF` nicht
automatisch; der Harness ruft bei Prop-Änderungen bewusst `update(document)` auf,
wie es die API vorsieht
([React-PDF usePDF](https://react-pdf.org/docs/v4/hooks),
[On-the-fly rendering](https://react-pdf.org/docs/v4/advanced/on-the-fly-rendering)).

## Mess- und Sichtbefunde

Testumgebung: Windows, Node 26.5.0, Next 15.5.19,
`@react-pdf/renderer` 4.5.1, Playwright 1.63.0, Chromium 153.

| Kriterium | A: gemeinsames React-PDF | B: HTML→PDF-Spike |
|---|---|---|
| Harness erreichbar | Ja, nach echtem Dev-Test-Login | Ja, separate dev-only HTML-Fläche |
| Einseiter | 1 A4-Seite in Browser und Node | Nicht separat erzeugt; HTML-Mehrseiter war Gegenstand des Spikes |
| Mehrseiter | Browser 4 A4-Seiten, Node 4 A4-Seiten | Chromium 3 A4-Seiten |
| Live-Aktualisierung | 125,00 € → 135,00 €; neue Blob-URL und aktualisierte PDF-Textextraktion | DOM aktualisiert unmittelbar; PDF entsteht erst beim `page.pdf()`-Aufruf |
| Sonderzeichen | In Browser- und Node-PDF korrekt sichtbar und extrahierbar | Sichtbar und korrekt; der Harness lädt dieselben lokalen Hanken-Grotesk-TTFs |
| Logo-Fallback | `YG` korrekt im Browser-PDF; gemeinsamer `DocumentPdf`-Pfad | `YG` korrekt in HTML und Chromium-PDF |
| Browserfehler | Keine Console-Errors | Keine Console-Errors |
| Seitenbruch-Parität Browser/Server | Gleiche Seitenzahl; gerasterte Seiten 2 und 3 waren pixelidentisch (SHA-256). Seiten 1 und 4 unterschieden sich nur durch die absichtliche Preis-/Summenänderung. | Nicht identisch zum aktuellen React-PDF: 3 statt 4 Seiten |

Die erzeugten PDFs wurden mit `pdfinfo` geprüft und mit Poppler vollständig zu PNGs
gerendert. Die Font-Glyphen waren lesbar; es gab keine schwarzen Kästen, abgeschnittene
Sonderzeichen oder überlappende Tabellenzeilen.

Der native PDF-Plugin-Inhalt der `PDFViewer`-/iframe-Flächen wurde in Headless-
Chromium-Screenshots nur als graue Fläche gezeichnet. Die Blob-URLs waren erreichbar,
die PDFs selbst korrekt und mit Poppler visuell prüfbar. Das ist kein Renderfehler des
PDFs, aber eine Grenze automatischer Screenshot-Tests und ein Hinweis darauf, dass die
spätere Preview-UX nicht ungeprüft vom eingebauten PDF-Viewer jedes Zielbrowsers
abhängen sollte. `usePDF` erlaubt alternativ, den Blob an eine bewusst gewählte
Darstellung oder einen Download-Fallback zu geben.

### Gefundene Pagination-Probleme

Beide Varianten sind technisch mehrseitenfähig, aber der aktuelle lange Beleg ist
noch nicht layoutreif:

- **React-PDF:** Fortsetzungsseiten wiederholen den Tabellenkopf nicht. Die Summen
  landen allein auf Seite 4. Der als `fixed` markierte Footer erscheint in der
  gerenderten Folge nicht konsistent auf allen vier Seiten.
- **HTML→PDF:** Der `<thead>` wird auf Seite 2 wiederholt. Der gesamte Footer wird
  wegen `break-inside: avoid` jedoch auf eine fast leere dritte Seite verschoben.
- Die Varianten haben bereits mit identischen Daten unterschiedliche Seitenumbrüche
  (4 gegenüber 3 Seiten). Eine pixel- oder umbruchidentische Ausgabe ist ohne einen
  einzigen kanonischen Layoutpfad nicht erreichbar.

Diese Befunde sind eine Stop-Bedingung für Folgepakete, nicht ein Grund, sie im Spike
zu kaschieren.

## Laufzeit und Deployment

### A: React-PDF

- Der produktive Node-Pfad existiert bereits und benötigt keine neue
  Laufzeitabhängigkeit.
- Browser und Server verwenden denselben Layout- und PDF-Kern. Die Browserseite muss
  dynamisch geladen werden, damit Web-APIs nicht beim SSR gegen den Node-Export laufen.
- `PDFViewer` bettet den nativen Browser-PDF-Viewer ein. Für mobile Zielbrowser sind
  deshalb noch manuelle Geräteprüfungen oder eine definierte Viewer-/Download-
  Fallbackstrategie erforderlich.
- Browser-Rendering verlagert CPU- und Speicherarbeit auf das Endgerät. Vor einer
  produktiven Freigabe sind deshalb Messungen auf schwachen Android-Geräten sinnvoll.
- Für produktive Browser-Fontparität braucht es eine dauerhaft sichere, selbst
  gehostete Font-URL oder eingebettete Bytes; die Spike-Font-Route bleibt absichtlich
  dev-only.
- Ein echtes Firmenlogo wurde nicht getestet. Der Fallback ist belegt; für Bildlogos
  muss der Browser später dieselbe bereits aufbereitete Rasterdatei erhalten, nicht
  die serverseitige `sharp`-Pipeline nachbauen.

React-PDF dokumentiert Browser- und Server-Rendering ausdrücklich als unterstützte
Umgebungen und React 19/Next.js-Kompatibilität
([Quick start](https://react-pdf.org/docs/v4),
[Compatibility](https://react-pdf.org/docs/v4/compatibility)).

### B: HTML→PDF

- Der lokale Machbarkeitsnachweis mit Chromiums `page.pdf()` ist erfolgreich.
- Für Vercel reicht die neue Playwright-Dev-Dependency nicht aus. Produktion würde
  zusätzlich einen kompatiblen Chromium-Build in der Function oder einen externen
  Browserdienst benötigen.
- Eine Standard-Vercel-Node-Function hat ein Bundlelimit von 250 MB einschließlich
  Abhängigkeiten und Dateien. Vercel bietet inzwischen größere Functions bis 5 GB
  auf Fluid Compute als Public Beta an; das macht Browserautomation möglich, ändert
  aber Cold-Start-, CPU-, Speicher-, Kosten- und Betriebsrisiken
  ([Vercel Function limits](https://vercel.com/docs/functions/limitations),
  [Large Functions](https://vercel.com/changelog/vercel-functions-can-now-be-up-to-5-gb-in-package-size)).
- Alternativ wäre ein externer Browserdienst möglich. Das fügt Netzabhängigkeit,
  Datenschutzprüfung, Fehlerbehandlung und einen weiteren Betreiber in den
  Belegpfad ein.
- Der Spike belegt einen lokalen, deterministischen Fontpfad. Vor einem Einsatz
  wären zusätzlich paginierte Print-CSS, wiederholte Header/Footer,
  Browser-Versions-Pinning und ein Vercel-Preview-Deployment zwingend.

## Entscheidung

**Variante A wird weiterverfolgt:** Browser-Vorschau und serverseitiges PDF
verwenden denselben `DocumentPdf`-Baum aus `@react-pdf/renderer`.

Begründung:

1. Browser und Server haben praktisch dieselbe Seitenzahl und für unveränderte
   Seiten pixelidentische Ausgabe geliefert.
2. Prop-Änderungen lassen sich kontrolliert mit `usePDF.update()` live rendern.
3. Der rechtlich relevante Server-/Archivpfad bleibt unverändert und benötigt keine
   neue Produktionslaufzeit.
4. Die eingebetteten TTFs decken die Zielzeichen nachweislich ab.
5. HTML→PDF ist machbar, würde aber einen zusätzlichen Browserbetrieb auf Vercel
   oder extern sowie eine größere Neuentwicklung der Print-Pagination verlangen.

Die Entscheidung wurde am 30. September 2026 durch den Nutzer bestätigt. Variante B
bleibt als dokumentierte Alternative erhalten, wird aber nicht umgesetzt. Vor einer
produktiven Browser-Vorschau sind die lange Dokumentpagination (wiederholter
Tabellenkopf, konsistenter Footer, zusammenhängender Summenblock), ein echter
Bildlogo-Paritätstest und eine definierte Viewer-/Download-Fallbackstrategie zu
spezifizieren und zu testen.

## Abschluss in Paket 8

Die produktive Konsolidierung ist abgeschlossen: Schritt 2, Schritt 3, der
Download-Pfad und die Archivierung rendern denselben `DocumentPdf`-Baum mit
derselben expliziten Pagination. Der frühere `DocumentA4`-HTML-Pfad und die alte
Beispiel-PDF-Route wurden entfernt. Die obigen HTML→PDF-Ergebnisse bleiben als
Entscheidungsnachweis erhalten, sind aber nicht mehr als ausführbarer Produkt-
oder Testpfad im Repository vorhanden.

Die kontrollierte Pagination wiederholt den Tabellenkopf und Footer pro Seite,
hält jede Positionszeile zusammen und reserviert auf der Schlussseite Platz für
Summen, Rechtshinweis und Zahlungstext. Offen bleibt die bereits dokumentierte
manuelle Prüfung nativer PDF-Viewer auf schwachen mobilen Zielgeräten.

## Dauerhafte Befehle

```bash
npm run e2e:install
npm run e2e:package-01
npm run e2e
```

Der Paket-1-Test liegt in `e2e/package-01-renderer.spec.ts`. Playwright-Berichte,
Traces und Testartefakte sind absichtlich ignorierte lokale Ausgaben.
