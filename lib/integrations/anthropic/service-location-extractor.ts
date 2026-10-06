import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { parseServiceLocationExtractionJson } from "@/lib/documents/service-location-intake";
import type { ServiceLocationExtraction } from "@/types/service-location";
import {
  SERVICE_LOCATION_EXTRACTION_SCHEMA,
  SERVICE_LOCATION_EXTRACTION_SYSTEM_PROMPT,
} from "./service-location-extraction-contract";

export async function extractServiceLocation(text: string): Promise<ServiceLocationExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim();
  if (!apiKey || !model) throw new Error("service_location_ai_configuration");

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 });
  const message = await client.messages.create({
    model,
    max_tokens: 512,
    temperature: 0,
    system: SERVICE_LOCATION_EXTRACTION_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Extrahiere den Einsatzort aus diesem JSON-kodierten Eingabetext:\n${JSON.stringify(text)}`,
    }],
    output_config: {
      format: { type: "json_schema", schema: SERVICE_LOCATION_EXTRACTION_SCHEMA },
    },
  });
  if (message.stop_reason !== "end_turn") throw new Error("service_location_ai_invalid_response");
  const textBlock = message.content.find((block) => block.type === "text");
  const location = textBlock ? parseServiceLocationExtractionJson(textBlock.text) : null;
  if (!location) throw new Error("service_location_ai_invalid_response");
  return location;
}
