"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getCurrentUser, getCurrentCompanyId } from "@/lib/supabase/auth";
import { getCompanyTaxSettings } from "@/lib/repositories/companies";
import { getCustomerSnapshot } from "@/lib/repositories/customers";
import { countDocumentItems } from "@/lib/repositories/document-items";
import {
  deleteDraftDocument,
  findReusableDraft,
  getDraftIssueDate,
  insertDraftDocument,
  setDraftDocumentType,
  setDraftInvoiceServiceTiming,
  setDraftQuoteValidUntil,
  updateDraftCustomerSnapshot,
} from "@/lib/repositories/document-drafts";
import type { DocType, ServiceTimingInput } from "@/types/document";
import { isValidQuoteDateRange, validateServiceTiming } from "./document-dates";

async function getCompanyCtx() {
  const user = await getCurrentUser();
  if (!user) return { error: "notAuthenticated" as const };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" as const };

  return { companyId, userId: user.id };
}

/**
 * Öffnet einen bestehenden leeren Entwurf wieder oder legt einen neuen an und
 * gibt dessen id zurück. §19-Status wird als Snapshot aus den Firmen-
 * Einstellungen übernommen (in Schritt 2 pro Rechnung überschreibbar). Keine
 * Rechnungsnummer – die wird erst bei der Finalisierung vergeben.
 */
export async function createDraftDocument(): Promise<
  { id: string } | { error: string }
> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  // Bestehenden leeren Entwurf wiederverwenden statt Duplikate anzulegen.
  const reusable = await findReusableDraft(ctx.companyId);
  if (reusable) return { id: reusable };

  const taxSettings = await getCompanyTaxSettings(ctx.companyId);
  return insertDraftDocument(
    ctx.companyId,
    taxSettings.isKleinunternehmer,
    taxSettings.defaultTaxRate,
  );
}

/**
 * Flow-Einstieg: Draft anlegen und direkt in Schritt 1 springen.
 * Als `<form action>` nutzbar (POST → keine Prefetch-Nebenwirkungen).
 */
export async function startNewDocument(): Promise<void> {
  const res = await createDraftDocument();
  const locale = await getLocale();
  if ("error" in res) redirect(`/${locale}/documents`);
  redirect(`/${locale}/create/${res.id}/1`);
}

/** Dokumenttyp direkt in den Draft schreiben (Schalter in Schritt 1). */
export async function updateDraftDocumentType(
  documentId: string,
  docType: DocType,
): Promise<{ error?: string }> {
  return setDraftDocumentType(documentId, docType);
}

async function startDocumentForCustomer(customerId: string, docType: DocType): Promise<void> {
  const res = await createDraftDocument();
  const locale = await getLocale();
  if ("error" in res) redirect(`/${locale}/documents`);

  const [typeResult, customerResult] = await Promise.all([
    setDraftDocumentType(res.id, docType),
    updateDraftCustomer(res.id, customerId),
  ]);
  if (typeResult.error || customerResult.error) {
    redirect(`/${locale}/create/${res.id}/1`);
  }
  redirect(`/${locale}/create/${res.id}/2`);
}

export async function startNewInvoiceForCustomer(customerId: string): Promise<void> {
  return startDocumentForCustomer(customerId, "invoice");
}

export async function startNewQuoteForCustomer(customerId: string): Promise<void> {
  return startDocumentForCustomer(customerId, "quote");
}

export async function updateDraftValidUntil(
  documentId: string,
  validUntil: string,
): Promise<{ error?: string }> {
  const draft = await getDraftIssueDate(documentId);
  if (!draft) return { error: "draftNotFound" };
  if (!isValidQuoteDateRange(draft.issueDate, validUntil)) {
    return { error: "validUntilInvalid" };
  }
  return setDraftQuoteValidUntil(documentId, validUntil);
}

export async function updateDraftServiceTiming(
  documentId: string,
  timing: ServiceTimingInput,
): Promise<{ error?: string }> {
  const validation = validateServiceTiming(timing);
  if (validation.error) return validation;

  const result = await setDraftInvoiceServiceTiming(documentId, timing);
  if (!result.error) {
    revalidatePath("/[locale]/create/[document_id]/1", "page");
    revalidatePath("/[locale]/create/[document_id]/3", "page");
  }
  return result;
}

/**
 * Kundenwahl in Schritt 1 festschreiben: customer_id + eingefrorener Snapshot,
 * issue_date auf heute (nur falls noch nicht gesetzt).
 */
export async function updateDraftCustomer(
  documentId: string,
  customerId: string,
): Promise<{ error?: string }> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  const snapshot = await getCustomerSnapshot(customerId);
  if (!snapshot) return { error: "customerNotFound" };

  const doc = await getDraftIssueDate(documentId);
  if (!doc) return { error: "draftNotFound" };

  const issueDate = doc.issueDate
    ? undefined
    : new Date().toISOString().split("T")[0];

  return updateDraftCustomerSnapshot(documentId, customerId, snapshot, issueDate);
}

/**
 * Löscht den Draft nur, wenn er wirklich leer ist – d. h. keine Positionen hat.
 * Der Kunde allein macht einen Entwurf nicht wertvoll (in Schritt 1 in Sekunden
 * neu gewählt); der eigentliche Inhalt sind die Positionen. Sobald mindestens
 * eine Position existiert, bleibt der Entwurf erhalten.
 */
export async function deleteDraftIfEmpty(documentId: string): Promise<void> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return;

  const count = await countDocumentItems(documentId);
  if (count === null) return; // im Zweifel behalten
  if (count > 0) return; // hat Positionen → behalten

  await deleteDraftDocument(documentId);
}
