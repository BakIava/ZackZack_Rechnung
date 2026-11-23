import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { improveDocumentText, improveDocumentTexts } from "./text-improver";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    static APIError = class extends Error {};
    messages = { create };
  },
}));

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only");
  vi.stubEnv("ANTHROPIC_MODEL", "text-test");
  create.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("Text-verbessern SDK-Adapter", () => {
  it("fragt strukturiert mit dem Standardmodell an", async () => {
    create.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: '{"deutsch":true,"text_de":"Fliesen verlegen"}' }],
    });
    await expect(improveDocumentText("fliesen verlegn", "bezeichnung"))
      .resolves.toEqual({ deutsch: true, textDe: "Fliesen verlegen" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: "text-test",
      output_config: { format: expect.objectContaining({ type: "json_schema" }) },
      messages: [{ role: "user", content: expect.stringContaining('"fliesen verlegn"') }],
    }));
    expect(create.mock.calls[0][0]).not.toHaveProperty("temperature");
  });

  it("meldet fehlende Konfiguration ohne Aufruf", async () => {
    vi.stubEnv("ANTHROPIC_MODEL", "");
    await expect(improveDocumentText("fliesen", "bezeichnung")).rejects.toMatchObject({ code: "configuration" });
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ["refusal", "", "refused"],
    ["max_tokens", "{}", "invalid_response"],
    ["end_turn", "{", "invalid_response"],
  ])("meldet bei %s einen stabilen Code", async (stop_reason, text, code) => {
    create.mockResolvedValue({ stop_reason, content: [{ type: "text", text }] });
    await expect(improveDocumentText("fliesen", "bezeichnung")).rejects.toMatchObject({ code });
  });

  it("meldet Netzwerkfehler als request_failed", async () => {
    create.mockRejectedValue(new Error("offline"));
    await expect(improveDocumentText("fliesen", "bezeichnung")).rejects.toMatchObject({ code: "request_failed" });
  });

  it("prüft alle Positionen in einem einzigen Aufruf", async () => {
    const positionen = [
      { id: "p1", bezeichnung: "fliesen verlegn", zusatztext: null },
      { id: "p2", bezeichnung: "geruest", zusatztext: "inkl abbau" },
    ];
    create.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify({ positionen: [
        { id: "p1", deutsch: true, bezeichnung: "Fliesen verlegen", zusatztext: null },
        { id: "p2", deutsch: true, bezeichnung: "Gerüst", zusatztext: "Inkl. Abbau" },
      ] }) }],
    });
    await expect(improveDocumentTexts(positionen)).resolves.toHaveLength(2);
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: "text-test",
      max_tokens: 16_000,
      messages: [{ role: "user", content: expect.stringContaining(JSON.stringify(positionen)) }],
    }));
  });

  it("verwirft eine Sammelantwort mit fremden Positionen", async () => {
    create.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: '{"positionen":[{"id":"p7","deutsch":true,"bezeichnung":"A","zusatztext":null}]}' }],
    });
    await expect(improveDocumentTexts([{ id: "p1", bezeichnung: "a", zusatztext: null }]))
      .rejects.toMatchObject({ code: "invalid_response" });
  });
});
