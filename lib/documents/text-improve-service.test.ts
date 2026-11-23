import { describe, expect, it, vi } from "vitest";
import { processTextImprove } from "./text-improve-service";

const ALLOWED = { allowed: true, remaining: 49, dailyLimit: 50 };

function dependencies(overrides: Partial<Parameters<typeof processTextImprove>[2]> = {}) {
  return {
    consumeAiQuota: vi.fn().mockResolvedValue(ALLOWED),
    improve: vi.fn().mockResolvedValue({ deutsch: true, textDe: "Fliesen verlegen" }),
    ...overrides,
  };
}

describe("processTextImprove", () => {
  it("liefert den abgesicherten Vorschlag", async () => {
    const deps = dependencies();
    await expect(processTextImprove(" fliesen verlegn ", "bezeichnung", deps))
      .resolves.toEqual({ status: "vorschlag", text: "Fliesen verlegen" });
    expect(deps.improve).toHaveBeenCalledWith("fliesen verlegn", "bezeichnung");
  });

  it("verbraucht bei ungültiger Eingabe kein Kontingent", async () => {
    const deps = dependencies();
    await expect(processTextImprove("x", "bezeichnung", deps)).resolves.toEqual({ status: "fehler" });
    await expect(processTextImprove("Fliesen", "preis", deps)).resolves.toEqual({ status: "fehler" });
    expect(deps.consumeAiQuota).not.toHaveBeenCalled();
    expect(deps.improve).not.toHaveBeenCalled();
  });

  it("ruft Claude nach erreichtem Tageslimit nicht mehr auf", async () => {
    const deps = dependencies({
      consumeAiQuota: vi.fn().mockResolvedValue({ allowed: false, remaining: 0, dailyLimit: 50 }),
    });
    await expect(processTextImprove("fliesen", "bezeichnung", deps))
      .resolves.toEqual({ status: "limit", dailyLimit: 50 });
    expect(deps.improve).not.toHaveBeenCalled();
  });

  it("meldet Fehler, wenn Kontingent oder Claude nicht erreichbar sind", async () => {
    await expect(processTextImprove("fliesen", "bezeichnung", dependencies({
      consumeAiQuota: vi.fn().mockRejectedValue(new Error("quota_unavailable")),
    }))).resolves.toEqual({ status: "fehler" });
    await expect(processTextImprove("fliesen", "bezeichnung", dependencies({
      improve: vi.fn().mockRejectedValue(new Error("request_failed")),
    }))).resolves.toEqual({ status: "fehler" });
  });

  it("gibt nicht deutsche Texte ohne Übersetzung zurück", async () => {
    await expect(processTextImprove("banyo fayans", "bezeichnung", dependencies({
      improve: vi.fn().mockResolvedValue({ deutsch: false, textDe: "banyo fayans" }),
    }))).resolves.toEqual({ status: "kein_deutsch" });
  });
});
