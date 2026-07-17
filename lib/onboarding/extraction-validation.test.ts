import { describe, expect, it } from "vitest";
import { ONBOARDING_EXTRACTABLE_FIELDS } from "@/types/onboarding-extraction";
import type { RawOnboardingExtraction } from "@/lib/integrations/anthropic/onboarding-extraction-contract";
import { normalizeOnboardingExtraction } from "./extraction-validation";

function raw(
  patch: Partial<RawOnboardingExtraction["values"]>,
  ambiguousFields: RawOnboardingExtraction["ambiguous_fields"] = [],
): RawOnboardingExtraction {
  const values = Object.fromEntries(
    ONBOARDING_EXTRACTABLE_FIELDS.map((field) => [
      field,
      field === "kleinunternehmer" ? "unknown" : "",
    ]),
  ) as RawOnboardingExtraction["values"];
  Object.assign(values, patch);
  return {
    values,
    detected_fields: Object.keys(patch) as RawOnboardingExtraction["detected_fields"],
    ambiguous_fields: ambiguousFields,
    warnings: [],
  };
}

describe("onboarding extraction validation", () => {
  it("normalisiert sichere Felder und leitet die Rechtsform ab", () => {
    const result = normalizeOnboardingExtraction(raw({
      name: "  Yılmaz Bau GmbH ",
      postcode: "60314",
      iban: "DE89 3704 0044 0532 0130 00",
      ust_id: "DE 123 456 789",
    }));
    expect(result.values).toMatchObject({
      name: "Yılmaz Bau GmbH",
      legal_form: "gmbh",
      postcode: "60314",
      iban: "DE89 3704 0044 0532 0130 00",
      ust_id: "DE123456789",
    });
  });

  it("übernimmt mehrdeutige oder technisch ungültige Felder nicht", () => {
    const result = normalizeOnboardingExtraction(raw(
      { name: "Musterbetrieb", email: "keine-mail", city: "Mainz" },
      ["city"],
    ));
    expect(result.values.email).toBeUndefined();
    expect(result.values.city).toBeUndefined();
    expect(result.statuses.email).toBe("ambiguous");
    expect(result.statuses.city).toBe("ambiguous");
  });

  it("übernimmt Modellwerte nur bei explizit sicherer Erkennung", () => {
    const input = raw({ name: "Musterbetrieb", iban: "DE89370400440532013000" });
    input.detected_fields = ["name"];
    const result = normalizeOnboardingExtraction(input);
    expect(result.values.iban).toBeUndefined();
    expect(result.statuses.iban).toBe("ambiguous");
  });
});
