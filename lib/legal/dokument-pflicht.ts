/**
 * §14-UStG-Pflichtangaben-Check auf Dokumentebene, ausgewertet **vor der
 * Finalisierung**. Rein funktional (nur Primitives rein, Prüfliste raus), damit
 * die Regeln unabhängig von Supabase testbar bleiben.
 *
 * Empfängerangaben (§14 Abs. 4 Nr. 1: Name + vollständige Anschrift) sind
 * **betragsabhängig**: Bei einer Kleinbetragsrechnung bis 250 € brutto
 * (§ 33 UStDV) entfallen Name und Anschrift des Empfängers komplett. Erst über
 * dieser Grenze werden sie Pflicht. Für §19-Kleinunternehmer gibt es keine USt,
 * daher entspricht der Dokumentbetrag dem Bruttobetrag.
 *
 * Der §19-Hinweis selbst ist keine „fehlende Angabe": er wird beim Rendern
 * automatisch gesetzt, sobald keine USt. ausgewiesen wird (siehe DOKUMENT_DE).
 * Für Angebote gilt dieselbe Prüfung – das Zahlungsziel ist keine Pflichtangabe.
 */

import type { DocType } from "@/types/document";
import { isValidQuoteDateRange } from "@/lib/documents/document-dates";

/** Kleinbetragsrechnung-Grenze (§ 33 UStDV): 250,00 € brutto in Cent. */
export const KLEINBETRAG_LIMIT_CENTS = 25_000;

/** Wo eine fehlende Angabe ergänzt wird – steuert den Korrigieren-Link. */
export type PflichtLocation = "settings" | "customer" | "positions" | "validity";

export type PflichtFeld =
  | "companyName"
  | "companyAddress"
  | "companySteuer"
  | "issueDate"
  | "validUntil"
  | "positions"
  | "customerName"
  | "customerAddress";

export interface DokumentPflichtInput {
  /** Ohne Angabe aus Rueckwaertskompatibilitaet als Rechnung behandelt. */
  docType?: DocType;
  companyName: string | null;
  companyStreet: string | null;
  companyPostcode: string | null;
  companyCity: string | null;
  companySteuernummer: string | null;
  companyUstId: string | null;
  /** issue_date des Dokuments (YYYY-MM-DD) oder null. */
  issueDate: string | null;
  validUntil?: string | null;
  itemCount: number;
  /** Dokumentbetrag in Cent (brutto). Steuert die Empfänger-Pflicht. */
  totalAmountCents: number;
  customerName: string | null;
  customerStreet: string | null;
  customerStreetNo: string | null;
  customerPostcode: string | null;
  customerCity: string | null;
}

export interface PflichtCheck {
  feld: PflichtFeld;
  location: PflichtLocation;
  ok: boolean;
}

function gefuellt(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function mk(feld: PflichtFeld, location: PflichtLocation, ok: boolean): PflichtCheck {
  return { feld, location, ok };
}

/**
 * Liefert ALLE anwendbaren Pflicht-Checks (grün wie rot) in fester Reihenfolge.
 * Die Empfänger-Checks (customerName/-Address) erscheinen nur, wenn der Betrag
 * die Kleinbetragsgrenze übersteigt. Die UI zeigt die vollständige Liste;
 * offene Punkte liefert `offeneMaengel`.
 */
export function pruefeDokumentPflicht(input: DokumentPflichtInput): PflichtCheck[] {
  const isQuote = input.docType === "quote";
  const checks: PflichtCheck[] = [
    mk("companyName", "settings", gefuellt(input.companyName)),
    mk(
      "companyAddress",
      "settings",
      gefuellt(input.companyStreet) &&
        gefuellt(input.companyPostcode) &&
        gefuellt(input.companyCity),
    ),
    // Steuernummer ODER USt-IdNr. genügt (§14 Abs. 4 Nr. 2 UStG).
    mk(
      "companySteuer",
      "settings",
      gefuellt(input.companySteuernummer) || gefuellt(input.companyUstId),
    ),
    mk("issueDate", "customer", gefuellt(input.issueDate)),
    mk("positions", "positions", input.itemCount >= 1),
  ];

  if (isQuote) {
    checks.push(
      mk(
        "validUntil",
        "validity",
        isValidQuoteDateRange(input.issueDate, input.validUntil ?? null),
      ),
    );
  }

  // Angebote brauchen immer einen eindeutigen Adressaten. Die 250-Euro-Ausnahme
  // gilt nur fuer Kleinbetragsrechnungen, nicht fuer Angebote.
  if (isQuote || input.totalAmountCents > KLEINBETRAG_LIMIT_CENTS) {
    checks.push(mk("customerName", "customer", gefuellt(input.customerName)));
    checks.push(
      mk(
        "customerAddress",
        "customer",
        gefuellt(input.customerStreet) &&
          gefuellt(input.customerStreetNo) &&
          gefuellt(input.customerPostcode) &&
          gefuellt(input.customerCity),
      ),
    );
  }

  return checks;
}

/** Offene (rote) Pflicht-Checks – diese blockieren die Finalisierung. */
export function offeneMaengel(checks: PflichtCheck[]): PflichtCheck[] {
  return checks.filter((c) => !c.ok);
}

/** Finalisierbar, sobald jeder Pflicht-Check grün ist. */
export function istFinalisierbar(checks: PflichtCheck[]): boolean {
  return checks.length > 0 && checks.every((c) => c.ok);
}
