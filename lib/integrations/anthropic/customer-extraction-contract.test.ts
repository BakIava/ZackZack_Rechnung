import { describe, expect, it } from "vitest";
import {
  CUSTOMER_EXTRACTION_FIELDS,
  CUSTOMER_EXTRACTION_SCHEMA,
} from "./customer-extraction-contract";

describe("customer extraction contract", () => {
  it("enthält exakt die Customer-Felder und verbietet weitere Felder", () => {
    expect(Object.keys(CUSTOMER_EXTRACTION_SCHEMA.properties)).toEqual(
      CUSTOMER_EXTRACTION_FIELDS,
    );
    expect(CUSTOMER_EXTRACTION_SCHEMA.required).toEqual(
      CUSTOMER_EXTRACTION_FIELDS,
    );
    expect(CUSTOMER_EXTRACTION_SCHEMA.additionalProperties).toBe(false);
  });
});

