import { describe, expect, it } from "vitest";
import { getQuoteDisplayStatus } from "./quote-state";

describe("Angebots-Anzeigezustand", () => {
  it("unterscheidet gueltig und abgelaufen", () => {
    expect(getQuoteDisplayStatus({
      status: "finalized",
      validUntil: "2026-07-20",
      convertedInvoiceId: null,
      replacementQuoteId: null,
      replacementQuoteStatus: null,
    }, "2026-07-20")).toBe("valid");
    expect(getQuoteDisplayStatus({
      status: "sent",
      validUntil: "2026-07-19",
      convertedInvoiceId: null,
      replacementQuoteId: null,
      replacementQuoteStatus: null,
    }, "2026-07-20")).toBe("expired");
  });

  it("priorisiert die unveraenderbare Rechnungsverknuepfung", () => {
    expect(getQuoteDisplayStatus({
      status: "finalized",
      validUntil: "2026-07-19",
      convertedInvoiceId: "invoice-1",
      replacementQuoteId: null,
      replacementQuoteStatus: null,
    }, "2026-07-20")).toBe("converted");
  });

  it("behaelt Entwurf und Stornierung als technische Randzustaende", () => {
    expect(getQuoteDisplayStatus({
      status: "draft",
      validUntil: "2026-08-20",
      convertedInvoiceId: null,
      replacementQuoteId: null,
      replacementQuoteStatus: null,
    })).toBe("draft");
    expect(getQuoteDisplayStatus({
      status: "cancelled",
      validUntil: "2026-08-20",
      convertedInvoiceId: null,
      replacementQuoteId: null,
      replacementQuoteStatus: null,
    })).toBe("cancelled");
  });

  it("zeigt den Ursprung waehrend der Anpassung und danach als ersetzt", () => {
    expect(getQuoteDisplayStatus({
      status: "finalized",
      validUntil: "2026-08-20",
      convertedInvoiceId: null,
      replacementQuoteId: "quote-draft",
      replacementQuoteStatus: "draft",
    }, "2026-07-20")).toBe("adjusting");
    expect(getQuoteDisplayStatus({
      status: "finalized",
      validUntil: "2026-08-20",
      convertedInvoiceId: null,
      replacementQuoteId: "quote-final",
      replacementQuoteStatus: "finalized",
    }, "2026-07-20")).toBe("replaced");
  });
});
