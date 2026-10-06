import { describe, expect, it } from "vitest";
import { DOCUMENT_TEMPLATE_IDS, type DocumentPreview } from "@/types/document";
import { createDocumentPdfElement } from "@/lib/pdf/document-pdf";
import { buildDocumentRenderData } from "@/lib/pdf/render-data";
import { StandardTemplate } from "./standard/standard-template";
import { ErhanExcelTemplate } from "./erhan-excel/erhan-excel-template";
import { ThsClassicTemplate } from "./ths-classic/ths-classic-template";
import {
  assertRenderableTemplate,
  DEFAULT_DOCUMENT_TEMPLATE,
  DOCUMENT_TEMPLATE_VERSIONS,
  DocumentTemplateError,
  latestDocumentTemplate,
  LEGACY_DOCUMENT_TEMPLATE,
} from "./template-catalog";
import {
  DOCUMENT_TEMPLATE_COMPONENTS,
  renderDocumentTemplate,
  resolveDocumentTemplate,
} from "./template-registry";

const preview: DocumentPreview = {
  id: "doc-1",
  docType: "invoice",
  status: "finalized",
  documentNumber: "R-2026-041",
  issueDate: "2026-06-09",
  serviceDate: null,
  servicePeriodStart: null,
  servicePeriodEnd: null,
  validUntil: null,
  isKleinunternehmer: true,
  defaultTaxRate: 0,
  netAmount: 48_000,
  taxAmount: 0,
  totalAmount: 48_000,
  taxGroups: [{ rate: 0, netAmount: 48_000, taxAmount: 0 }],
  company: {
    name: "Yılmaz Malerbetrieb", legalForm: null, street: null, streetNo: null,
    postcode: null, city: null, phone: null, mobile: null, website: null, fax: null, email: null,
    director: null, steuernummer: null, ustId: null, bankName: null, iban: null,
    bic: null, accountHolder: null, logoUrl: null, paymentDays: 14,
  },
  customer: null,
  items: [{
    position: 1, descriptionDe: "Innenanstrich", additionalDescriptionDe: null,
    amount: 1, unit: "psch", unitPrice: 48_000, totalAmount: 48_000,
    taxRate: 0, taxAmount: 0, grossAmount: 48_000,
  }],
  convertedInvoiceId: null,
  basedOnQuoteId: null,
  template: DEFAULT_DOCUMENT_TEMPLATE,
};

function templateError(fn: () => unknown): DocumentTemplateError {
  try {
    fn();
  } catch (error) {
    if (error instanceof DocumentTemplateError) return error;
    throw error;
  }
  throw new Error("expected DocumentTemplateError");
}

describe("Vorlagen-Registry – Standard bleibt Default", () => {
  it("Default und Altbelege rendern die bestehende Vorlage standard@1", () => {
    expect(DEFAULT_DOCUMENT_TEMPLATE).toEqual({ id: "standard", version: 1 });
    expect(LEGACY_DOCUMENT_TEMPLATE).toEqual({ id: "standard", version: 1 });
    expect(resolveDocumentTemplate(DEFAULT_DOCUMENT_TEMPLATE)).toBe(StandardTemplate);
    expect(latestDocumentTemplate("standard")).toEqual({ id: "standard", version: 1 });
  });

  it("der Beleg-Einstieg rendert ein Default-Dokument mit dem Standard-Layout", () => {
    const element = createDocumentPdfElement(preview, null);
    expect(element.type).toBe(StandardTemplate);
    expect(element.props).toEqual({ data: buildDocumentRenderData(preview, null) });
  });

  it("renderDocumentTemplate reicht genau die übergebenen Renderdaten an die Vorlage", () => {
    const data = buildDocumentRenderData(preview, null);
    const element = renderDocumentTemplate({ template: DEFAULT_DOCUMENT_TEMPLATE, data });
    expect(element.type).toBe(StandardTemplate);
    expect((element.props as { data: unknown }).data).toBe(data);
  });

  it("ths-classic@1 ist renderbar und hat ein eigenes Layout", () => {
    expect(latestDocumentTemplate("ths-classic")).toEqual({ id: "ths-classic", version: 1 });
    expect(resolveDocumentTemplate({ id: "ths-classic", version: 1 })).toBe(ThsClassicTemplate);
    const element = createDocumentPdfElement(
      { ...preview, template: { id: "ths-classic", version: 1 } },
      null,
    );
    expect(element.type).toBe(ThsClassicTemplate);
  });

  it("Katalog und Layout-Zuordnung stimmen exakt überein", () => {
    const fromCatalog = DOCUMENT_TEMPLATE_IDS.flatMap((id) =>
      DOCUMENT_TEMPLATE_VERSIONS[id].map((version) => `${id}@${version}`));
    expect(Object.keys(DOCUMENT_TEMPLATE_COMPONENTS).sort()).toEqual(fromCatalog.sort());
  });
});

describe("Vorlagen-Registry – sicheres Scheitern ohne stillen Fallback", () => {
  it("unbekannte Vorlage wird abgelehnt", () => {
    expect(templateError(() => resolveDocumentTemplate({ id: "fancy", version: 1 })).code)
      .toBe("unknown_template");
  });

  it.each(DOCUMENT_TEMPLATE_IDS)("bekannte Vorlage %s hat eine renderbare neueste Version", (id) => {
    expect(resolveDocumentTemplate(latestDocumentTemplate(id))).toBeDefined();
  });

  it("erhan-excel@1 ist renderbar und hat ein eigenes Layout", () => {
    expect(resolveDocumentTemplate({ id: "erhan-excel", version: 1 })).toBe(ErhanExcelTemplate);
  });

  it("unbekannte Version einer bekannten Vorlage wird abgelehnt", () => {
    expect(templateError(() => assertRenderableTemplate({ id: "standard", version: 2 })).code)
      .toBe("unknown_template_version");
  });

  it("der Beleg-Einstieg wirft statt in einer anderen Vorlage zu rendern", () => {
    const futurePreview: DocumentPreview = { ...preview, template: { id: "erhan-excel", version: 2 } };
    expect(templateError(() => createDocumentPdfElement(futurePreview, null)).code)
      .toBe("unknown_template_version");
  });
});
