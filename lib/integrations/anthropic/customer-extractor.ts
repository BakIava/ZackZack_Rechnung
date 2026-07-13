import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import {
  parseCustomerExtractionJson,
} from "@/lib/customers/customer-intake";
import type { CustomerIntakeData } from "@/types/customer-intake";
import {
  CUSTOMER_EXTRACTION_SCHEMA,
  CUSTOMER_EXTRACTION_SYSTEM_PROMPT,
} from "./customer-extraction-contract";

export type CustomerExtractionErrorCode =
  | "configuration"
  | "request_failed"
  | "invalid_response";

export class CustomerExtractionError extends Error {
  constructor(readonly code: CustomerExtractionErrorCode) {
    super(`Customer extraction failed: ${code}`);
    this.name = "CustomerExtractionError";
  }
}

function getAnthropicConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim();
  if (!apiKey || !model) throw new CustomerExtractionError("configuration");
  return { apiKey, model };
}

export async function extractCustomerData(text: string): Promise<CustomerIntakeData> {
  const { apiKey, model } = getAnthropicConfig();
  const client = new Anthropic({
    apiKey,
    maxRetries: 1,
    timeout: 20_000,
  });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model,
      max_tokens: 512,
      temperature: 0,
      system: CUSTOMER_EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extrahiere die Kundendaten aus diesem JSON-kodierten Eingabetext:\n${JSON.stringify(text)}`,
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: CUSTOMER_EXTRACTION_SCHEMA,
        },
      },
    });
  } catch {
    throw new CustomerExtractionError("request_failed");
  }

  if (message.stop_reason !== "end_turn") {
    throw new CustomerExtractionError("invalid_response");
  }

  const textBlock = message.content.find((block) => block.type === "text");
  const parsed = textBlock ? parseCustomerExtractionJson(textBlock.text) : null;
  if (!parsed) throw new CustomerExtractionError("invalid_response");
  return parsed;
}

