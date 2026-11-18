import type { DocumentServiceLocation } from "@/types/service-location";

export const MAX_SERVICE_LOCATION_SUGGESTIONS = 5;

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Gleicher Ort, egal ob Groß/klein oder Leerzeichen anders geschrieben wurden. */
export function serviceLocationKey(location: DocumentServiceLocation): string {
  return [location.name, location.street, location.houseNumber, location.postcode, location.city]
    .map(normalize)
    .join("|");
}

/** Neueste zuerst, jeder Ort nur einmal, höchstens fünf Vorschläge. */
export function uniqueServiceLocations(
  locations: DocumentServiceLocation[],
  max = MAX_SERVICE_LOCATION_SUGGESTIONS,
): DocumentServiceLocation[] {
  const seen = new Set<string>();
  const result: DocumentServiceLocation[] = [];
  for (const location of locations) {
    const key = serviceLocationKey(location);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(location);
    if (result.length === max) break;
  }
  return result;
}
