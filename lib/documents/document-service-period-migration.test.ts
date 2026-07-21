import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "scripts", "document-service-period.sql"),
  "utf8",
);
const draftRepository = readFileSync(
  join(process.cwd(), "lib", "repositories", "document-drafts.ts"),
  "utf8",
);
const documentsRepository = readFileSync(
  join(process.cwd(), "lib", "repositories", "documents.ts"),
  "utf8",
);
const quoteWorkflows = readFileSync(
  join(process.cwd(), "scripts", "quote-workflows.sql"),
  "utf8",
);

describe("Leistungszeitraum-Migration", () => {
  it("ergaenzt beide Spalten idempotent ohne Bestandszeilen umzuschreiben", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS service_period_start date");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS service_period_end date");
    expect(migration).not.toMatch(/UPDATE\s+public\.documents/i);
  });

  it("erzwingt Vollstaendigkeit, Reihenfolge und gegenseitigen Ausschluss", () => {
    expect(migration).toContain("documents_service_period_complete");
    expect(migration).toContain("service_period_start <= service_period_end");
    expect(migration).toContain("documents_service_timing_exclusive");
  });

  it("aktualisiert nur eigene Rechnungsentwuerfe", () => {
    const body = draftRepository.slice(
      draftRepository.indexOf("export async function setDraftInvoiceServiceTiming"),
      draftRepository.indexOf("export async function setDraftQuoteValidUntil"),
    );
    expect(body).toContain('.eq("company_id", companyId)');
    expect(body).toContain('.eq("document_type", "invoice")');
    expect(body).toContain('.eq("status", "draft")');
  });

  it("liefert die Leistungsangabe an die Dokumenten-Detailansicht", () => {
    expect(documentsRepository).toContain(
      "issue_date, service_date, service_period_start, service_period_end, valid_until",
    );
    expect(documentsRepository).toContain("servicePeriodStart:");
    expect(documentsRepository).toContain("servicePeriodEnd:");
  });

  it("startet konvertierte Rechnungen und duplizierte Angebote ohne Leistungsangabe", () => {
    expect(quoteWorkflows.match(/service_period_start/g)?.length).toBe(2);
    expect(quoteWorkflows.match(/service_period_end/g)?.length).toBe(2);
  });
});
