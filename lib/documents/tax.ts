/**
 * Zentrale Umsatzsteuer-Berechnung für Dokumentpositionen.
 *
 * Alle Geldbeträge sind ganzzahlige Cents. Der Nettobetrag und die Steuer
 * werden genau einmal pro Position kaufmännisch gerundet; Dokument- und
 * Steuergruppensummen sind anschließend reine Summen dieser Zeilenwerte.
 */

import type { DocumentTotals, TaxGroup, TaxRate } from "@/types/document";

export const SUPPORTED_TAX_RATES = [19, 7, 0] as const satisfies readonly TaxRate[];

export interface LineAmounts {
  netAmount: number;
  taxRate: TaxRate;
  taxAmount: number;
  grossAmount: number;
}

export function isTaxRate(value: unknown): value is TaxRate {
  return value === 0 || value === 7 || value === 19;
}

/** §19 setzt nur den geerbten Dokumentstandard auf 0 %, nicht Positions-Overrides. */
export function resolveDocumentDefaultTaxRate(
  companyDefaultRate: TaxRate,
  isKleinunternehmer: boolean,
): TaxRate {
  return isKleinunternehmer ? 0 : companyDefaultRate;
}

export function resolveTaxRate(
  defaultRate: TaxRate,
  overrideRate: TaxRate | null,
): TaxRate {
  return overrideRate ?? defaultRate;
}

/**
 * Steuerdetails sind bei §19 nur nötig, wenn mindestens eine Position bewusst
 * mit einem positiven Steuersatz überschrieben wurde.
 */
export function shouldShowTaxDetails(
  isKleinunternehmer: boolean,
  items: readonly { readonly taxRate: TaxRate }[],
): boolean {
  return !isKleinunternehmer || items.some((item) => item.taxRate > 0);
}

function assertLineInput(unitPriceCents: number, amount: number, taxRate: TaxRate): void {
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new RangeError("unit_price_invalid");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError("amount_invalid");
  }
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > Number.EPSILON * 100) {
    throw new RangeError("amount_precision_invalid");
  }
  if (!isTaxRate(taxRate)) {
    throw new RangeError("tax_rate_invalid");
  }
}

/** Nettosumme, Steuer und Brutto einer Position. */
export function calculateLineAmounts(
  unitPriceCents: number,
  amount: number,
  taxRate: TaxRate,
): LineAmounts {
  assertLineInput(unitPriceCents, amount, taxRate);
  const netAmount = Math.round(unitPriceCents * amount);
  const taxAmount = Math.round((netAmount * taxRate) / 100);
  return {
    netAmount,
    taxRate,
    taxAmount,
    grossAmount: netAmount + taxAmount,
  };
}

/** Summiert bereits zeilenweise gerundete Beträge und gruppiert nach Satz. */
export function calculateDocumentTotals(lines: readonly LineAmounts[]): DocumentTotals {
  const groups = new Map<TaxRate, TaxGroup>();
  let netAmount = 0;
  let taxAmount = 0;
  let grossAmount = 0;

  for (const line of lines) {
    if (!isTaxRate(line.taxRate)) throw new RangeError("tax_rate_invalid");
    if (![line.netAmount, line.taxAmount, line.grossAmount].every(Number.isSafeInteger)) {
      throw new RangeError("line_amount_invalid");
    }
    if (line.grossAmount !== line.netAmount + line.taxAmount) {
      throw new RangeError("line_total_inconsistent");
    }

    netAmount += line.netAmount;
    taxAmount += line.taxAmount;
    grossAmount += line.grossAmount;
    const group = groups.get(line.taxRate) ?? {
      rate: line.taxRate,
      netAmount: 0,
      taxAmount: 0,
    };
    group.netAmount += line.netAmount;
    group.taxAmount += line.taxAmount;
    groups.set(line.taxRate, group);
  }

  return {
    netAmount,
    taxAmount,
    grossAmount,
    taxGroups: [...groups.values()].sort((a, b) => b.rate - a.rate),
  };
}
