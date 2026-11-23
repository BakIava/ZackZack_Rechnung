export const MAX_NACHWEIS_TAGE = 31;

export function normalisiereNachweisZiffern(value: string): string {
  const arabisch = "٠١٢٣٤٥٦٧٨٩";
  const persisch = "۰۱۲۳۴۵۶۷۸۹";
  return value.replace(/[٠-٩۰-۹]/g, (ziffer) =>
    String(arabisch.includes(ziffer) ? arabisch.indexOf(ziffer) : persisch.indexOf(ziffer)));
}

/** Nur vollständige, existierende Kalendertage. Keine implizite Normalisierung. */
export function istNachweisDatum(value: unknown): value is string {
  if (typeof value !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const datum = new Date(value);
  return Number.isFinite(datum.getTime()) && datum.toISOString().slice(0, 10) === value;
}
