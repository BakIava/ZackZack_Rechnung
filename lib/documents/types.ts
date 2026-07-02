export type DbDocumentStatus = "draft" | "final" | "sent" | "paid" | "cancelled";
export type DbDocumentType = "invoice" | "quote";
export type UiDocumentStatus = "bezahlt" | "offen" | "versendet" | "entwurf";

export interface DocumentListItem {
  id: string;
  type: DbDocumentType;
  documentNumber: string;
  customerName: string;
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
}

export interface DraftStep1Data {
  id: string;
  docType: "rechnung" | "angebot";
  /** customer.id aus dem snapshot – null wenn noch kein Kunde gewählt */
  customerId: string | null;
}
