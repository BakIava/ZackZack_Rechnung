/**
 * Zentrale Dokumentabfragen für Liste und Flow-Metadaten sowie Statuswechsel.
 * Entwurfs-, Vorschau- und Dashboard-Zugriffe liegen in spezialisierten
 * Schwester-Repositories.
 */

import { cache } from "react";
import { getCustomerName } from "@/lib/customers/utils";
import { todayInGermany } from "@/lib/documents/document-dates";
import { calculateDocumentTotals } from "@/lib/documents/tax";
import { deriveInitials } from "@/lib/initials";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { CustomerSnapshot } from "@/types/customer";
import type {
  DocStatus,
  DocumentListItem,
  DocumentsPageData,
  DraftContext,
  DraftDoc,
  FlowDocMeta,
  TaxRate,
} from "@/types/document";
import { getCompanyNameAndPaymentDays } from "./companies";
import { getCustomersByIds } from "./customers";
import { getDocumentIdsWithItems } from "./document-items";
import {
  getDocumentRelations,
  getDocumentRelationsForOne,
} from "./document-relations";

const EMPTY_DRAFT_MAX_AGE_MS = 30 * 60 * 1000;

function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

/** Räumt alte, positionslose Entwürfe der eigenen Firma auf. */
async function deleteEmptyDrafts(companyId: string): Promise<void> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - EMPTY_DRAFT_MAX_AGE_MS).toISOString();
  const { data: drafts, error } = await supabase
    .from("documents")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "draft")
    .lt("created_at", cutoff);
  if (error || !drafts || drafts.length === 0) return;

  const draftIds = drafts.map((draft) => draft.id as string);
  const hasItems = await getDocumentIdsWithItems(companyId, draftIds);
  const emptyIds = draftIds.filter((id) => !hasItems.has(id));
  if (emptyIds.length === 0) return;

  await supabase
    .from("documents")
    .delete()
    .eq("company_id", companyId)
    .eq("status", "draft")
    .in("id", emptyIds);
}

export async function fetchDocumentsPageData(): Promise<DocumentsPageData> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { documents: [], paymentDays: 14, companyName: "" };

  const supabase = await createClient();
  const [docsRes, company] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, document_type, document_number, status, issue_date, valid_until, total_amount, paid_at, customer_id, customer_snapshot",
      )
      .eq("company_id", companyId)
      .order("issue_date", { ascending: false }),
    getCompanyNameAndPaymentDays(companyId),
    deleteEmptyDrafts(companyId),
  ]);

  const { name: companyName, paymentDays } = company;
  const today = todayInGermany();
  const customerIds = (docsRes.data
    ?.map((document) => document.customer_id as string | null)
    .filter(Boolean) ?? []) as string[];
  const customers = await getCustomersByIds(customerIds);
  const docRows = docsRes.data ?? [];
  const relations = await getDocumentRelations(
    companyId,
    docRows.map((document) => document.id as string),
  );

  const documents: DocumentListItem[] = docRows.map((document) => {
    const snapshot = document.customer_snapshot as CustomerSnapshot | null;
    const status = document.status as DocumentListItem["status"];
    const paidAt = document.paid_at as string | null;
    const customer = customers.find((item) => item.id === document.customer_id);
    const isOverdue =
      paidAt === null &&
      document.document_type === "invoice" &&
      (status === "finalized" || status === "sent") &&
      addDays(document.issue_date, paymentDays) < today;
    const conversion = relations.find(
      (relation) =>
        relation.sourceDocumentId === document.id &&
        relation.relationType === "converted_to_invoice",
    );
    const basis = relations.find(
      (relation) =>
        relation.targetDocumentId === document.id &&
        relation.relationType === "based_on_quote",
    );
    const replacement = relations.find(
      (relation) =>
        relation.sourceDocumentId === document.id &&
        relation.relationType === "based_on_quote",
    );

    return {
      id: document.id,
      type: document.document_type as DocumentListItem["type"],
      documentNumber: document.document_number ?? "",
      customerName: getCustomerName(customer ?? snapshot) || "—",
      customerEmail: customer?.email ?? snapshot?.email ?? null,
      customerPhone: customer?.phone ?? snapshot?.phone ?? null,
      status,
      issueDate: document.issue_date,
      validUntil: (document.valid_until as string | null) ?? null,
      totalAmount: document.total_amount ?? 0,
      paidAt,
      isOverdue,
      convertedInvoiceId: conversion?.targetDocumentId ?? null,
      basedOnQuoteId: basis?.sourceDocumentId ?? null,
      replacementQuoteId: replacement?.targetDocumentId ?? null,
      replacementQuoteStatus: replacement?.targetDocumentStatus ?? null,
    };
  });

  return { documents, paymentDays, companyName };
}

