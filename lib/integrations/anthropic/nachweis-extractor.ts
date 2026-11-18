import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { NachweisExtraction, NachweisMediaType } from "@/types/nachweis";
import {
  NACHWEIS_EXTRACTION_SCHEMA,
  NACHWEIS_EXTRACTION_SYSTEM_PROMPT,
  parseNachweisExtractionJson,
} from "./nachweis-extraction-contract";

export type NachweisExtractionErrorCode =
  | "configuration"
  | "request_failed"
  | "refused"
  | "invalid_response";

export class NachweisExtractionError extends Error {
  constructor(
    readonly code: NachweisExtractionErrorCode,
    readonly httpStatus?: number,
  ) {
    super(`Nachweis extraction failed: ${code}`);
    this.name = "NachweisExtractionError";
  }
}

function getAnthropicConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model =
    process.env.ANTHROPIC_NACHWEIS_MODEL?.trim() ||
    process.env.ANTHROPIC_MODEL?.trim();
  if (!apiKey || !model) throw new NachweisExtractionError("configuration");
  return { apiKey, model };
}

function documentContent(
  mediaType: NachweisMediaType,
  base64: string,
): Anthropic.MessageParam["content"] {
  const instruction = {
    type: "text" as const,
    text: "Lies den Stundennachweis gemäß dem vorgegebenen Schema aus.",
  };
  if (mediaType === "application/pdf") {
    return [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      },
      instruction,
    ];
  }
  return [
    { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
    instruction,
  ];
}

/**
 * Liest die Stundentabelle eines Nachweises ab. Bewusst ohne `temperature`:
 * aktuelle Modelle (z. B. claude-sonnet-5-5) lehnen den Parameter ab.
 */
export async function extractNachweis(
  bytes: Uint8Array,
  mediaType: NachweisMediaType,
): Promise<NachweisExtraction> {
  const { apiKey, model } = getAnthropicConfig();
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model,
      max_tokens: 16000,
      system: NACHWEIS_EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: documentContent(mediaType, Buffer.from(bytes).toString("base64")),
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: NACHWEIS_EXTRACTION_SCHEMA },
      },
    });
  } catch (error) {
    throw new NachweisExtractionError(
      "request_failed",
      error instanceof Anthropic.APIError ? error.status : undefined,
    );
  }

  if (message.stop_reason === "refusal") throw new NachweisExtractionError("refused");
  if (message.stop_reason !== "end_turn") {
    throw new NachweisExtractionError("invalid_response");
  }
  const textBlock = message.content.find((block) => block.type === "text");
  const parsed = textBlock ? parseNachweisExtractionJson(textBlock.text) : null;
  if (!parsed) throw new NachweisExtractionError("invalid_response");
  return parsed;
}
