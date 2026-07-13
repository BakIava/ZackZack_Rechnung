import { describe, expect, it } from "vitest";
import { parseCustomerAiQuota } from "./customer-ai-quota";

describe("parseCustomerAiQuota", () => {
  it("normalisiert die TABLE-Antwort der RPC", () => {
    expect(
      parseCustomerAiQuota([
        { allowed: true, remaining: 4, daily_limit: 10 },
      ]),
    ).toEqual({ allowed: true, remaining: 4, dailyLimit: 10 });
  });

  it("akzeptiert eine ausgeschöpfte Quote", () => {
    expect(
      parseCustomerAiQuota({ allowed: false, remaining: 0, daily_limit: 10 }),
    ).toEqual({ allowed: false, remaining: 0, dailyLimit: 10 });
  });

  it("lehnt fehlende oder widersprüchliche Werte ab", () => {
    expect(parseCustomerAiQuota([])).toBeNull();
    expect(
      parseCustomerAiQuota({ allowed: true, remaining: 11, daily_limit: 10 }),
    ).toBeNull();
    expect(
      parseCustomerAiQuota({ allowed: "yes", remaining: 9, daily_limit: 10 }),
    ).toBeNull();
  });
});

