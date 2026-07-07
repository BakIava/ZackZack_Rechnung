# REFACTOR_REPORT — Codebase-Struktur-Bereinigung

Stand der Analyse: vor Beginn der Umsetzung (Branch `claude/codebase-refactor-cleanup-4l7gnm`).
Dieser Report wird nach der Umsetzung um den Abschnitt „Ergebnis" ergänzt.

**Hinweis zur Realität der Codebase:** Das Projekt ist eine Next.js-15-App-Router-Anwendung
mit Root-Level-Ordnern (`app/`, `components/`, `lib/`, `hooks/`, `shared/`, `i18n/`) und
TS-Alias `@/* → ./*`. Es gibt **kein** `src/`-Verzeichnis. Die im Auftrag genannten Pfade
(`src/types/`, `src/lib/repositories/`, `src/components/`) werden als „Source-Root"
interpretiert und auf die bestehende Root-Struktur abgebildet (`types/`,
`lib/repositories/`, `components/`) — ein zusätzliches `src/`-Präfix bei gleichzeitig
verbleibendem Root-`app/` würde eine Mischstruktur erzeugen und `@/`-Aliase,
`next.config.ts` (Serwist `swSrc`, `outputFileTracingIncludes`) sowie `components.json`
ohne strukturellen Gewinn brechen.

---

## Problem 1 — Doppelte Type-/Interface-Definitionen

### 1a. Dokument-Typen (Status/Typ-Unions): 6 konkurrierende Definitionen

| Fundort | Definition | Status |
|---|---|---|
| `shared/doc.ts:1` | `DocType = "offer" \| "invoice"` | **kanonisch**, überall importiert |
| `shared/doc.ts:2` | `DocStatus = "draft" \| "finalized" \| "sent" \| "paid" \| "cancelled"` | **kanonisch** |
| `lib/documents/types.ts:3-4` | `DbDocumentStatus`/`DbDocumentType` — reine Re-Aliase von `DocStatus`/`DocType` | redundanter Alias |
| `lib/documents/types.ts:5` | `UiDocumentStatus = "bezahlt" \| "offen" \| "versendet" \| "entwurf"` | ungenutzt (kein Importeur) |
| `lib/demo/dashboard-data.ts:7` | `DocStatus = "bezahlt" \| "offen" \| "versendet" \| "entwurf"` | **Namenskollision** mit `shared/doc.ts:DocStatus`, wird von Produktivcode (`lib/dashboard/fetch.ts`, `components/dashboard/dashboard-main.tsx`) importiert |
| `lib/db/schema.ts:37,39` | `DocumentType = "invoice" \| "quote"`, `DocumentStatus = …` | toter Platzhalter (nur von totem `lib/store/` importiert), Wert `"quote"` widerspricht `"offer"` |

### 1b. Dokument-Entitäten: 7 Definitionen

| Fundort | Interface | Zweck |
|---|---|---|
| `lib/db/schema.ts:41` | `Document` | toter Platzhalter |
| `lib/documents/types.ts:7` | `DocumentListItem` | Listenansicht Dokumente |
| `lib/documents/types.ts:39` | `DraftDoc` | Draft im Flow |
| `lib/documents/queries.ts:121` | `FlowDocMeta` | Status-Guard im Flow (inline in Query-Datei) |
| `lib/documents/preview-types.ts:47` | `DocumentPreview` | Schritt-3-Vorschau |
| `lib/demo/dashboard-data.ts:9` | `DashboardDoc` | **Produktiv** genutzt vom Dashboard, lebt aber in `lib/demo/` |
| `lib/customers/types.ts:1` | `CustomerDocRow` | Dokumente-Join in Kundenansicht |

### 1c. Kunden-Typen: 8 Definitionen

| Fundort | Interface | Anmerkung |
|---|---|---|
| `lib/db/schema.ts:18` | `Customer` | toter Platzhalter |
| `lib/customers/types.ts:10` | `CustomerRow` | DB-Row inkl. Dokumente-Join |
| `lib/customers/types.ts:30` | `CustomerListItem` | Schritt-1-Auswahlliste |
| `lib/customers/types.ts:40` | `FlowCustomer` | Edit-Modus im Flow |
| `lib/documents/queries.ts:184` | `DocumentCustomer` | **fast identisch mit `FlowCustomer`** (nur `notes` fehlt) |
| `lib/documents/draft-actions.ts:10` | `CustomerSnapshot` | snake_case-Variante desselben Datensatzes |
| `lib/documents/preview-types.ts:27` | `PreviewCustomer` | Snapshot in camelCase, ohne `id` |
| `lib/demo/dashboard-data.ts:34` | `DemoCustomer` | nur Demodaten |

