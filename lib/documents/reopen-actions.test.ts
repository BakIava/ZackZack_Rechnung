import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  reopenInvoiceRpc: vi.fn(),
  deleteDocumentPdf: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({ getCurrentUser: h.getCurrentUser }));
vi.mock("@/lib/repositories/documents", () => ({ reopenInvoiceRpc: h.reopenInvoiceRpc }));
vi.mock("@/lib/repositories/document-pdfs", () => ({
  deleteDocumentPdf: h.deleteDocumentPdf,
}));

import { reopenInvoice } from "./reopen-actions";

beforeEach(() => {
  vi.clearAllMocks();
  h.getCurrentUser.mockResolvedValue({ id: "user-1" });
  h.deleteDocumentPdf.mockResolvedValue({});
});

describe("reopenInvoice", () => {
  it("öffnet die Rechnung mit derselben Nummer und verwirft das alte Archiv-PDF", async () => {
    h.reopenInvoiceRpc.mockResolvedValue({ number: "R-2026-041" });

    await expect(reopenInvoice("doc-1")).resolves.toEqual({ number: "R-2026-041" });

    expect(h.reopenInvoiceRpc).toHaveBeenCalledWith("doc-1");
    expect(h.deleteDocumentPdf).toHaveBeenCalledWith("doc-1");
  });

  it("lässt das Archiv unangetastet, wenn die Rechnung nicht korrigierbar ist", async () => {
    h.reopenInvoiceRpc.mockResolvedValue({ errorMessage: "invoice_not_reopenable" });

    await expect(reopenInvoice("doc-1")).resolves.toEqual({ error: "invoiceNotReopenable" });
    expect(h.deleteDocumentPdf).not.toHaveBeenCalled();
  });

  it("ruft ohne Anmeldung weder RPC noch Archiv auf", async () => {
    h.getCurrentUser.mockResolvedValue(null);

    await expect(reopenInvoice("doc-1")).resolves.toEqual({ error: "notAuthenticated" });
    expect(h.reopenInvoiceRpc).not.toHaveBeenCalled();
    expect(h.deleteDocumentPdf).not.toHaveBeenCalled();
  });

  it("bleibt erfolgreich, wenn das Verwerfen des PDFs fehlschlägt", async () => {
    h.reopenInvoiceRpc.mockResolvedValue({ number: "R-2026-041" });
    h.deleteDocumentPdf.mockResolvedValue({ errorMessage: "storage down" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(reopenInvoice("doc-1")).resolves.toEqual({ number: "R-2026-041" });
  });

  it("bildet unbekannte Datenbankfehler auf einen stabilen Code ab", async () => {
    h.reopenInvoiceRpc.mockResolvedValue({ errorMessage: "reopen_via_rpc_required" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(reopenInvoice("doc-1")).resolves.toEqual({ error: "unknown" });
  });
});
