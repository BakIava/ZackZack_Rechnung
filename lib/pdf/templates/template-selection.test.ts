import { describe, expect, it } from "vitest";
import type { DocStatus } from "@/types/document";
import { DocumentTemplateError } from "./template-catalog";
import { resolveDocumentTemplate } from "./template-registry";
import { selectDocumentTemplate, type DocumentTemplateSelectionInput } from "./template-selection";

/** Rohwerte wie aus der DB: Entwurf ohne Snapshot. */
function draft(companyTemplateId: unknown): DocumentTemplateSelectionInput {
  return { status: "draft", documentTemplateId: null, documentTemplateVersion: null, companyTemplateId };
}

function finalized(
  documentTemplateId: unknown,
  documentTemplateVersion: unknown,
  companyTemplateId: unknown = "standard",
  status: DocStatus = "finalized",
): DocumentTemplateSelectionInput {
  return { status, documentTemplateId, documentTemplateVersion, companyTemplateId };
}

function errorCode(input: DocumentTemplateSelectionInput): string {
  try {
    selectDocumentTemplate(input);
  } catch (error) {
    if (error instanceof DocumentTemplateError) return error.code;
    throw error;
  }
  throw new Error("expected DocumentTemplateError");
}

describe("selectDocumentTemplate – Entwürfe folgen der Firmenwahl", () => {
  it("bestehende Firmen (Default 'standard') und Zeilen vor der Migration rendern standard@1", () => {
    expect(selectDocumentTemplate(draft("standard"))).toEqual({ id: "standard", version: 1 });
    expect(selectDocumentTemplate(draft(null))).toEqual({ id: "standard", version: 1 });
    expect(selectDocumentTemplate(draft(undefined))).toEqual({ id: "standard", version: 1 });
  });

  it.each([["ths-classic"], ["erhan-excel"]] as const)("Firma mit %s → neueste Version", (id) => {
    expect(selectDocumentTemplate(draft(id))).toEqual({ id, version: 1 });
  });

  it("ignoriert Snapshot-Spalten eines Entwurfs", () => {
    expect(selectDocumentTemplate({
      status: "draft", documentTemplateId: "erhan-excel", documentTemplateVersion: 1,
      companyTemplateId: "ths-classic",
    })).toEqual({ id: "ths-classic", version: 1 });
  });

  it("ein unbekannter Firmenwert scheitert sichtbar statt still auf Standard zu fallen", () => {
    expect(errorCode(draft("fancy"))).toBe("unknown_template");
    expect(errorCode(draft(""))).toBe("unknown_template");
    expect(errorCode(draft(42))).toBe("unknown_template");
  });
});

describe("selectDocumentTemplate – finalisierte Belege behalten ihren Snapshot", () => {
  it.each<DocStatus>(["finalized", "sent", "paid", "cancelled"])(
    "Status %s: Snapshot gewinnt über spätere Firmenwahl",
    (status) => {
      expect(selectDocumentTemplate(finalized("ths-classic", 1, "erhan-excel", status)))
        .toEqual({ id: "ths-classic", version: 1 });
    },
  );

  it("Altbelege ohne Snapshot rendern standard@1, auch wenn die Firma inzwischen anders gewählt hat", () => {
    expect(selectDocumentTemplate(finalized(null, null, "ths-classic"))).toEqual({ id: "standard", version: 1 });
  });

  it("ein kaputter Firmenwert blockiert keinen finalisierten Beleg", () => {
    expect(selectDocumentTemplate(finalized("standard", 1, "fancy"))).toEqual({ id: "standard", version: 1 });
    expect(selectDocumentTemplate(finalized(null, null, "fancy"))).toEqual({ id: "standard", version: 1 });
  });

  it("die eingefrorene Version bleibt erhalten — eine unbekannte wird erst beim Rendern abgelehnt", () => {
    const ref = selectDocumentTemplate(finalized("ths-classic", 2));
    expect(ref).toEqual({ id: "ths-classic", version: 2 });
    expect(() => resolveDocumentTemplate(ref)).toThrow(DocumentTemplateError);
  });

  it("kaputte oder halbe Snapshots werfen", () => {
    expect(errorCode(finalized("fancy", 1))).toBe("unknown_template");
    expect(errorCode(finalized("standard", 0))).toBe("unknown_template_version");
    expect(errorCode(finalized("standard", 1.5))).toBe("unknown_template_version");
    expect(errorCode(finalized("standard", "1"))).toBe("unknown_template_version");
    expect(errorCode(finalized("standard", null))).toBe("incomplete_template_snapshot");
    expect(errorCode(finalized(null, 1))).toBe("incomplete_template_snapshot");
  });
});