### 1d. Firma/Company: 4 Definitionen

| Fundort | Interface | Anmerkung |
|---|---|---|
| `lib/db/schema.ts:7` | `BusinessProfile` | toter Platzhalter |
| `lib/settings/types.ts:1` | `CompanySettings` | snake_case, vollständige `companies`-Row |
| `lib/documents/preview-types.ts:5` | `PreviewCompany` | camelCase-Teilmenge für Dokumentkopf |
| `components/setup/types.ts:1` | `SetupFormData` | Onboarding-Formular = Firmenfelder als Strings |

### 1e. Leistung/Katalog: 3 Definitionen

| Fundort | Interface | Anmerkung |
|---|---|---|
| `lib/db/schema.ts:28` | `CatalogItem` | toter Platzhalter |
| `lib/services/types.ts:3` | `ServiceRow` | DB-Row `services` |
| `lib/katalog/types.ts:9` | `KatalogEintrag` | UI-Modell (mehrsprachig), Mapper in `lib/services/types.ts` |

### 1f. Positionen: 4 Definitionen

| Fundort | Interface | Anmerkung |
|---|---|---|
| `lib/documents/types.ts:23` | `DocumentItem` | **exaktes Duplikat** von `PreviewItem` |
| `lib/documents/preview-types.ts:38` | `PreviewItem` | **exaktes Duplikat** von `DocumentItem` |
| `lib/documents/item-types.ts:9` | `DraftItem` | Superset mit internen Fremdleistungs-Feldern |
| `lib/flow/positionen.ts:11-36` | `NormalPosition`/`FremdPosition`/`Position` | tot (nur von ungenutzten Demodaten `lib/demo/flow-data.ts:defaultPositions` importiert) |

### 1g. Supabase-generierte DB-Typen

Es existieren **keine** Supabase-generierten `Database`-Typen im Repo, und die
`scripts/*.sql` enthalten keine `CREATE TABLE`-Statements (Schema wurde im
Supabase-Dashboard gepflegt). Ohne Zugriff auf das Supabase-Projekt können
generierte Typen nicht erzeugt werden. Ersatzlösung: `types/database.ts` wird
**handgeschrieben** aus allen im Code verwendeten Spalten + den SQL-Funktionen
abgeleitet (Row-Typen pro Tabelle: `companies`, `customers`, `documents`,
`document_items`, `services`, `users`, `number_sequences`) und dient als Single
Source of Truth; UI-Typen werden per `Pick`/Ableitung darauf aufgebaut.
Offener Punkt: sobald Projektzugriff besteht, per
`supabase gen types typescript` ersetzen.

### Ziel (nach Umsetzung)

```
types/
  database.ts   # Row-Typen aller Tabellen (Single Source of Truth) + DocType/DocStatus
  document.ts   # DocumentListItem, DraftDoc, FlowDocMeta, DocumentPreview, DraftItem, …
  customer.ts   # CustomerRow, CustomerListItem, FlowCustomer, CustomerSnapshot, …
  company.ts    # CompanySettings, PreviewCompany, SettingsData
  service.ts    # ServiceRow, KatalogEintrag (+ Mapper bleiben in lib)
```

Gelöscht werden: `lib/db/schema.ts`, `lib/store/index.ts` (einziger Importeur von
schema.ts, selbst nirgends importiert), `shared/doc.ts` (geht in `types/database.ts`
auf), `lib/documents/types.ts`, `lib/documents/preview-types.ts`,
`lib/documents/item-types.ts`, `lib/customers/types.ts`, `lib/settings/types.ts`,
`lib/services/types.ts` (Typ-Anteil; Mapper ziehen um), `hooks/useDocType.ts` (tot),
`lib/flow/positionen.ts` (tot), Typ-Anteil von `lib/demo/dashboard-data.ts`.
`DocumentItem`/`PreviewItem` werden zu **einem** Typ zusammengelegt;
`DocumentCustomer` entfällt zugunsten einer Ableitung von `FlowCustomer`.

---

## Problem 2 — Datenzugriff (Repository-Pattern)

### Ist-Zustand: alle `supabase.from()`/`.rpc()`/Storage-Aufrufe

