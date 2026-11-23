import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freieKalendernotiz } from "@/lib/documents/nachweis-frei-fixtures";
import { extractNachweisVarianten } from "./nachweis-extractor";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class { messages = { create }; },
}));

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only");
  vi.stubEnv("ANTHROPIC_NACHWEIS_MODEL", "nachweis-test");
  create.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

const bytes = new Uint8Array([1, 2, 3]);
function respond(nachweis: unknown) {
  create.mockResolvedValue({
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify({ nachweis }) }],
  });
}

describe("Nachweis SDK-Adapter", () => {
  it("liest freie Notizen in einer strukturierten Fotoanfrage", async () => {
    respond(freieKalendernotiz());
    await expect(extractNachweisVarianten(bytes, "image/jpeg")).resolves.toMatchObject({
      variante: "frei",
      stundenLautBlatt: 6.5,
    });
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: "nachweis-test",
      output_config: expect.objectContaining({ format: expect.objectContaining({ type: "json_schema" }) }),
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AQID" } },
        expect.objectContaining({ type: "text" }),
      ] }],
    }), expect.anything());
  });

  it("erhält Zuordnung und Blattwerte für eine Tabelle", async () => {
    respond({
      variante: "tabelle", ausrichtung: "kopf_rechts", nachweis_nummer: "TEST-01", projekt: "",
      tage: [], material: [], arbeitsleistung: "Montage", gesamt_summe_laut_blatt: 8,
      mitarbeiter: [{ name: "Testkraft A", eintraege: [
        { datum: "2026-11-09", stunden: 8, zelle: "zahl", unsicher: true },
      ] }],
    });
    await expect(extractNachweisVarianten(bytes, "application/pdf")).resolves.toMatchObject({
      variante: "tabelle", ausrichtung: "kopf_rechts", gesamtSummeLautBlatt: 8,
      mitarbeiter: [{ eintraege: [{ stunden: 8, unsicher: true }] }],
    });
  });

  it.each([
    ["refusal", "", "refused"],
    ["max_tokens", "{}", "invalid_response"],
    ["end_turn", "{", "invalid_response"],
  ])("meldet bei %s einen stabilen Code", async (stop_reason, text, code) => {
    create.mockResolvedValue({ stop_reason, content: [{ type: "text", text }] });
    await expect(extractNachweisVarianten(bytes, "image/jpeg")).rejects.toMatchObject({ code });
  });
});
