# Zack Zack Rechnung

PWA-Grundgerüst für rechtssichere Rechnungen und Angebote (Kleinunternehmer §19 UStG).  
Bediensprache DE / TR / AR – erzeugte PDFs immer auf Deutsch.

## Schnellstart

```bash
cp .env.local.example .env.local   # Supabase-Keys eintragen
npm install
npm run dev
```

App: [http://localhost:3000/de](http://localhost:3000/de) (Standard-Locale)

Beispiel-PDF: [http://localhost:3000/api/pdf](http://localhost:3000/api/pdf)

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build (Webpack – wegen Serwist)
npm run preview      # Production-Build lokal ansehen (next start)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Unit-Tests (Rechnungsnummern, §19, Marge, i18n, PDF-DTO)
```

## Abweichungen von CLAUDE.md

`CLAUDE.md` beschreibt teils ein Remix/React-Router-Layout (`app/routes/`, `loader`/`action`/`meta`, `~/`-Alias). Dieses Projekt nutzt den **fixierten Tech-Stack Next.js 15 App Router**. Daher gilt die Next.js-Entsprechung:

| CLAUDE.md | Hier (Next.js) |
|---|---|
| `app/routes/flow/` | `app/[locale]/create/[step]/` |
| `loader` / `action` / `meta` | Server Components + Route Handler + `metadata` |
| `~/components/ui` | `@/components/ui` (Alias `@/*`) |
| `app/lib/`, `app/components/` | Root-`lib/`, `components/`, `hooks/` |

Alle **verbindlichen Code-Style- und Domänenregeln** (kein hartkodierter UI-Text, Geld als Cents, RTL über logische Properties, §19/Pflichtangaben/Marge in `lib/legal/`, Dokumentsprache immer DE) sind umgesetzt.

## Tech-Stack

| Bereich | Paket / Ort |
|---------|-------------|
| Framework | Next.js 15 App Router, TypeScript strict |
| UI | Tailwind CSS v4, shadcn/ui |
| i18n (UI) | next-intl unter `app/[locale]/` |
| Auth + DB | @supabase/ssr in `lib/supabase/` |
| PDF (Dokument) | @react-pdf/renderer in `lib/pdf/` |
| PWA | @serwist/next – Service Worker `app/sw.ts` |

## Projektstruktur

```
app/
  [locale]/           # UI-Routen mit Locale-Prefix (/de, /tr, /ar)
    dashboard/
    documents/
    create/[step]/
    customers/
    catalog/
    settings/
  api/
    pdf/              # PDF-Stream (Dokument immer DE)
    customers/        # Platzhalter – offline gecacht
    catalog/
    settings/
  sw.ts               # Serwist Service Worker
  ~offline/           # Offline-Fallback (ohne Locale)
components/
  demo/               # rtl-demo-card.tsx (+ .css, [dir="rtl"]-Demo)
  layout/             # AppNav, PlaceholderScreen
  ui/                 # Primitives + Barrel (index.ts)
                      #   Button, Input (touch), LangSwitch, StepHeader, AmpelCheck
hooks/
  useDocType.ts       # 'angebot' | 'rechnung'
i18n/                 # next-intl Routing + Navigation
lib/
  auth/actions.ts     # OTP-Gerüst (TODO)
  db/schema.ts        # Typen inkl. InvoiceNumberSequence
  document-locale.ts  # DOCUMENT_LOCALE = "de"
  money.ts            # formatCents (Geld = ganzzahlige Cents)
  legal/              # rechnungsnummer, mwst (§19), marge, pflichtangaben (+ Tests)
  katalog/            # mehrsprachig, dokumentName() immer DE (+ Test)
  store/              # Persistenz-Interface (TODO)
  pdf/                # invoice-document, sample-data (DTO, Cents), render-invoice
  supabase/
messages/             # de.json, tr.json, ar.json (+ Key-Parität-Test)
public/manifest.json
```

Datei-Limits (CLAUDE.md): Routen ≤ 400 LOC, Komponenten/Hooks/Utils ≤ 300 LOC – aktuell überall eingehalten.

## i18n & RTL

- **Routing:** `i18n/routing.ts` – Locales `de` (default), `tr`, `ar`
- **Middleware:** `middleware.ts` – Locale-Umleitung + Supabase Session-Refresh
- **RTL:** In `app/[locale]/layout.tsx` wird `dir="rtl"` für `ar` auf `<html>` gesetzt
- **Navigation:** `Link` aus `i18n/navigation.ts` (locale-aware)
- **Dokumente:** UI übersetzt via `messages/*.json`; PDF-Inhalt nutzt `DOCUMENT_LOCALE` (`lib/document-locale.ts`) – immer Deutsch

### Tailwind / RTL

Neue UI-Komponenten nur mit **logischen Properties**: `ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-` – **kein** `pl-`/`pr-`/`ml-`/`mr-`/`left-`/`right-`.

Demo: `components/demo/rtl-demo-card.tsx` – unter `/ar` spiegelt sich das Layout automatisch.

## PDF

- Route: `GET /api/pdf`
- Template: `lib/pdf/invoice-document.tsx` (Beispieldaten Yılmaz Malerbetrieb → Familie Schneider, §19-Hinweis)
- Rendering: `lib/pdf/render-invoice.tsx` via `renderToStream`

## Supabase (Gerüst)

| Datei | Zweck |
|-------|--------|
| `lib/supabase/client.ts` | Browser-Client |
| `lib/supabase/server.ts` | Server Components / Actions |
| `lib/supabase/middleware.ts` | Session-Refresh in Middleware |
| `lib/auth/actions.ts` | `sendLoginCode`, `verifyLoginCode`, `signOut` – TODO |

Env-Variablen: siehe `.env.local.example`

## Domänen-Logik (rechtssicher, in `lib/legal/`)

Die nicht verhandelbaren Regeln aus `CLAUDE.md` liegen als getestete, reine Funktionen vor:

| Datei | Regel |
|---|---|
| `rechnungsnummer.ts` | Lückenlose, fortlaufende Nummern; final erst beim Festschreiben |
| `mwst.ts` | §19-Hinweis automatisch, sobald keine MwSt. ausgewiesen wird |
| `pflichtangaben.ts` | Ampel-Check; Export erst bei vollständig grün |
| `marge.ts` | Einkauf/Marge strikt intern – nie im Dokument-DTO/PDF |
| `lib/katalog/types.ts` | `dokumentName()` liest immer `de`, nie die Übersetzung |

`lib/db/schema.ts` definiert `InvoiceNumberSequence` (pro `business_id` + `year` eine Zeile).  
Beim Finalisieren: Nummer in derselben Transaktion inkrementieren (`SELECT … FOR UPDATE`), damit die Folge lückenlos bleibt.

Tests: `npm run test` (Legal-, Katalog-, PDF-DTO- und i18n-Parität-Tests).

## PWA / Offline

- **Serwist** statt veraltetem next-pwa (Task 6) – Webpack-Build erforderlich (`npm run build` ohne Turbopack)
- **Manifest:** `public/manifest.json`
- **Offline-Seite:** `/~offline`
- **Caching:** In `app/sw.ts` – `/api/customers`, `/api/catalog`, `/api/settings` mit StaleWhileRevalidate

PWA lokal testen:

```bash
npm run build && npm start
# Service Worker ist in development deaktiviert (next.config.ts)
```

Optional: `SERWIST_SUPPRESS_TURBOPACK_WARNING=1` in `.env.local` wenn du `next dev --turbopack` nutzt.

## UI-Primitives (Barrel-Import)

Immer aus dem Barrel importieren: `import { Button, Input, LangSwitch, StepHeader, AmpelCheck } from "@/components/ui";`

- `Button` mit `size="touch"` → min. 48px Höhe
- `Input` mit `touch` Prop → min. 48px Höhe
- `StepHeader` – Schritt-Kopf mit Fortschritt (1/2/3), i18n + RTL-fest
- `AmpelCheck` – Pflichtangaben-Ampel, liest `AmpelItem[]` aus `lib/legal/pflichtangaben`
- `LangSwitch` – Sprachumschalter DE/TR/AR

UI-Text in Primitives kommt ausschließlich aus `messages/*.json`, nie hartkodiert.