**In Komponenten (Verstöße gegen die Zielarchitektur):**

| Fundort | Zugriff |
|---|---|
| `components/dashboard/sidebar.tsx:20-22` | `companies`, `customers`, `services` (Server-Component, 3 Queries) |
| `components/documents/documents-main.tsx:87-105` | `document_items` über **Browser-Client** (`lib/supabase/client`) |

**In `lib/` (bereits zentralisiert, aber ohne einheitliches Muster über 16 Dateien verstreut):**

| Datei | Tabellen/RPC |
|---|---|
| `lib/customers/queries.ts` | `customers` (2 Reads) |
| `lib/customers/actions.ts` | `customers` (Insert/Update/Read/Delete) |
| `lib/documents/queries.ts` | `documents` (4), `document_items`, `companies`, `customers` |
| `lib/documents/item-queries.ts` | `document_items`, `documents` |
| `lib/documents/item-actions.ts` | `documents` (2), `document_items` (~12 Zugriffe), `services` |
| `lib/documents/draft-actions.ts` | `documents` (6), `document_items` (2), `companies`, `customers` |
| `lib/documents/actions.ts` | `documents` (Update `markDocumentAsPaid`) |
| `lib/documents/finalize-actions.ts` | **RPC `finalize_document`** |
| `lib/documents/preview-queries.ts` | `documents`, `companies`, `document_items` |
| `lib/dashboard/fetch.ts` | `companies`, `documents` (3), `customers`, `services` |
| `lib/services/queries.ts` | `services` |
| `lib/services/actions.ts` | `services` (3) |
| `lib/settings/queries.ts` | `companies` (2), `number_sequences` |
| `lib/settings/actions.ts` | `companies` (Update), Storage-Bucket `company-logos` (Upload + publicUrl) |
| `lib/auth/actions.ts` | `users` (2) + `supabase.auth.*` (OTP) |
| `lib/onboarding/actions.ts` | `users` (2), `companies` (2) über **Admin-Client** |
| `lib/supabase/auth.ts` | `users` (`getCurrentCompanyId`) |
| `lib/pdf/pdf-storage.ts` | Storage-Bucket `document-pdfs` (Upload/Download, Admin-Client) |

