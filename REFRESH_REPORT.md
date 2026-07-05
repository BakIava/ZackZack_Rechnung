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

## Phase 2 — SAFE Cleanup (umgesetzt)

Jeder Block wurde einzeln mit Typecheck/Lint/Build/Test geprüft und committet.

| Commit | Inhalt |
|---|---|
| `e896030` | **Tote Platzhalter entfernt:** `components/flow/CreatePlaceholder.tsx` (+`.css`), `components/layout/placeholder-screen.tsx`. 0 Imports, durch reale Screens/Flow-Schritte ersetzt. |
| `0a70e66` | **Verwaiste Demo-Daten entfernt:** `lib/demo/customers-data.ts` (165 LOC), `lib/demo/documents-data.ts` (206 LOC). 0 Imports (repoweit verifiziert). `lib/demo/dashboard-data.ts` + `flow-data.ts` **bleiben** (noch in Gebrauch). |
| `719b738` | **2 Lint-Warnungen behoben:** `lib/dashboard/fetch.ts` (`userRes` per Array-Elision entfernt, `getUser()`-Aufruf bleibt); `components/setup/SetupWizard.tsx` (vestigiale Prop `onComplete` entfernt, Call-Site in `SetupFlow.tsx` angepasst). |

**Verhaltensneutralität:** alle Löschungen betreffen Dateien mit 0 eingehenden
Referenzen; die Lint-Fixes lassen jeden Laufzeit-Aufruf unverändert. Lint danach
**0 Warnungen** (vorher 2).

---

## Phase 3 — UI-/Helfer-Konsolidierung (konservativ umgesetzt)

| Commit | Inhalt |
|---|---|
| `8f3d9fd` | **`deriveInitials` vereinheitlicht** (4 funktional identische Kopien → `lib/initials.ts`): `customer-detail.tsx` (jetzt Re-Export), `NewCustomerModal.tsx`, `lib/customers/queries.ts`, `lib/documents/item-queries.ts`. |

**Warum genau diese eine Zusammenführung:** Alle vier Kopien liefern für jeden
Input **byteidentische** Ausgabe (verifiziert über Edge-Cases: mehrere Wörter,
ein Wort, führende/mehrfache Leerzeichen, leerer String). Reine Funktion, keine
neue Abstraktionsebene, passt zur bestehenden `lib/format.ts`/`lib/money.ts`-Konvention.

**Bewusst NICHT zusammengeführt (False Friends / Tabu):**

