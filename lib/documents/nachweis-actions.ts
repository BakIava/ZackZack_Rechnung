"use server";

import { getCurrentCompanyId } from "@/lib/supabase/auth";
import {
  NachweisExtractionError,
  extractNachweis,
} from "@/lib/integrations/anthropic/nachweis-extractor";
import { consumeCustomerAiQuota } from "@/lib/repositories/ai-usage";
import { getDraftTaxConfig, isDraftDocument } from "@/lib/repositories/document-drafts";
import { getNextItemPosition, insertDocumentItems } from "@/lib/repositories/document-items";
import { findDocumentsMentioningNachweis } from "@/lib/repositories/nachweis-usages";
import type { NachweisReadResult, NachweisVerwendung } from "@/types/nachweis";
import { nachweisZusatzSuchmuster, zusatzNenntNachweis } from "./nachweis-positionen";
import { getItemContext, lineValues, recomputeDraftItems, type ItemsResult } from "./item-write";
import { parseNachweisImportLines } from "./nachweis-import";
import { processNachweis } from "./nachweis-service";
import { resolveTaxRate } from "./tax";

/** Nur Codes und Größen loggen – nie Dateiinhalte oder Mitarbeiternamen. */
function logNachweis(level: "info" | "error", stage: string, details: Record<string, unknown>) {
  const line = `[nachweis] ${JSON.stringify({ stage, ...details })}`;
  if (level === "error") console.error(line);
  else console.info(line);
}

/** Nachweis (Foto/PDF) lesen und prüfen. Die Datei wird nur im Speicher verarbeitet. */
export async function readNachweis(
  documentId: string,
  formData: FormData,
): Promise<NachweisReadResult> {
  if (!(await getCurrentCompanyId())) return { status: "error", error: "not_authenticated" };
  if (typeof documentId !== "string" || !(await isDraftDocument(documentId))) {
    return { status: "error", error: "draft_not_found" };
  }

  const file = formData instanceof FormData ? formData.get("file") : null;
  const result = await processNachweis(file, {
    // Gemeinsamer Tageszähler mit Kunden- und Einsatzort-Erkennung.
    consumeAiQuota: async () => {
      const quota = await consumeCustomerAiQuota();
      if ("error" in quota) throw new Error(quota.error);
      return quota.quota;
    },
    extractNachweis: async (bytes, mediaType) => {
      try {
        return await extractNachweis(bytes, mediaType);
      } catch (error) {
        logNachweis("error", "provider_response", {
          errorCode: error instanceof NachweisExtractionError ? error.code : "unknown",
          httpStatus: error instanceof NachweisExtractionError ? error.httpStatus : undefined,
          mediaType,
          sizeBytes: bytes.byteLength,
        });
        throw error;
      }
    },
  });

  logNachweis(result.status === "success" ? "info" : "error", "read_completed", {
    status: result.status,
    errorCode: result.status === "error" ? result.error : undefined,
    sheetMatches: result.status === "success" ? result.ergebnis.pruefung.ok : undefined,
  });
  return result;
}

/**
 * Warnung vor Doppelabrechnung: Dokumente, auf denen diese Nachweis-Nummer
 * schon steht (ohne stornierte). Fehler führen still zu „keine Treffer“.
 */
export async function findNachweisUsage(
  documentId: string,
  nummer: string,
): Promise<NachweisVerwendung[]> {
  const companyId = await getCurrentCompanyId();
  if (!companyId || typeof nummer !== "string") return [];
  const trimmed = nummer.trim();
  if (!trimmed || trimmed.length > 60) return [];

  const rows = await findDocumentsMentioningNachweis(companyId, nachweisZusatzSuchmuster(trimmed));
  const seen = new Set<string>();
  return rows.flatMap((row): NachweisVerwendung[] => {
    if (row.status === "cancelled" || seen.has(row.documentId)) return [];
    if (!zusatzNenntNachweis(row.additionalDescriptionDe, trimmed)) return [];
    seen.add(row.documentId);
    return [{
      documentId: row.documentId,
      docType: row.docType,
      documentNumber: row.documentNumber,
      sameDocument: row.documentId === documentId,
    }];
  });
}

/** Bestätigte Zeilen als freie Positionen anlegen – alle in einem Insert. */
export async function addNachweisItems(
  documentId: string,
  input: unknown,
): Promise<ItemsResult> {
  const ctx = await getItemContext();
  if ("error" in ctx) return { error: "notAuthenticated" };
  if (typeof documentId !== "string" || !(await isDraftDocument(documentId))) {
    return { error: "draftNotFound" };
  }
  const lines = parseNachweisImportLines(input);
  if (!lines) return { error: "linesInvalid" };

  const taxConfig = await getDraftTaxConfig(documentId);
  if (!taxConfig) return { error: "draftNotFound" };
  const taxRate = resolveTaxRate(taxConfig.defaultTaxRate, null);
  const firstPosition = await getNextItemPosition(ctx.companyId, documentId);

  const rows = [];
  for (const [index, line] of lines.entries()) {
    const values = lineValues(line.unitPrice, line.amount, taxRate);
    if (!values) return { error: "pricingInvalid" };
    rows.push({
      serviceId: null,
      position: firstPosition + index,
      descriptionDe: line.descriptionDe,
      additionalDescriptionDe: line.additionalDescriptionDe,
      amount: line.amount,
      unit: line.unit,
      unitPrice: line.unitPrice,
      totalAmount: values.netAmount,
      taxRate: values.taxRate,
      taxRateOverridden: false,
      taxAmount: values.taxAmount,
      grossAmount: values.grossAmount,
    });
  }

  const { error } = await insertDocumentItems(ctx.companyId, documentId, rows);
  if (error) return { error };
  return recomputeDraftItems(ctx.companyId, documentId);
}
