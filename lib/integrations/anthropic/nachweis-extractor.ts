import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type {
  NachweisAusrichtung,
  NachweisExtraktion,
  NachweisMediaType,
} from "@/types/nachweis";
import {
  NACHWEIS_AUSRICHTUNG_SCHEMA,
  NACHWEIS_AUSRICHTUNG_SYSTEM_PROMPT,
  parseNachweisAusrichtungJson,
} from "./nachweis-extraction-contract";
import { NACHWEIS_VARIANTEN_SCHEMA, parseNachweisVariantenJson } from "./nachweis-varianten-contract";
import { NACHWEIS_VARIANTEN_SYSTEM_PROMPT } from "./nachweis-varianten-prompt";

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

/** Erste gesetzte Modell-Variable gewinnt. */
function getAnthropicConfig(...modelVariablen: string[]): { apiKey: string; model: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model = modelVariablen.map((name) => process.env[name]?.trim()).find(Boolean);
  if (!apiKey || !model) throw new NachweisExtractionError("configuration");
  return { apiKey, model };
}

function documentContent(
  mediaType: NachweisMediaType,
  base64: string,
  instruction: string,
): Anthropic.MessageParam["content"] {
  const text = { type: "text" as const, text: instruction };
  if (mediaType === "application/pdf") {
    return [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      },
      text,
    ];
  }
  return [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, text];
}

/**
 * Ein Aufruf mit strukturierter Antwort; liefert den JSON-Text. Bewusst ohne
 * `temperature`: aktuelle Modelle (z. B. claude-sonnet-5-5) lehnen den Parameter ab.
 */
async function strukturierteAntwort(
  apiKey: string,
  request: Anthropic.MessageCreateParamsNonStreaming,
  timeout: number,
  signal?: AbortSignal,
): Promise<string> {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create(request, { signal });
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
  if (!textBlock) throw new NachweisExtractionError("invalid_response");
  return textBlock.text;
}

/**
 * Liest die Stundentabelle eines Nachweises ab. `effort: "high"` ausdrücklich:
 * Opus 5.5 nimmt sonst „medium“ und ordnete versetzt geschriebene Stunden im
 * Test seltener der richtigen Zeile zu.
 */
export async function extractNachweisVarianten(
  bytes: Uint8Array,
  mediaType: NachweisMediaType,
  signal?: AbortSignal,
): Promise<NachweisExtraktion> {
  const { apiKey, model } = getAnthropicConfig("ANTHROPIC_NACHWEIS_MODEL", "ANTHROPIC_MODEL");
  const text = await strukturierteAntwort(
    apiKey,
    {
      model,
      max_tokens: 16000,
      system: NACHWEIS_VARIANTEN_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: documentContent(
            mediaType,
            Buffer.from(bytes).toString("base64"),
            "Lies den Arbeitsnachweis gemäß dem vorgegebenen Schema aus.",
          ),
        },
      ],
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: NACHWEIS_VARIANTEN_SCHEMA },
      },
    },
    42_000,
    signal,
  );
  const parsed = parseNachweisVariantenJson(text);
  if (!parsed) throw new NachweisExtractionError("invalid_response");
  return parsed;
}

/**
 * Erkennt mit dem günstigen Standardmodell auf einem kleinen Vorschaubild, wie
 * das Blatt liegt (Test: 31 von 32 richtig, ca. 0,02 ct). So liest das teure
 * Modell jedes Blatt nur einmal und aufrecht.
 */
export async function erkenneNachweisAusrichtung(jpeg: Uint8Array, signal?: AbortSignal): Promise<NachweisAusrichtung> {
  const { apiKey, model } = getAnthropicConfig("ANTHROPIC_MODEL");
  const text = await strukturierteAntwort(
    apiKey,
    {
      model,
      max_tokens: 4000,
      system: NACHWEIS_AUSRICHTUNG_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: documentContent(
            "image/jpeg",
            Buffer.from(jpeg).toString("base64"),
            "Wo liegt der Kopf des Formulars?",
          ),
        },
      ],
      output_config: { format: { type: "json_schema", schema: NACHWEIS_AUSRICHTUNG_SCHEMA } },
    },
    8_000,
    signal,
  );
  const ausrichtung = parseNachweisAusrichtungJson(text);
  if (!ausrichtung) throw new NachweisExtractionError("invalid_response");
  return ausrichtung;
}
