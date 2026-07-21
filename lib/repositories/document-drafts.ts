/** Schreibzugriffe und Hilfsabfragen für eigene Dokumententwürfe. */

import { addOneCalendarMonth, todayInGermany } from "@/lib/documents/document-dates";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { CustomerSnapshot } from "@/types/customer";
import type { DocumentRow } from "@/types/database";
import type { DocType, ServiceTimingInput, TaxRate } from "@/types/document";
import { getDocumentIdsWithItems } from "./document-items";

/** Gehört das Dokument der eigenen Firma und ist noch ein Entwurf? */
export async function isDraftDocument(documentId: string): Promise<boolean> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft")
    .maybeSingle();
  return Boolean(data);
}

/** Neuesten leeren Entwurf der Firma finden, falls vorhanden. */
export async function findReusableDraft(companyId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: drafts } = await supabase
    .from("documents")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "draft")
    .order("created_at", { ascending: false });
  if (!drafts || drafts.length === 0) return null;

  const ids = drafts.map((draft) => draft.id as string);
  const hasItems = await getDocumentIdsWithItems(companyId, ids);
  const reusable = drafts.find((draft) => !hasItems.has(draft.id as string));
  return reusable ? (reusable.id as string) : null;
}

/** Legt einen neuen Entwurf ohne Dokumentnummer an. */
export async function insertDraftDocument(
  companyId: string,
  isKleinunternehmer: boolean,
  defaultTaxRate: TaxRate,
): Promise<{ id: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      company_id: companyId,
      created_by: user.id,
      document_type: "invoice",
      status: "draft",
      is_kleinunternehmer: isKleinunternehmer,
      default_tax_rate: defaultTaxRate,
      customer_snapshot: {},
      subtotal_amount: 0,
      tax_amount: 0,
      total_amount: 0,
      issue_date: todayInGermany(),
      valid_until: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[insertDraftDocument] insert failed:", error);
    return { error: error?.message ?? "unknown" };
  }
  return { id: data.id as string };
}

/** Dokumenttyp direkt in den Draft schreiben. */
export async function setDraftDocumentType(
  documentId: string,
  docType: DocType,
): Promise<{ error?: string }> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { data: draft } = await supabase
    .from("documents")
    .select("issue_date, valid_until")
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft")
    .maybeSingle();
  if (!draft) return { error: "draftNotFound" };

  const issueDate = (draft.issue_date as string | null) ?? todayInGermany();
  const validUntil =
    docType === "quote"
      ? ((draft.valid_until as string | null) ?? addOneCalendarMonth(issueDate))
      : null;
  const { error } = await supabase
    .from("documents")
    .update({
      document_type: docType,
      valid_until: validUntil,
      ...(docType === "quote"
        ? {
            service_date: null,
            service_period_start: null,
            service_period_end: null,
          }
        : {}),
    })
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  return {};
}

/** Optionale Leistungsangabe eines eigenen Rechnungsentwurfs aktualisieren. */
export async function setDraftInvoiceServiceTiming(
  documentId: string,
  timing: ServiceTimingInput,
): Promise<{ error?: "notAuthenticated" | "draftNotFound" | "updateFailed" }> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .update({
      service_date: timing.serviceDate,
      service_period_start: timing.servicePeriodStart,
      service_period_end: timing.servicePeriodEnd,
    })
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("document_type", "invoice")
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error) return { error: "updateFailed" };
  if (!data) return { error: "draftNotFound" };
  return {};
}

/** Gültigkeitsdatum eines eigenen Angebotsentwurfs aktualisieren. */
export async function setDraftQuoteValidUntil(
  documentId: string,
  validUntil: string,
): Promise<{ error?: string }> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .update({ valid_until: validUntil })
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("document_type", "quote")
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "draftNotFound" };
  return {};
}

/** issue_date des Drafts lesen (null = Draft nicht gefunden/fremd). */
export async function getDraftIssueDate(
  documentId: string,
): Promise<{ issueDate: DocumentRow["issue_date"] } | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("issue_date")
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft")
    .maybeSingle();
  if (!doc) return null;
  return { issueDate: (doc.issue_date as string | null) ?? null };
}

/** Kundenwahl als Referenz und eingefrorenen Snapshot festschreiben. */
export async function updateDraftCustomerSnapshot(
  documentId: string,
  customerId: string,
  snapshot: CustomerSnapshot,
  issueDate?: string,
): Promise<{ error?: string }> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const update: {
    customer_id: string;
    customer_snapshot: CustomerSnapshot;
    issue_date?: string;
  } = { customer_id: customerId, customer_snapshot: snapshot };
  if (issueDate !== undefined) update.issue_date = issueDate;

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update(update)
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  return {};
}

/** Entwurf löschen (nur eigener, nur status='draft'). */
export async function deleteDraftDocument(documentId: string): Promise<void> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return;

  const supabase = await createClient();
  await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft");
}

/** Autoritative Summen eines Entwurfs aktualisieren. */
export async function setDraftDocumentTotals(
  companyId: string,
  documentId: string,
  totals: { netAmount: number; taxAmount: number; grossAmount: number },
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({
      subtotal_amount: totals.netAmount,
      tax_amount: totals.taxAmount,
      total_amount: totals.grossAmount,
    })
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft");
}

/** Eingefrorene Steuerkonfiguration eines Entwurfs. */
export async function getDraftTaxConfig(
  documentId: string,
): Promise<{ defaultTaxRate: TaxRate } | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("default_tax_rate")
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft")
    .maybeSingle();
  if (!data) return null;
  return {
    defaultTaxRate: (data.default_tax_rate as TaxRate | null) ?? 19,
  };
}
