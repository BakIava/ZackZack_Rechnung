# Invoice Template Architecture — Analysis

Status: **Phase 1, Phase 2 (per-company selection + document snapshot), `ths-classic@1` and `erhan-excel@1` implemented; phase 0 (frozen company data, archive view in step 3) and phase 4 open**
Date: 3 October 2026
Scope: `ZackZack_Rechnung` only. `ZackZack_Admin` was not inspected or changed.

> Sections 1–10 are the original analysis of the code *before* Phase 1. Where they
> describe `DocumentPdf` as a monolith, read [Implementation status](#implementation-status-phase-1)
> for the current structure.

## Implementation status (Phase 1)

Done, without any visual change and without a DB migration:

| Piece | Location |
|---|---|
| Template ids `standard`, `ths-classic`, `erhan-excel`; `DocumentTemplateRef { id, version }`; `DocumentPreview.template` | `types/document.ts` |
| Normalized, template-agnostic render data (`DocumentRenderData`): all §19/VAT decisions, due date, dates, money/date formatting and legal labels | `lib/pdf/render-data.ts` |
| Pure catalog: published versions, `DEFAULT_DOCUMENT_TEMPLATE` / `LEGACY_DOCUMENT_TEMPLATE` (both `standard@1`), `DocumentTemplateError` | `lib/pdf/templates/template-catalog.ts` |
| Selection rule (draft → override/company/default at latest version; finalized → frozen snapshot, legacy → `standard@1`) | `lib/pdf/templates/template-selection.ts` |
| Registry `standard@1 → StandardTemplate`, single entry point `renderDocumentTemplate({ template, data })` | `lib/pdf/templates/template-registry.tsx` |
| `standard@1` layout (moved verbatim from `document-pdf.tsx`) | `lib/pdf/templates/standard/standard-template.tsx` |
| `standard` view model, now pure presentation over render data | `lib/pdf/pdf-view-model.ts` |

Flow (identical for browser preview, PDF route, archive and finalize):
`loadDocumentPreviewData` sets `preview.template` via `selectDocumentTemplate` →
`createDocumentPdfElement(preview, logo)` = `renderDocumentTemplate({ template: preview.template,
data: buildDocumentRenderData(preview, logo) })`.

Decisions taken in Phase 1:
- **No silent fallback.** Unknown ids, reserved ids (`ths-classic`, `erhan-excel`) and unknown
  versions throw `DocumentTemplateError` *before* a PDF buffer exists, so no archive object can be
  written in the wrong template. An existing archive is still returned regardless of template.
- **No schema change.** The repository passes `null` for the not-yet-existing columns, and every
  document resolves to `standard@1` as before. The Phase 2 columns stay as in §9.
- **Phase 2 note:** the template *version* is known in code, not in SQL. `finalize_document`
  should therefore receive `p_template_id`/`p_template_version` from the finalize action (the
  ref the user previewed), validated against the catalog, and not derive them itself.
- **Deferred:** pagination metrics are still the `standard` constants in `document-pages.ts`.
  They become a template parameter when a second layout exists (see §6). The Phase 0 hardening
  items are not done, including the archive `upsert: true`, which is only reachable when no
  non-empty archive exists.
- Proof of unchanged output: 12 fixtures (invoice/quote, §19, override, mixed VAT, draft, empty,
  36 rows, long description, logo, minimal company) were rendered before and after the change
  and compared by pdf.js signature (page geometry, positioned text runs, full operator list).
  All 12 were identical. Byte comparison is impossible because React-PDF randomizes font-subset
  tags and the document ID on every run.

## Phase 2 status: per-company selection and document snapshot

**Schema** (`scripts/document-templates.sql`, then `scripts/finalize_document.sql`, both before
the app deploy):

| Column | Type | Rules |
|---|---|---|
| `companies.document_template_id` | `text NOT NULL DEFAULT 'standard'` | CHECK ∈ {standard, ths-classic, erhan-excel}. `ADD COLUMN` fills existing companies with `'standard'`. |
| `documents.template_id` | `text NULL` | CHECK ∈ same set |
| `documents.template_version` | `smallint NULL` | CHECK ≥ 1; both columns NULL or both set |

There is no backfill. The immutability trigger forbids updates of finalized rows, and
`ADD COLUMN` fires no row triggers. A test keeps the CHECK lists in sync with
`DOCUMENT_TEMPLATE_IDS`.

**`finalize_document(p_document_id, p_confirm_expired_quote, p_template_id, p_template_version)`:**
the old 2-argument signature is dropped. The template parameters default to NULL, so an old app
instance during the deploy window still works; its documents get no snapshot (legacy rule).
When given, the ID must equal the company's current `document_template_id`
(`template_mismatch`), the pair must be complete, and the version must be ≥ 1. The snapshot is
written in the same UPDATE as number, status and logo snapshot.

**Flow (one resolver, no template switches elsewhere):**

```
companies.document_template_id ─┐
documents.template_id/_version ──┼─▶ selectDocumentTemplate()   lib/pdf/templates/template-selection.ts
documents.status ────────────────┘      called only in loadDocumentPreviewData (document-previews.ts)
                                        │
                              DocumentPreview.template
                 ┌──────────────────────┼───────────────────────────┐
     step 2/3 browser preview     finalizeDocument action       PDF route / archive
     (DocumentPdf → registry)     → RPC p_template_* (snapshot)  (renderDocumentPdfBuffer → registry)
```

- **Drafts** always follow the company's current choice in its latest version. A company change
  is visible in open drafts immediately. Snapshot columns on drafts are ignored; there is no
  per-document override.
- **Finalized documents** render exactly their snapshot (`template_id@template_version`). A later
  company change does not affect them.
- **Finalized without snapshot** (before this migration, or finalized by an old app instance):
  `standard@1`.
- **Invalid values** (unknown ID, version ≤ 0 or non-integer, half snapshot) throw
  `DocumentTemplateError`; there is no silent fallback.
  - Values are parsed only in the branch that uses them, so a corrupt company value blocks
    drafts but never a finalized document or its archive.
  - The finalize action rejects unrenderable templates before the RPC, so nothing is
    finalized or archived.

**What is guaranteed, and what is not:**
- An existing non-empty archived PDF is always served as-is and never regenerated by a template
  change (archive-first; tested at route level). Re-rendering happens only when the archive object
  is missing or 0 bytes. `uploadDocumentPdf` still uses `upsert: true`, which is reachable only in
  that case.
- If no archive exists (archiving at finalize failed and the PDF route has not run yet), the
  re-render uses the frozen template and version, but **live company master data** (name, address,
  bank, tax number, payment days) and the template code as currently deployed. Templates must
  therefore stay append-only (see the catalog).
- Step 3 view mode for finalized documents still renders in the browser from the same
  data: frozen template, live company data. It can therefore differ from the archived PDF
  after company data changes. Both limitations are Phase 0 items and are **not** solved by
  Phase 2.

## Template `ths-classic@1`

Layout in `lib/pdf/templates/ths-classic/`. It reproduces the THS reference invoice (an A4
vector PDF). All geometry comes from measuring the reference: text baselines via pdf.js,
bands and rules via a 4× raster scan.

- **Geometry:**
  - Header band: x 48.25–577.25 pt, y 38.5–112.5 pt.
  - Footer band: full bleed from y 741 pt.
  - Table rules: x 77–561 pt, 1.25/1.5 pt.
  - Column starts: 82.3 / 164.5 / 217.3 / 380.3 / 437.0 / 502.8 pt.
  - Footer columns: 70.8 / 212.7 / 354.4 pt.
  - The rendered baselines are within 0.3 pt of the reference.
- **Typography:** the reference uses Calibri, which cannot be embedded. The template keeps
  Hanken Grotesk and scales every size by 0.917, matching Calibri's cap height and x-height and
  restoring the line lengths (body 9.25, number 11, band 10.1, footer 7.25 pt). There is no
  italic cut, so the reference's bold-italic label is set bold.
- **React-PDF facts the layout relies on:**
  - The baseline sits exactly `fontSize` below the box top.
  - A unitless `lineHeight` is multiplied by the `fontSize` declared in the *same* style rule,
    falling back to 18 pt. Every THS style with `lineHeight` therefore declares `fontSize`.
- **Reference fields mapped to existing data:**
  - "Firma" line → business customer.
  - Head of the first page (updated reference, 2026-10): right column Belegdatum,
    Gültig bis (quotes), Sachbearbeiter; then on the left "Rechnungsnummer:" /
    "Angebotsnummer:" + `numberText`, Ansprechpartner, Tel., Liefer-/Montagetermin.
    Both stacks fill from the top without gaps; intro and table top stay fixed, so
    pagination is unchanged. Continuation pages use the same number label.
  - "Sachbearbeiter" → company director.
  - "Ansprechpartner" → first/last name of a *business* customer (`customer.contactPersonName`).
  - "Tel." → customer phone from the snapshot, private and business (`customer.phone`).
  - "Liefer-/Montagetermin" → service date/period value (label fixed, not the data's
    Leistungsdatum/Leistungszeitraum label).
  - Reference typos ("Tel;") and inconsistent styling are not copied: every line is
    bold label + regular value.
  - These changes were made in place on `ths-classic@1` (no new version) at the business's
    request; archived PDFs are unaffected, only a missing archive would re-render with them.
  - Summary rows → render-data totals. With §19 and no VAT shown, a single
    Rechnungsbetrag/Angebotssumme row.
  - The legal note area → the §19 note.
  - "Zahlungsbedingung" → payment terms (invoices only).
  - Footer → director (labelled "Geschäftsführer"), seat, phone/mobile/e-mail, bank name/IBAN/BIC,
    tax-id label and value.
- **Header service lines:** the four lines on the right of the band are hardcoded in the
  template (`THS_HEADER_SERVICES` in `ths-classic-labels.ts`), wording as in the original.
  `ths-classic` is THS's own template; any other company selecting it would show these lines
  too.
- **Unsupported (no ZackZack field; left empty, never invented):**
  - The delivery address ("Lieferadresse").
  - Bvh./Bauvorhaben and Mitarbeiter.
  - Per-line "Datum" column; its slot carries the line VAT rate when VAT is shown.
  - Price-per-unit text in the E-Preis column ("39€/Std."); shown as a plain decimal, since
    Menge already carries the unit.
  - §13b reverse-charge note.
  - Free-text payment conditions (Skonto clause).
  - A second recipient line (department) and Herr/Frau salutations.
- **Multi-page:**
  - The band, footer and table head repeat on every page.
  - Continuation pages show the document number.
  - Non-final pages end with a "Zwischensumme".
  - The summary/closing block is reserved per document (`thsClosingHeight`), so totals never
    reach the footer.
  - Words over 18 characters may break (`breakLongWords`); the page planner splits them too.
- **Shared additions:**
  - Render data now also carries decimal texts without "€" and `logo.initials` (wordmark).
  - `paginatePdfRows` takes template metrics; `standard` keeps its constants and output.
  - Template selection in the UI/admin is not implemented. Selection still resolves to
    `standard@1` until the Phase 2 columns exist.

## Template `erhan-excel@1`

Layout in `lib/pdf/templates/erhan-excel/`. The reference is a 100 %-zoom screenshot of an
Excel sheet (Arial 10, 12.75 pt default rows). Its sheet width of 659 px × 0.75 pt equals A4
minus Excel's default margins, so the mapping x = 50.4 + 0.75·(px−1), y = 54 + 0.75·px is
exact. Hanken Grotesk runs as wide as Arial at the same size, so the Excel point sizes are kept
(7 / 10 / 12 / 16 pt).

- **Excel character, kept:**
  - The 12.75 pt row grid: every table text sits on a grid row on every page. A test enforces
    this.
  - Light gray (#cfcfcf, 0.5 pt) gridlines inside the table area only.
  - A two-row merged header with the reference labels.
  - Open empty grid rows between items and totals.
  - Totals anchored bottom-right.
  - The reference's only real border: a 1.5 pt black rule under "Mwst".
- **Not reproduced:**
  - Page-wide gridlines (Excel screen chrome).
  - The white text-box masks.
  - Raster content of any kind.
- **Mapping:**
  - Logo image or company name (top right).
  - Sender line: name / street / city, underlined 7 pt.
  - Recipient from the customer snapshot.
  - Tel./Mobil./Fax./E-Mail from company phone/mobile/fax/email. Fax is now loaded into the
    render data; empty lines are omitted.
  - "<city>, den <issue date>".
  - "Rechnung" / "Angebot" + numberLabel/number.
  - The "Leistungszeitraum" line comes from service timing (date or period).
  - Columns:
    - Pos. → position.
    - Leistung-Material → name plus additional description (one line per grid row).
    - Preis € → unit price (decimal).
    - Art → unit.
    - Menge-Arbeitsstunden → quantity "1,00".
    - Gesamt-Betrag € → net line total.
  - Nettobetrag / "Mwst 19%" per tax group / Gesamtbetrag.
- **Mismatches (documented, not invented):**
  - Einsatzort is unsupported; its row carries "Gültig bis" for quotes.
  - The reference's free text "pausch" in Preis € is shown as the real unit price.
  - The "Leistungszeitraum April 2026" month wording becomes the exact date range.
  - The "Rechnungs.- Nr." / "den," punctuation is normalized.
  - With several tax rates, the line rate is printed under the unit in Art (§ 14 Abs. 4 Nr. 8
    UStG).
  - §19 shows only Gesamtbetrag plus the §19 note.
  - Payment terms, the §19 note, bank details and the tax number are not visible in the
    reference crop, so they are added as plain text below the grid and in a small footer.
- **Exact wrapping:** `lib/pdf/text-metrics.ts` holds Hanken Grotesk advance widths, tested
  against rendered PDFs. ERHAN pre-wraps every multi-line cell to its true width, so planned
  and rendered rows always match (no lost lines, no clipped rows) even for all-caps text and
  long compounds. `standard` and `ths-classic` keep their heuristic and are unchanged.
- **Column deviation:** Art is 11 pt wider than in Excel, so "Pauschale" fits unbroken;
  Leistung-Material is 11 pt narrower.

## How this was analysed

- The analysis covers the **current working tree** (HEAD `7681c68` plus a large set of
  uncommitted changes). Among other things, the working tree deletes the old HTML
  preview (`components/create/3/document-a4.tsx`), `lib/pdf/invoice-document.tsx`,
  `lib/pdf/render-invoice.tsx` and the settings screens. Statements below refer to the
  working tree, not to HEAD.
- Code was read directly. Where docs and code disagree, the code wins (see
  [Appendix A](#appendix-a--docs-vs-code-discrepancies)).
- **The live database schema was not queried.** There is no Supabase CLI or `psql` in
  this environment, and I did not use the service-role key against production. The schema
  below is reconstructed from `types/database.ts` (handwritten, "matched to schema dump
  2026-07"), the migration snippets in `scripts/*.sql`, and the column lists the
  repositories actually `select`. Items marked *(verify)* should be checked against the
  live DB before any migration.
- `npm run test`: 61 files, 316 tests, all passing.

---

## 1. Current rendering pipeline

There is **one** renderer for invoices and quotes, used for both the browser preview and
the server PDF: `DocumentPdf` in `lib/pdf/document-pdf.tsx`, built with
`@react-pdf/renderer` 4.5.x. The HTML A4 preview (`DocumentA4`) has been removed. The
decision is recorded in `docs/decisions/document-renderer.md` (option A, "one shared
React-PDF tree").

```
DB (documents, document_items, companies)
   │  lib/repositories/document-previews.ts  loadDocumentPreviewData()
   ▼
DocumentPreview  (types/document.ts)  ← the single renderer input DTO
   │  + PdfLogo (lib/pdf/document-logo.ts loadPdfLogo, server-side, sharp)
   ▼
DocumentPdf({ preview, logo })                    lib/pdf/document-pdf.tsx
   ├─ buildPdfViewModel(preview) → PdfViewModel    lib/pdf/pdf-view-model.ts
   ├─ paginatePdfRows(vm.rows, showTaxDetails)     lib/pdf/document-pages.ts
   └─ <Document><Page>… Header/Parties/ItemsTable/PageSubtotal/Totals/Footer
          styles: lib/pdf/document-pdf.styles.ts (single hard-coded stylesheet)
   │
   ├── Browser: DocumentPdfPreview (usePDF → blob URL → <iframe>)
   │      components/create/3/document-pdf-preview.tsx (+ -loader.tsx, ssr:false)
   │      fonts: lib/pdf/browser-fonts.ts → /api/document-renderer/font/[weight]
   │
   └── Node:    renderDocumentPdfBuffer() → renderToBuffer
          lib/pdf/render-document.tsx
          fonts: lib/pdf/fonts.ts (fs paths to lib/pdf/fonts/*.ttf)
```

### Where each surface renders

| Surface | Entry | Data | Renderer |
|---|---|---|---|
| Step 2 live preview (draft) | `app/[locale]/create/[document_id]/2/page.tsx` → `Step2Screen` → `Step2PreviewPanel` | `getStep2DocumentData()`; client-side projections via `withTemporaryDocumentItem` / `withEditedDocumentItem` / `withPersistedDocumentItems` (`lib/documents/document-preview-state.ts`) | Browser `DocumentPdfPreview`, 650 ms debounce, re-render keyed on `JSON.stringify(preview)` |
| Step 3 preview (draft) | `.../3/page.tsx` → `Step3Screen` → `Step3Main` | `getDocumentPreview()` | Browser `DocumentPdfPreview` (+ zoom overlay, second instance) |
| Step 3 view mode (**finalized**) | same page, `status !== 'draft'` | `getDocumentPreview()`, **same live read** | **Browser re-render**, not the archived PDF |
| Documents list, detail panel | `components/documents/doc-detail.tsx` | `DocumentListItem` + items | No document rendering. HTML summary (`PositionsList`) plus an "Open PDF" link to the PDF route |
| Download / share / "Open PDF" | `GET /api/documents/[document_id]/pdf` (`useShareDocument` preloads it on mount) | `getDocumentPreview()` | Archive first, otherwise Node render (see §2) |
| Dev harness | `/[locale]/renderer-spike`, `/api/renderer-spike/pdf` (`NODE_ENV=development` only) | `components/renderer-spike/sample-documents.ts` | Same `DocumentPdf` |

**Invoices and quotes share one renderer.** `docType` only switches strings and blocks
inside the view model: title, number label, recipient label, sum label, closing text,
`paymentText` (invoice only), `validUntilValue` (quote only), and service timing.

**Preview and PDF use the same component tree.** The only differences are font loading
(URL in the browser, fs path in Node) and where the logo bytes come from (both get the same
server-prepared `PdfLogo` data URL). E2E `package-08-final-parity.spec.ts` asserts identical
page count, page sizes and per-page text between the step 2 browser PDF and the archived
PDF.

### Line items and totals

- `document_items` rows → `toDocumentItem()` (`lib/repositories/document-item-mappers.ts`)
  or `toDraftItem()` → `toDocumentItems()`. Both drop `purchase_price`, `surcharge` and
  `surcharge_type`, so `DocumentItem` cannot carry margin data (hard rule 4).
- Document totals in `DocumentPreview` are **recomputed in TypeScript from the item rows**
  via `calculateDocumentTotals()` (`lib/documents/tax.ts`). The stored
  `documents.subtotal_amount/tax_amount/total_amount` are **not** read by the renderer. For
  finalized documents this is consistent, because `finalize_document` recomputes items
  authoritatively and the item-history trigger freezes them.
- `buildPdfViewModel` formats everything (de-DE money and dates, `"{amount} {unit}"`, tax
  rate text) into a flat `PdfViewModel`. The renderer itself does almost no logic. Page
  subtotals are the one exception (`calculatePageSubtotal`).

### §19 / VAT logic reaching the renderer

1. On draft creation, `getCompanyTaxSettings()` snapshots `companies.kleinunternehmer` →
   `documents.is_kleinunternehmer` and the resolved default rate →
   `documents.default_tax_rate` (0 if §19). Quote conversion and duplication
   (`scripts/quote-workflows.sql`) re-read the company settings at that moment.
2. Items carry an effective `tax_rate` (0/7/19) and `tax_rate_overridden`.
3. `shouldShowTaxDetails(isKleinunternehmer, items)` = `!§19 || any item taxRate > 0`.
4. The view model derives `showTaxDetails` (VAT column, net total, tax lines per
   `taxGroups`) and `showKleinunternehmerHinweis = isKleinunternehmer && !showTaxDetails`.
   The text is `DOKUMENT_DE.kleinunternehmerHinweis` (`lib/documents/document-de.ts`).
5. Layout reacts to `showTaxDetails` by switching column widths (`cDesc` vs `cDescNoVat`)
   **and** by switching pagination width budgets (34/36 vs 44/46 "units").

All legal decisions sit in the view model, not in the JSX. That is the main reason a
template layer can be added cleanly.

### Logos

- `companies.logo_url` is a public URL in bucket `company-logos`. Each upload goes to an
  **immutable path** `<companyId>/<uuid>.<ext>` (`saveCompanyLogo`). The previous logo is
  deleted only if no finalized document references it
  (`isLogoReferencedByFinalizedDocument`, fails closed).
- `finalize_document` copies `companies.logo_url` → `documents.logo_url_snapshot` and sets
  `logo_snapshot_captured = true`. The preview repository then uses the snapshot for
  captured documents and the live company logo for drafts.
- `loadPdfLogo(url)` runs server-side in the step 2/3 pages and in `archiveDocumentPdf`. It
  only accepts URLs from the configured Supabase bucket, enforces the size limit, and
  rasterizes PNG/JPEG/SVG with `sharp` (`lib/company-logo/process`). It returns a data URL.
  On any failure it returns `null`, and the renderer falls back to the monogram
  (`deriveCompanyMonogram`).
- The snapshot freezes the logo **by reference**. Bytes are re-fetched and re-processed on
  every render.

### Multi-page documents

Pagination is **explicit and planned before rendering**, not left to React-PDF auto-wrap:

- `paginatePdfRows()` estimates row heights from hard-coded constants:
  `FIRST_PAGE_ROW_HEIGHT = 355`, `CONTINUATION_PAGE_ROW_HEIGHT = 550`,
  `SUMMARY_HEIGHT = 200`, row padding and line heights. Text widths come from a
  character-unit heuristic tuned to Hanken Grotesk (`wrapPdfCellText`).
- Long `additional_description_de` texts are split into continuation fragments
  (`isContinuation`). Only the first fragment shows position, quantity and price.
- Every page repeats the table header and the absolutely positioned footer
  (`foot: { position: "absolute", bottom: 40 }`). Continuation pages get a short header
  (company name + title). Non-final pages show a "Zwischensumme" for rows starting on that
  page. The final page reserves room for totals, the §19 note and payment text.
- Each page body is `wrap={false}`: React-PDF must never break pages itself. If the
  estimates are wrong, content overflows instead of flowing.
- There are no page numbers ("Seite x von y").

---

## 2. Current PDF / archive pipeline

```
finalizeDocument() server action           lib/documents/finalize-actions.ts
  1. getDocumentPreview → status=draft && canFinalizePreview (dokument-pflicht)
  2. finalizeDocumentRpc → SQL finalize_document()
       - FOR UPDATE lock, validations, authoritative item/total recompute
       - get_next_document_number → "R-YYYY-NNN" / "A-YYYY-NNN"
       - status='finalized', totals, logo_url_snapshot, logo_snapshot_captured
  3. best effort: getDocumentPreviewFresh → archiveDocumentPdf(preview)
       - loadPdfLogo → renderDocumentPdfBuffer → uploadDocumentPdf (upsert: true)
       - errors are logged, never thrown

GET /api/documents/[id]/pdf                 runtime nodejs, force-dynamic
  getDocumentPreview (auth + company scope) → 404 for drafts / no number
  getOrArchiveDocumentPdf(preview)          lib/pdf/pdf-storage.ts
     ├─ downloadDocumentPdf(id)  → non-empty archive bytes → returned as is
     └─ else archiveDocumentPdf(preview) → render now, upload, return
```

- Storage: private bucket `documents`, object `<document-id>.pdf`, written and read only
  with the **service-role** client (`lib/repositories/document-pdfs.ts`). There are no
  storage policies. Authorization comes from the route's `getDocumentPreview` check.
- Archive-first: when an archive object exists, its bytes win, whatever the current data or
  code says. That is the GoBD anchor.
- Self-healing: a missing or 0-byte archive is re-rendered **from the current DB state with
  the current code** and uploaded with `upsert: true`.
- No metadata is stored about the archive: no `archived_at`, no hash, no renderer or
  template version, no "archive is final" flag.
- Filename: `pdfFileName()` → `Rechnung_R-2026-041.pdf` / `Angebot_…`.
- Fonts in Node: `registerPdfFonts()` reads TTFs via `path.join(process.cwd(), "lib/pdf/fonts")`.
  `next.config.ts` `outputFileTracingIncludes` covers only
  `/api/documents/[document_id]/pdf` and `/api/document-renderer/font/[weight]`, see §5.6.

---

## 3. Current data model (rendering-relevant)

Reconstructed from `types/database.ts` and `scripts/*.sql` *(verify against live DB)*.

### `companies`

| Column | Used by renderer? | Notes |
|---|---|---|
| `name`, `street`, `street_no`, `postcode`, `city` | yes | header, sender line, footer |
| `phone`, `email` | yes | header contact, footer |
| `director` | yes | footer "{director}, Inhaber" (label is fixed, whatever the legal form) |
| `steuernummer`, `ust_id` | yes | footer; Steuernummer wins, otherwise USt-IdNr., otherwise "—" |
| `bank_name`, `iban` | yes | footer + payment block |
| `payment_days` | yes | invoice payment text, due date = issue_date + payment_days |
| `logo_url` | yes (drafts) | finalized docs use `documents.logo_url_snapshot` |
| `legal_form`, `mobile`, `bic`, `account_holder` | selected, **not rendered** | |
| `fax`, `registergericht`, `handelsregister_nr` | not selected, not rendered | |
| `kleinunternehmer`, `default_tax_rate` | indirectly | snapshotted onto `documents` at draft creation |
| *template field* | — | **none exists** |

### `documents`

`id, company_id, customer_id, created_by, document_type (invoice|quote), document_number,
status (draft|finalized|sent|paid|cancelled), issue_date, service_date,
service_period_start, service_period_end, valid_until, customer_snapshot (jsonb),
subtotal_amount, tax_amount, total_amount, is_kleinunternehmer, default_tax_rate,
created_at, updated_at, paid_at, logo_url_snapshot, logo_snapshot_captured`

Constraints and triggers that matter:
- `protect_document_history` (latest version in `scripts/quote-workflows.sql`): once
  `status <> 'draft'`, **every column except `status`, `paid_at`, `updated_at` is
  immutable**. Leaving draft is only allowed under `zackzack.finalizing = 'on'`. The final
  trigger version **no longer honors** the `zackzack.migrating` bypass that the
  quote-workflow migration used temporarily.
- CHECKs on totals, `valid_until` vs type, quote not payable, default_tax_rate ∈ {0,7,19}.
- Documents are also inserted by SQL with explicit column lists: `convert_quote_to_invoice`
  and `duplicate_quote`.

### `document_items`

`id, document_id, company_id, service_id, position, description_de,
additional_description_de, amount, unit, unit_price, total_amount, tax_rate,
tax_rate_overridden, tax_amount, gross_amount, purchase_price*, surcharge*,
surcharge_type*, created_at` (* = strictly internal)

`protect_document_item_history` rejects any insert, update or delete unless the parent
document is a draft.

### Related
- `number_sequences` (numbering, untouched by templates), `document_relations`
  (quote → invoice links).
- Storage buckets: `company-logos` (public), `documents` (private PDF archive).

---

## 4. Live vs frozen data

| Data | Draft | Finalized | Mechanism |
|---|---|---|---|
| Document number, dates, `valid_until`, service timing | editable | **frozen** | `documents` row + history trigger |
| Recipient | snapshot (written in step 1) | **frozen** | `documents.customer_snapshot` |
| Line items (text, qty, unit, price, tax) | editable | **frozen** | `document_items` + item trigger; `description_de` is copied from catalog |
| Totals | derived | **frozen** (in rows; renderer re-derives from items) | `finalize_document` recompute |
| §19 flag, document default tax rate | snapshot at draft creation | **frozen** | `is_kleinunternehmer`, `default_tax_rate` |
| Logo | **live** (`companies.logo_url`) | **frozen by URL** | `logo_url_snapshot` at finalize; bytes re-fetched per render |
| Company name, address, phone, email, director | **live** | **live** ⚠ | read from `companies` on every render |
| Steuernummer / USt-IdNr. | **live** | **live** ⚠ | same |
| Bank name, IBAN | **live** | **live** ⚠ | same |
| `payment_days` → payment text and due date | **live** | **live** ⚠ | same |
| Layout, styles, labels, fonts, pagination | **code** | **code** ⚠ | whatever is deployed at render time |
| Archived PDF bytes | n/a | **frozen** (when present) | Storage `documents/<id>.pdf` |

So a finalized document is fully frozen **only as archived bytes**. Its *data* is
partially frozen (everything except seller master data). Its *presentation* is not
frozen at all.

---

## 5. Existing weaknesses that matter for templates

1. **Seller master data is read live for finalized documents.** If the company changes
   address, bank or tax number, any re-render of a finalized document shows the new values.
   This affects the step 3 view mode and the self-healing archive path. Comments in
   `pdf-storage.ts` and the route ("eingefrorener Snapshot") overstate what is frozen.
2. **Step 3 view mode re-renders finalized documents in the browser** instead of showing
   the archived bytes. As soon as a template, style, font or company field changes, what
   the user sees on screen differs from the PDF the customer received.
3. **The archive is best effort and has no provenance.** A failed upload at finalize means
   the first `GET` renders later with whatever code and data exist then. No record says
   which renderer, template or version produced an archive object. `upsert: true` means any
   future caller of `archiveDocumentPdf` would silently overwrite the legal artifact.
4. **Pagination is hard-wired to the current layout.** The page budgets (355/550/200 pt),
   row padding, line heights and column "unit" widths in `document-pages.ts` encode the
   current header height, footer height, column widths and font metrics. A template with a
   taller header, a different footer or different columns would overflow or leave gaps,
   because page bodies are `wrap={false}`.
5. **`DocumentPdf` is a single monolith.** View-model building, pagination and layout all
   happen inside one component. Legally required blocks (§19 note, tax lines, totals,
   Steuernummer, number and date) are placed by layout JSX. A second template written by
   copy-paste could drop a mandatory block without any test noticing. There are no
   per-template "mandatory content" contract tests; package-08 checks text only for the
   one existing layout.
6. **Fonts:** there is one family (`PDF_FONT_FAMILY = "ZackZack Sans"`, Hanken Grotesk
   regular and bold). `Font.register` is process-global. The browser font route whitelists
   exactly two files. `outputFileTracingIncludes` covers only the PDF route and the font
   route. **The finalize server action also renders (`archiveDocumentPdf`), and it runs in
   the `/[locale]/create/[document_id]/3` function, for which the fonts are not traced.**
   On Vercel this probably makes archive-at-finalize fail and leaves archiving to the
   first PDF route call. The share hook triggers that call within seconds, so the effect is
   hidden *(unverified; check Vercel logs for `[finalizeDocument] pdf archive failed`)*.
   New template fonts would multiply this.
7. **Styles are one flat module with hard-coded colors** (`INK`, `HEAD`, `ACCENT`, …). There
   are no theme tokens to vary per template.
8. **The renderer has no template input.** Neither `DocumentPreview`, `DocumentPdf` nor
   the DB has any template notion. The preview debounce key (`JSON.stringify(preview)`)
   would not notice a template change passed as a separate prop unless it is added to the
   memo dependencies.
9. **The seller side is not part of the Pflicht check.** `pruefeDokumentPflicht` checks
   date, positions, validity and recipient. It never checks Steuernummer/USt-IdNr. or
   seller address; the renderer prints "—". Templates must not make this worse, for example
   by hiding the tax-number line when it is empty.
10. **Minor determinism gaps between browser and server.** `formatDateDE` uses
    `new Date(iso).toLocaleDateString` in the runtime time zone. A browser in a negative UTC
    offset would show the previous day, while the server (UTC) does not. Logo bytes depend
    on the `sharp` version. Both only matter where a re-render is compared to an archive.
11. **The logo snapshot backfill may not have applied.** `scripts/document-logo-snapshot.sql`
    updates finalized rows without any trigger bypass. Against the current
    `protect_document_history` that `UPDATE` would raise `finalized_document_immutable`.
    It only works if it ran before the trigger existed *(verify:
    `select count(*) from documents where status <> 'draft' and not logo_snapshot_captured`)*.

---

## 6. Recommended insertion point for a template abstraction

**Insert the template layer between `buildPdfViewModel` and the React-PDF primitives,
inside `lib/pdf/`. Keep `DocumentPreview` → `PdfViewModel` as the template-agnostic
contract.**

```
DocumentPreview (+ template: { id, version })        ← resolved server-side
   │
   ▼
buildPdfViewModel(preview)        UNCHANGED, owns all legal/content decisions
   │
   ▼
resolveTemplate(id, version) → DocumentTemplate
   {
     id, version,
     styles,                       // per-template StyleSheet / tokens
     metrics: PaginationMetrics,   // page budgets, row heights, column units
     Page frame components:        // Header, Parties, Continuation head,
                                   // ItemsTable, PageSubtotal, Totals, Footer
   }
   │
   ▼
DocumentPdf({ preview, logo })    thin orchestrator:
   pages = paginatePdfRows(vm.rows, vm.showTaxDetails, template.metrics)
   render template components per page, in a fixed slot order
```

Design points:
- **Template identity travels inside `DocumentPreview`.** Add `template: { id, version }`
  there, set by `loadDocumentPreviewData` in `lib/repositories/document-previews.ts`. That
  is already the single place that decides live vs snapshot (it does the same for the
  logo). Browser preview, step 3, archive and self-heal then all get the template without
  new plumbing. Because the debounce key is `JSON.stringify(preview)`, template changes
  re-render automatically.
- **Templates own presentation only.** Content and legality stay in `buildPdfViewModel` and
  the slot order: header → parties/meta → title → items → (page subtotal | totals → §19
  note → payment → closing) → footer. A template may restyle or rearrange *within* a slot.
  It may not drop slots. Consider rendering the legal text blocks (`Totals`, §19 note,
  payment text) through shared components that templates can only style.
- **Parameterize pagination**, do not duplicate it: `paginatePdfRows(rows, showTaxDetails,
  metrics)`. The current constants become `standard` metrics.
- **The template registry is code**, a map of `id → { [version]: DocumentTemplate }`.
  Published versions are append-only.
- Keep one font family at first. Templates vary colors, spacing, header arrangement, logo
  placement and table styling. This avoids the font tracing and browser font route issues
  and keeps Turkish glyph coverage proven.

---

## 7. Code reusable unchanged

| Area | Files |
|---|---|
| Tax / §19 / totals | `lib/documents/tax.ts`, `lib/documents/margin.ts` |
| Draft preview projections | `lib/documents/document-preview-state.ts` |
| Legal checks | `lib/legal/dokument-pflicht.ts`, `lib/documents/finalize-validation.ts` |
| Numbering and finalization | `scripts/finalize_document.sql` (only extended later for template snapshot), `finalize-actions.ts` |
| Content / view model | `lib/pdf/pdf-view-model.ts` (as is), `lib/documents/document-de.ts` labels |
| Item mappers (margin stripping) | `lib/repositories/document-item-mappers.ts` |
| Logo pipeline | `lib/pdf/document-logo.ts`, `lib/pdf/pdf-logo.ts`, logo storage in `companies.ts` |
| Fonts | `lib/pdf/fonts.ts`, `browser-fonts.ts`, `pdf-font-family.ts`, font route |
| Archive | `lib/pdf/pdf-storage.ts`, `lib/repositories/document-pdfs.ts`, PDF route (apart from the hardening in phase 0) |
| Browser preview shell | `document-pdf-preview.tsx`, `-loader.tsx`, `step2-preview-panel.tsx` |
| Share / filename | `use-share-document.ts`, `pdf-filename.ts`, `share-message.ts` |
| Text wrapping heuristic | `wrapPdfCellText` (valid while the font stays Hanken Grotesk) |
| Harness / tests | `renderer-spike` harness, e2e packages 02–09, `pdf-view-model.test.ts` |

To be refactored, not rewritten: `lib/pdf/document-pdf.tsx` (split into orchestrator and a
`standard` template), `lib/pdf/document-pdf.styles.ts` (becomes `standard` styles),
`lib/pdf/document-pages.ts` (metrics as a parameter).

---

## 8. Risks around finalized documents and archived PDFs

1. **Never re-render or overwrite an existing archive because a template changed.**
   Archive bytes are the Beleg. Introducing templates must not add any "regenerate archive"
   path. Change `uploadDocumentPdf` to `upsert: false`, and allow overwriting only for the
   0-byte repair case, explicitly.
2. **The self-heal path renders with today's code.** If a finalized document has no
   archive, the fallback render uses the current template code, current company data and
   current fonts. Mitigations: freeze `template_id` and `template_version` on the document,
   keep every published template version in code permanently, freeze seller data (phase 0),
   and make archive-at-finalize reliable so the fallback becomes rare.
3. **Historical archives predate templates.** Older archives were produced by earlier
   layouts (e.g. the now-deleted `lib/pdf/invoice-document.tsx`). A finalized document
   without a template snapshot must not be labelled as if it were produced by `standard@1`.
   Treat `template_id IS NULL` on a finalized row as "legacy, archive authoritative".
   Re-render it with `standard@1` only as a last-resort fallback.
4. **The immutability trigger blocks backfills.** `ALTER TABLE … ADD COLUMN` (nullable, or
   with a constant default) does not fire row triggers and is safe. Any `UPDATE` of
   finalized rows raises `finalized_document_immutable`, and the final trigger version has
   no migration bypass. So prefer a **nullable column plus a code-level legacy rule** over a
   backfill. If a backfill is ever needed, follow the `quote-workflows.sql` pattern
   (temporary trigger version with `zackzack.migrating`, inside a transaction) and restore
   the strict version.
5. **Do not exempt the new columns in the trigger.** Template columns must be protected
   like everything else. Do not add them to the `status/paid_at/updated_at` exemption list.
6. **The step 3 view mode shows a live re-render** (weakness 2). With templates this
   becomes a guaranteed divergence. Finalized documents should display the archived PDF.
7. **Quote → invoice conversion and duplication** insert drafts with explicit column lists.
   A new `documents.template_id` will be NULL there, meaning "inherit the company default".
   That is the desired behaviour, but it should be deliberate and tested.

---

## 9. Where template id / version should live

**Recommendation: both, with different meanings.**

| Location | Column(s) | Meaning |
|---|---|---|
| `companies` | `document_template_id text NOT NULL DEFAULT 'standard'` | The company's **choice** for new documents. No version: drafts always use the latest version of the chosen template. |
| `documents` | `template_id text NULL`, `template_version smallint NULL` | The **frozen** template used for this Beleg. Written atomically by `finalize_document`, like `logo_url_snapshot`. |

Resolution rule, implemented once in `loadDocumentPreviewData`:
- **Draft:** `documents.template_id ?? companies.document_template_id`, at the latest
  version. A non-null draft value is reserved for a later per-document override. A settings
  change is then visible immediately in open drafts, which matches how the logo behaves.
- **Finalized with snapshot:** `(template_id, template_version)` exactly.
- **Finalized without snapshot (legacy):** archive is authoritative; fallback render uses
  `standard@1`.

Why not company-only: re-rendering a finalized document would follow later settings
changes. Why not document-only, set at draft creation: settings changes would not reach
existing drafts, and every insert path (`insertDraftDocument`, `convert_quote_to_invoice`,
`duplicate_quote`) would need to copy it. Freezing at finalization mirrors the logo and has
exactly one writer.

Validation: a text slug checked against the code registry plus a DB `CHECK`
(`IN ('standard', …)`) is enough while templates live in code. A `document_templates` lookup
table only pays off if ZackZack_Admin is meant to manage availability. That is an open
product question; this analysis did not inspect ZackZack_Admin.

---

## 10. Recommended implementation phases

**Phase 0: harden the frozen-document path (no templates, no visual change)**
1. Step 3 view mode for `status !== 'draft'` displays the archived PDF
   (`/api/documents/[id]/pdf`) instead of a browser re-render.
2. Fix or verify font availability for the finalize server action, so that
   archive-at-finalize actually happens (tracing include for the step 3 route, or archive
   through a traced route).
3. Freeze seller data: `documents.company_snapshot jsonb`, written by `finalize_document`,
   including `payment_days`. The preview repository reads it for finalized documents, the
   same way `customer_snapshot` works. *(DB change; needs SQL tests.)*
4. Archive safety: `upsert: false` except the explicit 0-byte repair. Optionally record
   `pdf_archived_at` and a SHA-256.
5. Verify that the logo snapshot backfill applied (weakness 11).

**Phase 1: extract `standard` without visual change**
- Introduce the `DocumentTemplate` type, the registry and `standard@1`, built from the
  current `document-pdf.tsx`, styles and pagination constants.
- `paginatePdfRows(..., metrics)`. `DocumentPreview.template` is always `standard@1` for now.
- Gate: all unit tests plus e2e package-08 pass unchanged. Add a golden test showing that
  page count and per-page text of fixture documents (single page, 36 rows, long
  description, §19, mixed VAT, quote) are identical before and after.

**Phase 2: persistence**
- Columns per §9, `types/database.ts`, `finalize_document` writes the snapshot,
  `loadDocumentPreviewData` resolution rule, legacy rule. SQL tests in the style of
  `lib/documents/finalize-document-sql.test.ts`. No backfill.

**Phase 3: second template + selection**
- Second template with its own metrics, same font family.
- Per-template **contract tests**: for each template × {invoice, quote} × {§19, 19 %,
  mixed}, the rendered text contains number/date, seller, recipient, the tax-number line,
  totals, the §19 note when expected, and payment text for invoices. It never contains
  Einkaufspreis, Aufschlag or Marge. Plus pagination overflow tests with long fixtures.
- Selection UI: the settings screen is deleted in the current working tree, so where the
  company picks a template (this app vs ZackZack_Admin) is a product decision. Any UI in
  this app needs i18n keys in de/tr/ar and RTL verification.

**Phase 4 (optional)**
- Per-document override in step 3 (writes `documents.template_id` on the draft), template
  thumbnails, additional fonts (each requires Node registration, browser font route
  whitelist, tracing includes and glyph tests for Turkish).

---

## Appendix A — Docs vs code discrepancies

- `CLAUDE.md` lists flow components under `components/documents/create/`; they are in
  `components/create/{1,2,3}/`.
- `CLAUDE.md` says the fonts need `outputFileTracingIncludes`. Only the PDF route and the
  font route are covered, not the finalize server action (weakness 6).
- `pdf-storage.ts` and the PDF route call the rendered input a "frozen snapshot". Seller
  data is live (weakness 1).
- `document-pdf.styles.ts` and `fonts.ts` refer to mirroring the "A4-HTML-Vorschau
  (step3.css)". That HTML preview no longer exists in the working tree.
- `step3-main.tsx` header comment says "PDF/Teilen folgt im nächsten Schritt". Sharing is
  implemented.
- `types/database.ts` claims to match the real schema as of 2026-07. Columns added since
  (`logo_url_snapshot`, `service_period_*`, `additional_description_de`) are present in the
  type, but the live schema was not re-verified here.
