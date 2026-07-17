import { describe, expect, it } from "vitest";
import { filterUnits, FLOW_UNITS, withCurrentUnit } from "./units";

describe("billing units", () => {
  it("exposes the compact shared unit list", () => {
    expect(FLOW_UNITS).toEqual([
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
    ]);
    expect(new Set(FLOW_UNITS).size).toBe(FLOW_UNITS.length);
  });

  it("keeps an existing legacy or free-text unit selectable", () => {
    expect(withCurrentUnit(FLOW_UNITS, "Pauschal")).toEqual([
      "Pauschal",
      ...FLOW_UNITS,
    ]);
  });

  it("does not duplicate a current standard unit", () => {
    expect(withCurrentUnit(FLOW_UNITS, "km")).toEqual(FLOW_UNITS);
  });

  it("filters the provided units case-insensitively", () => {
    expect(filterUnits(FLOW_UNITS, "st")).toEqual(["Stk.", "Std."]);
    expect(filterUnits(FLOW_UNITS, "LITER")).toEqual(["Liter"]);
  });

  it("matches common keyboard input for superscript units", () => {
    expect(filterUnits(FLOW_UNITS, "m2")).toEqual(["m²"]);
    expect(filterUnits(FLOW_UNITS, "m3")).toEqual(["m³"]);
  });

  it("returns the original options for an empty filter", () => {
    expect(filterUnits(FLOW_UNITS, "  ")).toEqual(FLOW_UNITS);
  });
});
