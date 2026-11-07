import { describe, expect, it } from "vitest";
import { isSameItemSet, moveByOne, moveToIndex, planReorder } from "./item-order";

const fifteen = Array.from({ length: 15 }, (_, index) => `p${index + 1}`);

describe("moveToIndex", () => {
  it("holt die letzte von 15 Positionen in einem Schritt an die erste Stelle", () => {
    const next = moveToIndex(fifteen, 14, 0);
    expect(next[0]).toBe("p15");
    expect(next.slice(1)).toEqual(fifteen.slice(0, 14));
  });

  it("schiebt eine Position nach hinten, die anderen rücken auf", () => {
    expect(moveToIndex(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("lässt die Liste bei gleichem oder ungültigem Ziel unverändert", () => {
    const list = ["a", "b", "c"];
    expect(moveToIndex(list, 1, 1)).toEqual(list);
    expect(moveToIndex(list, 0, 3)).toEqual(list);
    expect(moveToIndex(list, -1, 0)).toEqual(list);
    expect(moveToIndex(list, 1, 0)).not.toBe(list);
  });
});

describe("moveByOne", () => {
  it("tauscht mit der Nachbarposition", () => {
    expect(moveByOne(["a", "b", "c"], 1, "up")).toEqual(["b", "a", "c"]);
    expect(moveByOne(["a", "b", "c"], 1, "down")).toEqual(["a", "c", "b"]);
  });

  it("bleibt am Rand stehen", () => {
    expect(moveByOne(["a", "b"], 0, "up")).toEqual(["a", "b"]);
    expect(moveByOne(["a", "b"], 1, "down")).toEqual(["a", "b"]);
  });
});

describe("isSameItemSet", () => {
  it("akzeptiert nur eine vollständige Umordnung derselben Positionen", () => {
    expect(isSameItemSet(["a", "b", "c"], ["c", "a", "b"])).toBe(true);
    expect(isSameItemSet(["a", "b", "c"], ["a", "b"])).toBe(false);
    expect(isSameItemSet(["a", "b", "c"], ["a", "a", "b"])).toBe(false);
    expect(isSameItemSet(["a", "b", "c"], ["a", "b", "x"])).toBe(false);
  });
});

describe("planReorder", () => {
  const current = [
    { id: "a", position: 1 },
    { id: "b", position: 2 },
    { id: "c", position: 3 },
    { id: "d", position: 4 },
  ];

  it("schreibt nur Zeilen, deren Nummer sich ändert", () => {
    expect(planReorder(current, ["a", "c", "b", "d"])).toEqual([
      { id: "c", position: 2, temporary: 5 },
      { id: "b", position: 3, temporary: 6 },
    ]);
    expect(planReorder(current, ["a", "b", "c", "d"])).toEqual([]);
  });

  it("vergibt eindeutige Zwischennummern oberhalb aller bisherigen und künftigen Nummern", () => {
    const plan = planReorder(current, ["d", "c", "b", "a"]);
    const temporary = plan.map((row) => row.temporary);
    expect(new Set(temporary).size).toBe(temporary.length);
    expect(Math.min(...temporary)).toBeGreaterThan(4);
    expect(plan.map((row) => row.position).sort()).toEqual([1, 2, 3, 4]);
  });

  it("vermeidet Kollisionen auch bei nicht lückenlosen Altnummern", () => {
    const gappy = [
      { id: "a", position: 1 },
      { id: "b", position: 7 },
    ];
    const plan = planReorder(gappy, ["b", "a"]);
    expect(Math.min(...plan.map((row) => row.temporary))).toBeGreaterThan(7);
  });
});
