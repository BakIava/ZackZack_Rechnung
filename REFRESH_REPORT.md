# REFRESH_REPORT — Codebase-Konsolidierung

Branch: `claude/codebase-consolidation-eut0tg`
Datum: 2026-07-04
Prinzip: **Kein Verhalten ändern.** Reines Refactoring + Cleanup.

> **Hinweis zum Branch-Namen:** Die Aufgabe schlug `chore/codebase-refresh` vor.
> Die Harness-Vorgaben dieser Session schreiben jedoch den Branch
> `claude/codebase-consolidation-eut0tg` verbindlich vor. Es wird daher auf
> dem vorgegebenen Branch gearbeitet.

---

## Phase 0 — Baseline (Ausgangszustand)

Node: v22.22.2 · Next.js 15.5.19 · React 19.1.0

| Check | Ergebnis |
|---|---|
| `npm run typecheck` | ✅ 0 Fehler |
| `npm run lint` | ⚠️ 0 Fehler, **2 Warnungen** |
| `npm run build` | ✅ erfolgreich (mit denselben 2 Lint-Warnungen) |
| `npm run test` | ❌ **1 fehlgeschlagen**, 51 bestanden (52 gesamt) |

### Lint-Warnungen (Baseline)
1. `components/setup/SetupWizard.tsx:27` — `'onComplete' is defined but never used`
2. `lib/dashboard/fetch.ts:44` — `'userRes' is assigned a value but never used`

### Test-Fehler (Baseline, **vorbestehend** — nicht durch dieses Refactoring verursacht)
- `lib/katalog/katalog.test.ts` → „shows the operating language in the UI"
  erwartet AR `دهان الجدران`, Sample-Daten liefern `طلاء الجدران`.
  Das ist ein Daten-/Test-Mismatch, der schon vor Beginn bestand. **Nicht angefasst**
  (Änderung an Sample-Daten oder Test wäre eine Verhaltens-/Erwartungsänderung).

Diese Zahlen sind der Vergleichsmaßstab für den Endzustand.

> **Hinweis:** `CLAUDE.md` beschreibt eine Remix/React-Router-Struktur
> (`app/routes/flow/`, `loader`/`action`, `app/lib/…`). Die tatsächliche Codebase
> ist **Next.js 15 App Router** (`app/[locale]/…`, Server Actions, `lib/…`).
> Ich habe mich an der **tatsächlichen** Codebase-Konvention orientiert, nicht an
> der (teils veralteten) CLAUDE.md-Beschreibung. Wo CLAUDE.md eine *bewusst
> geplante* Struktur dokumentiert (UI-Primitives-Barrel, `lib/store`, `useDocType`),
> habe ich das als **Absicht** gewertet und nicht gelöscht — siehe unten.

---

## Phase 1 — Inventur (Analyse, nichts geändert)

Methodik: Referenz-Analyse per `grep` über `app/ components/ lib/ hooks/ messages/`
(Import-Pfade, Symbolnamen, dynamische Referenzen). Ergänzt durch Lint/Build.
**Risiko-Kategorien:** `SAFE` = mechanisch/verhaltensneutral · `REVIEW` = Urteil nötig ·
`RISKY` = Verhalten könnte kippen.

### A. Toter Code — ganze Dateien (0 eingehende Imports, verifiziert)

| Datei | Was | Beleg | Kategorie | Aktion |
|---|---|---|---|---|
| `components/flow/CreatePlaceholder.tsx` + `.css` | Platzhalter für „noch nicht umgesetzte" Flow-Schritte 2/3 | Schritte 2/3 sind real umgesetzt (`components/flow/step2-*`, `components/create/step3-*`); 0 Imports | **SAFE** | Entfernen (Phase 2) |
| `components/layout/placeholder-screen.tsx` | Generischer „comingSoon"-Screen | Alle Screens (dashboard/documents/customers/catalog/settings) real umgesetzt; 0 Imports | **SAFE** | Entfernen (Phase 2) |
| `lib/demo/customers-data.ts` (165 LOC) | Verwaiste Demo-Kundendaten | 0 Imports (Kunden laufen über Supabase `lib/customers/queries.ts`) | **SAFE** | Entfernen (Phase 2, eigener Commit) |
| `lib/demo/documents-data.ts` (206 LOC) | Verwaiste Demo-Dokumentdaten | 0 Imports (Dokumente laufen über Supabase) | **SAFE** | Entfernen (Phase 2, eigener Commit) |
| `lib/store/index.ts` | Abstrakte `Store`-Schnittstelle, „Implementierung folgt", TODO | 0 Imports; **in CLAUDE.md als geplante Architektur dokumentiert** | **REVIEW** | **NICHT** löschen — Empfehlung |
| `hooks/useDocType.ts` | Ungenutzter Hook | 0 Imports; **in CLAUDE.md als `app/hooks/useDocType.ts` dokumentiert** | **REVIEW** | **NICHT** löschen — Empfehlung |

