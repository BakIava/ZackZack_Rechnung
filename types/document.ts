/**
 * Dokument-Typen (Rechnung/Angebot) — abgeleitet aus `DocumentRow` /
 * `DocumentItemRow` (types/database.ts). Keine erneute Felddefinition
 * außerhalb von types/.
 */

import type { DocStatus, DocType, SurchargeType } from "./database";
import type { PreviewCompany } from "./company";
import type { PreviewCustomer } from "./customer";

export type { DocStatus, DocType, SurchargeType };

/** Anzeige-Status in der Bediensprache (Dashboard/Dokumentenliste). */
export type UiDocumentStatus = "bezahlt" | "offen" | "versendet" | "entwurf";

/** Zeile der Dokumentenliste. */
export interface DocumentListItem {
  id: string;
  type: DocType;
  documentNumber: string;
  customerName: string;
  /** Aus dem eingefrorenen Snapshot – nur fürs Teilen (E-Mail vorbelegen). */
  customerEmail: string | null;
  /** Aus dem eingefrorenen Snapshot – nur fürs Teilen (WhatsApp-Deeplink). */
  customerPhone: string | null;
  status: DocStatus;
  issueDate: string; // YYYY-MM-DD
  totalAmount: number; // cents
  paidAt: string | null; // ISO timestamp
  isOverdue: boolean;
}

/**
 * Eine Position, wie sie aufs Dokument geht (Vorschau, PDF, Detailansicht).
 * Bewusst OHNE die internen Fremdleistungs-Felder – nur der Verkaufspreis.
 */
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

/** Draft im Create-Flow (Schritt 1). */
export interface DraftDoc {
  id: string;
  docType: DocType;
  /** documents.customer_id – null, solange noch kein Kunde gewählt ist */
  customerId: string | null;
}

/** Leichtgewichtiger Zugehörigkeits-/Status-Check für die Flow-Guards. */
export interface FlowDocMeta {
  id: string;
  status: DocStatus;
  docType: "rechnung" | "angebot";
}

/** Dokument-Kachel des Dashboards. */
export interface DashboardDoc {
  id: string;
  type: DocType;
  customer: string;
  number: string;
  amount: number; // Cent
  date: string; // ISO (JJJJ-MM-TT)
  status: UiDocumentStatus;
}

/** Vollständige Dokument-Vorschau (Schritt 3, PDF, Detail). */
export interface DocumentPreview {
  id: string;
  docType: DocType;
  status: DocStatus;
  documentNumber: string | null;
  issueDate: string | null; // YYYY-MM-DD
  serviceDate: string | null; // YYYY-MM-DD
  isKleinunternehmer: boolean;
  totalAmount: number; // cents
  company: PreviewCompany;
  customer: PreviewCustomer | null;
  items: DocumentItem[];
}

/**
 * Eine Position eines Draft-Dokuments (Zeile in document_items).
 * Geld immer in ganzzahligen Cents. Die Fremdleistungs-Felder
 * (purchasePrice, surcharge, surchargeType) sind STRIKT INTERN und dürfen
 * niemals aufs Dokument/PDF gelangen – nur `unitPrice` (Verkaufspreis) zählt.
 */
export interface DraftItem {
  id: string;
  /** Referenz auf den Katalog-Eintrag (Snapshot, kein Live-Bezug). null bei freier Position. */
  serviceId: string | null;
  position: number;
  /** Deutscher Begriff – erscheint so auf dem Dokument. */
  descriptionDe: string;
  amount: number;
  unit: string;
  unitPrice: number; // cents – Verkaufspreis, geht aufs Dokument
  totalAmount: number; // cents
  purchasePrice: number | null; // cents – intern
  surcharge: number | null; // percent: Basispunkte (1250 = 12,50 %); fixed: cents – intern
  surchargeType: SurchargeType | null; // intern
}

/** Kontext des Drafts für den Kopfbereich von Schritt 2. */
export interface DraftContext {
  docType: DocType;
  customerName: string;
  customerInitials: string;
  isKleinunternehmer: boolean;
}

export interface FreeItemInput {
  descriptionDe: string;
  amount: number;
  unit: string;
  unitPrice: number; // cents
}

export interface FremdItemInput {
  descriptionDe: string;
  unit: string;
  amount: number;
  purchasePrice: number; // cents (inkl. MwSt)
  surcharge: number; // percent: Basispunkte; fixed: cents
  surchargeType: SurchargeType;
}

export interface ItemPatch {
  descriptionDe?: string;
  amount?: number;
  unit?: string;
  unitPrice?: number; // cents – nur für normale Positionen
  purchasePrice?: number | null; // cents – intern
  surcharge?: number | null; // intern
  surchargeType?: SurchargeType | null; // intern
}
