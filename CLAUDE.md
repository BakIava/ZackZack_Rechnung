# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

**Zack Zack Rechnung** — PWA zur rechtssicheren Erstellung von Rechnungen und Angeboten für kleine Handwerksbetriebe.

Bediensprache **DE / TR / AR** (Arabisch mit RTL), Dokumentsprache **immer Deutsch**. Zielgruppe: Kleinunternehmer nach §19 UStG bis ~10 Mitarbeiter, oft nicht tech-affin, mit Sprachbarriere — Migranten in Deutschland mit A1/A2-Deutsch.

**Kernprinzip:** Bedienung in der eigenen Sprache, fertiges PDF auf Deutsch, Versand per WhatsApp/E-Mail oder Ausdruck.

## Commands

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build (inkl. Serwist-SW-Bundling)
npm run preview      # next start
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest: lib/**/*.test.ts + messages/**/*.test.ts
npm run test:watch   # Vitest im Watch-Modus
npm run icons        # PWA-Icons generieren (scripts/generate-icons.cjs)
```

Node ≥ 22. Deployment: Vercel, Region `fra1` (neben Supabase eu-central-1).

## Tech-Stack & Architektur

- **Next.js 15 App Router** (kein `src/`-Verzeichnis; Alias `@/*` → Repo-Root), TypeScript strict.
- **Supabase** über `@supabase/ssr`: Server-Client (`lib/supabase/server`), Browser-Client (`lib/supabase/client`), Admin-Client (`lib/supabase/admin`, Service-Role — nur Onboarding + PDF-Archiv). Auth = E-Mail-OTP; die Middleware refresht Tokens vor dem Rendern. `getCurrentUser()`/`getCurrentCompanyId()` (`lib/supabase/auth.ts`) sind per `react/cache` requestweit memoisiert — keine eigenen `auth.getUser()`-Roundtrips in Queries.
- **RLS** scoped alle Tabellen auf die Firma des eingeloggten Users. Manche Reads filtern zusätzlich explizit auf `company_id`, manche verlassen sich nur auf RLS — bestehende Query-Formen nicht „vereinheitlichen", ohne die Policies zu kennen.
- **DB-Schema** wird im Supabase-Dashboard gepflegt; SQL-Funktionen und Migrations-Snippets liegen unter `scripts/*.sql` (`finalize_document`, `get_next_document_number`, `complete_onboarding`, Bucket-Anlage). Enum-Werte (gegen `pg_enum` verifiziert): `document_type_enum = invoice | quote`, `document_status_enum = draft | finalized | sent | paid | cancelled`; die TS-Unions in `types/database.ts` entsprechen exakt der DB. **„Angebot" heißt technisch `quote`** — nur UI-Labels übersetzen (`t("offer")`), niemals `"offer"` als Datenwert verwenden.
- **i18n:** next-intl unter `/[locale]/` (`i18n/routing.ts`, `messages/{de,tr,ar}.json`). Ein Paritätstest (`messages/messages.test.ts`) erzwingt identische Schlüsselmengen in allen drei Sprachen.
- **PWA (Serwist):** App-Shell + `/api/{catalog,customers,settings}`-Platzhalter werden offline gecacht (`app/sw.ts`); diese drei API-Routen liefern statische Platzhalterdaten und existieren nur als Offline-Cache-Ziele. **Offline-Schreiben (Entwurf ohne Netz anlegen/synchronisieren) ist NICHT implementiert** — Schreibpfade laufen über Server-Actions und brauchen Netz.
- **PDF:** serverseitig mit `@react-pdf/renderer` (`lib/pdf/`), Fonts werden zur Renderzeit per fs gelesen (`outputFileTracingIncludes` in `next.config.ts` beachten). Finalisierte Belege werden zusätzlich als PDF im privaten Storage-Bucket archiviert (GoBD-Gedanke, 10 Jahre; `lib/repositories/document-pdfs.ts`).

### Verzeichnisstruktur

```
app/[locale]/
  (app)/{dashboard,documents,customers,catalog,settings}/   # Hauptseiten, teilen Layout (AppShell + Sidebar)
  create/[document_id]/{1,2,3}/                             # 3-Schritt-Flow (eigenes Layout: Draft-Guard, force-dynamic)
  login/  setup/  page.tsx                                  # außerhalb der App-Shell
app/api/documents/[document_id]/pdf/                        # echte PDF-Route (Archiv-first)
components/
  documents/create/   # ALLE Flow-Komponenten (Schritt 1–3)
  layout/             # app-shell, sidebar (+ zugehöriges CSS)
  ui/                 # Primitives mit Barrel-Export (siehe unten)
  shared/             # feature-lose Bausteine
  dashboard/ documents/ customers/ catalog/ settings/ login/ setup/
lib/
  repositories/       # EINZIGER Ort mit supabase.from()/.rpc()/storage (siehe Datenzugriff)
  documents/ customers/ services/ settings/ auth/ onboarding/  # dünne Server-Actions + Domänenlogik
  legal/  pdf/  supabase/  katalog/  dashboard/
types/                # Single Source of Truth aller Entitäts-Typen
i18n/  messages/  scripts/
```

### Flow

Rechnung und Angebot teilen denselben geführten 3-Schritt-Flow (Kunde → Positionen → Vorschau/Versand), unterschieden per `docType: "invoice" | "quote"`. Drafts sind persistent (`documents.status = 'draft'`); leere Drafts werden wiederverwendet bzw. nach 30 min aufgeräumt. Schritt 1 (Kunde) ist überspringbar — Empfängerangaben werden betragsabhängig erst über 250 € brutto Pflicht (§ 33 UStDV).

## Types — eine Quelle der Wahrheit

- Alle Entitäts-Typen liegen unter `types/` (`database.ts`, `document.ts`, `customer.ts`, `company.ts`, `service.ts`). **Keine Entitäts-Interfaces in Komponenten, Actions oder Repositories definieren** — importieren und per `Pick`/`Omit` ableiten.
- `types/database.ts` enthält handgeschriebene Row-Typen des Supabase-Schemas (generierte Typen existieren nicht im Repo). Bei Schema-Änderungen zuerst dort nachziehen. Sobald Projektzugriff besteht: durch `supabase gen types typescript` ersetzen.
- Lokale Props-Interfaces (`XyzProps`) und Action-Result-Envelopes bleiben bei ihrer Datei — nur *Entitäts*-Formen gehören nach `types/`.

## Datenzugriff — Repository-Pattern

- `lib/repositories/` ist die **einzige** Stelle mit `supabase.from()`, `.rpc()` oder `storage.*` (Ausnahme: `lib/supabase/` als Auth-Infrastruktur). Ein Modul pro Entität; Funktionen klar benannt, typisiert, ein Zweck.
- Server-Actions (`"use server"`, `lib/<domain>/actions.ts` u. ä.) bleiben dünn: Validierung, Fehler-Mapping, `redirect`/`revalidate` — Datenzugriff nur über Repositories. `"use server"`-Dateien dürfen ausschließlich async-Funktionen exportieren.
- Client-Komponenten rufen Server-Actions oder explizite Client-Repositories (`*.client.ts`, Browser-Client) — niemals direkt Supabase.
- Admin-Client (Service-Role, umgeht RLS) nur in Repositories und nur wo zwingend: Onboarding (users-Zeile existiert noch nicht) und privater PDF-Bucket.
- RPC-Aufrufe (`finalize_document`) werden im Repository gekapselt; rohe Postgres-Fehlermeldungen dort nicht durchreichen, sondern in der Action auf stabile Fehlercodes mappen.

## Domänen-Logik

### §19 Kleinunternehmer (Default)
- §19-Betriebe sind **dauerhaft von der E-Rechnungs-Ausstellungspflicht befreit** → reiner PDF-Export ist zulässig. ZUGFeRD/XRechnung sind **nicht** MVP.
- `is_kleinunternehmer` wird beim Anlegen des Drafts als **Snapshot** aus den Firmen-Einstellungen übernommen (`documents.is_kleinunternehmer`).
- Der §19-Hinweis („Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.", exakter Wortlaut in `lib/documents/document-de.ts`) erscheint **automatisch** auf Vorschau und PDF, sobald das Flag gesetzt ist.
- **Noch nicht implementiert** (Ziel, nicht Ist): MwSt.-Ausweis für Nicht-§19-Betriebe (Opt-in pro Rechnung, Positionen 19 %/7 %, Netto/Steuer/Brutto-Aufschlüsselung). `document_items` hat dafür noch keine Steuerfelder. Nicht ohne ausdrückliche Freigabe bauen.

### Mehrsprachiger Katalog
Handwerker wählt die Leistung in seiner Sprache, aufs Dokument kommt **immer der deutsche Begriff**. Tabelle `services`: `description_de` (Pflicht) + `description_tr`/`description_ar`, UI-Modell `KatalogEintrag` (`types/service.ts`), Anzeige über `anzeigeName()` (`lib/katalog/anzeige.ts`). Beim Übernehmen in ein Dokument wird `description_de` als Snapshot in `document_items` kopiert — **Dokument-Rendering liest nie ein übersetztes Feld.**

### Fremdleistung mit Marge
Einkaufspreis (inkl. MwSt) + Aufschlag (`percent` in **Basispunkten**, 1250 = 12,50 %, oder `fixed` in Cents) → Verkaufspreis via `computeUnitPrice()` (`lib/documents/margin.ts`). `purchase_price`/`surcharge`/`surcharge_type` sind strikt intern; der View-Typ `DocumentItem` (`types/document.ts`) enthält sie bewusst nicht — **nur der Verkaufspreis erreicht Vorschau, DTO und PDF.**

### Pflichtangaben & Finalisierung
- §14-Check vor der Finalisierung: `pruefeDokumentPflicht()` (`lib/legal/dokument-pflicht.ts`), rein funktional und Supabase-frei. Empfängerangaben sind **betragsabhängig** (Kleinbetragsrechnung bis 250 € brutto, § 33 UStDV). Finalisieren ist erst möglich, wenn `istFinalisierbar()` grün ist.
- Nummernvergabe passiert **ausschließlich** in der SQL-Funktion `finalize_document` (SECURITY DEFINER, atomar über `number_sequences`, lückenlos pro Firma/Typ/Jahr) — niemals im Client oder in TypeScript. Format: `R-JJJJ-NNN` (Rechnung) / `A-JJJJ-NNN` (Angebot), z. B. `R-2026-041`.
- Finalisierte Dokumente sind eingefroren: Schritt 1+2 leiten bei `status != 'draft'` auf Schritt 3 (Ansichtsmodus) um.

### Legacy-Spec-Module — nicht für neuen Code verwenden
`lib/legal/rechnungsnummer.ts`, `lib/legal/mwst.ts`, `lib/legal/marge.ts`, `lib/legal/pflichtangaben.ts` (+ `components/ui/ampel-check.tsx`) sind frühe Spezifikations-Module ohne Produktions-Importeur; sie leben nur noch mit ihren Tests. Produktive Pendants: SQL-Nummernvergabe, `lib/documents/margin.ts`, `lib/legal/dokument-pflicht.ts`. Bei Arbeiten in diesen Bereichen die produktiven Module ändern; die Legacy-Module dürfen nach Produktentscheidung entfernt werden.

## Mehrsprachigkeit & RTL

- **Kein hartkodierter UI-Text.** Immer über next-intl (`messages/*.json`); neue Schlüssel in **allen drei** Sprachen anlegen, sonst schlägt der Paritätstest an. (Bekannte Altlast: `components/setup/translations.ts` pflegt ein eigenes Übersetzungsobjekt — nicht ausbauen, mittelfristig in `messages/` überführen.)
- Arabisch braucht volles RTL-Layout (`dir="rtl"`), nicht nur übersetzte Strings. RTL **früh** am Screen verifizieren, nicht am Ende.
- CSS ausschließlich mit **logischen Properties** (`margin-inline-start`, `inset-inline-end`, `text-align: start/end`) bzw. `[dir="rtl"]`-Selektoren — nie physisch (`left/right`, `pl-/pr-/ml-/mr-`).
- Dokumentinhalt (Vorschau + PDF) bleibt **immer LTR/Deutsch** (`lib/document-locale.ts`, `lib/documents/document-de.ts`), unabhängig von der Bediensprache.

## Design

Große Buttons, viel Icon/wenig Text, fehlertolerant, geführte Schritte, echte Beispieldaten statt Platzhalter („Yılmaz Malerbetrieb", „Familie Schneider"). Desktop-Layouts nach Design-Handoff; Latin- und Arabisch-Schrift (Hanken Grotesk + IBM Plex Sans Arabic) müssen sauber rendern. Vertrauenswürdiger Ton.

## Phase 2 (bewusst NICHT im MVP)

KI-Eingabe (Sprache/Text → Rechnungsentwurf, Preise nur aus Katalog), OCR für Fremdangebote, Angebotsstatus, Abschlags-/Schlussrechnung, **Mahnungen**, MwSt.-Ausweis für Nicht-§19 (s. o.), §19-Grenzwarnung (25.000 €/100.000 €), ZUGFeRD/XRechnung, SMS-Login, Bankanbindung (PSD2/XS2A), Offline-Schreibpfad mit Sync. **Nicht ohne ausdrückliche Freigabe implementieren.**

Bereits umgesetzt (nicht mehr Phase 2): Zahlungsstatus (bezahlt/überfällig via `paid_at` + Zahlungsziel), PDF-Langzeitarchiv im Storage.

---

## Code Style

### Benennung & Dateien
- **Dateien und Ordner in kebab-case** (`kunde-step.tsx`, `dokument-pflicht.ts`); Komponenten-Exporte bleiben PascalCase. Umbenennungen immer per `git mv` (Case-Sensitivity auf Linux/Vercel).
- Richtwerte Dateilänge: Route-Dateien ≤ 400 LOC, Komponenten/Hooks/Utils ≤ 300 LOC. Verbindlich für **neue** Dateien; wächst eine Datei durch eine Änderung über das Limit, erst auslagern. Bestandsdateien darüber (u. a. `customer-detail.tsx`, `catalog-master-detail.tsx`, `documents-main.tsx`, `lib/repositories/documents.ts`) beim nächsten **substanziellen** Umbau aufteilen — nicht bei jeder Kleinständerung.
- JSX-Blöcke > 40 Zeilen → eigene Komponente im Feature-Ordner.

### TypeScript
- Jede Komponente hat ein explizites Props-Interface direkt über der Komponente. **Keine `any`-Types.**
- Geld immer als ganzzahlige Cents (`number`, kein Float-Euro); formatiert wird erst bei der Anzeige (`lib/money.ts`, `lib/format.ts`).
- Entitäts-Typen: siehe „Types" oben.

### Route-Dateien (Next.js App Router)
Pages bleiben dünn: `params` auflösen, `setRequestLocale`, Daten über Repositories laden, an eine Screen-Komponente delegieren. Reihenfolge: Imports → Types → Segment-Config (`dynamic`, `runtime`) → Default-Export → `generateStaticParams`. Guards/Redirects gehören ins Layout bzw. an den Seitenanfang.

### CSS
- **Kein Inline-Style** — Tailwind-Klassen (v4, Theme via `@theme` in `globals.css`) oder komponentenlokale CSS-Datei. (Bekannte Altlasten in `setup/`/`settings/` nur beim ohnehin anstehenden Umbau der Datei bereinigen.)
- Jede Screen-/Feature-Komponente mit nennenswertem Styling hat ihre `.css` im selben Ordner und importiert sie selbst. **Keine zentrale Sammel-CSS-Datei**, die von Layouts oder mehreren Features importiert wird.
- `app/globals.css` enthält nur: Tailwind-Direktiven, Theme-Variablen (shadcn auf `:root` + App-Design-Tokens auf den `zz-*`-Scopes), Base-Layer. Kein komponentenspezifisches CSS.
- Gemeinsames App-Gerüst (`.dapp`, `.dmain`, `.dtopbar`, `.pill` …) liegt in `components/layout/app-shell.css` bzw. `sidebar.css` — dort erweitern statt Shell-Klassen in Screen-CSS zu duplizieren.
- RTL: nur logische Properties (siehe oben).

### UI-Primitives (`components/ui/`, Barrel-Import)
`Button`, `Input`, `StepHeader`, `LangSwitch` — immer aus dem Barrel importieren (`@/components/ui`), Texte via i18n, RTL-fest, Prop-Erweiterungen abwärtskompatibel. Realität: Die App-Screens folgen dem Design-Handoff mit eigenen Klassen; die Primitives werden bisher v. a. auf der Startseite genutzt. Vor dem Bau eines neuen generischen Bausteins prüfen, ob ein Primitive passt oder erweiterbar ist — Handoff-Screens nicht zwanghaft auf Primitives umbauen.

---

## Rechtssicherheit — harte Regeln

Diese Punkte sind **nicht verhandelbar** und in Tests abgesichert:

1. Dokumentnummern fortlaufend und **lückenlos**, vergeben ausschließlich beim Festschreiben durch `finalize_document` (SQL) — nie beim Anlegen, nie im Client.
2. §19-Hinweis automatisch auf dem Dokument, sobald `is_kleinunternehmer` gesetzt ist (= keine MwSt. ausgewiesen wird).
3. Pflichtangaben-Check (`dokument-pflicht.ts`) muss vor jeder Finalisierung grün sein.
4. Einkaufspreis/Marge erscheinen **niemals** im Dokument-DTO (`DocumentItem`), in der Vorschau oder im PDF.
5. Dokumentsprache **immer Deutsch**, unabhängig von der Bediensprache.
6. Finalisierte Dokumente sind unveränderbar; das archivierte PDF ist der Beleg (Archiv-first bei Abruf).

Änderungen an `lib/legal/`, `lib/pdf/`, `lib/documents/margin.ts`, dem Finalisierungspfad (`lib/repositories/documents.ts`) oder `scripts/*.sql` brauchen begleitende Tests.

## DSGVO

Personenbezogene Kundendaten sparsam halten, Verarbeitungsort dokumentieren (Supabase eu-central-1, Vercel fra1). **Keine personenbezogenen Daten in Logs** (auch kein `console.log` von Kunden-Objekten).

## Vor jedem Commit

`npm run typecheck`, `npx eslint .`, `npm run build` und `npm run test` müssen grün sein (die Suite ist klein und schnell — immer komplett laufen lassen).
Commits atomar halten: CSS-Änderungen von Komponenten-Änderungen trennen, i18n-Änderungen separat.
