/** Nur eine vollständig leere Beschreibung entfernen; sonst die Eingabe unverändert lassen. */
export function normalizeAdditionalDescriptionDe(value: string | null): string | null {
  return value === null || value.trim() === "" ? null : value;
}
