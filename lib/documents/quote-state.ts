import type { DocStatus, QuoteDisplayStatus } from "@/types/document";
import { isPastDate, todayInGermany } from "./document-dates";

interface QuoteStateInput {
  status: DocStatus;
  validUntil: string | null;
  convertedInvoiceId: string | null;
  replacementQuoteId: string | null;
  replacementQuoteStatus: DocStatus | null;
}

/** Fachlicher Angebotszustand fuer Liste, Detail, Dashboard und Kundenhistorie. */
export function getQuoteDisplayStatus(
  input: QuoteStateInput,
  today = todayInGermany(),
): QuoteDisplayStatus {
  if (input.status === "draft") return "draft";
  if (input.convertedInvoiceId) return "converted";
  if (input.status === "cancelled") return "cancelled";
  if (input.replacementQuoteId && input.replacementQuoteStatus === "draft") {
    return "adjusting";
  }
  if (
    input.replacementQuoteId &&
    (input.replacementQuoteStatus === "finalized" ||
      input.replacementQuoteStatus === "sent")
  ) {
    return "replaced";
  }
  if (input.validUntil && isPastDate(input.validUntil, today)) return "expired";
  return "valid";
}
