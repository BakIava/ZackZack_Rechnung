import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import type { DbDocumentStatus } from "./types";
import type {
  DocumentPreview,
  PreviewCompany,
  PreviewCustomer,
  PreviewItem,
} from "./preview-types";
import { DocType } from "@/shared/doc";

// Als ein String-Literal (nicht verkettet), sonst kann Supabase die Spalten
// nicht typisieren und die Zeile wird zu GenericStringError.
const COMPANY_COLUMNS =
  "name, legal_form, street, street_no, postcode, city, phone, mobile, email, director, steuernummer, ust_id, bank_name, iban, bic, account_holder, logo_url, payment_days";

const DOCUMENT_COLUMNS =
  "id, document_type, document_number, status, issue_date, service_date, customer_snapshot, total_amount, is_kleinunternehmer";

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
    email: (row.email as string | null) ?? null,
    director: (row.director as string | null) ?? null,
    steuernummer: (row.steuernummer as string | null) ?? null,
    ustId: (row.ust_id as string | null) ?? null,
    bankName: (row.bank_name as string | null) ?? null,
    iban: (row.iban as string | null) ?? null,
    bic: (row.bic as string | null) ?? null,
    accountHolder: (row.account_holder as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    paymentDays: (row.payment_days as number | null) ?? 14,
  };
}

function toCustomer(snapshot: unknown): PreviewCustomer | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const s = snapshot as Record<string, unknown>;
  const name = typeof s.name === "string" ? s.name.trim() : "";
  if (!name) return null;
  return {
    name,
    street: (s.street as string | null) ?? null,
    streetNo: (s.street_no as string | null) ?? null,
    postcode: (s.postcode as string | null) ?? null,
    city: (s.city as string | null) ?? null,
    email: (s.email as string | null) ?? null,
    phone: (s.phone as string | null) ?? null,
  };
}

/**
 * Lädt ein Dokument vollständig für die Vorschau (Kopf, Empfänger-Snapshot,
 * Positionen). Anders als getDraft ist hier JEDER Status erlaubt – ein
 * finalisiertes Dokument bleibt in Schritt 3 im Ansichtsmodus aufrufbar. Die
 * Zugehörigkeit zur eigenen Firma wird geprüft; fremde Dokumente ergeben null.
 * `cache()` dedupliziert den Fetch innerhalb eines Requests.
 */
export const getDocumentPreview = cache(
  async (documentId: string): Promise<DocumentPreview | null> => {
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
    const doc = docRow as unknown as Record<string, unknown>;

    const [companyRes, itemsRes] = await Promise.all([
      supabase.from("companies").select(COMPANY_COLUMNS).eq("id", companyId).maybeSingle(),
      supabase
        .from("document_items")
        .select("position, description_de, amount, unit, unit_price, total_amount")
        .eq("document_id", documentId)
        .eq("company_id", companyId)
        .order("position", { ascending: true }),
    ]);
    if (!companyRes.data) return null;

    const items: PreviewItem[] = (itemsRes.data ?? []).map((r) => ({
      position: r.position as number,
      descriptionDe: (r.description_de as string) ?? "",
      amount: Number(r.amount ?? 0),
      unit: (r.unit as string) ?? "",
      unitPrice: (r.unit_price as number) ?? 0,
      totalAmount: (r.total_amount as number) ?? 0,
    }));

    return {
      id: doc.id as string,
      docType: doc.document_type as DocType,
      status: doc.status as DbDocumentStatus,
      documentNumber: (doc.document_number as string | null) ?? null,
      issueDate: (doc.issue_date as string | null) ?? null,
      serviceDate: (doc.service_date as string | null) ?? null,
      isKleinunternehmer: Boolean(doc.is_kleinunternehmer),
      totalAmount: (doc.total_amount as number | null) ?? 0,
      company: toCompany(companyRes.data as unknown as Record<string, unknown>),
      customer: toCustomer(doc.customer_snapshot),
      items,
    };
  },
);
