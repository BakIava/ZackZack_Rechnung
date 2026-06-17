/**
 * Lückenlose, fortlaufende Rechnungsnummern.
 * Hard rule: numbers are assigned only when a document is finalised
 * (Festschreiben), never when a draft is created. The actual increment must
 * happen inside a DB transaction against InvoiceNumberSequence.
 */

export interface Rechnungsnummer {
  year: number;
  sequence: number;
}

const SEQUENCE_PAD = 4;

export function formatRechnungsnummer({ year, sequence }: Rechnungsnummer): string {
  if (sequence < 1) {
    throw new Error("Rechnungsnummer-Sequenz muss >= 1 sein");
  }
  return `${year}-${String(sequence).padStart(SEQUENCE_PAD, "0")}`;
}

export function parseRechnungsnummer(value: string): Rechnungsnummer | null {
  const match = /^(\d{4})-(\d+)$/.exec(value.trim());
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

/** Next sequence value when finalising the next document for a year. */
export function nextSequence(lastSequence: number): number {
  if (!Number.isInteger(lastSequence) || lastSequence < 0) {
    throw new Error("lastSequence muss eine nicht-negative Ganzzahl sein");
  }
  return lastSequence + 1;
}

/**
 * Validates that a set of assigned sequence numbers is consecutive and gap-free
 * (1, 2, 3, …). Used in tests and before/after finalising batches.
 */
export function istLueckenlos(sequences: number[]): boolean {
  if (sequences.length === 0) return true;
  const sorted = [...sequences].sort((a, b) => a - b);
  if (sorted[0] !== 1) return false;
  return sorted.every((value, index) => value === index + 1);
}