- **`toInitials`** (`lib/dashboard/fetch.ts`, `components/dashboard/sidebar.tsx`, 2×):
  andere Semantik — „erste Buchstaben der ersten **zwei Wörter**". Ergebnis weicht
  bei 3+-Wort- und Einwort-Namen ab (z. B. „Ali Veli Han" → `AV` statt `AH`;
  „Yılmaz" → `Y` statt `YI`). **Nicht** mit `deriveInitials` mischen.
- **`initialsOf`** (`lib/pdf/pdf-view-model.ts`, `components/create/document-a4.tsx`,
  `components/create/step3-main.tsx`, 3×): 2 Kopien identisch zu `deriveInitials`,
  **aber** eine (`step3-main.tsx`) ist ein False Friend (`toInitials`-Semantik),
  und eine liegt in **`lib/pdf/`** (Tabu — Änderungen dort brauchen Tests). Deshalb
  **komplett unangetastet**. Empfehlung: unter Review 2 der 3 auf `lib/initials`
  ziehen, die dritte bewusst getrennt lassen.

**Nicht zusammengeführte UI-Duplikate (feature-spezifisch, nicht identisch):**
Modals (`service-modal`, `NewCustomerModal`, `finalize-dialog`), Master-Detail
(catalog/customers), Empty-/Loading-States, sowie `SaveBar` (2× in
`settings-rechnung.tsx`/`settings-firma.tsx`) und `Field` (3×). Diese können sinnvoll
sein, sind aber je Fundstelle optisch/funktional zu prüfen → **REVIEW**, siehe
Empfehlungen.

---

## Phase 4 — Pattern-Angleichung (Ergebnis: keine sichere Angleichung nötig)

Die untersuchten „Muster" sind entweder bereits konsistent oder ihre Angleichung
wäre nicht verhaltensneutral:

- **Data-Fetching / Supabase-Client / Screen-Struktur:** bereits konsistent
  (siehe Phase-1-Tabelle F). Kein Handlungsbedarf.
- **`getCompanyId`** (5×, zwei unterschiedliche Rückgabe-Signaturen:
  `{companyId}|{error}` in Actions, `string|null` in Queries): auth-/RLS-nah,
  Signaturen **nicht** identisch → **nicht** angeglichen. Empfehlung unten.
- **Geld-Formatierung** `formatMoney` (`lib/format.ts`, 12 Nutzer) vs. `formatCents`
  (`lib/money.ts`, nur `lib/pdf/invoice-document.tsx`): `formatCents` lebt im
  **PDF/Legal-Pfad** (Tabu ohne Tests) → **nicht** angeglichen.
- **Datums-Helfer** `addDays`/`addDaysIso` (3×) betreffen Fälligkeitsdaten
  (rechtlich relevant) → **nicht** angefasst.

Ergebnis: In Phase 4 wurden **keine** Code-Änderungen vorgenommen (bewusst).

---

## Baseline vs. Endzustand

| Check | Baseline | Endzustand | Δ |
|---|---|---|---|
| `typecheck` | 0 Fehler | 0 Fehler | = |
| `lint` | 0 Fehler, **2 Warnungen** | 0 Fehler, **0 Warnungen** | ✅ −2 |
| `build` | grün | grün | = |
| `test` | 51 grün / 1 vorbestehender Fehler | 51 grün / 1 vorbestehender Fehler | = |
| gelöschte Dateien | — | 5 (3 tote Komponenten/CSS, 2 Demo-Daten) | −536 LOC toter Code |
| deduplizierte Funktion | — | `deriveInitials` (4→1) | −3 Kopien |

Commits (Reihenfolge, kein Squash):
`f0af445` (P0) · `7a6a646` (P1) · `e896030` `0a70e66` `719b738` (P2) · `8f3d9fd` (P3).

---

## Bewusst NICHT angefasst — mit Begründung & Empfehlung

1. **Demo-/Sandbox-Startseite `app/[locale]/page.tsx` + Cluster**
   (`components/demo/rtl-demo-card.tsx`+css, `components/layout/app-nav.tsx`,
   Route `app/api/pdf/route.ts`, sowie die UI-Primitives `Button`/`Input`/
   `LangSwitch`, die faktisch nur hier genutzt werden).
   *Begründung:* `/de` `/tr` `/ar` rendern diese Seite weiterhin — Entfernen
   erzeugt 404 = Verhaltensänderung.
   *Empfehlung:* Mit Freigabe entfernen (Seite ist eine Entwickler-Sandbox:
   „demoPdf", „rtlDemoTitle"). Dann fallen auch `AppNav`, `RtlDemoCard` und
   `/api/pdf` weg; die UI-Primitives-Nutzung sollte separat entschieden werden (2.).

2. **UI-Primitives `components/ui/` (`Button`, `Input`, `LangSwitch`, `StepHeader`,
   `AmpelCheck`, Barrel).**
   *Begründung:* In CLAUDE.md als **verbindliche** wiederverwendbare Primitives
   dokumentiert — die reale App nutzt sie aber kaum (Button/Input/LangSwitch nur in
   der Demo-Seite; `StepHeader`+`step-header.css` und `AmpelCheck` 0×).
   *Empfehlung / Grundsatzentscheidung nötig:* Entweder (a) die Primitives real
   ausrollen (dann rohe `<button>` schrittweise migrieren — **großes**, optisch
   riskantes Vorhaben, nur mit visueller Abnahme), **oder** (b) Primitives +
   Barrel + Demo-Seite entfernen und die reale „roh+CSS"-Konvention offiziell machen.
   Bis dahin unverändert gelassen.

3. **`lib/store/index.ts`** (abstrakte `Store`-Schnittstelle, „Implementierung folgt")
   und **`hooks/useDocType.ts`** — 0 Imports, aber **in CLAUDE.md als geplante
   Architektur dokumentiert**. Nicht gelöscht (könnte gewollte Baustein-Absicht sein).
   *Empfehlung:* Entweder implementieren/verdrahten oder als „nicht mehr geplant"
   entfernen — Team-Entscheidung.

4. **131 rohe `<button>` in 37 Dateien** statt `Button`-Primitive.
   *Begründung:* Migration ändert Optik/Verhalten (eigene CSS-Klassen). **RISKY.**
   *Empfehlung:* nur mit visueller Regressionsabnahme, komponentenweise. Siehe 2.

5. **Selektorgenaues totes CSS** in großen Feature-Stylesheets (`step2.css` 944,
   `step3.css` 991, `dashboard.css` 784, `settings.css` 795 …).
   *Begründung:* hohe False-Positive-Gefahr (dynamische `data-*`-Selektoren,
   Descendant/Attribut-Selektoren). *Empfehlung:* dediziertes Tooling
   (knip/PurgeCSS) unter Review; nicht blind entfernen.

6. **Ungenutzte Exports** (Scan meldete ~50, aber mit belegten False Positives, z. B.
   `updateSession` via Root-`middleware.ts`). *Empfehlung:* `knip`/`ts-prune`
   einführen und Ergebnisse manuell prüfen.

7. **Naming-Inkonsistenzen** (PascalCase vs. kebab-case Dateien; DE vs. EN Namen).
   *Begründung:* Umbenennen ändert Import-Pfade, zerstört `git blame`, riskant auf
   case-insensitiven FS. *Empfehlung:* eine Konvention festlegen und in einem
   dedizierten, gut getesteten PR pro Feature-Ordner umsetzen.

8. **`initialsOf`/`toInitials`/`getCompanyId`/`formatCents`/`addDays`-Duplikate** —
   siehe Phase 3/4: teils False Friends, teils Tabu-Pfade (PDF/Legal, Auth/RLS).
   *Empfehlung:* schrittweise unter Review konsolidieren, dabei die
   Semantik-Unterschiede (dokumentiert oben) strikt beachten.

9. **Verwaiste i18n-Keys `Placeholder.comingSoon`** (de/tr/ar) — nach Entfernen der
   Platzhalter-Komponenten ungenutzt. *Begründung:* i18n-Keys wurden per Vorgabe
   nicht angefasst (Parität bleibt gewahrt, `messages.test.ts` bleibt grün).
   *Empfehlung:* in allen drei Locales gemeinsam entfernen (Parität halten).

10. **Vorbestehender Testfehler** `lib/katalog/katalog.test.ts` (AR-Übersetzung
    `طلاء` vs. `دهان`). *Begründung:* Daten-/Erwartungs-Mismatch, kein
    Refactoring-Thema; Ändern wäre eine inhaltliche Entscheidung. *Empfehlung:*
    Sample-Daten oder Testerwartung angleichen (fachliche Klärung nötig).

11. **Keine** Dependency-Upgrades, **keine** `next.config`-Änderung, **keine**
    Schema/RLS/Migration/Geld-/Rechnungsnummern-/Snapshot-/§19-Änderung — wie vorgegeben.

## Offene Risiken / menschliches Review

- Grundsatzentscheidung UI-Primitives vs. „roh+CSS" (Punkt 2/4) — prägt viel Folgearbeit.
- Freigabe zum Entfernen der Demo-Startseite (Punkt 1).
- Initialen-/CompanyId-/Geld-Duplikate: Konsolidierung nur mit Beachtung der
  False-Friend-Semantik und der PDF/Auth-Tabus.

---

# LAUF 2 — Umsetzung klar sicherer Empfehlungen

Branch: `claude/codebase-consolidation-eut0tg` (Fortsetzung von Lauf 1; die Aufgabe
schlug `chore/codebase-refresh-2` vor, die Harness-Vorgabe dieser Session schreibt
aber den bestehenden Branch verbindlich vor — dort liegt auch der Stand aus Lauf 1).
Prinzip unverändert: **kein Verhalten ändern**.

## Lauf-2 Baseline (= Endzustand Lauf 1)

| Check | Ergebnis |
|---|---|
| `typecheck` | ✅ 0 Fehler |
| `lint` | ✅ 0 Fehler, 0 Warnungen |
| `build` | ✅ grün |
| `test` | 51 grün / 1 vorbestehender Fehler (`katalog.test.ts`, AR-Daten) |

## Phase 1 — Tote i18n-Keys (SAFE) — ✅ erledigt

- Entfernt: **kompletter `Placeholder`-Namespace** (`Placeholder.comingSoon`) aus
  `messages/de.json`, `tr.json`, `ar.json` — in allen drei Locales gemeinsam,
  Parität gewahrt.
- **Verifikation vor Löschung:** repoweit 0 Referenzen auf `Placeholder`/`comingSoon`
  (statisch **und** dynamisch). `comingSoon` war der einzige Key des Namespaces →
  ganzer Namespace entfernt.
- **False-Positive-Falle bewusst vermieden:** `Create.step1/step2/step3` sehen wie
  Kandidaten aus (kein `t("step2")` im Code), werden aber **dynamisch** über
  `FLOW_STEPS[].labelKey` in `FlowSteps.tsx` referenziert → **behalten**.
  `Create.title` wird 8× genutzt → behalten.
- JSON valide, `messages.test.ts`-Paritätstest grün, Typecheck grün, Tests unverändert.
- Commit: `cc36f83`
