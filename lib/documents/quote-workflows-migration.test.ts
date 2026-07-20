import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "scripts", "quote-workflows.sql"),
  "utf8",
);
const finalize = readFileSync(
  join(process.cwd(), "scripts", "finalize_document.sql"),
  "utf8",
);

describe("Angebots-Workflow-SQL", () => {
  it("modelliert Gueltigkeit und Rechnung-only-Zahlungen ohne neuen Dokumentstatus", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS valid_until date");
    expect(migration).toContain("documents_quote_not_payable");
    expect(migration).not.toContain("ALTER TYPE public.document_status_enum");
  });

  it("speichert Umwandlung unveraenderbar und eindeutig", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.document_relations");
    expect(migration).toContain("document_relations_one_invoice_per_quote");
    expect(migration).toContain("document_relation_immutable");
    expect(migration).toContain("ON DELETE RESTRICT");
    expect(migration).toContain(
      "GRANT SELECT ON TABLE public.document_relations TO authenticated",
    );
  });

  it("kopiert Dokument, Positionen und Relation in einer SQL-Funktion", () => {
    const body = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice"),
      migration.indexOf("CREATE OR REPLACE FUNCTION public.duplicate_quote"),
    );
    expect(body).toContain("FOR UPDATE");
    expect(body).toContain("INSERT INTO public.documents");
    expect(body).toContain("INSERT INTO public.document_items");
    expect(body).toContain("INSERT INTO public.document_relations");
    expect(body).toContain("conversion_preview_stale");
    expect(body).toContain("expired_quote_confirmation_required");
  });

  it("bewahrt explizite Steuersaetze und nutzt sonst den aktuellen Standard", () => {
    expect(migration).toContain(
      "CASE WHEN i.tax_rate_overridden THEN i.tax_rate ELSE v_default_rate END",
    );
  });

  it("erzwingt die Warnbestaetigung auch in der Finalisierungs-RPC", () => {
    expect(finalize).toContain("p_confirm_expired_quote boolean DEFAULT false");
    expect(finalize).toContain("expired_quote_confirmation_required");
    expect(finalize).toContain("valid_until_before_issue_date");
  });
});