/** Status und Typ eines eigenen Dokuments für den Flow-Guard. */
export const getFlowDocMeta = cache(
  async (documentId: string): Promise<FlowDocMeta | null> => {
    const companyId = await getCurrentCompanyId();
    if (!companyId) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("documents")
      .select("id, status, document_type")
      .eq("id", documentId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!data) return null;

    return {
      id: data.id as string,
      status: data.status as DocStatus,
      docType: data.document_type === "quote" ? "angebot" : "rechnung",
    };
  },
);

/** Lädt einen eigenen Dokumententwurf und seine leichte Herkunftsverknüpfung. */
export const getDraft = cache(
  async (documentId: string): Promise<DraftDoc | null> => {
    const companyId = await getCurrentCompanyId();
    if (!companyId) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("documents")
      .select("id, document_type, customer_id, issue_date, valid_until")
      .eq("id", documentId)
      .eq("company_id", companyId)
      .eq("status", "draft")
      .maybeSingle();
    if (!data) return null;

    const relations = await getDocumentRelationsForOne(companyId, data.id as string);
    return {
      id: data.id as string,
      docType: data.document_type,
      issueDate: (data.issue_date as string | null) ?? todayInGermany(),
      customerId: (data.customer_id as string | null) ?? null,
      validUntil: (data.valid_until as string | null) ?? null,
      documentTypeLocked: relations.some(
        (relation) => relation.targetDocumentId === data.id,
      ),
    };
  },
);

/** Kopf-Kontext des Drafts für Schritt 2. */
export async function getDraftContext(
  documentId: string,
): Promise<DraftContext | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("document_type, customer_snapshot, is_kleinunternehmer, default_tax_rate")
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft")
    .maybeSingle();
  if (!data) return null;

  const snapshot: CustomerSnapshot = data.customer_snapshot;
  const items = await getDraftItemsForTotals(companyId, documentId);
  return {
    docType: data.document_type,
    customerName: getCustomerName(snapshot),
    customerInitials: deriveInitials(snapshot),
    isKleinunternehmer: Boolean(data.is_kleinunternehmer),
    defaultTaxRate: (data.default_tax_rate as TaxRate | null) ?? 19,
    totals: calculateDocumentTotals(items),
  };
}

async function getDraftItemsForTotals(companyId: string, documentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_items")
    .select("total_amount, tax_rate, tax_amount, gross_amount")
    .eq("document_id", documentId)
    .eq("company_id", companyId);
  return (data ?? []).map((item) => ({
    netAmount: (item.total_amount as number | null) ?? 0,
    taxRate: (item.tax_rate as TaxRate | null) ?? 0,
    taxAmount: (item.tax_amount as number | null) ?? 0,
    grossAmount:
      (item.gross_amount as number | null) ??
      (item.total_amount as number | null) ??
      0,
  }));
}

/** Eine Rechnung als bezahlt markieren. Angebote sind ausgeschlossen. */
export async function markDocumentPaid(
  documentId: string,
): Promise<{ error?: string }> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("document_type", "invoice")
    .in("status", ["finalized", "sent"])
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "invoiceNotPayable" };
  return {};
}

/** Atomare Finalisierung und Nummernvergabe über die SQL-Funktion. */
export async function finalizeDocumentRpc(
  documentId: string,
  confirmExpiredQuote = false,
): Promise<{ number: string } | { errorMessage: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finalize_document", {
    p_document_id: documentId,
    p_confirm_expired_quote: confirmExpiredQuote,
  });
  if (error) return { errorMessage: error.message };
  if (typeof data !== "string" || data.length === 0) {
    return { errorMessage: "unknown" };
  }
  return { number: data };
}
