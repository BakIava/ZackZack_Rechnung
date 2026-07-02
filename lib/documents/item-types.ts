export type SurchargeType = "percent" | "fixed";

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
  docType: "rechnung" | "angebot";
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
