import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TRADE_IDS, type TradeId } from "@/types/database";
import { FLOW_UNITS } from "@/lib/documents/units";

const seed = readFileSync(
  join(process.cwd(), "scripts", "starter_catalog_seed.sql"),
  "utf8",
);

const rowPattern = /^\s*\('([0-9a-f-]+)', '([a-z_]+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', (\d+), true, 1\)[,;]?$/gm;
const rows = [...seed.matchAll(rowPattern)].map((match) => ({
  id: match[1],
  tradeId: match[2] as TradeId,
  descriptionDe: match[3],
  descriptionTr: match[4],
  descriptionAr: match[5],
  unit: match[6],
  sortOrder: Number(match[7]),
}));

const recommendedPrices = [...seed.matchAll(
  /WHEN '([0-9a-f-]+)' THEN (\d+)/g,
)].map((match) => ({ id: match[1], cents: Number(match[2]) }));

describe("reviewed starter catalog seed", () => {
  it("contains the complete reviewed templates for every MVP trade", () => {
    const expectedCounts: Record<TradeId, number> = {
      painter: 9,
      carpenter: 8,
      windows_doors: 8,
      electrician: 8,
      tiler: 8,
      plumbing_heating: 8,
      drywall: 8,
      flooring: 8,
      gardening_landscaping: 8,
      cleaning: 9,
      other: 8,
    };
    expect(rows).toHaveLength(90);
    for (const tradeId of TRADE_IDS) {
      expect(rows.filter((row) => row.tradeId === tradeId)).toHaveLength(
        expectedCounts[tradeId],
      );
    }
  });

  it("uses unique stable ids and ordering within each trade", () => {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    for (const tradeId of TRADE_IDS) {
      expect(
        rows.filter((row) => row.tradeId === tradeId).map((row) => row.sortOrder),
      ).toEqual(
        tradeId === "painter" || tradeId === "cleaning"
          ? [10, 20, 30, 40, 50, 60, 70, 80, 90]
          : [10, 20, 30, 40, 50, 60, 70, 80],
      );
    }
  });

  it("provides German, Turkish and Arabic labels plus supported units", () => {
    const supportedUnits = new Set(FLOW_UNITS);
    for (const row of rows) {
      expect(row.descriptionDe.trim()).not.toBe("");
      expect(row.descriptionTr.trim()).not.toBe("");
      expect(row.descriptionAr.trim()).not.toBe("");
      expect(supportedUnits.has(row.unit)).toBe(true);
    }
  });

  it("uses specific billing units for travel and general work", () => {
    const unitsFor = (description: string) =>
      rows.filter((row) => row.descriptionDe === description).map((row) => row.unit);

    expect(unitsFor("Anfahrt")).toEqual(["Fahrt", "Fahrt", "Fahrt"]);
    expect(unitsFor("Kleinauftrag")).toEqual(["Auftrag", "Auftrag", "Auftrag"]);
    expect(unitsFor("Fehlersuche / Reparatur")).toEqual(["Einsatz"]);
    expect(unitsFor("Entsorgung")).toEqual(["m³"]);
  });

  it("contains the confirmed spelling corrections", () => {
    expect(seed).toContain("'Trockenbaudemontage'");
    expect(seed).toContain("'Zaundemontage'");
    expect(seed).not.toContain("Trockenbaudemontege");
    expect(seed).not.toContain("Zaunmontagedemontage");
  });

  it("is rerunnable with prices but without tax fields", () => {
    expect(seed).toContain("ON CONFLICT (id) DO UPDATE SET");
    expect(seed).toContain("default_price");
    expect(seed).not.toContain("tax_rate");
  });

  it("assigns every starter template a positive net price recommendation", () => {
    expect(recommendedPrices).toHaveLength(rows.length);
    expect(new Set(recommendedPrices.map((price) => price.id))).toEqual(
      new Set(rows.map((row) => row.id)),
    );
    expect(recommendedPrices.every((price) => price.cents > 0)).toBe(true);
  });
});
