import { describe, expect, it, vi } from "vitest";
import { EMPTY_SERVICE_LOCATION_EXTRACTION } from "./service-location-intake";
import { processServiceLocationIntake } from "./service-location-intake-service";

function dependencies() {
  return {
    consumeAiQuota: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, dailyLimit: 10 }),
    extractServiceLocation: vi.fn().mockResolvedValue({
      ...EMPTY_SERVICE_LOCATION_EXTRACTION,
      name: "Baustelle Familie Schneider",
      street: "Gartenstraße",
    }),
  };
}

describe("processServiceLocationIntake", () => {
  it("fragt bei ungültigem Text weder Quote noch KI ab", async () => {
    const deps = dependencies();
    await expect(processServiceLocationIntake(" ", deps)).resolves.toEqual({
      status: "manual", reason: "invalid_input",
    });
    expect(deps.consumeAiQuota).not.toHaveBeenCalled();
    expect(deps.extractServiceLocation).not.toHaveBeenCalled();
  });

  it("blockiert beim gemeinsamen Tageslimit vor dem KI-Aufruf", async () => {
    const deps = dependencies();
    deps.consumeAiQuota.mockResolvedValue({ allowed: false, remaining: 0, dailyLimit: 10 });
    await expect(processServiceLocationIntake("Baustelle Mainz", deps)).resolves.toEqual({
      status: "manual", reason: "daily_limit_reached", dailyLimit: 10,
    });
    expect(deps.extractServiceLocation).not.toHaveBeenCalled();
  });

  it("gibt erkannte Teilangaben zum Prüfen an das Formular zurück", async () => {
    const deps = dependencies();
    await expect(processServiceLocationIntake("  Baustelle Mainz  ", deps)).resolves.toMatchObject({
      status: "extracted",
      location: { name: "Baustelle Familie Schneider", street: "Gartenstraße" },
    });
    expect(deps.extractServiceLocation).toHaveBeenCalledWith("Baustelle Mainz");
  });

  it("fällt bei Quoten- und KI-Fehlern ohne interne Details auf manuell zurück", async () => {
    const deps = dependencies();
    deps.consumeAiQuota.mockRejectedValueOnce(new Error("secret db detail"));
    await expect(processServiceLocationIntake("Baustelle", deps)).resolves.toEqual({
      status: "manual", reason: "quota_unavailable",
    });
    expect(deps.extractServiceLocation).not.toHaveBeenCalled();
    deps.extractServiceLocation.mockRejectedValueOnce(new Error("secret provider detail"));
    await expect(processServiceLocationIntake("Baustelle", deps)).resolves.toEqual({
      status: "manual", reason: "extraction_failed",
    });
  });

  it("behandelt eine leere KI-Antwort als manuelle Eingabe", async () => {
    const deps = dependencies();
    deps.extractServiceLocation.mockResolvedValue(EMPTY_SERVICE_LOCATION_EXTRACTION);
    await expect(processServiceLocationIntake("irgendein Text", deps)).resolves.toEqual({
      status: "manual", reason: "no_usable_data",
    });
  });
});
