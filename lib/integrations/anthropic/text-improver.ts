import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type {
  TextImproveFeld,
  TextImproveKiAntwort,
  TextImproveListeAntwort,
  TextImproveListeEintrag,
} from "@/types/text-improve";
import {
  TEXT_IMPROVE_SCHEMA,
  TEXT_IMPROVE_SYSTEM_PROMPT,
  parseTextImproveJson,
  textImproveNachricht,
} from "./text-improve-contract";
import {
  TEXT_IMPROVE_LISTE_SCHEMA,
  TEXT_IMPROVE_LISTE_SYSTEM_PROMPT,
  parseTextImproveListeJson,
  textImproveListeNachricht,
} from "./text-improve-liste-contract";

export type TextImproveErrorCode =
  | "configuration"
  | "request_failed"
  | "refused"
  | "invalid_response";

export class TextImproveError extends Error {
  constructor(
    readonly code: TextImproveErrorCode,
    readonly httpStatus?: number,
  ) {
    super(`Text improvement failed: ${code}`);
    this.name = "TextImproveError";
  }
}

function getAnthropicConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim();
  if (!apiKey || !model) throw new TextImproveError("configuration");
  return { apiKey, model };
}

/**
 * Ein strukturierter Aufruf; liefert den JSON-Text. Ohne `temperature`
 * (aktuelle Modelle lehnen sie ab) und mit Platz für das standardmäßige
 * Mitdenken neuerer Modelle – sonst endet die Antwort vorzeitig.
 */
async function strukturierteAntwort(
  request: Omit<Anthropic.MessageCreateParamsNonStreaming, "model">,
  timeout: number,
): Promise<string> {
  const { apiKey, model } = getAnthropicConfig();
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({ ...request, model });
  } catch (error) {
    throw new TextImproveError(
      "request_failed",
      error instanceof Anthropic.APIError ? error.status : undefined,
    );
  }

  if (message.stop_reason === "refusal") throw new TextImproveError("refused");
  if (message.stop_reason !== "end_turn") throw new TextImproveError("invalid_response");
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock) throw new TextImproveError("invalid_response");
  return textBlock.text;
}

/** Schlägt einen verbesserten deutschen Text vor; ob er taugt, prüft lib/documents/text-improve.ts. */
export async function improveDocumentText(
  text: string,
  feld: TextImproveFeld,
): Promise<TextImproveKiAntwort> {
  const raw = await strukturierteAntwort({
    max_tokens: 4096,
    system: TEXT_IMPROVE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: textImproveNachricht(text, feld) }],
    output_config: { format: { type: "json_schema", schema: TEXT_IMPROVE_SCHEMA } },
  }, 15_000);
  const parsed = parseTextImproveJson(raw);
  if (!parsed) throw new TextImproveError("invalid_response");
  return parsed;
}

/**
 * Alle Positionen in einem Aufruf: eine Wartezeit statt vieler und
 * einheitliche Begriffe über das ganze Dokument. Prüfung je Feld in
 * lib/documents/text-check.ts.
 */
export async function improveDocumentTexts(
  positionen: TextImproveListeEintrag[],
): Promise<TextImproveListeAntwort[]> {
  const raw = await strukturierteAntwort({
    max_tokens: 16_000,
    system: TEXT_IMPROVE_LISTE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: textImproveListeNachricht(positionen) }],
    output_config: { format: { type: "json_schema", schema: TEXT_IMPROVE_LISTE_SCHEMA } },
  }, 40_000);
  const parsed = parseTextImproveListeJson(raw, positionen);
  if (!parsed) throw new TextImproveError("invalid_response");
  return parsed;
}
