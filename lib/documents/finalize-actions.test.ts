import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentPreview, DocumentTemplateRef } from "@/types/document";

const h = vi.hoisted(() => ({
  getDocumentPreview: vi.fn(),
  getDocumentPreviewFresh: vi.fn(),
  finalizeDocumentRpc: vi.fn(),
  archiveDocumentPdf: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({ getCurrentUser: async () => ({ id: "user-1" }) }));
vi.mock("@/lib/repositories/documents", () => ({ finalizeDocumentRpc: h.finalizeDocumentRpc }));
vi.mock("@/lib/repositories/document-previews", () => ({
  getDocumentPreview: h.getDocumentPreview,
  getDocumentPreviewFresh: h.getDocumentPreviewFresh,
}));
vi.mock("@/lib/pdf/pdf-storage", () => ({ archiveDocumentPdf: h.archiveDocumentPdf }));
vi.mock("./finalize-validation", () => ({ canFinalizePreview: () => true }));

import { DocumentTemplateError } from "@/lib/pdf/templates/template-catalog";
import { finalizeDocument } from "./finalize-actions";

function preview(status: DocumentPreview["status"], template: DocumentTemplateRef): DocumentPreview {
  return { id: "doc-1", status, template } as DocumentPreview;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.archiveDocumentPdf.mockResolvedValue(Buffer.from("PDF"));
});

describe("finalizeDocument: Vorlagen-Snapshot", () => {
  it("friert genau die Vorlage ein, mit der der Entwurf gerendert wurde, und archiviert in ihr", async () => {
    const template = { id: "ths-classic", version: 1 } as const;
    h.getDocumentPreview.mockResolvedValue(preview("draft", template));
    h.finalizeDocumentRpc.mockResolvedValue({ number: "R-2026-001" });
    h.getDocumentPreviewFresh.mockResolvedValue(preview("finalized", template));

    await expect(finalizeDocument("doc-1")).resolves.toEqual({ number: "R-2026-001" });

    expect(h.finalizeDocumentRpc).toHaveBeenCalledWith("doc-1", false, template);
    expect(h.archiveDocumentPdf).toHaveBeenCalledWith(preview("finalized", template));
  });

  it("finalisiert und archiviert nichts, wenn die Vorlage nicht renderbar ist", async () => {
    h.getDocumentPreview.mockResolvedValue(preview("draft", { id: "standard", version: 9 }));

    await expect(finalizeDocument("doc-1")).resolves.toEqual({ error: "notFinalizable" });
    expect(h.finalizeDocumentRpc).not.toHaveBeenCalled();
    expect(h.archiveDocumentPdf).not.toHaveBeenCalled();
  });

  it("finalisiert und archiviert nichts bei kaputtem Vorlagenwert der Firma", async () => {
    h.getDocumentPreview.mockRejectedValue(new DocumentTemplateError("unknown_template", "fancy"));

    await expect(finalizeDocument("doc-1")).resolves.toEqual({ error: "notFinalizable" });
    expect(h.finalizeDocumentRpc).not.toHaveBeenCalled();
    expect(h.archiveDocumentPdf).not.toHaveBeenCalled();
  });

  it("archiviert nichts, wenn die Firmenwahl seit der Vorschau geändert wurde (template_mismatch)", async () => {
    h.getDocumentPreview.mockResolvedValue(preview("draft", { id: "standard", version: 1 }));
    h.finalizeDocumentRpc.mockResolvedValue({ errorMessage: "template_mismatch" });

    await expect(finalizeDocument("doc-1")).resolves.toEqual({ error: "unknown" });
    expect(h.archiveDocumentPdf).not.toHaveBeenCalled();
  });
});
