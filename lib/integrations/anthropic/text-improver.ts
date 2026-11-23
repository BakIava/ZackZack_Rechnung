import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { TextImproveFeld, TextImproveKiAntwort } from "@/types/text-improve";
import {
  TEXT_IMPROVE_SCHEMA,
  TEXT_IMPROVE_SYSTEM_PROMPT,
  parseTextImproveJson,
  textImproveNachricht,
} from "./text-improve-contract";

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

/** Schlägt einen verbesserten deutschen Text vor; ob er taugt, prüft lib/documents/text-improve.ts. */
export async function improveDocumentText(
  text: string,
  feld: TextImproveFeld,
): Promise<TextImproveKiAntwort> {
  const { apiKey, model } = getAnthropicConfig();
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 15_000 });

  let message: Anthropic.Message;
  try {
    // Ohne `temperature` (aktuelle Modelle lehnen sie ab) und mit Platz für das
    // standardmäßige Mitdenken neuerer Modelle – sonst endet die Antwort vorzeitig.
    message = await client.messages.create({
      model,
      max_tokens: 4096,
      system: TEXT_IMPROVE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: textImproveNachricht(text, feld) }],
      output_config: {
        format: { type: "json_schema", schema: TEXT_IMPROVE_SCHEMA },
      },
    });
  } catch (error) {
    throw new TextImproveError(
      "request_failed",
      error instanceof Anthropic.APIError ? error.status : undefined,
    );
  }

  if (message.stop_reason === "refusal") throw new TextImproveError("refused");
  if (message.stop_reason !== "end_turn") throw new TextImproveError("invalid_response");

  const textBlock = message.content.find((block) => block.type === "text");
  const parsed = textBlock ? parseTextImproveJson(textBlock.text) : null;
  if (!parsed) throw new TextImproveError("invalid_response");
  return parsed;
}
