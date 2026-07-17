/** Gemeinsame, bewusst kompakte Einheitenliste für Katalog und Dokumentpositionen. */
export const FLOW_UNITS = [
  "m²",
  "m³",
  "lfm",
  "Stk.",
  "Std.",
  "Tag",
  "Fahrt",
  "km",
  "Auftrag",
  "Einsatz",
  "Pauschale",
  "kg",
  "t",
  "Liter",
];

/**
 * Behält einen gespeicherten Alt-/Freitextwert beim Bearbeiten sichtbar.
 * Neue Werte können weiterhin nur aus der aktuellen Standardliste gewählt werden.
 */
export function withCurrentUnit(
  units: readonly string[],
  currentUnit: string | null | undefined,
): string[] {
  if (!currentUnit || units.includes(currentUnit)) return [...units];
  return [currentUnit, ...units];
}

function normalizeUnitSearch(value: string): string {
  return value
    .normalize("NFKC")
    .replaceAll("²", "2")
    .replaceAll("³", "3")
    .trim()
    .toLocaleLowerCase();
}

/** Filtert ausschließlich die übergebene Einheitenliste, ohne neue Werte zu erzeugen. */
export function filterUnits(units: readonly string[], query: string): string[] {
  const normalizedQuery = normalizeUnitSearch(query);
  if (!normalizedQuery) return [...units];

  return units.filter((unit) => normalizeUnitSearch(unit).includes(normalizedQuery));
}
