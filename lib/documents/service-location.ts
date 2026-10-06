import type { DocumentServiceLocation } from "@/types/service-location";

const FIELD_LIMITS = {
  name: 160,
  street: 160,
  houseNumber: 20,
  postcode: 20,
  city: 120,
  addressExtra: 240,
} as const satisfies Record<keyof DocumentServiceLocation, number>;

/** Prüft Formularwerte und gespeicherte JSONB-Snapshots; verwirft Zusatzfelder. */
export function parseDocumentServiceLocation(value: unknown): DocumentServiceLocation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const result: DocumentServiceLocation = {
    name: "", street: "", houseNumber: "", postcode: "", city: "", addressExtra: "",
  };
  for (const key of Object.keys(FIELD_LIMITS) as Array<keyof typeof FIELD_LIMITS>) {
    const field = input[key];
    if (typeof field !== "string" || field.length > FIELD_LIMITS[key]) return null;
    result[key] = field.trim();
  }
  return result.name || result.street || result.city ? result : null;
}
