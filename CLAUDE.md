# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt
**Zack Zack Rechnung** — PWA zur rechtssicheren Erstellung von Rechnungen und Angeboten für kleine Handwerksbetriebe.

Bediensprache **DE / TR / AR** (Arabisch mit RTL), Dokumentsprache **immer Deutsch**. Zielgruppe: Kleinunternehmer nach §19 UStG bis ~10 Mitarbeiter, oft nicht tech-affin, mit Sprachbarriere — Migranten in Deutschland mit A1/A2-Deutsch.

**Kernprinzip:** Bedienung in der eigenen Sprache, fertiges PDF auf Deutsch, Versand per WhatsApp/E-Mail oder Ausdruck.

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run preview      # Preview production build locally
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Unit tests (Rechnungsnummern, §19-Logik, Marge, i18n)
```

Node ≥22 required.

## Architektur

### PWA
Installierbar und offline-fähig (Baustelle = schlechtes Netz). Service Worker cached App-Shell, Stammdaten, Katalog, Kunden. Schreibvorgänge (neue Rechnung) müssen offline funktionieren und bei Verbindung synchronisieren — **fortlaufende Rechnungsnummern erst final beim Festschreiben vergeben**, nicht beim Anlegen des Entwurfs.

### Routing
Geführter 3-Schritt-Flow statt überladener Formulare:

```
Schritt 1 Kunde → Schritt 2 Positionen → Schritt 3 Vorschau/Versand
```

Rechnung und Angebot teilen denselben Flow, unterschieden durch einen Schalter (`docType: 'angebot' | 'rechnung'`).

### Key files

| Datei | Zweck |
|---|---|
| `app/lib/i18n/` | Übersetzungen DE/TR/AR + RTL-Steuerung. **Quelle der Wahrheit für UI-Text.** |
| `app/lib/pdf/` | Serverseitiger PDF-Generator, sauberes A4-Layout, **immer Deutsch** |
| `app/lib/legal/pflichtangaben.ts` | Pflichtangaben-Check + §19-Hinweis |
| `app/lib/legal/rechnungsnummer.ts` | Lückenlose, fortlaufende Nummernvergabe |
| `app/lib/katalog/` | Leistungskatalog: deutscher Begriff + Übersetzung, Einheit, Preis |
| `app/lib/store/` | Persistenz für Stammdaten, Katalog, Kunden, Dokumente |
| `app/routes/flow/` | Kern-Flow (3 Schritte) |

## Domänen-Logik

### §19 Kleinunternehmer (Default)
- §19-Betriebe sind **dauerhaft von der E-Rechnungs-Ausstellungspflicht befreit** → reiner PDF-Export ist und bleibt zulässig. ZUGFeRD/XRechnung sind **nicht** MVP.
- §19-Hinweis kommt **automatisch** aufs Dokument, wenn kein MwSt. ausgewiesen wird.
- MwSt. ist **opt-in pro Rechnung**, nicht die Norm. Default lebt in den Einstellungen (§19), pro Rechnung in Schritt 2 überschreibbar.
- Bei aktivierter MwSt.: Positionen default 19 %, pro Position auf 7 % umstellbar. Dokument zeigt dann Netto/Steuer/Brutto-Aufschlüsselung statt §19-Variante.

### Mehrsprachiger Katalog-Trick
Handwerker wählt Position in seiner Sprache (z.B. „Duvar boyama"), aufs Dokument kommt **immer der deutsche Begriff** („Malerarbeiten Wandfläche"). Jeder Katalogeintrag: `{ de: string, übersetzungen: Record<Lang, string>, einheit, preis }`. **Dokument-Rendering liest nie das übersetzte Feld.**

### Fremdleistung mit Marge
- Einkaufspreis (inkl. MwSt) + Aufschlag in % oder € → ergibt Verkaufspreis.
- **Nur der Verkaufspreis erscheint auf dem Dokument.** Einkauf und Marge bleiben strikt intern — niemals in PDF-Generator oder Dokument-DTO durchreichen.

### Pflichtangaben
Automatischer Check **vor Export** (Ampel): Aussteller, Empfänger, Steuernr., Datum, Leistung, Betrag, fortlaufende Nummer, §19-Hinweis (falls zutreffend). Export erst möglich, wenn vollständig.

## Mehrsprachigkeit & RTL

- **Kein hartkodierter UI-Text.** Immer über `app/lib/i18n/`.
- Arabisch braucht volles RTL-Layout (`dir="rtl"`), nicht nur übersetzte Strings — Spiegelung von Layout, Icons mit Richtung, Eingabefeldern.
- RTL **früh** an einem Screen verifizieren, nicht am Ende.
- Dokumentinhalt (PDF) bleibt **immer LTR/Deutsch**, unabhängig von der Bediensprache.

## Design

Designprinzipien: **große Buttons, viel Icon/wenig Text, fehlertolerant, geführte Schritte, echte Beispieldaten** statt Platzhalter (z.B. „Yılmaz Malerbetrieb", „Familie Schneider").

- Mobile-first, aber Desktop-Layouts ebenfalls erforderlich.
- Große Touch-Targets, vertrauenswürdiger Ton.
- Latin- und Arabisch-Schrift müssen sauber rendern.

## Phase 2 (bewusst NICHT im MVP)
KI-Eingabe (Sprache/Text → Rechnungsentwurf, Preise nur aus Katalog), OCR für Fremdangebote, Angebotsstatus, Abschlags-/Schlussrechnung, Zahlungsstatus/Mahnungen, §19-Grenzwarnung (25.000 €/100.000 €), GoBD-Archivierung, ZUGFeRD/XRechnung, SMS-Login, Bankanbindung (PSD2/XS2A). **Nicht ohne ausdrückliche Freigabe implementieren.**

---

## Code Style

Diese Regeln gelten verbindlich für alle neuen und geänderten Dateien. Bearbeitest du eine Datei, die dagegen verstößt, strukturiere sie im selben Zug um — ohne nachzufragen.

### Dateilängen-Limits

| Dateityp | Max. Zeilen |
|---|---|
| Route-Dateien (`app/routes/`) | 400 LOC |
| Komponenten, Hooks, Utils | 300 LOC |

Überschreitet eine Datei das Limit: erst auslagern, dann das Feature implementieren.

### Ordnerstruktur

Komponenten nach Feature gruppieren. Jede Komponente bekommt eine eigene `.css`-Datei im selben Ordner.

```
app/
  components/
    flow/
      KundeStep.tsx
      KundeStep.css
      PositionenStep.tsx
      PositionenStep.css
      VorschauStep.tsx
      VorschauStep.css
    katalog/
      KatalogPicker.tsx
      KatalogPicker.css
    ui/                  # wiederverwendbare Primitives (Barrel-Export)
  hooks/
    useDocType.ts
  lib/
    i18n/
    pdf/
    legal/
    katalog/
    store/
