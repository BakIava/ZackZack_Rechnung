import type { NachweisImportLine } from "@/types/nachweis";
import { round2 } from "./nachweis-pruefung";

export const MAX_NACHWEIS_IMPORT_LINES = 20;
export const MAX_NACHWEIS_DESCRIPTION = 200;
const MAX_AMOUNT = 100_000;
const MAX_UNIT_PRICE_CENTS = 100_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function amount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = round2(value);
  return rounded > 0 && rounded <= MAX_AMOUNT ? rounded : null;
}

function additionalDescription(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 500) return undefined;
  return value.trim() === "" ? null : value;
}

function parseLine(value: unknown): NachweisImportLine | null {
  if (!isRecord(value)) return null;
  const parsedAmount = amount(value.amount);
  const additionalDescriptionDe = additionalDescription(value.additionalDescriptionDe);
  if (parsedAmount === null || additionalDescriptionDe === undefined) return null;

  if (value.kind !== "free") return null;
  const descriptionDe = typeof value.descriptionDe === "string" ? value.descriptionDe.trim() : "";
  const unit = typeof value.unit === "string" ? value.unit.trim() : null;
  const unitPrice = value.unitPrice;
  if (
    descriptionDe.length === 0 ||
    descriptionDe.length > MAX_NACHWEIS_DESCRIPTION ||
    unit === null ||
    unit.length > 30 ||
    typeof unitPrice !== "number" ||
    !Number.isInteger(unitPrice) ||
    unitPrice <= 0 ||
    unitPrice > MAX_UNIT_PRICE_CENTS
  ) {
    return null;
  }
  return {
    kind: "free",
    descriptionDe,
    amount: parsedAmount,
    unit,
    unitPrice,
    additionalDescriptionDe,
  };
}

/** Serverseitige Prüfung der vom Client bestätigten Zeilen – eine ungültige Zeile verwirft alles. */
export function parseNachweisImportLines(input: unknown): NachweisImportLine[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_NACHWEIS_IMPORT_LINES) {
    return null;
  }
  const lines: NachweisImportLine[] = [];
  for (const entry of input) {
    const line = parseLine(entry);
    if (!line) return null;
    lines.push(line);
  }
  return lines;
}
