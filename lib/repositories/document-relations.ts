import { createClient } from "@/lib/supabase/server";
import type {
  DocStatus,
  DocumentRelationInfo,
  DocumentRelationType,
  QuoteConversionPreview,
} from "@/types/document";

export async function getDocumentRelations(
  companyId: string,
  documentIds: string[],
): Promise<DocumentRelationInfo[]> {
  if (documentIds.length === 0) return [];
  const supabase = await createClient();
  const [sources, targets] = await Promise.all([
    supabase
      .from("document_relations")
      .select("source_document_id, target_document_id, relation_type")
      .eq("company_id", companyId)
      .in("source_document_id", documentIds),
    supabase
      .from("document_relations")
      .select("source_document_id, target_document_id, relation_type")
      .eq("company_id", companyId)
      .in("target_document_id", documentIds),
  ]);

  const relationRows = [...(sources.data ?? []), ...(targets.data ?? [])];
  const targetIds = [...new Set(
    relationRows.map((row) => row.target_document_id as string),
  )];
  const { data: targetsData } = targetIds.length > 0
    ? await supabase
        .from("documents")
        .select("id, status")
        .eq("company_id", companyId)
        .in("id", targetIds)
    : { data: [] };
  const targetStatuses = new Map(
    (targetsData ?? []).map((row) => [row.id as string, row.status as DocStatus]),
  );

  const unique = new Map<string, DocumentRelationInfo>();
  for (const row of relationRows) {
    const targetDocumentId = row.target_document_id as string;
    const targetDocumentStatus = targetStatuses.get(targetDocumentId);
    if (!targetDocumentStatus) continue;
    const relation: DocumentRelationInfo = {
      sourceDocumentId: row.source_document_id as string,
      targetDocumentId,
      targetDocumentStatus,
      relationType: row.relation_type as DocumentRelationType,
    };
    unique.set(`${relation.relationType}:${relation.targetDocumentId}`, relation);
  }
  return [...unique.values()];
}

export async function getDocumentRelationsForOne(
  companyId: string,
  documentId: string,
): Promise<DocumentRelationInfo[]> {
  return getDocumentRelations(companyId, [documentId]);
}

export async function getQuoteConversionPreviewRpc(
  quoteId: string,
): Promise<QuoteConversionPreview | { errorMessage: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_quote_conversion_preview", {
    p_quote_id: quoteId,
  });
  if (error) return { errorMessage: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return { errorMessage: "unknown" };
  const value = row as Record<string, unknown>;
  return {
    quoteId,
    existingInvoiceId: (value.existing_invoice_id as string | null) ?? null,
    quoteTotal: Number(value.quote_total ?? 0),
    invoiceTotal: Number(value.invoice_total ?? 0),
    validUntil: String(value.valid_until ?? ""),
    isExpired: Boolean(value.is_expired),
  };
}

export interface ConvertQuoteRpcResult {
  documentId: string;
  created: boolean;
  quoteTotal: number;
  invoiceTotal: number;
}

export async function convertQuoteToInvoiceRpc(
  quoteId: string,
  expectedInvoiceTotal: number,
  confirmExpired: boolean,
): Promise<ConvertQuoteRpcResult | { errorMessage: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_quote_to_invoice", {
    p_quote_id: quoteId,
    p_expected_invoice_total: expectedInvoiceTotal,
    p_confirm_expired: confirmExpired,
  });
  if (error) return { errorMessage: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return { errorMessage: "unknown" };
  const value = row as Record<string, unknown>;
  return {
    documentId: String(value.document_id),
    created: Boolean(value.created),
    quoteTotal: Number(value.quote_total ?? 0),
    invoiceTotal: Number(value.invoice_total ?? 0),
  };
}

export async function duplicateQuoteRpc(
  quoteId: string,
): Promise<{ documentId: string } | { errorMessage: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicate_quote", {
    p_quote_id: quoteId,
  });
  if (error) return { errorMessage: error.message };
  if (typeof data !== "string" || data.length === 0) return { errorMessage: "unknown" };
  return { documentId: data };
}