```

`app/styles/app.css` enthält nur globale Resets, CSS-Variablen, RTL-Basis und Tailwind-Basis — **kein komponentenspezifisches CSS**.

### CSS
- **Kein inline-Style.** Immer Tailwind-Klassen oder eigene CSS-Datei.
- Tailwind für Layout, Spacing, Typografie.
- Eigene CSS-Klassen für komplexe Hover-/Animationslogik.
- CSS-Datei direkt in der Komponente importieren.
- **RTL nie per inline-Style** — über `[dir="rtl"]`-Selektoren oder logische Properties (`margin-inline-start` statt `margin-left`).

```tsx
// ✅
<div className="flex gap-4 items-center katalog-picker__list">

// ❌
<div style={{ display: 'flex', gap: '16px' }}>
```

### TypeScript
Jede neue Komponente braucht ein explizites Props-Interface, direkt über der Komponente. **Keine `any`-Types.**

```tsx
interface PositionenStepProps {
  positionen: Position[];
  mwstAktiv: boolean;
  onChange: (next: Position[]) => void;
}

export function PositionenStep({ positionen, mwstAktiv, onChange }: PositionenStepProps) {
  // ...
}
```

Geld immer als ganzzahlige Cents (`number`, kein Float-Euro). Beträge erst bei der Anzeige formatieren.

### Route-Dateien
Reihenfolge innerhalb einer Route-Datei:

1. Imports
2. Types / Interfaces
3. `loader` / `action`
4. `meta`-Export
5. Default-Export (schlanke Hauptkomponente, delegiert an Subkomponenten)

JSX-Blöcke >40 Zeilen → eigene Komponente in `app/components/<feature>/`.

---

## Wiederverwendbare UI-Primitives

Basis-Komponenten liegen in `app/components/ui/` und werden **immer aus dem Barrel** importiert:

```ts
import { Button, StepHeader, AmpelCheck, LangSwitch } from '~/components/ui';
```

Diese Muster **nicht inline nachbauen**:

| Statt handgeschrieben | benutze |
|---|---|
| großer Touch-Button mit Icon + Label | `<Button variant size icon>` |
| Schritt-Kopf mit Fortschritt (1/2/3) | `<StepHeader step total title>` |
| Ampel-Pflichtangaben-Block | `<AmpelCheck items />` |
| Sprachumschalter DE/TR/AR | `<LangSwitch />` |

**Regeln:**
- UI-Text in Primitives kommt aus `i18n`, nie hartkodiert.
- Primitives müssen RTL-fest sein (logische Properties).
- Prop-Erweiterungen optional & abwärtskompatibel.

---

## Rechtssicherheit — harte Regeln

Diese Punkte sind **nicht verhandelbar** und in Tests abgesichert:

1. Rechnungsnummern fortlaufend und **lückenlos**, final erst beim Festschreiben.
2. §19-Hinweis automatisch, sobald keine MwSt. ausgewiesen wird.
3. Pflichtangaben-Check muss vor jedem Export grün sein.
4. Einkaufspreis/Marge erscheinen **niemals** im Dokument-DTO oder PDF.
5. Dokumentsprache **immer Deutsch**, unabhängig von der Bediensprache.

Änderungen an `app/lib/legal/` oder `app/lib/pdf/` brauchen begleitende Tests.

## DSGVO
Aufnahmen/KI-Eingaben (Phase 2) und personenbezogene Kundendaten sparsam halten, Verarbeitungsort dokumentieren. Keine personenbezogenen Daten in Logs.

## Vor jedem Commit
`npm run typecheck`, `npx eslint` und `npm run build` müssen grün sein. Tests für `legal/` und `pdf/` ausführen.
Commits atomar halten — **CSS-Änderungen von Komponenten-Änderungen trennen**, i18n-Änderungen separat.