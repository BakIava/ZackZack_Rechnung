import { describe, expect, it } from "vitest";
import { TRADE_IDS } from "@/types/database";
import { isTradeId, validateTradeIds } from "./trades";

describe("onboarding trade validation", () => {
  it.each(TRADE_IDS)("accepts the stable trade id %s", (tradeId) => {
    expect(isTradeId(tradeId)).toBe(true);
    expect(validateTradeIds([tradeId])).toEqual({ ok: true, tradeIds: [tradeId] });
  });

  it("accepts multiple trades and preserves their order", () => {
    expect(validateTradeIds(["painter", "electrician", "cleaning"])).toEqual({
      ok: true,
      tradeIds: ["painter", "electrician", "cleaning"],
    });
  });

  it("normalizes repeated ids", () => {
    expect(validateTradeIds(["tiler", "tiler", "flooring"])).toEqual({
      ok: true,
      tradeIds: ["tiler", "flooring"],
    });
  });

  it.each([
    undefined,
    null,
    "painter",
    ["maler"],
    ["painter", "unknown"],
    [19],
  ])("rejects invalid serialized values: %j", (value) => {
    expect(validateTradeIds(value)).toEqual({ ok: false, reason: "invalid" });
  });

  it("requires at least one trade", () => {
    expect(validateTradeIds([])).toEqual({ ok: false, reason: "required" });
  });
});
