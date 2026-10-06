/** Vollständige, unveränderliche Dokumentansicht für Vorschau und PDF. */

import { cache } from "react";
import { calculateDocumentTotals } from "@/lib/documents/tax";
import { parseDocumentServiceLocation } from "@/lib/documents/service-location";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { toPreviewCustomer } from "@/lib/customers/utils";
import type { PreviewCompany } from "@/types/company";
import type {
  DocStatus,
  DocType,
  DocumentPreview,
  Step2DocumentData,
  TaxRate,
} from "@/types/document";
import { getDocumentRelationsForOne } from "./document-relations";
import { toDocumentItems } from "@/lib/documents/document-preview-state";
import { selectDocumentTemplate } from "@/lib/pdf/templates/template-selection";
import { toDocumentItem, toDraftItem } from "./document-item-mappers";

// Als ein String-Literal (nicht verkettet), sonst kann Supabase die Spalten
// nicht typisieren und die Zeile wird zu GenericStringError.
const COMPANY_COLUMNS =
  "name, legal_form, street, street_no, postcode, city, phone, mobile, fax, email, website, director, steuernummer, ust_id, bank_name, iban, bic, account_holder, logo_url, payment_days, document_template_id";

const DOCUMENT_COLUMNS =
  "id, document_type, document_number, status, issue_date, service_date, service_period_start, service_period_end, service_location, valid_until, customer_snapshot, subtotal_amount, tax_amount, total_amount, is_kleinunternehmer, default_tax_rate, logo_url_snapshot, logo_snapshot_captured, template_id, template_version";

const PREVIEW_ITEM_COLUMNS =
  "position, description_de, additional_description_de, amount, unit, unit_price, total_amount, tax_rate, tax_amount, gross_amount";

const DRAFT_ITEM_COLUMNS =
  "id, service_id, position, description_de, additional_description_de, amount, unit, unit_price, total_amount, tax_rate, tax_rate_overridden, tax_amount, gross_amount, purchase_price, surcharge, surcharge_type";

function toCompany(row: Record<string, unknown>): PreviewCompany {
  return {
    name: (row.name as string) ?? "",
    legalForm: (row.legal_form as string | null) ?? null,
    street: (row.street as string | null) ?? null,
    streetNo: (row.street_no as string | null) ?? null,
    postcode: (row.postcode as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    mobile: (row.mobile as string | null) ?? null,
    fax: (row.fax as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    director: (row.director as string | null) ?? null,
    steuernummer: (row.steuernummer as string | null) ?? null,
    ustId: (row.ust_id as string | null) ?? null,
    bankName: (row.bank_name as string | null) ?? null,
    iban: (row.iban as string | null) ?? null,
    bic: (row.bic as string | null) ?? null,
    accountHolder: (row.account_holder as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    paymentDays: (row.payment_days as number | null) ?? 14,  };
}

async function loadDocumentPreviewData(
  documentId: string,
  includeDraftItems: boolean,
): Promise<Step2DocumentData | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { data: docRow } = await supabase
    .from("documents")
    .select(DOCUMENT_COLUMNS)
    .eq("id", documentId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!docRow) return null;
  const doc = docRow;

  const itemQuery = includeDraftItems
    ? supabase.from("document_items").select(DRAFT_ITEM_COLUMNS)
    : supabase.from("document_items").select(PREVIEW_ITEM_COLUMNS);
  const [companyRes, itemsRes, relations] = await Promise.all([
    supabase.from("companies").select(COMPANY_COLUMNS).eq("id", companyId).maybeSingle(),
    itemQuery
      .eq("document_id", documentId)
      .eq("company_id", companyId)
      .order("position", { ascending: true }),
    getDocumentRelationsForOne(companyId, documentId),
  ]);
  if (!companyRes.data) return null;

  const itemRows = (itemsRes.data ?? []) as unknown as Array<Record<string, unknown>>;
  const draftItems = includeDraftItems ? itemRows.map(toDraftItem) : [];
  const items = includeDraftItems
    ? toDocumentItems(draftItems)
    : itemRows.map(toDocumentItem);
  const totals = calculateDocumentTotals(
    items.map((item) => ({
      netAmount: item.totalAmount,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      grossAmount: item.grossAmount,
    })),
  );

  const company = toCompany(companyRes.data as unknown as Record<string, unknown>);
  if ((doc.logo_snapshot_captured as boolean | null) === true) {
    company.logoUrl = (doc.logo_url_snapshot as string | null) ?? null;
  }

  const preview: DocumentPreview = {
    id: doc.id as string,
    docType: doc.document_type as DocType,
    status: doc.status as DocStatus,
    documentNumber: (doc.document_number as string | null) ?? null,
    issueDate: (doc.issue_date as string | null) ?? null,
    serviceDate: (doc.service_date as string | null) ?? null,
    servicePeriodStart: (doc.service_period_start as string | null) ?? null,
    servicePeriodEnd: (doc.service_period_end as string | null) ?? null,
    validUntil: (doc.valid_until as string | null) ?? null,
    serviceLocation: parseDocumentServiceLocation(doc.service_location),
    isKleinunternehmer: Boolean(doc.is_kleinunternehmer),
    defaultTaxRate: (doc.default_tax_rate as TaxRate | null) ?? 19,
    totalAmount: totals.grossAmount,
    netAmount: totals.netAmount,
    taxAmount: totals.taxAmount,
    taxGroups: totals.taxGroups,
    company,
    customer: toPreviewCustomer(doc.customer_snapshot),
    items,
    convertedInvoiceId:
      relations.find(
        (relation) =>
          relation.sourceDocumentId === documentId &&
          relation.relationType === "converted_to_invoice",
      )?.targetDocumentId ?? null,
    basedOnQuoteId:
      relations.find(
        (relation) =>
          relation.targetDocumentId === documentId &&
          relation.relationType === "based_on_quote",
      )?.sourceDocumentId ?? null,
    // Einzige Stelle, an der die Vorlage eines Belegs bestimmt wird: Entwürfe
    // folgen der Firmenwahl, finalisierte Belege ihrem Snapshot (template-selection.ts).
    template: selectDocumentTemplate({
      status: doc.status as DocStatus,
      documentTemplateId: doc.template_id,
      documentTemplateVersion: doc.template_version,
      companyTemplateId: (companyRes.data as Record<string, unknown>).document_template_id,
    }),
  };
  return { preview, draftItems };
}

async function loadDocumentPreview(documentId: string): Promise<DocumentPreview | null> {
  return (await loadDocumentPreviewData(documentId, false))?.preview ?? null;
}

export const getDocumentPreview = cache(loadDocumentPreview);

/** Schritt 2: Dokumentvorschau und interne Bearbeitungszeilen aus einem Item-Read. */
export const getStep2DocumentData = cache(
  async (documentId: string): Promise<Step2DocumentData | null> =>
    loadDocumentPreviewData(documentId, true),
);

/** Erzwingt nach einer Mutation einen frischen Read statt des Request-Caches. */
export async function getDocumentPreviewFresh(
  documentId: string,
): Promise<DocumentPreview | null> {
  return loadDocumentPreview(documentId);
}
