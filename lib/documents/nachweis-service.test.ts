import { describe, expect, it, vi } from "vitest";
import { beispielNachweis } from "./nachweis-test-fixtures";
import { MAX_NACHWEIS_BYTES, processNachweis } from "./nachweis-service";

const PDF = new Blob([new TextEncoder().encode("%PDF-1.7 Nachweis")], {
  type: "application/pdf",
});

function dependencies() {
  return {
    consumeAiQuota: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, dailyLimit: 10 }),
    extractNachweis: vi.fn().mockResolvedValue(beispielNachweis()),
  };
}

describe("processNachweis", () => {
  it("liest, rechnet und prüft das Blatt", async () => {
    const deps = dependencies();
    const result = await processNachweis(PDF, deps);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.ergebnis.pruefung).toMatchObject({ gesamt: 180, ok: true });
    expect(deps.extractNachweis).toHaveBeenCalledWith(expect.any(Uint8Array), "application/pdf");
  });

  it("lehnt fehlende, leere und fremde Dateien ab, ohne Kontingent zu verbrauchen", async () => {
    const deps = dependencies();
    for (const file of [null, "text", new Blob([]), new Blob(["hallo"], { type: "text/plain" })]) {
      await expect(processNachweis(file, deps)).resolves.toEqual({
        status: "error",
        error: "unsupported_file",
      });
    }
    expect(deps.consumeAiQuota).not.toHaveBeenCalled();
  });

  it("lehnt zu große Dateien ab", async () => {
    const deps = dependencies();
    const big = new Blob([new Uint8Array(MAX_NACHWEIS_BYTES + 1)]);
    await expect(processNachweis(big, deps)).resolves.toEqual({
      status: "error",
      error: "file_too_large",
    });
  });

  it("meldet das erreichte Tageslimit mit Grenze und ruft Claude nicht", async () => {
    const deps = dependencies();
    deps.consumeAiQuota.mockResolvedValue({ allowed: false, remaining: 0, dailyLimit: 10 });
    await expect(processNachweis(PDF, deps)).resolves.toEqual({
      status: "error",
      error: "quota_reached",
      dailyLimit: 10,
    });
    expect(deps.extractNachweis).not.toHaveBeenCalled();
  });

  it("bildet Kontingent- und Providerfehler auf stabile Codes ab", async () => {
    const quotaDown = dependencies();
    quotaDown.consumeAiQuota.mockRejectedValue(new Error("db"));
    await expect(processNachweis(PDF, quotaDown)).resolves.toMatchObject({
      error: "quota_unavailable",
    });

    const providerDown = dependencies();
    providerDown.extractNachweis.mockRejectedValue(new Error("provider secret"));
    await expect(processNachweis(PDF, providerDown)).resolves.toEqual({
      status: "error",
      error: "provider_unavailable",
    });
  });

  it("meldet ein Blatt ohne Stunden und ohne Material", async () => {
    const deps = dependencies();
    deps.extractNachweis.mockResolvedValue({ ...beispielNachweis(), mitarbeiter: [] });
    await expect(processNachweis(PDF, deps)).resolves.toEqual({
      status: "error",
      error: "no_hours_found",
    });
  });
});
