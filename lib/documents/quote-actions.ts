"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import {
  convertQuoteToInvoiceRpc,
  duplicateQuoteRpc,
  getQuoteConversionPreviewRpc,
} from "@/lib/repositories/document-relations";
import type {
  QuoteConversionPreview,
  QuoteWorkflowError,
} from "@/types/document";

function mapWorkflowError(message: string): QuoteWorkflowError {
  if (message.includes("not_authenticated")) return "notAuthenticated";
  if (message.includes("quote_not_convertible")) return "quoteNotConvertible";
  if (message.includes("quote_not_adjustable")) return "quoteNotAdjustable";
  if (message.includes("expired_quote_confirmation_required")) {
    return "expiredConfirmationRequired";
  }
  if (message.includes("conversion_preview_stale")) return "conversionPreviewStale";
  return "unknown";
}

export async function getQuoteConversionPreview(
  quoteId: string,
): Promise<QuoteConversionPreview | { error: QuoteWorkflowError }> {
  const user = await getCurrentUser();
  if (!user) return { error: "notAuthenticated" };
  const result = await getQuoteConversionPreviewRpc(quoteId);
  if ("errorMessage" in result) return { error: mapWorkflowError(result.errorMessage) };
  return result;
}

export async function convertQuoteToInvoice(
  quoteId: string,
  expectedInvoiceTotal: number,
  confirmExpired: boolean,
): Promise<{ documentId: string; created: boolean } | { error: QuoteWorkflowError }> {
  const user = await getCurrentUser();
  if (!user) return { error: "notAuthenticated" };
  if (!Number.isInteger(expectedInvoiceTotal) || expectedInvoiceTotal < 0) {
    return { error: "conversionPreviewStale" };
  }
  const result = await convertQuoteToInvoiceRpc(
    quoteId,
    expectedInvoiceTotal,
    confirmExpired,
  );
  if ("errorMessage" in result) return { error: mapWorkflowError(result.errorMessage) };
  return { documentId: result.documentId, created: result.created };
}

export async function duplicateQuote(
  quoteId: string,
): Promise<{ documentId: string } | { error: QuoteWorkflowError }> {
  const user = await getCurrentUser();
  if (!user) return { error: "notAuthenticated" };
  const result = await duplicateQuoteRpc(quoteId);
  if ("errorMessage" in result) return { error: mapWorkflowError(result.errorMessage) };
  return result;
}
