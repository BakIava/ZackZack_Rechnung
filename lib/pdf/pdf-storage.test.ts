import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentPreview } from "@/lib/documents/preview-types";

// ── Mocks (via vi.hoisted, damit sie vor den Imports greifen) ──────────────────
const h = vi.hoisted(() => {
  const download = vi.fn();
  const upload = vi.fn();
  const from = vi.fn(() => ({ download, upload }));
  const renderDocumentPdfBuffer = vi.fn(async () => Buffer.from("RENDERED"));
  const loadPdfLogo = vi.fn(async () => null);
  return { download, upload, from, renderDocumentPdfBuffer, loadPdfLogo };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ storage: { from: h.from } }),
}));

vi.mock("@/lib/pdf/render-document", () => ({
  renderDocumentPdfBuffer: h.renderDocumentPdfBuffer,
}));

vi.mock("@/lib/pdf/document-logo", () => ({
  loadPdfLogo: h.loadPdfLogo,
}));

import {
  PDF_BUCKET,
  archiveDocumentPdf,
  fetchArchivedPdf,
  getOrArchiveDocumentPdf,
  pdfObjectPath,
} from "./pdf-storage";

function blobLike(text: string) {
  return { arrayBuffer: async () => new TextEncoder().encode(text).buffer };
}

const preview: DocumentPreview = {
  id: "11111111-2222-3333-4444-555555555555",
  docType: "invoice",
  status: "finalized",
  documentNumber: "R-2026-041",
  issueDate: "2026-06-09",
  serviceDate: null,
  isKleinunternehmer: true,
  totalAmount: 0,
  company: {
    name: "Firma",
    legalForm: null,
    street: null,
    streetNo: null,
    postcode: null,
    city: null,
    phone: null,
    mobile: null,
    email: null,
    director: null,
    steuernummer: null,
    ustId: null,
    bankName: null,
    iban: null,
    bic: null,
    accountHolder: null,
    logoUrl: null,
    paymentDays: 14,
  },
  customer: null,
  items: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pdfObjectPath", () => {
  it("bildet den Pfad aus der Dokument-ID", () => {
    expect(pdfObjectPath("abc")).toBe("abc.pdf");
  });
});

describe("getOrArchiveDocumentPdf", () => {
  it("liefert das eingefrorene Archiv-Blob und rendert dann NICHT neu", async () => {
    h.download.mockResolvedValue({ data: blobLike("ARCHIVED"), error: null });

    const out = await getOrArchiveDocumentPdf(preview);

    expect(out.toString()).toBe("ARCHIVED");
    expect(h.from).toHaveBeenCalledWith(PDF_BUCKET);
    expect(h.download).toHaveBeenCalledWith(`${preview.id}.pdf`);
    expect(h.renderDocumentPdfBuffer).not.toHaveBeenCalled();
    expect(h.upload).not.toHaveBeenCalled();
  });

  it("rendert und archiviert nach, wenn kein Archiv existiert (self-healing)", async () => {
    h.download.mockResolvedValue({ data: null, error: { message: "not found" } });
    h.upload.mockResolvedValue({ error: null });

    const out = await getOrArchiveDocumentPdf(preview);

    expect(out.toString()).toBe("RENDERED");
    expect(h.renderDocumentPdfBuffer).toHaveBeenCalledOnce();
    expect(h.upload).toHaveBeenCalledWith(`${preview.id}.pdf`, expect.any(Blob), {
      contentType: "application/pdf",
      upsert: true,
    });
  });

  it("behandelt ein leeres Archiv-Objekt (0 Bytes) als nicht vorhanden → rendert neu", async () => {
    h.download.mockResolvedValue({ data: blobLike(""), error: null });
    h.upload.mockResolvedValue({ error: null });

    const out = await getOrArchiveDocumentPdf(preview);

    expect(out.toString()).toBe("RENDERED");
    expect(h.renderDocumentPdfBuffer).toHaveBeenCalledOnce();
    expect(h.upload).toHaveBeenCalledOnce();
  });
});

describe("archiveDocumentPdf", () => {
  it("liefert das gerenderte PDF auch, wenn der Upload fehlschlägt (best effort)", async () => {
    h.upload.mockResolvedValue({ error: { message: "storage down" } });

    const out = await archiveDocumentPdf(preview);

    expect(out.toString()).toBe("RENDERED");
    expect(h.upload).toHaveBeenCalledOnce();
  });
});

describe("fetchArchivedPdf", () => {
  it("gibt null zurück, wenn kein Objekt existiert", async () => {
    h.download.mockResolvedValue({ data: null, error: { message: "not found" } });
    expect(await fetchArchivedPdf(preview.id)).toBeNull();
  });
});
