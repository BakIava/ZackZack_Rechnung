import { describe, expect, it } from "vitest";
import de from "./de.json";
import tr from "./tr.json";
import ar from "./ar.json";

type Json = Record<string, unknown>;

function flatKeys(obj: Json, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object"
      ? flatKeys(value as Json, path)
      : [path];
  });
}

describe("i18n message parity", () => {
  const deKeys = flatKeys(de as Json).sort();

  it("tr has exactly the same keys as de (no missing/extra)", () => {
    expect(flatKeys(tr as Json).sort()).toEqual(deKeys);
  });

  it("ar has exactly the same keys as de (no missing/extra)", () => {
    expect(flatKeys(ar as Json).sort()).toEqual(deKeys);
  });
});
