import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentPreview } from "@/types/document";

const h = vi.hoisted(() => ({
  getDocumentPreview: vi.fn(),
  download: vi.fn(),
  upload: vi.fn(),
  renderDocumentPdfBuffer: vi.fn(async () => Buffer.from("RENDERED")),
}));

vi.mock("@/lib/repositories/document-previews", () => ({ getDocumentPreview: h.getDocumentPreview }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ storage: { from: () => ({ download: h.download, upload: h.upload }) } }),
}));
vi.mock("@/lib/pdf/render-document", () => ({ renderDocumentPdfBuffer: h.renderDocumentPdfBuffer }));
vi.mock("@/lib/pdf/document-logo", () => ({ loadPdfLogo: async () => null }));

import { GET } from "@/app/api/documents/[document_id]/pdf/route";

function finalizedPreview(template: DocumentPreview["template"]): DocumentPreview {
  return {
    id: "doc-1", docType: "invoice", status: "finalized", documentNumber: "R-2026-001",
    company: { logoUrl: null }, template,
  } as DocumentPreview;
}

const context = { params: Promise.resolve({ document_id: "doc-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PDF-Route: Archiv bleibt der Beleg", () => {
  it("liefert das archivierte PDF unverändert — eine spätere Vorlagenwahl regeneriert nichts", async () => {
    // Beleg unter standard@1 festgeschrieben; die Firma hat inzwischen ERHAN gewählt.
    // Für finalisierte Belege zählt nur der Snapshot — und vorhandene Archive gewinnen ohnehin.
    h.getDocumentPreview.mockResolvedValue(finalizedPreview({ id: "standard", version: 1 }));
    h.download.mockResolvedValue({ data: new Blob(["ARCHIVED-BYTES"]), error: null });

    const response = await GET(new Request("http://localhost/api/documents/doc-1/pdf"), context);

    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("ARCHIVED-BYTES");
    expect(h.renderDocumentPdfBuffer).not.toHaveBeenCalled();
    expect(h.upload).not.toHaveBeenCalled();
  });

  it("archiviert nur bei fehlendem Archiv nach — in der eingefrorenen Vorlage", async () => {
    const preview = finalizedPreview({ id: "ths-classic", version: 1 });
    h.getDocumentPreview.mockResolvedValue(preview);
    h.download.mockResolvedValue({ data: null, error: { message: "not found" } });
    h.upload.mockResolvedValue({ error: null });

    const response = await GET(new Request("http://localhost/api/documents/doc-1/pdf"), context);

    expect(response.status).toBe(200);
    expect(h.renderDocumentPdfBuffer).toHaveBeenCalledWith(preview, null);
    expect(h.upload).toHaveBeenCalledOnce();
  });
});
