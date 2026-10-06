import type { ServiceLocationExtraction, ServiceLocationInput } from "@/types/service-location";

export const SERVICE_LOCATION_MAX_INPUT_LENGTH = 1200;

const FIELD_LIMITS = {
  name: 160,
  street: 160,
  houseNumber: 20,
  postcode: 20,
  city: 120,
  addressExtra: 240,
} as const satisfies Record<keyof Omit<ServiceLocationInput, "sourceText">, number>;

export const EMPTY_SERVICE_LOCATION_EXTRACTION: ServiceLocationExtraction = {
  name: null,
  street: null,
  houseNumber: null,
  postcode: null,
  city: null,
  addressExtra: null,
};

export function validateServiceLocationText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= SERVICE_LOCATION_MAX_INPUT_LENGTH ? text : null;
}

export function parseServiceLocationExtraction(value: unknown): ServiceLocationExtraction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const location = { ...EMPTY_SERVICE_LOCATION_EXTRACTION };
  for (const field of Object.keys(FIELD_LIMITS) as Array<keyof typeof FIELD_LIMITS>) {
    const raw = record[field];
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed && trimmed.length <= FIELD_LIMITS[field]) location[field] = trimmed;
  }
  return location;
}

export function parseServiceLocationExtractionJson(json: string): ServiceLocationExtraction | null {
  try {
    return parseServiceLocationExtraction(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Entspricht der Übernehmen-Regel des Formulars. */
export function hasUsableServiceLocation(location: ServiceLocationExtraction): boolean {
  return Boolean(location.name || location.street || location.city);
}