### B. UI-Primitives — vorhanden, aber praktisch ungenutzt

`components/ui/` (Barrel `index.ts`) exportiert `Button`, `buttonVariants`, `Input`,
`LangSwitch`, `StepHeader`, `AmpelCheck`. CLAUDE.md schreibt diese als **verbindliche
wiederverwendbare Primitives** vor. Tatsächliche Nutzung:

| Primitive | Import-Stellen | Bemerkung |
|---|---|---|
| `Button` / `buttonVariants` | **nur** `app/[locale]/page.tsx` | Demo-Seite (siehe C) |
| `Input` | **nur** `app/[locale]/page.tsx` | Demo-Seite |
| `LangSwitch` | **nur** `app/[locale]/page.tsx` | Demo-Seite |
| `StepHeader` (+`step-header.css`) | **0** | völlig ungenutzt |
| `AmpelCheck` | **0** | völlig ungenutzt |

→ Die **echten** Screens nutzen alle rohe `<button>` + komponenteneigenes CSS
(37 Dateien, 131 `<button>`-Vorkommen). Der `Button`-Primitive lebt faktisch nur
in der Demo-Seite. **Kategorie REVIEW** (dokumentierte Absicht vs. Realität) —
nicht angefasst, siehe „Duplizierte UI" und Empfehlungen.

### C. Demo-/Sandbox-Cluster (erreichbare Route → Entfernen wäre Verhaltensänderung)

`app/[locale]/page.tsx` (`HomePage`) ist eine Entwickler-/Design-Sandbox:
Demo-Input, „demoPdf"-Link auf `/api/pdf`, `RtlDemoCard`. Die Middleware leitet
`/` → `/{locale}/login`, **aber** ein direkter Aufruf von `/de` `/tr` `/ar`
rendert diese Seite weiterhin. Sie ist alleiniger Konsument von:

- `components/demo/rtl-demo-card.tsx` + `.css`
- `components/layout/app-nav.tsx` (`AppNav`)
- den UI-Primitives aus B (`Button`, `Input`, `LangSwitch`)
- der API-Route `app/api/pdf/route.ts`

**Kategorie REVIEW/RISKY** — Entfernen macht `/de` etc. zu 404 (Verhaltensänderung).
**Nicht angefasst.** Empfehlung: mit Freigabe entfernen (siehe unten).

### D. Totes CSS

- Ganze CSS-Datei tot: `components/flow/CreatePlaceholder.css` (an tote Komponente
  gebunden) → **SAFE**, wird mit der Komponente entfernt.
- `components/ui/step-header.css` (an ungenutzten `StepHeader` gebunden) → **REVIEW**
  (Primitive, siehe B), nicht angefasst.
- **Selektor-genaues totes CSS** in lebenden `.css`-Dateien (z. B. große
  Feature-Stylesheets `step2.css` 944, `step3.css` 991, `dashboard.css` 784,
  `settings.css` 795): **NICHT** automatisch entfernt. Grund: hohe
  False-Positive-Gefahr (dynamische `data-state`/`data-*`-Selektoren,
  Descendant-/Attribut-Selektoren, klassenweise erzeugte Namen). **RISKY** →
  Empfehlung: dediziertes Tooling (PurgeCSS/knip) unter menschlichem Review.

### E. Duplizierte UI

