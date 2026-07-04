/**
 * §14-UStG-Pflichtangaben-Check auf Dokumentebene, ausgewertet **vor der
 * Finalisierung**. Rein funktional (nur Primitives rein, Prüfliste raus), damit
 * die Regeln unabhängig von Supabase testbar bleiben.
 *
 * Der §19-Hinweis selbst ist keine „fehlende Angabe": er wird beim Rendern
 * automatisch gesetzt, sobald keine USt. ausgewiesen wird (siehe DOKUMENT_DE).
 * Für Angebote gilt dieselbe Prüfung – das Zahlungsziel ist keine Pflichtangabe,
 * sondern nur eine Anzeige und daher hier bewusst nicht enthalten.
 */

/** Wo eine fehlende Angabe ergänzt wird – steuert den Korrigieren-Link. */
export type PflichtLocation = "settings" | "customer" | "positions";

export type PflichtFeld =
  | "companyName"
  | "companyAddress"
  | "companySteuer"
  | "customerName"
  | "issueDate"
  | "positions";

export interface DokumentPflichtInput {
  companyName: string | null;
  companyStreet: string | null;
  companyPostcode: string | null;
  companyCity: string | null;
  companySteuernummer: string | null;
  companyUstId: string | null;
  customerName: string | null;
  /** issue_date des Dokuments (YYYY-MM-DD) oder null. */
  issueDate: string | null;
  itemCount: number;
}

export interface PflichtCheck {
  feld: PflichtFeld;
  location: PflichtLocation;
  ok: boolean;
}

const FELD_LOCATION: Record<PflichtFeld, PflichtLocation> = {
  companyName: "settings",
  companyAddress: "settings",
  companySteuer: "settings",
  customerName: "customer",
  issueDate: "customer",
  positions: "positions",
};

function gefuellt(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Liefert ALLE Pflicht-Checks (grün wie rot) in fester Reihenfolge. Die UI zeigt
 * die vollständige Liste; offene Punkte liefert `offeneMaengel`.
 */
export function pruefeDokumentPflicht(input: DokumentPflichtInput): PflichtCheck[] {
  const ergebnis: Record<PflichtFeld, boolean> = {
    companyName: gefuellt(input.companyName),
    companyAddress:
      gefuellt(input.companyStreet) &&
      gefuellt(input.companyPostcode) &&
      gefuellt(input.companyCity),
    // Steuernummer ODER USt-IdNr. genügt (§14 Abs. 4 Nr. 2 UStG).
    companySteuer: gefuellt(input.companySteuernummer) || gefuellt(input.companyUstId),
    customerName: gefuellt(input.customerName),
    issueDate: gefuellt(input.issueDate),
    positions: input.itemCount >= 1,
  };

  return (Object.keys(FELD_LOCATION) as PflichtFeld[]).map((feld) => ({
    feld,
    location: FELD_LOCATION[feld],
    ok: ergebnis[feld],
  }));
}

/** Offene (rote) Pflicht-Checks – diese blockieren die Finalisierung. */
export function offeneMaengel(checks: PflichtCheck[]): PflichtCheck[] {
  return checks.filter((c) => !c.ok);
}

/** Finalisierbar, sobald jeder Pflicht-Check grün ist. */
export function istFinalisierbar(checks: PflichtCheck[]): boolean {
  return checks.length > 0 && checks.every((c) => c.ok);
}
