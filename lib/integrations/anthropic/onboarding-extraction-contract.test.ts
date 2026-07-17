import { describe, expect, it } from "vitest";
import { ONBOARDING_EXTRACTABLE_FIELDS } from "@/types/onboarding-extraction";
import {
  ONBOARDING_EXTRACTION_SCHEMA,
  parseOnboardingExtractionJson,
} from "./onboarding-extraction-contract";

function validPayload(): Record<string, unknown> {
  return {
    values: Object.fromEntries(
      ONBOARDING_EXTRACTABLE_FIELDS.map((field) => [
        field,
        field === "kleinunternehmer" ? "unknown" : "",
      ]),
    ),
    detected_fields: [],
    ambiguous_fields: [],
    warnings: [],
  };
}

describe("onboarding extraction contract", () => {
  it("verwendet keine vom Provider begrenzten Union-Typen", () => {
    const schema = JSON.stringify(ONBOARDING_EXTRACTION_SCHEMA);
    expect(schema).not.toMatch(/"type":\[/);
    expect(schema).not.toContain("null");
  });

  it("akzeptiert eine vollständige strukturierte Antwort", () => {
    const payload = validPayload();
    const values = payload.values as Record<string, unknown>;
    values.name = "Yılmaz Malerbetrieb";
    payload.detected_fields = ["name"];
    expect(parseOnboardingExtractionJson(JSON.stringify(payload))?.values.name)
      .toBe("Yılmaz Malerbetrieb");
  });

  it("verwirft fehlende und falsch typisierte Felder", () => {
    const missing = validPayload();
    delete (missing.values as Record<string, unknown>).iban;
    expect(parseOnboardingExtractionJson(JSON.stringify(missing))).toBeNull();

    const wrong = validPayload();
    (wrong.values as Record<string, unknown>).kleinunternehmer = "ja";
    expect(parseOnboardingExtractionJson(JSON.stringify(wrong))).toBeNull();
  });
});
