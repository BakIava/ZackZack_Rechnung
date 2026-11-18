import { describe, expect, it, vi } from "vitest";
import type { NachweisAusrichtung, NachweisMediaType } from "@/types/nachweis";
import { beispielNachweis } from "./nachweis-test-fixtures";
import { MAX_NACHWEIS_BYTES, processNachweis } from "./nachweis-service";

const PDF = new Blob([new TextEncoder().encode("%PDF-1.7 Nachweis")], {
  type: "application/pdf",
});
const SCAN_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0x01]);
const GEDREHT = new Uint8Array([0xff, 0xd8, 0xff, 0x02]);

function dependencies() {
  return {
    consumeAiQuota: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, dailyLimit: 10 }),
    extractNachweis: vi.fn().mockResolvedValue(beispielNachweis()),
    prepareNachweis: vi.fn(async (bytes: Uint8Array, mediaType: NachweisMediaType) => ({
      bytes,
      mediaType,
    })),
    detectOrientation: vi.fn<(bytes: Uint8Array) => Promise<NachweisAusrichtung>>(
      async () => "aufrecht",
    ),
    rotateNachweis: vi.fn().mockResolvedValue(GEDREHT),
  };
}

/** Wie ein PDF, aus dem der Scan als JPEG herausgelöst wurde. */
function mitScan() {
  const deps = dependencies();
  deps.prepareNachweis.mockResolvedValue({ bytes: SCAN_JPEG, mediaType: "image/jpeg" });
  return deps;
}

const KOPFUEBER = { ...beispielNachweis(), ausrichtung: "kopfueber" as const, mitarbeiter: [] };

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

  it("schickt Claude die vorbereitete Datei, z. B. den Scan aus dem PDF", async () => {
    const deps = mitScan();
    await processNachweis(PDF, deps);
    expect(deps.prepareNachweis).toHaveBeenCalledWith(expect.any(Uint8Array), "application/pdf");
    expect(deps.extractNachweis).toHaveBeenCalledWith(SCAN_JPEG, "image/jpeg");
    expect(deps.rotateNachweis).not.toHaveBeenCalled();
  });

  it("richtet ein gedrehtes Blatt nach der Vorprüfung auf – das Hauptmodell liest nur einmal", async () => {
    const deps = mitScan();
    deps.detectOrientation.mockResolvedValue("kopfueber");
    const result = await processNachweis(PDF, deps);
    expect(deps.detectOrientation).toHaveBeenCalledWith(SCAN_JPEG);
    expect(deps.rotateNachweis).toHaveBeenCalledWith(SCAN_JPEG, "kopfueber");
    expect(deps.extractNachweis).toHaveBeenCalledTimes(1);
    expect(deps.extractNachweis).toHaveBeenCalledWith(GEDREHT, "image/jpeg");
    expect(result.status).toBe("success");
  });

  it("liest das Bild wie es ist, wenn die Vorprüfung scheitert", async () => {
    const deps = mitScan();
    deps.detectOrientation.mockRejectedValue(new Error("haiku"));
    const result = await processNachweis(PDF, deps);
    expect(deps.rotateNachweis).not.toHaveBeenCalled();
    expect(deps.extractNachweis).toHaveBeenCalledWith(SCAN_JPEG, "image/jpeg");
    expect(result.status).toBe("success");
  });

  it("liest nach einem Fehlgriff der Vorprüfung aufgerichtet neu, ohne weiteres Kontingent", async () => {
    const deps = mitScan();
    deps.extractNachweis.mockResolvedValueOnce(KOPFUEBER);
    const result = await processNachweis(PDF, deps);
    expect(deps.rotateNachweis).toHaveBeenCalledWith(SCAN_JPEG, "kopfueber");
    expect(deps.extractNachweis).toHaveBeenLastCalledWith(GEDREHT, "image/jpeg");
    expect(deps.extractNachweis).toHaveBeenCalledTimes(2);
    expect(deps.consumeAiQuota).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: "success", ergebnis: { pruefung: { gesamt: 180 } } });
  });

  it("dreht ein PDF ohne herauslösbaren Scan nicht", async () => {
    const deps = dependencies();
    deps.extractNachweis.mockResolvedValue({ ...beispielNachweis(), ausrichtung: "kopfueber" });
    const result = await processNachweis(PDF, deps);
    expect(deps.detectOrientation).not.toHaveBeenCalled();
    expect(deps.rotateNachweis).not.toHaveBeenCalled();
    expect(deps.extractNachweis).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("success");
  });

  it("behält das erste Ergebnis, wenn das zweite Lesen scheitert", async () => {
    const deps = mitScan();
    const ersteLesung = { ...beispielNachweis(), ausrichtung: "kopf_links" as const };
    deps.extractNachweis
      .mockResolvedValueOnce(ersteLesung)
      .mockRejectedValueOnce(new Error("provider"));
    const result = await processNachweis(PDF, deps);
    expect(deps.rotateNachweis).toHaveBeenCalledWith(SCAN_JPEG, "kopf_links");
    expect(result).toMatchObject({ status: "success", ergebnis: { pruefung: { gesamt: 180 } } });
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
