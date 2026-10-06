import { describe, expect, it } from "vitest";
import {
  SERVICE_LOCATION_EXTRACTION_FIELDS,
  SERVICE_LOCATION_EXTRACTION_SCHEMA,
  SERVICE_LOCATION_EXTRACTION_SYSTEM_PROMPT,
} from "./service-location-extraction-contract";

describe("service location extraction contract", () => {
  it("beschränkt die Antwort auf die Einsatzort-Felder", () => {
    expect(Object.keys(SERVICE_LOCATION_EXTRACTION_SCHEMA.properties))
      .toEqual(SERVICE_LOCATION_EXTRACTION_FIELDS);
    expect(SERVICE_LOCATION_EXTRACTION_SCHEMA.required)
      .toEqual(SERVICE_LOCATION_EXTRACTION_FIELDS);
    expect(SERVICE_LOCATION_EXTRACTION_SCHEMA.additionalProperties).toBe(false);
  });

  it("grenzt Einsatzort von Rechnungsadresse ab und verbietet Ergänzungen", () => {
    expect(SERVICE_LOCATION_EXTRACTION_SYSTEM_PROMPT).toContain("Rechnungs- und Firmenadresse");
    expect(SERVICE_LOCATION_EXTRACTION_SYSTEM_PROMPT).toContain("Erfinde keine fehlenden Angaben");
    expect(SERVICE_LOCATION_EXTRACTION_SYSTEM_PROMPT).toContain("Deutsch, Türkisch oder Arabisch");
  });
});
