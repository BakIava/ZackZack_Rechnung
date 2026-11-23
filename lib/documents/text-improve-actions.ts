"use server";

import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { TextImproveError, improveDocumentText } from "@/lib/integrations/anthropic/text-improver";
import { consumeTextAiQuota } from "@/lib/repositories/text-ai-usage";
import type { TextImproveResult } from "@/types/text-improve";
import { processTextImprove } from "./text-improve-service";

/** Nur Codes loggen – nie den Text selbst. */
function logTextImprove(stage: string, details: Record<string, unknown>) {
  console.error(`[text-improve] ${JSON.stringify({ stage, ...details })}`);
}

/** „Text verbessern“: deutscher Verbesserungsvorschlag für ein Positions- oder Katalogfeld. */
export async function improveText(text: unknown, feld: unknown): Promise<TextImproveResult> {
  if (!(await getCurrentCompanyId())) return { status: "fehler" };

  return processTextImprove(text, feld, {
    consumeAiQuota: async () => {
      const result = await consumeTextAiQuota();
      if ("error" in result) {
        logTextImprove("quota_check", { errorCode: result.error });
        throw new Error(result.error);
      }
      return result.quota;
    },
    improve: async (input, art) => {
      try {
        return await improveDocumentText(input, art);
      } catch (error) {
        logTextImprove("provider_response", {
          errorCode: error instanceof TextImproveError ? error.code : "unknown",
          httpStatus: error instanceof TextImproveError ? error.httpStatus : undefined,
        });
        throw error;
      }
    },
  });
}
