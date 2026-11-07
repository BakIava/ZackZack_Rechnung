import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "scripts", "document-service-month.sql"),
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
const previewRepository = readFileSync(
  join(process.cwd(), "lib", "repositories", "document-previews.ts"),
  "utf8",
);

describe("Leistungsmonat-Migration", () => {
  it("ergaenzt die Markierung idempotent ohne Bestandszeilen umzuschreiben", () => {
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS service_period_is_month boolean NOT NULL DEFAULT false",
    );
    expect(migration).not.toMatch(/UPDATE\s+public\.documents/i);
  });

  it("erlaubt die Markierung nur fuer genau einen vollen Kalendermonat", () => {
    expect(migration).toContain("documents_service_month_full");
    expect(migration).toContain("NOT service_period_is_month");
    expect(migration).toContain(
      "service_period_start = date_trunc('month', service_period_start)::date",
    );
    expect(migration).toContain(
      "service_period_end = (date_trunc('month', service_period_start) + interval '1 month')::date - 1",
    );
  });

  it("speichert die Markierung mit der Leistungsangabe und setzt sie beim Angebot zurueck", () => {
    const timing = draftRepository.slice(
      draftRepository.indexOf("export async function setDraftInvoiceServiceTiming"),
      draftRepository.indexOf("export async function setDraftServiceLocation"),
    );
    expect(timing).toContain("service_period_is_month: timing.servicePeriodIsMonth");

    const docType = draftRepository.slice(
      0,
      draftRepository.indexOf("export async function setDraftInvoiceServiceTiming"),
    );
    expect(docType).toContain("service_period_is_month: false");
  });

  it("liest die Markierung fuer Liste, Entwurf und Vorschau", () => {
    expect(documentsRepository.match(/service_period_end, service_period_is_month/g)?.length).toBe(2);
    expect(documentsRepository.match(/servicePeriodIsMonth: Boolean\(/g)?.length).toBe(2);
    expect(previewRepository).toContain("service_period_end, service_period_is_month");
    expect(previewRepository).toContain("servicePeriodIsMonth: Boolean(doc.service_period_is_month)");
  });
});
