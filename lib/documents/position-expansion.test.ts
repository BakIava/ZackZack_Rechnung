import { describe, expect, it } from "vitest";
import { expandedAfterChange, toggleExpanded } from "./position-expansion";

describe("expandedAfterChange", () => {
  it("klappt eine neu hinzugefügte Position auf – die vorige klappt zu", () => {
    expect(expandedAfterChange(["a", "b"], ["a", "b", "c"], "a")).toBe("c");
    expect(expandedAfterChange([], ["a"], null)).toBe("a");
  });

  it("lässt die offene Position nach Bearbeiten und Umsortieren offen", () => {
    expect(expandedAfterChange(["a", "b", "c"], ["a", "b", "c"], "b")).toBe("b");
    expect(expandedAfterChange(["a", "b", "c"], ["c", "a", "b"], "b")).toBe("b");
  });

  it("schließt alles, wenn die offene Position gelöscht wurde", () => {
    expect(expandedAfterChange(["a", "b", "c"], ["a", "c"], "b")).toBeNull();
  });

  it("lässt alles zu, wenn nichts offen war und nichts dazukam", () => {
    expect(expandedAfterChange(["a", "b"], ["b"], null)).toBeNull();
    expect(expandedAfterChange(["a", "b"], ["b", "a"], null)).toBeNull();
  });
});

describe("toggleExpanded", () => {
  it("öffnet eine andere Position und schließt damit die bisherige", () => {
    expect(toggleExpanded("a", "b")).toBe("b");
    expect(toggleExpanded(null, "a")).toBe("a");
  });

  it("schließt die offene Position beim erneuten Antippen", () => {
    expect(toggleExpanded("a", "a")).toBeNull();
  });
});
