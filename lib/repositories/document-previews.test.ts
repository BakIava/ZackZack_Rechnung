import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  rows: {} as Record<string, unknown>,
  selects: [] as Array<[string, string]>,
}));

/** Minimaler PostgREST-Builder: jede Tabelle liefert ihre vorbereitete Zeile. */
function builder(table: string) {
  const chain = {
    select(columns: string) {
      h.selects.push([table, columns]);
      return chain;
    },
    eq: () => chain,
    maybeSingle: async () => ({ data: h.rows[table] ?? null }),
    order: async () => ({ data: h.rows[table] ?? [] }),
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: (table: string) => builder(table) }),
}));
vi.mock("@/lib/supabase/auth", () => ({ getCurrentCompanyId: async () => "company-1" }));
vi.mock("./document-relations", () => ({ getDocumentRelationsForOne: async () => [] }));

import { createDocumentPdfElement } from "@/lib/pdf/document-pdf";
import { ErhanExcelTemplate } from "@/lib/pdf/templates/erhan-excel/erhan-excel-template";
import { StandardTemplate } from "@/lib/pdf/templates/standard/standard-template";
import { DocumentTemplateError } from "@/lib/pdf/templates/template-catalog";
import { ThsClassicTemplate } from "@/lib/pdf/templates/ths-classic/ths-classic-template";
import { getDocumentPreviewFresh } from "./document-previews";

function documentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1", document_type: "invoice", document_number: null, status: "draft",
    issue_date: "2026-06-09", service_date: null, service_period_start: null,
    service_period_end: null, valid_until: null, customer_snapshot: null,
    subtotal_amount: 0, tax_amount: 0, total_amount: 0, is_kleinunternehmer: true,
    default_tax_rate: 0, logo_url_snapshot: null, logo_snapshot_captured: false,
    template_id: null, template_version: null,
    ...overrides,
  };
}

function companyRow(documentTemplateId: unknown) {
  return {
    name: "Musterbetrieb", legal_form: null, street: null, street_no: null, postcode: null,
    city: null, phone: null, mobile: null, fax: null, email: null, director: null,
    steuernummer: null, ust_id: null, bank_name: null, iban: null, bic: null,
    account_holder: null, logo_url: null, payment_days: 14,
    document_template_id: documentTemplateId,
  };
}

async function rendererFor(document: Record<string, unknown>, company: Record<string, unknown>) {
  h.rows = { documents: document, companies: company, document_items: [] };
  const preview = await getDocumentPreviewFresh("doc-1");
  return { preview, element: createDocumentPdfElement(preview!, null) };
}

beforeEach(() => {
  h.rows = {};
  h.selects = [];
});

describe("document-previews: Vorlagenauswahl aus der Datenbank", () => {
  it("liest Firmenwahl und Beleg-Snapshot mit", async () => {
    await rendererFor(documentRow(), companyRow("standard"));
    const columns = Object.fromEntries(h.selects);
    expect(columns.companies).toContain("document_template_id");
    expect(columns.documents).toContain("template_id");
    expect(columns.documents).toContain("template_version");
  });

  it("bestehende Firma (Default 'standard') → Standard-Renderer", async () => {
    const { preview, element } = await rendererFor(documentRow(), companyRow("standard"));
    expect(preview!.template).toEqual({ id: "standard", version: 1 });
    expect(element.type).toBe(StandardTemplate);
  });

  it("Firma mit ths-classic → THS-Renderer", async () => {
    const { preview, element } = await rendererFor(documentRow(), companyRow("ths-classic"));
    expect(preview!.template).toEqual({ id: "ths-classic", version: 1 });
    expect(element.type).toBe(ThsClassicTemplate);
  });

  it("Firma mit erhan-excel → ERHAN-Renderer", async () => {
    const { preview, element } = await rendererFor(documentRow(), companyRow("erhan-excel"));
    expect(preview!.template).toEqual({ id: "erhan-excel", version: 1 });
    expect(element.type).toBe(ErhanExcelTemplate);
  });

  it("finalisierter Beleg behält seinen Snapshot, auch nach Wechsel der Firmenwahl", async () => {
    const { preview, element } = await rendererFor(
      documentRow({ status: "finalized", document_number: "R-2026-001", template_id: "ths-classic", template_version: 1 }),
      companyRow("erhan-excel"),
    );
    expect(preview!.template).toEqual({ id: "ths-classic", version: 1 });
    expect(element.type).toBe(ThsClassicTemplate);
  });

  it("Altbeleg ohne Snapshot bleibt beim Standard-Renderer", async () => {
    const { element } = await rendererFor(
      documentRow({ status: "paid", document_number: "R-2025-001" }),
      companyRow("ths-classic"),
    );
    expect(element.type).toBe(StandardTemplate);
  });

  it("ein kaputter Firmenwert lässt das Laden eines Entwurfs scheitern statt still umzuschalten", async () => {
    h.rows = { documents: documentRow(), companies: companyRow("fancy"), document_items: [] };
    await expect(getDocumentPreviewFresh("doc-1")).rejects.toBeInstanceOf(DocumentTemplateError);
  });
});
