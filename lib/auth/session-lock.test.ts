import { describe, expect, it } from "vitest";
import { INACTIVITY_TIMEOUT_MS, isLocaleAppPath, toLocaleRelativePath } from "./session-lock";

describe("session lock", () => {
  it("sperrt erst nach 15 Minuten", () => {
    expect(INACTIVITY_TIMEOUT_MS).toBe(15 * 60 * 1_000);
  });

  it("akzeptiert nur sprachgebundene interne Rueckkehrziele", () => {
    expect(isLocaleAppPath("/de/create/doc-1/2", "de")).toBe(true);
    expect(isLocaleAppPath("https://example.com", "de")).toBe(false);
    expect(isLocaleAppPath("/tr/dashboard", "de")).toBe(false);
    expect(toLocaleRelativePath("/de/create/doc-1/2", "de")).toBe("/create/doc-1/2");
  });
});
