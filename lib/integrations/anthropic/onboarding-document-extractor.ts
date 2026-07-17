import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { OnboardingDocumentMediaType } from "@/types/onboarding-extraction";
import {
  ONBOARDING_EXTRACTION_SCHEMA,
  ONBOARDING_EXTRACTION_SYSTEM_PROMPT,
  parseOnboardingExtractionJson,
  type RawOnboardingExtraction,
} from "./onboarding-extraction-contract";

export type OnboardingDocumentExtractionErrorCode =
  | "configuration"
  | "request_failed"
  | "invalid_response";

export interface OnboardingDocumentExtractionErrorDetails {
  configurationField?: "ANTHROPIC_API_KEY" | "ANTHROPIC_ONBOARDING_MODEL";
  httpStatus?: number;
  providerType?: string;
  providerRequestId?: string;
  causeName?: string;
  detailCode?: "unexpected_stop_reason" | "schema_parse_failed";
  stopReason?: string;
}

export class OnboardingDocumentExtractionError extends Error {
  constructor(
    readonly code: OnboardingDocumentExtractionErrorCode,
    readonly details: OnboardingDocumentExtractionErrorDetails = {},
  ) {
    super(`Onboarding document extraction failed: ${code}`);
    this.name = "OnboardingDocumentExtractionError";
  }
}

function getAnthropicConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model =
    process.env.ANTHROPIC_ONBOARDING_MODEL?.trim() ||
    process.env.ANTHROPIC_MODEL?.trim();
  if (!apiKey) {
    throw new OnboardingDocumentExtractionError("configuration", {
      configurationField: "ANTHROPIC_API_KEY",
    });
  }
  if (!model) {
    throw new OnboardingDocumentExtractionError("configuration", {
      configurationField: "ANTHROPIC_ONBOARDING_MODEL",
    });
  }
  return { apiKey, model };
}

function documentContent(
  mediaType: OnboardingDocumentMediaType,
  base64: string,
): Anthropic.MessageParam["content"] {
  const instruction = {
    type: "text" as const,
    text: "Extrahiere die Stammdaten des Dokumentausstellers gemäß dem vorgegebenen Schema.",
  };
  if (mediaType === "application/pdf") {
    return [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      },
      instruction,
    ];
  }
  return [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64,
      },
    },
    instruction,
  ];
}

export async function extractOnboardingDocument(
  bytes: Uint8Array,
  mediaType: OnboardingDocumentMediaType,
): Promise<RawOnboardingExtraction> {
  const { apiKey, model } = getAnthropicConfig();
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 30_000 });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model,
      max_tokens: 2048,
      temperature: 0,
      system: ONBOARDING_EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: documentContent(mediaType, Buffer.from(bytes).toString("base64")),
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: ONBOARDING_EXTRACTION_SCHEMA,
        },
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new OnboardingDocumentExtractionError("request_failed", {
        httpStatus: error.status,
        providerType: error.type ?? undefined,
        providerRequestId: error.requestID ?? undefined,
        causeName: error.name,
      });
    }
    throw new OnboardingDocumentExtractionError("request_failed", {
      causeName: error instanceof Error ? error.name : "unknown",
    });
  }

  if (message.stop_reason !== "end_turn") {
    throw new OnboardingDocumentExtractionError("invalid_response", {
      detailCode: "unexpected_stop_reason",
      stopReason: message.stop_reason ?? "null",
    });
  }
  const textBlock = message.content.find((block) => block.type === "text");
  const parsed = textBlock
    ? parseOnboardingExtractionJson(textBlock.text)
    : null;
  if (!parsed) {
    throw new OnboardingDocumentExtractionError("invalid_response", {
      detailCode: "schema_parse_failed",
    });
  }
  return parsed;
}
