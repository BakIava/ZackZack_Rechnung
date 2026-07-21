import type { DocumentListItem, UiDocumentStatus } from "@/types/document";
import { getQuoteDisplayStatus } from "./quote-state";
import { todayInGermany } from "./document-dates";

type DisplayStatusInput = Pick<
  DocumentListItem,
  | "type"
  | "status"
  | "validUntil"
  | "convertedInvoiceId"
  | "replacementQuoteId"
  | "replacementQuoteStatus"
  | "paidAt"
>;

export const DOCUMENT_STATUS_MESSAGE_KEYS = {
  bezahlt: "paid",
  offen: "open",
  versendet: "sent",
  entwurf: "draft",
  gueltig: "valid",
  in_anpassung: "adjusting",
  ersetzt: "replaced",
  abgelaufen: "expired",
  umgewandelt: "converted",
  storniert: "cancelled",
} as const satisfies Record<UiDocumentStatus, string>;

export type DocumentStatusMessageKey =
  (typeof DOCUMENT_STATUS_MESSAGE_KEYS)[UiDocumentStatus];

/** Einzige Zuordnung vom fachlichen Status zum gemeinsamen i18n-Schlüssel. */
export function getDocumentStatusMessageKey(
  status: UiDocumentStatus,
): DocumentStatusMessageKey {
  return DOCUMENT_STATUS_MESSAGE_KEYS[status];
}

export function getDocumentUiStatus(
  doc: DisplayStatusInput,
  today = todayInGermany(),
): UiDocumentStatus {
  if (doc.type === "quote") {
    const quoteStatus = getQuoteDisplayStatus(
      {
        status: doc.status,
        validUntil: doc.validUntil,
        convertedInvoiceId: doc.convertedInvoiceId,
        replacementQuoteId: doc.replacementQuoteId,
        replacementQuoteStatus: doc.replacementQuoteStatus,
      },
      today,
    );
    return {
      draft: "entwurf",
      valid: "gueltig",
      adjusting: "in_anpassung",
      replaced: "ersetzt",
      expired: "abgelaufen",
      converted: "umgewandelt",
      cancelled: "storniert",
    }[quoteStatus] as UiDocumentStatus;
  }

  if (doc.status === "paid" || doc.paidAt) return "bezahlt";
  if (doc.status === "sent") return "versendet";
  if (doc.status === "draft") return "entwurf";
  if (doc.status === "cancelled") return "storniert";
  return "offen";
}