| Muster | Fundstellen | Bewertung |
|---|---|---|
| **Buttons** | `Button`-Primitive: 1×; rohe `<button>`+CSS: 37 Dateien / 131 Stellen (u. a. `components/flow/step2-main.tsx`, `components/customers/customer-detail.tsx`, `components/settings/*`, `components/setup/*`) | Vorherrschend = **roh+CSS**. Migration auf Primitive würde Optik/Styles ändern → **RISKY**, nicht zusammengeführt. |
| **Modals/Dialoge** | `components/catalog/service-modal.tsx`, `components/customers/NewCustomerModal.tsx`, `components/create/finalize-dialog.tsx` + inline in `catalog-master-detail.tsx`, `customers-master-detail.tsx`, `customer-detail.tsx`, `flow/KundeStep.tsx`, `flow/step2-main.tsx` | Funktional **unterschiedlich** (Service-Editor vs. Kunden-Formular vs. Finalisieren-Bestätigung). Kein gemeinsames `Modal`-Primitive. Nicht identisch → **nicht** zusammengeführt (REVIEW). |
| **Master-Detail** | `components/catalog/catalog-master-detail.tsx` (646 CSS), `components/customers/customers-master-detail.tsx` | Parallele, aber **feature-spezifische** Umsetzungen. Nicht identisch → nicht zusammengeführt. |
| **Empty-/Loading-States** | verstreut inline in ~13 Komponenten | Kein gemeinsames Primitive; jeweils leicht anders. REVIEW/RISKY → dokumentiert, nicht vereinheitlicht. |

### F. Inkonsistente Patterns (Ergebnis: überwiegend bereits konsistent)

| Bereich | Varianten | Vorherrschend / Befund |
|---|---|---|
| Data-Fetching | Server Components + `lib/*/queries.ts` + Server Actions (`'use server'`, 10 Dateien) **vs.** Route Handler `app/api/*` | Vorherrschend = Server Components/Actions. Die `app/api/{catalog,customers,settings}/route.ts` werden von **keinem** Client-`fetch` aufgerufen — sie sind laut ihren eigenen Kommentaren **absichtliche Offline-Cache-Platzhalter** (Serwist/`app/sw.ts`). **Kein** Handlungsbedarf, keine Inkonsistenz zum Angleichen. |
| Supabase-Client | `lib/supabase/server` (17×, serverseitig), `lib/supabase/client` (1×, Client-Komponente `documents-main.tsx`), `admin` (2×), `middleware` (root) | **Konsistent** — je nach Kontext korrekt. Kein Handlungsbedarf. |
| Screen-Struktur | `*-screen.tsx` / `*-main.tsx` / `*-master-detail.tsx` | Durchgängige interne Konvention (Screen = Shell/Desktop-Layout, Main = Inhalt). **Konsistent.** |

### G. Naming-Inkonsistenzen (dokumentiert, **nicht** umbenannt)

- **Datei-Casing gemischt:** PascalCase (`KundeStep.tsx`, `FlowSteps.tsx`,
  `NewCustomerModal.tsx`, `AppShell.tsx`, `Setup*.tsx`) vs. kebab-case
  (`catalog-picker.tsx`, `position-editor.tsx`, `customer-detail.tsx`,
  `step2-main.tsx`, `doc-detail.tsx`).
- **Sprachmix in Namen:** Deutsch (`KundeStep`, `step2`, `positionen`) vs. Englisch
  (`customer-detail`, `doc-detail`, `dashboard-main`).
- **Bewertung:** Umbenennen ändert Import-Pfade und zerstört `git blame`/History;
  auf case-insensitiven Dateisystemen (macOS) sogar riskant. **RISKY** →
  Empfehlung, nicht ausgeführt.

### H. Unused Exports (Scan durchgeführt, **bewusst nicht** mechanisch bereinigt)

Ein Symbol-Referenz-Scan über `lib/` meldete ~50 „ungenutzte" Exports — jedoch mit
**belegten False Positives** (z. B. `updateSession` aus `lib/supabase/middleware.ts`
wird von der Root-`middleware.ts` genutzt, die außerhalb `app/components/lib` liegt;
diverse Typen werden über Inline-`import type` referenziert). Ein zuverlässiger
Abbau ungenutzter Exports braucht dediziertes Tooling (`knip`/`ts-prune`) mit
menschlicher Prüfung. **RISKY/REVIEW** → Empfehlung, nicht ausgeführt.

### Risiko-Zusammenfassung

- **SAFE (in Phase 2 umgesetzt):** tote Placeholder-Komponenten (+CSS), verwaiste
  Demo-Daten-Dateien, 2 Lint-Warnungen.
- **REVIEW (dokumentiert, nicht angefasst):** UI-Primitives vs. Realität (B),
  Demo-Sandbox-Cluster (C), Modal-/Master-Detail-Duplikate (E), `lib/store`,
  `useDocType`.
- **RISKY (dokumentiert, nicht angefasst):** Button-Migration, selektorgenaues
  totes CSS, Datei-Umbenennungen, Unused-Export-Abbau.

---
