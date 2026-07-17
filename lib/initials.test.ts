import { describe, expect, it } from "vitest";
import { deriveCompanyMonogram, deriveInitials } from "./initials";

describe("deriveInitials", () => {
  it("unterstützt den DB-Feldnamen für Firmenkunden", () => {
    expect(
      deriveInitials({ customer_type: "business", company_name: "Müller GmbH" }),
    ).toBe("MG");
  });

  it("bleibt mit dem Formular-Feldnamen kompatibel", () => {
    expect(
      deriveInitials({ customerType: "private", firstname: "Max", lastname: "Mustermann" }),
    ).toBe("MM");
  });

  it("leitet den Firmen-Fallback ausschließlich aus dem Firmennamen ab", () => {
    expect(deriveCompanyMonogram("Yılmaz Malerbetrieb")).toBe("YM");
  });
});
