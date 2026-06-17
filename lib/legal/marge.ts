/**
 * Fremdleistung mit Marge.
 * HARD RULE: Einkaufspreis und Marge sind strikt intern. Sie dürfen NIEMALS
 * in das Dokument-DTO oder den PDF-Generator gelangen – nur der berechnete
 * Verkaufspreis erscheint auf dem Dokument.
 */

export type Aufschlag =
  | { typ: "prozent"; wert: number }
  | { typ: "euro"; cents: number };

/**
 * Internal-only calculation. Returns the Verkaufspreis in cents.
 * Inputs (Einkaufspreis inkl. MwSt, Aufschlag) must not be persisted on the
 * document or passed to PDF rendering.
 */
export function berechneVerkaufspreis(
  einkaufCents: number,
  aufschlag: Aufschlag,
): number {
  if (einkaufCents < 0) {
    throw new Error("Einkaufspreis darf nicht negativ sein");
  }

  if (aufschlag.typ === "prozent") {
    return Math.round(einkaufCents * (1 + aufschlag.wert / 100));
  }

  return einkaufCents + aufschlag.cents;
}
