export type DbDocumentStatus = "draft" | "finalized" | "sent" | "paid" | "cancelled";
export type DbDocumentType = "invoice" | "quote";
export type UiDocumentStatus = "bezahlt" | "offen" | "versendet" | "entwurf";

export interface DocumentListItem {
  id: string;
  type: DbDocumentType;
  documentNumber: string;
  customerName: string;
  /** Aus dem eingefrorenen Snapshot – nur fürs Teilen (E-Mail vorbelegen). */
  customerEmail: string | null;
  /** Aus dem eingefrorenen Snapshot – nur fürs Teilen (WhatsApp-Deeplink). */
  customerPhone: string | null;
  status: DbDocumentStatus;
  issueDate: string; // YYYY-MM-DD
  totalAmount: number; // cents
  paidAt: string | null; // ISO timestamp
  isOverdue: boolean;
}

export interface DocumentItem {
  position: number;
  descriptionDe: string;
  amount: number;
  unit: string;
  unitPrice: number; // cents
  totalAmount: number; // cents
}

export interface DocumentsPageData {
  documents: DocumentListItem[];
  paymentDays: number;
  /** Firmenname für die Grußzeile im Teilen-Begleittext. */
  companyName: string;
}

export interface DraftDoc {
  id: string;
  docType: "rechnung" | "angebot";
  /** documents.customer_id – null, solange noch kein Kunde gewählt ist */
  customerId: string | null;
}
