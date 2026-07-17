import { TRADE_IDS, type TradeId } from "@/types/database";

const TRADE_ID_SET: ReadonlySet<string> = new Set(TRADE_IDS);

export function isTradeId(value: unknown): value is TradeId {
  return typeof value === "string" && TRADE_ID_SET.has(value);
}

export type TradeValidationResult =
  | { ok: true; tradeIds: TradeId[] }
  | { ok: false; reason: "required" | "invalid" };

/** Runtime-Validierung für serialisierte Clientdaten; Duplikate werden entfernt. */
export function validateTradeIds(value: unknown): TradeValidationResult {
  if (!Array.isArray(value)) return { ok: false, reason: "invalid" };
  if (value.length === 0) return { ok: false, reason: "required" };
  if (!value.every(isTradeId)) return { ok: false, reason: "invalid" };

  return { ok: true, tradeIds: [...new Set(value)] };
}
