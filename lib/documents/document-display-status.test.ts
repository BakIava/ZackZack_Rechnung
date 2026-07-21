import { describe, expect, it } from "vitest";
import {
  getDocumentStatusMessageKey,
  getDocumentUiStatus,
} from "./document-display-status";

describe("typabhaengiger Dokumentstatus", () => {
  it("behandelt ein finalisiertes Angebot nie als offene Forderung", () => {
    expect(getDocumentUiStatus({
      type: "quote",
      status: "finalized",
      validUntil: "2026-08-20",
      convertedInvoiceId: null,
      replacementQuoteId: null,
      replacementQuoteStatus: null,
      paidAt: null,
    }, "2026-07-20")).toBe("gueltig");
  });

  it("behandelt nur Rechnungen als offen oder bezahlt", () => {
    expect(getDocumentUiStatus({
      type: "invoice",
      status: "finalized",
      validUntil: null,
      convertedInvoiceId: null,
      replacementQuoteId: null,
      replacementQuoteStatus: null,
      paidAt: null,
    })).toBe("offen");
    expect(getDocumentUiStatus({
      type: "invoice",
      status: "paid",
      validUntil: null,
      convertedInvoiceId: null,
      replacementQuoteId: null,
      replacementQuoteStatus: null,
      paidAt: "2026-07-20T10:00:00Z",
    })).toBe("bezahlt");
  });

  it("liefert den gemeinsamen i18n-Schluessel zentral", () => {
    expect(getDocumentStatusMessageKey("gueltig")).toBe("valid");
    expect(getDocumentStatusMessageKey("in_anpassung")).toBe("adjusting");
    expect(getDocumentStatusMessageKey("ersetzt")).toBe("replaced");
  });
});
