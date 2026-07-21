/** Dashboard-spezifische, RLS-geschützte Dokumentabfragen. */

import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow } from "@/types/database";
import { getDocumentRelations } from "./document-relations";

export type RecentDocument = Pick<
  DocumentRow,
  | "id"
  | "document_type"
  | "document_number"
  | "status"
  | "total_amount"
  | "issue_date"
  | "customer_snapshot"
  | "valid_until"
> & {
  converted_invoice_id: string | null;
  replacement_quote_id: string | null;
  replacement_quote_status: DocumentRow["status"] | null;
};

export type InvoicePaymentAmount = Pick<
  DocumentRow,
  "status" | "total_amount" | "paid_at"
>;

/** Die zuletzt angelegten Dokumente der eigenen Firma. */
export async function getRecentDocuments(limit: number): Promise<RecentDocument[]> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select(
      "id, document_type, document_number, status, total_amount, issue_date, valid_until, customer_snapshot",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as Array<Omit<
    RecentDocument,
    "converted_invoice_id" | "replacement_quote_id" | "replacement_quote_status"
  >>;
  const relations = await getDocumentRelations(companyId, rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    converted_invoice_id:
      relations.find(
        (relation) =>
          relation.sourceDocumentId === row.id &&
          relation.relationType === "converted_to_invoice",
      )?.targetDocumentId ?? null,
    replacement_quote_id:
      relations.find(
        (relation) =>
          relation.sourceDocumentId === row.id &&
          relation.relationType === "based_on_quote",
      )?.targetDocumentId ?? null,
    replacement_quote_status:
      relations.find(
        (relation) =>
          relation.sourceDocumentId === row.id &&
          relation.relationType === "based_on_quote",
      )?.targetDocumentStatus ?? null,
  }));
}

/** Beträge und Zahlungsstatus aller für die Dashboard-Summen relevanten Rechnungen. */
export async function getInvoicePaymentAmounts(): Promise<InvoicePaymentAmount[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("status, total_amount, paid_at")
    .eq("document_type", "invoice")
    .or("paid_at.not.is.null,status.in.(finalized,sent)");
  return (data ?? []) as InvoicePaymentAmount[];
}
