"use server";

import { getCurrentCompanyId } from "@/lib/supabase/auth";
import {
  TextImproveError,
  improveDocumentText,
  improveDocumentTexts,
} from "@/lib/integrations/anthropic/text-improver";
import { isDraftDocument } from "@/lib/repositories/document-drafts";
import { getDraftItems, updateDocumentItem } from "@/lib/repositories/document-items";
import { consumeTextAiQuota } from "@/lib/repositories/text-ai-usage";
import type { CustomerAiQuota } from "@/types/customer-intake";
import type { TextImproveResult, TextPruefungResult, TextUebernahmeResult } from "@/types/text-improve";
import { normalizeAdditionalDescriptionDe } from "./additional-description";
import { getItemContext, recomputeDraftItems } from "./item-write";
import { parseTextUebernahme } from "./text-check";
import { processTextImprove, processTextPruefung } from "./text-improve-service";

/** Nur Codes loggen – nie den Text selbst. */
function logTextImprove(stage: string, details: Record<string, unknown>) {
  console.error(`[text-improve] ${JSON.stringify({ stage, ...details })}`);
}

async function consumeQuota(): Promise<CustomerAiQuota> {
  const result = await consumeTextAiQuota();
  if ("error" in result) {
    logTextImprove("quota_check", { errorCode: result.error });
    throw new Error(result.error);
  }
  return result.quota;
}

function logProviderError(error: unknown): void {
  logTextImprove("provider_response", {
    errorCode: error instanceof TextImproveError ? error.code : "unknown",
    httpStatus: error instanceof TextImproveError ? error.httpStatus : undefined,
  });
}

/** „Text verbessern“: deutscher Verbesserungsvorschlag für ein Positions- oder Katalogfeld. */
export async function improveText(text: unknown, feld: unknown): Promise<TextImproveResult> {
  if (!(await getCurrentCompanyId())) return { status: "fehler" };

  return processTextImprove(text, feld, {
    consumeAiQuota: consumeQuota,
    improve: async (input, art) => {
      try {
        return await improveDocumentText(input, art);
      } catch (error) {
        logProviderError(error);
        throw error;
      }
    },
  });
}

/** „Texte prüfen“: Vorschläge für alle freien Positionen eines Entwurfs in einem KI-Aufruf. */
export async function checkDraftTexts(documentId: unknown): Promise<TextPruefungResult> {
  if (!(await getCurrentCompanyId())) return { status: "fehler" };
  if (typeof documentId !== "string" || !(await isDraftDocument(documentId))) return { status: "fehler" };

  let items;
  try {
    items = await getDraftItems(documentId, true);
  } catch {
    return { status: "fehler" };
  }
  return processTextPruefung(items, {
    consumeAiQuota: consumeQuota,
    improveAll: async (positionen) => {
      try {
        return await improveDocumentTexts(positionen);
      } catch (error) {
        logProviderError(error);
        throw error;
      }
    },
  });
}

/** Bestätigte Texte aus „Texte prüfen“ speichern; Preise und Steuern bleiben unberührt. */
export async function applyDraftTexts(documentId: unknown, input: unknown): Promise<TextUebernahmeResult> {
  const ctx = await getItemContext();
  if ("error" in ctx) return { error: "notAuthenticated" };
  const aenderungen = parseTextUebernahme(input);
  if (typeof documentId !== "string" || !aenderungen) return { error: "textsInvalid" };
  if (!(await isDraftDocument(documentId))) return { error: "draftNotFound" };

  let vorhandene: Set<string>;
  try {
    vorhandene = new Set((await getDraftItems(documentId, true)).map((item) => item.id));
  } catch {
    return { error: "textsSaveFailed" };
  }
  if (!aenderungen.every((aenderung) => vorhandene.has(aenderung.itemId))) return { error: "textsChanged" };

  const ergebnisse = await Promise.all(aenderungen.map((aenderung) =>
    updateDocumentItem(ctx.companyId, aenderung.itemId, {
      ...(aenderung.descriptionDe !== undefined && { description_de: aenderung.descriptionDe }),
      ...(aenderung.additionalDescriptionDe !== undefined && {
        additional_description_de: normalizeAdditionalDescriptionDe(aenderung.additionalDescriptionDe),
      }),
    }).catch(() => ({ error: "update_failed" }))));
  if (ergebnisse.some((ergebnis) => ergebnis.error)) {
    logTextImprove("apply", { errorCode: "update_failed", count: aenderungen.length });
    return { error: "textsSaveFailed" };
  }

  const result = await recomputeDraftItems(ctx.companyId, documentId, false);
  return "error" in result ? { error: "textsSaveFailed" } : result;
}