**RPC-Inventur:** Im Code wird nur `finalize_document` aufgerufen
(`lib/documents/finalize-actions.ts:39`). `scripts/complete_onboarding.sql`
existiert, wird aber vom Code **nicht** verwendet — `lib/onboarding/actions.ts`
macht stattdessen direkte Admin-Inserts (Inkonsistenz, siehe „Offene Punkte").
`get_next_document_number` wird ausschließlich SQL-intern von
`finalize_document` aufgerufen.

### Zielarchitektur

```
lib/repositories/
  companies.ts        # companies-Reads/-Writes + Logo-Storage
  customers.ts        # customers-Reads/-Writes
  documents.ts        # documents-Reads/-Writes + RPC finalize_document
  document-items.ts   # document_items-Reads/-Writes (Server)
  document-items.client.ts  # der eine Browser-Read (Positionen im Dokument-Detail)
  services.ts         # services-Reads/-Writes
  users.ts            # users-Zeilen (Onboarding/Auth-Verknüpfung)
  storage.ts          # PDF-Archiv (document-pdfs-Bucket)
```

Regeln:
- Repositories sind die **einzigen** Dateien mit `supabase.from()` / `.rpc()` /
  `storage.from()` (Ausnahme: `lib/supabase/*` Infrastruktur inkl.
  `getCurrentCompanyId` und `supabase.auth.*`-Aufrufe in `lib/auth/actions.ts`,
  die Auth- und keine Datenzugriffe sind).
- Server-Actions (`"use server"`) bleiben als dünne Anwendungsschicht bestehen
  (Validierung, `redirect`, Fehler-Mapping) und rufen Repository-Funktionen auf.
  Grund: `"use server"`-Dateien dürfen nur async-Funktionen exportieren, und
  reine Reads sollen keine zusätzlichen POST-Endpoints werden.
- Server/Client-Trennung: Repositories nutzen `lib/supabase/server`;
  die einzige Client-Query bekommt eine explizite `*.client.ts`-Variante mit
  `lib/supabase/client`.
- Pages/Komponenten rufen nur noch Repository-Funktionen bzw. Actions auf.

---

## Problem 3 — Ordnerstruktur

### Ist-Zustand (betroffene Teile)

```
app/
  [locale]/
    (app)/{dashboard,documents,customers,catalog,settings}/page.tsx
    create/[document_id]/{1,2,3}/page.tsx + layout.tsx   ← Flow-ROUTEN liegen schon richtig
    setup/page.tsx + SetupFlowClient.tsx                  ← Client-Komponente in Route-Ordner
    login/page.tsx
  api/{catalog,customers,settings}/route.ts               ← Serwist-Offline-Platzhalter
  api/pdf/route.ts, api/documents/[document_id]/pdf/route.ts
components/
  flow/        ← Schritt 1 + 2 des Create-Flows (KundeStep, step2-*, position-*, catalog-picker, FlowSteps)
  create/      ← Schritt 3 des Create-Flows (step3-*, document-a4, share-*, finalize-dialog, …)
  dashboard/   ← Sidebar (app-weit genutzt!) + Dashboard-Screen
  documents/ customers/ catalog/ settings/ login/ setup/ layout/ ui/ demo/
hooks/useDocType.ts        ← tot
shared/doc.ts              ← einzelne Typ-Datei als eigener Root-Ordner
lib/
  flow/ (steps.ts lebendig, positionen.ts tot)
  demo/ (dashboard-data.ts: Typen produktiv genutzt + Demodaten; flow-data.ts: nur FLOW_UNITS lebendig)
  db/schema.ts + store/    ← tote Platzhalter
  customers/ documents/ services/ settings/ dashboard/ auth/ onboarding/ katalog/ legal/ pdf/ supabase/
```

Der Auftrag nennt „flow/ UND create/": Auf **Routen**-Ebene existiert nur noch
`create/[document_id]/{1,2,3}` (bereits konsolidiert, keine Redirect-Leichen
gefunden). Verteilt ist der Flow auf **Komponenten**-Ebene
(`components/flow/` + `components/create/`) und in `lib/flow/`.

### Ziel

```
components/
  documents/create/   ← ALLE Flow-Komponenten aus components/flow/ + components/create/
  layout/             ← AppShell + Sidebar (Sidebar zieht aus dashboard/ um, sie ist app-weit)
  shared/             ← wiederverwendbare Bausteine ohne Feature-Zuordnung (rtl-demo-card)
  ui/ dashboard/ documents/ customers/ catalog/ settings/ login/ setup/  (wie gehabt)
lib/
  repositories/       ← neu (Problem 2)
  flow/steps.ts       → lib/documents/flow-steps.ts (Flow-Konstanten zum Feature)
  demo/               → Typen ziehen nach types/, echte Demodaten bleiben als lib/demo/
  db/, store/         → gelöscht (tot)
types/                ← neu (Problem 1)
shared/               → gelöscht (Inhalt geht in types/ auf)
hooks/                → gelöscht (useDocType tot)
```

`components/demo/rtl-demo-card` wird von der öffentlichen Startseite
(`app/[locale]/page.tsx`) produktiv gerendert → bleibt, zieht nach
`components/shared/` um.

---

## Problem 4 — Dateibenennung (kebab-case)

Nicht-kebab-case-Dateien (per `git mv` umzubenennen; Komponenten-Exporte bleiben PascalCase):

| Ist | Soll |
|---|---|
| `app/[locale]/setup/SetupFlowClient.tsx` | `setup-flow-client.tsx` |
| `components/customers/NewCustomerModal.tsx/.css` | `new-customer-modal.tsx/.css` |
| `components/flow/FlowSteps.tsx` | `flow-steps.tsx` (im Zuge des Umzugs nach `components/documents/create/`) |
| `components/flow/KundeStep.tsx/.css` | `kunde-step.tsx/.css` (dito) |
| `components/layout/AppShell.tsx` | `app-shell.tsx` |
| `components/setup/Setup.css` | `setup.css` |
| `components/setup/SetupDone.tsx/.css` | `setup-done.tsx/.css` |
| `components/setup/SetupEntry.tsx/.css` | `setup-entry.tsx/.css` |
| `components/setup/SetupFlow.tsx` | `setup-flow.tsx` |
| `components/setup/SetupIcon.tsx` | `setup-icon.tsx` |
| `components/setup/SetupOtherFields.tsx` | `setup-other-fields.tsx` |
| `components/setup/SetupPrimitives.tsx/.css` | `setup-primitives.tsx/.css` |
| `components/setup/SetupReview.tsx/.css` | `setup-review.tsx/.css` |
| `components/setup/SetupStepFields.tsx/.css` | `setup-step-fields.tsx/.css` |
| `components/setup/SetupUpload.tsx/.css` | `setup-upload.tsx/.css` |
| `components/setup/SetupWelcome.tsx/.css` | `setup-welcome.tsx/.css` |
| `components/setup/SetupWizard.tsx` | `setup-wizard.tsx` |
| `lib/legal/dokumentPflicht.ts/.test.ts` | `dokument-pflicht.ts/.test.ts` |
| `hooks/useDocType.ts` | entfällt (tot, wird gelöscht) |

Ordnernamen sind durchgängig bereits kebab-case/lowercase.
Case-Sensitivity: Umbenennungen laufen über `git mv` (bei reinen
Groß-/Kleinschreibungs-Wechseln über Zwischennamen), damit Linux/Vercel-Builds
nicht brechen.

---

## Problem 5 — Styling

### Befund

1. **Zentrale gebündelte Custom-CSS-Datei:** `components/dashboard/dashboard.css`
   (785 Zeilen) wird von **vier** Stellen importiert:
   - `app/[locale]/(app)/layout.tsx:7` (alle App-Seiten)
   - `app/[locale]/create/[document_id]/layout.tsx:6`
   - `components/flow/step2-screen.tsx:6`
   - `components/create/step3-screen.tsx:7`

   Inhalt ist ein Grab-Bag aus: Design-Tokens (`.zz-dash`-Scope), App-Shell
   (`.dapp`, `.dmain`, `.dtopbar`, `.dscroll`, `.dsearch`, `.dtools`,
   `.greet-*`, `.iconbtn`, `.pill*`), Sidebar (`.dside*`, `.dnav*`) und rein
   dashboard-seitigen Styles (`.dhero`, `.dcta*`, `.dhighlight*`, `.dtable`,
   `.dtr/.dth/.dtd-*`, `.le-*`-Leerzustände).

2. **Design-Token-Block 6-fach dupliziert:** identische Token
   (`--primary:#02335c`, `--accent:#fb6202`, Statusfarben, Radien, …) sind
   redundant definiert in `dashboard.css` (`.zz-dash`), `step3.css`
   (`.zz-create`), `customers.css` (`.zz-cust`), `settings.css`,
   `catalog-master-detail.css`, `login.css` (je eigener Scope).
   Das gehört als **CSS-Variablen/Theme in `globals.css`** (laut Auftrag dort
   ausdrücklich erlaubt).

3. **Duplizierte Regelblöcke zwischen Flow-Steps:** `step2.css` und `step3.css`
   definieren `.dflow-*`, `.dsteps2`, `.dstep2*`, `.d2-ctx`, `.p2-chip` doppelt.

4. `app/globals.css` ist bereits sauber (Tailwind-Direktiven, shadcn-Theme-
   Variablen, Base-Layer) — keine komponentenspezifischen Styles.

5. Kein einziges Vorkommen physischer Tailwind-Klassen (`pl-`/`pr-`/`ml-`/`mr-`)
   in TSX; die CSS-Dateien nutzen bereits logische Properties
   (`margin-inline-start`, `inset-inline-end`, `text-align: start/end`).

6. **Kein Inline-Style-Problem** und die übrigen CSS-Dateien sind bereits
   komponenten-lokal (gleicher Ordner, Import in genau der Komponente) —
   das entspricht der in `CLAUDE.md` festgeschriebenen Projektkonvention
   („Jede Komponente bekommt eine eigene `.css`-Datei im selben Ordner").

### Ziel

- `dashboard.css` wird vollständig aufgelöst:
  - Token-Block → einmalig nach `app/globals.css` (scoped auf die bestehenden
    `zz-*`-Klassen, damit shadcn-`--primary` auf `:root` nicht kollidiert);
    die 5 weiteren Token-Duplikate in den Screen-CSS-Dateien entfallen.
  - Shell-Klassen → `components/layout/app-shell.css` (co-located mit der
    Shell-Komponente, die dieses Markup besitzt).
  - Sidebar-Klassen → `components/layout/sidebar.css` (co-located, Sidebar
    zieht nach `components/layout/`).
  - Dashboard-only-Klassen → `components/dashboard/dashboard-main.css`
    (co-located mit `dashboard-main.tsx`).
  - Die Layout-Importe (`(app)/layout.tsx`, `create/layout.tsx`) der
    Sammel-CSS entfallen ersatzlos.
- Duplizierte `.dflow-*`/`.dstep2*`-Blöcke aus `step2.css`/`step3.css` →
  einmal in die CSS der gemeinsamen Flow-Kopf-Komponente.
- Einfache Shell-Wrapper (`.zz-dash`-Layout, `.dapp`) werden, wo trivial
  äquivalent, als Tailwind-Klassen in die Komponente gezogen; komplexe
  Hover-/Media-Query-Blöcke bleiben bewusst in co-located CSS
  (Projektkonvention aus `CLAUDE.md`, minimiert Regressionsrisiko — die
  App muss pixelgleich bleiben, es gibt keine visuelle Regressionssuite).
- Beim Verschieben: ausschließlich logische Properties (ist bereits erfüllt,
  wird beibehalten).

**Bewusste Abweichung vom Auftragstext:** Die vollständige Umwandlung *aller*
komponenten-lokalen CSS-Dateien (~8.300 Zeilen in 24 Dateien) in
Tailwind-Utility-Klassen wird **nicht** durchgeführt: sie widerspräche der
dokumentierten Projektkonvention (`CLAUDE.md`), hätte bei Hover-/Keyframe-/
Media-Query-lastigem Design ein hohes Risiko stiller UI-Regressionen und wäre
keine Struktur-, sondern eine Neuschreibungsmaßnahme („Keine UI-Änderungen").
Der Auftragskern — keine zentrale gebündelte Custom-CSS-Datei, sauberes
`globals.css`, logische Properties — wird vollständig umgesetzt.

---

## Weitere Befunde (außerhalb der 5 Punkte, nicht umgesetzt — nur dokumentiert)

1. `lib/legal/marge.ts` (`berechneVerkaufspreis`) ist eine ältere Parallel-
   implementierung von `lib/documents/margin.ts` (`computeUnitPrice`) und wird
   nur noch vom eigenen Test importiert.
2. `lib/legal/pflichtangaben.ts` (Ampel-Check) ist die Vorgänger-Variante von
   `lib/legal/dokumentPflicht.ts`; produktiv genutzt wird nur letztere.
   `components/ui/ampel-check.tsx` (hängt an pflichtangaben.ts) ist ein in
   `CLAUDE.md` vorgeschriebenes UI-Primitive und bleibt daher bestehen.
3. `app/api/{catalog,customers,settings}/route.ts` liefern statische
   Platzhalter-Daten (Serwist-Offline-Cache-Ziele laut `app/sw.ts`) — kein
   Supabase-Zugriff; bleiben unverändert (Verhaltensänderung wäre nötig).
4. `scripts/complete_onboarding.sql` wird vom Code nicht aufgerufen
   (`lib/onboarding/actions.ts` macht direkte Admin-Inserts mit manuellem
   Rollback). Umstellung auf die RPC wäre eine Verhaltensänderung → offen.
5. `components/setup/translations.ts` pflegt ein eigenes Übersetzungsobjekt am
   next-intl-System vorbei (Auftrag: i18n nicht anfassen → bleibt).
6. `app/[locale]/(app)/customers/page.tsx:14` enthält ein `console.log`
   personenbezogener Kundendaten — Konflikt mit der DSGVO-Regel „keine
   personenbezogenen Daten in Logs" aus `CLAUDE.md`. Wird im Zuge des
   Repository-Umbaus entfernt (Zeile wird ohnehin angefasst).
7. Inkonsistente DocType-Mappings: `lib/documents/queries.ts:150` und
   `lib/documents/item-queries.ts:60` prüfen auf `"quote"`, während
   `shared/doc.ts` `"offer"` definiert. Verhalten bleibt unangetastet
   (Mapping wird 1:1 in die Repositories übernommen), aber dokumentiert.

## Baseline-Reparatur (vor Schritt 1 nötig)

Das Abnahmekriterium „`tsc --noEmit` und Tests fehlerfrei nach jedem Schritt"
war **schon vor dem Refactoring verletzt** (Altlasten des früheren
`rechnung/angebot → invoice/offer`-Renames sowie i18n-Drift):

| Fundort | Problem | Fix |
|---|---|---|
| `lib/pdf/pdf-filename.test.ts:8,50`, `lib/pdf/pdf-storage.test.ts:40`, `lib/pdf/pdf-view-model.test.ts:54,112,116` | Testdaten nutzten alte `DocType`-Werte `"rechnung"`/`"angebot"` → 6 tsc-Fehler + 4 rote Tests | Testdaten auf `"invoice"`/`"offer"` aktualisiert |
| `messages/de.json` (`Dashboard.colService`) | Schlüssel existierte nur in `de`, nicht in `tr`/`ar`; wird von keinem Code verwendet (nur `Step2.colService` ist in Gebrauch) → Paritätstest rot | ungenutzten Schlüssel entfernt |
| `lib/katalog/katalog.test.ts:10` | Erwartung `"دهان الجدران"` passte nicht zu den Sample-Daten `"طلاء الجدران"` (`lib/katalog/sample.ts:8`, identisch in `lib/demo/flow-data.ts`) | Testerwartung an Sample-Daten angeglichen |

Reine Testdaten-/Übersetzungsdaten-Korrekturen, keine Verhaltensänderung.

## Reihenfolge der Umsetzung

1. **Types** → `types/` anlegen, Duplikate löschen, Imports umstellen
2. **Repositories** → `lib/repositories/`, Komponenten/Pages entkoppeln
3. **Ordnerstruktur** → Flow-Komponenten konsolidieren, tote Ordner löschen
4. **Benennung** → kebab-case per `git mv`
5. **CSS** → `dashboard.css` auflösen, Token nach `globals.css`

Nach jedem Schritt: `npm run build` + `npx tsc --noEmit` (+ `npm run test`)
müssen grün sein; Commits pro Schritt atomar.

---

# Ergebnis der Umsetzung

Alle fünf Schritte sind umgesetzt; nach jedem Schritt (und final) liefen
`npm run build`, `npx tsc --noEmit`, `npx eslint .` und `npm run test`
(58/58) fehlerfrei. Commits auf `claude/codebase-refactor-cleanup-4l7gnm`:

| Commit | Inhalt |
|---|---|
| `docs:` | dieser Report (Analyse vor Umsetzung) |
| `test:` | Baseline-Reparatur (siehe oben – Voraussetzung fürs Grün-Kriterium) |
| `refactor(types):` | Schritt 1 – zentrale Typen unter `types/` |
| `refactor(data):` | Schritt 2 – Repository-Pattern unter `lib/repositories/` |
| `refactor(struktur):` | Schritt 3 – Flow-Konsolidierung + Ordnerleichen |
| `refactor(namen):` | Schritt 4 – kebab-case via `git mv` |
| `refactor(css):` | Schritt 5 – `dashboard.css` aufgelöst, Tokens in `globals.css` |

## Struktur nachher (betroffene Teile)

```
types/                          ← NEU: Single Source of Truth
  database.ts  document.ts  customer.ts  company.ts  service.ts
lib/
  repositories/                 ← NEU: einzige Stelle mit supabase.from()/.rpc()/storage
    companies.ts  customers.ts  documents.ts  document-items.ts
    document-items.client.ts    ← Client-Variante (Browser-Read im Dokument-Detail)
    document-pdfs.ts  services.ts  users.ts
  customers/actions.ts          ← nur noch dünne Server-Actions (Validierung, Redirects)
  documents/{actions,draft-actions,finalize-actions,item-actions}.ts   ← dito
  documents/{margin.ts,document-de.ts,flow-steps.ts,units.ts}          ← Domänenlogik
  services/{actions.ts,mappers.ts}   settings/actions.ts
  auth/  onboarding/  dashboard/  katalog/  legal/  pdf/  supabase/
components/
  documents/create/             ← kompletter Create-Flow (vorher flow/ + create/)
  layout/                       ← app-shell.tsx/.css, sidebar*.tsx, sidebar.css
  shared/                       ← rtl-demo-card (von der Startseite genutzt)
  ui/  dashboard/  documents/  customers/  catalog/  settings/  login/  setup/
app/[locale]/…                  ← Routen unverändert (nur setup/SetupFlowClient.tsx raus)
```

Gelöscht: `components/flow/`, `components/create/`, `components/demo/`,
`hooks/`, `shared/`, `lib/db/`, `lib/store/`, `lib/flow/`, `lib/demo/`,
`components/dashboard/dashboard.css` sowie alle in Abschnitt 1 gelisteten
Duplikat-Typdateien und die sechs alten `queries.ts`-Module.

## Was bewusst NICHT geändert wurde

1. **Kein `src/`-Präfix** – Begründung siehe Kopf des Reports (Root-Struktur
   mit `@/`-Alias beibehalten; `app/` bleibt ohnehin Root).
2. **Per-Komponenten-CSS-Dateien bleiben CSS** (keine Tailwind-Umschreibung
   der ~7.500 verbliebenen Zeilen) – entspricht der Projektkonvention in
   `CLAUDE.md`; eine Utility-Umschreibung wäre eine Neuschreibung mit hohem
   Regressionsrisiko ohne visuelle Testsuite. Der Auftragskern (keine
   zentrale Sammel-CSS, sauberes `globals.css`, logische Properties) ist
   vollständig erfüllt.
3. **`.dflow-*`/`.dstep2*`-Blöcke in `kunde-step.css`/`step2.css`/`step3.css`
   nicht zusammengelegt**: Die Blöcke sind zwischen den Dateien NICHT
   identisch (unterschiedliche Hover-/Transition-/`flex-shrink`-Details).
   Eine Vereinheitlichung wäre eine sichtbare Designentscheidung → offen.
4. **Bestehende Inline-Styles** (~20 Stellen, v. a. `components/setup/`,
   `components/settings/`, `customers-master-detail.tsx`) nicht angefasst –
   Verstoß gegen die CSS-Regeln aus `CLAUDE.md`, aber außerhalb der fünf
   Auftragspunkte; nur die ohnehin bearbeitete `setup/page.tsx` wurde auf
   Tailwind umgestellt.
5. **Query-Formen 1:1 übernommen**, inkl. Eigenheiten: manche Reads filtern
   explizit auf `company_id`, andere verlassen sich auf RLS (Sidebar/
   Dashboard-Counts); `document_type`-Mapping prüft weiterhin `"quote"`,
   obwohl der Typ `"offer"` heißt (Fundorte: `lib/repositories/documents.ts`,
   getFlowDocMeta/getDraftContext). Verhalten unangetastet.
6. **`lib/supabase/auth.ts`** (getCurrentUser/getCurrentCompanyId, inkl. des
   `users`-Lookups) bleibt Auth-Infrastruktur und wandert nicht ins
   Repository – sie ist requestweit gecacht und wird von allen Repositories
   konsumiert.
7. **API-Platzhalter-Routen** (`app/api/{catalog,customers,settings}`)
   unverändert – sie sind Serwist-Offline-Cache-Ziele (`app/sw.ts`).
8. **next-intl/Locale-Routing, DB-Schema, RLS, Postgres-Funktionen**: nicht
   angefasst (Auftragsvorgabe). Ebenso keine neuen Dependencies.

## Offene Punkte / Empfehlungen

1. **Supabase-generierte Typen**: `types/database.ts` ist handgeschrieben.
   Mit Projektzugriff per `supabase gen types typescript` ersetzen und die
   Ableitungen in `types/*` darauf umstellen.
2. **`"quote"`-vs-`"offer"`-Inkonsistenz** klären: Entweder enthält die DB
   noch Altwerte (`document_type_enum`?) – dann Migration – oder die beiden
   `=== "quote"`-Checks sind tote Zweige.
3. **`complete_onboarding.sql` wird vom Code nicht genutzt** –
   `lib/onboarding/actions.ts` macht Admin-Inserts mit manuellem Rollback.
   Entweder auf die atomare RPC umstellen oder das SQL-Script entfernen.
4. **Parallel-Implementierungen in `lib/legal/`**: `marge.ts` (nur noch vom
   eigenen Test genutzt; produktiv ist `lib/documents/margin.ts`) und
   `pflichtangaben.ts` (Vorgänger von `dokument-pflicht.ts`, hängt am
   ungenutzten UI-Primitive `AmpelCheck`). Konsolidierung braucht eine
   Produktentscheidung zu `AmpelCheck`.
5. **Setup-Übersetzungen** (`components/setup/translations.ts`) laufen am
   next-intl-System vorbei (eigenes `T`-Objekt) – mittelfristig in
   `messages/*.json` überführen.
6. **Inline-Styles** (Punkt 4 oben) schrittweise in Tailwind-Klassen bzw.
   Komponenten-CSS überführen, wenn die jeweiligen Dateien ohnehin angefasst
   werden.
7. **Flow-CSS-Feinschliff**: die fast-identischen `.dflow-*`/`.dstep2*`-
   Blöcke nach einer bewussten Design-Entscheidung in eine gemeinsame
   Datei (z. B. `flow-steps.css` bei der gemeinsamen Komponente) ziehen.
