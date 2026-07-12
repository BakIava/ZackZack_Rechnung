/**
 * Repository `documents` — einzige Stelle mit Supabase-Zugriff auf die Tabelle
 * `documents` inkl. RPC `finalize_document`. Positionszeilen liegen im
 * Schwester-Repository `document-items`, Firmen-/Kundenreads werden von dort
 * komponiert (`companies`, `customers`).
 */

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentCompanyId } from "@/lib/supabase/auth";
import { getCompanyNameAndPaymentDays } from "./companies";
import { getCustomersByIds } from "./customers";
import { getDocumentIdsWithItems } from "./document-items";
import type {
  DocStatus,
  DocType,
  DocumentItem,
  DocumentListItem,
  DocumentPreview,
  DocumentsPageData,
  DraftContext,
  DraftDoc,
  FlowDocMeta,
} from "@/types/document";
import type { PreviewCompany } from "@/types/company";
import type { CustomerSnapshot, PreviewCustomer } from "@/types/customer";
import type { CustomerType, DocumentRow } from "@/types/database";
import { deriveInitials } from "@/lib/initials";
import { getCustomerName } from "../customers/utils";

/**
 * Alter, ab dem ein positionsloser Entwurf beim Laden der Liste automatisch
 * aufgeräumt wird. Der Puffer schützt einen gerade angelegten Entwurf davor,
 * bei einem kurzen Abstecher in die Dokumentenliste gelöscht zu werden.
 */
const EMPTY_DRAFT_MAX_AGE_MS = 30 * 60 * 1000;

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Räumt verwaiste, positionslose Entwürfe der Firma auf: Ein Entwurf ohne
 * document_items hat keinen Wert. Nur Entwürfe, die älter als der Puffer sind,
 * werden gelöscht – aktive/gerade angelegte bleiben unangetastet.
 */
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

  const draftIds = drafts.map((d) => d.id as string);
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

  // Die Aufräumaktion für verwaiste Entwürfe läuft nebenläufig zum eigentlichen
  // Laden der Liste, statt sie davor zu blockieren. Sie betrifft nur leere,
  // >30 Min alte Drafts; taucht ausnahmsweise einmal einer in der Liste auf,
  // ist er beim nächsten Laden verschwunden – dafür entfällt der sequentielle
  // Latenz-Aufschlag von 2–3 Roundtrips bei jedem Öffnen der Dokumentenliste.
  const [docsRes, company] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, document_type, document_number, status, issue_date, total_amount, paid_at, customer_id, customer_snapshot",
      )
      .eq("company_id", companyId)
      .order("issue_date", { ascending: false }),
    getCompanyNameAndPaymentDays(companyId),
    deleteEmptyDrafts(companyId),
  ]);

  const { name: companyName, paymentDays } = company;
  const today = new Date().toISOString().split("T")[0];
  const customerIds = (docsRes.data?.map((d) => d.customer_id as string | null).filter(Boolean) ?? []) as string[];
  const customers = await getCustomersByIds(customerIds);

  const documents: DocumentListItem[] = (docsRes.data ?? []).map((doc) => {
    const snapshot = doc.customer_snapshot as
      | { name?: string; email?: string | null; phone?: string | null }
      | null;
    const status = doc.status as DocumentListItem["status"];
    const paidAt = doc.paid_at as string | null;
    const customer = customers.find((c) => c.id === doc.customer_id);

    const isOverdue =
      paidAt === null &&
      (status === "finalized" || status === "sent") &&
      addDays(doc.issue_date, paymentDays) < today;

    return {
      id: doc.id,
      type: doc.document_type as DocumentListItem["type"],
      documentNumber: doc.document_number ?? "",
      customerName: customer?.firstname && customer?.lastname ? `${customer.firstname} ${customer.lastname}` : snapshot?.name ?? "—",
      customerEmail: customer?.email ?? snapshot?.email ?? null,
      customerPhone: customer?.phone ?? snapshot?.phone ?? null,
      status,
      issueDate: doc.issue_date,
      totalAmount: doc.total_amount ?? 0,
      paidAt,
      isOverdue,
    };
  });

  return { documents, paymentDays, companyName };
}

/**
 * Leichtgewichtiger Zugehörigkeits-/Status-Check für den Flow-Layout-Guard und
 * die Schritt-1/2-Weichen: liefert Status & Typ eines EIGENEN Dokuments,
 * unabhängig vom Status (draft, finalized, …). Fremde/nicht existierende
 * Dokumente ergeben null. `cache()` dedupliziert den Fetch pro Request.
 */
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

/**
 * Lädt einen Draft und validiert Zugehörigkeit (eigene Firma + status='draft').
 * `cache()` dedupliziert den Fetch innerhalb eines Requests, sodass Layout und
 * Seite denselben Draft nur einmal aus der DB lesen.
 */
export const getDraft = cache(
  async (documentId: string): Promise<DraftDoc | null> => {
    const companyId = await getCurrentCompanyId();
    if (!companyId) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("documents")
      .select("id, document_type, customer_id")
      .eq("id", documentId)
      .eq("company_id", companyId)
      .eq("status", "draft")
      .maybeSingle();

    if (!data) return null;

    return {
      id: data.id as string,
      docType: data.document_type,
      customerId: (data.customer_id as string | null) ?? null,
    };
  },
);

/** Kopf-Kontext des Drafts (Typ, Kunde, §19) für Schritt 2. */
export async function getDraftContext(
  documentId: string,
): Promise<DraftContext | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("document_type, customer_snapshot, is_kleinunternehmer")
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft")
    .maybeSingle();

  if (!data) return null;

  const snapshot: CustomerSnapshot = data.customer_snapshot;
  const customerName = getCustomerName(snapshot);

  return {
    docType: data.document_type,
    customerName,
    customerInitials: deriveInitials(snapshot),
    isKleinunternehmer: Boolean(data.is_kleinunternehmer),
  };
}

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

function toCustomer(snapshot: CustomerSnapshot): PreviewCustomer | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const name = typeof snapshot.firstname === "string" ? snapshot.firstname.trim() : "";
  if (!name) return null;
  return {
    customer_type: snapshot.customer_type as CustomerType,
    company_name: (snapshot.company_name as string | null) ?? null,
    firstname: (snapshot.firstname as string | null) ?? null,
    lastname: (snapshot.lastname as string | null) ?? null,
    street: (snapshot.street as string | null) ?? null,
    streetNo: (snapshot.street_no as string | null) ?? null,
    postcode: (snapshot.postcode as string | null) ?? null,
    city: (snapshot.city as string | null) ?? null,
    email: (snapshot.email as string | null) ?? null,
    phone: (snapshot.phone as string | null) ?? null,
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
    const doc = docRow;

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

    const items: DocumentItem[] = (itemsRes.data ?? []).map((r) => ({
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
      status: doc.status as DocStatus,
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

/**
 * Neuesten leeren Entwurf (ohne Positionen) der Firma finden – falls vorhanden.
 * Verhindert, dass „Neue Rechnung" bei jedem Klick Duplikate anlegt.
 */
export async function findReusableDraft(companyId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: drafts } = await supabase
    .from("documents")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "draft")
    .order("created_at", { ascending: false });
  if (!drafts || drafts.length === 0) return null;

  const ids = drafts.map((d) => d.id as string);
  const hasItems = await getDocumentIdsWithItems(companyId, ids);

  const reusable = drafts.find((d) => !hasItems.has(d.id as string));
  return reusable ? (reusable.id as string) : null;
}

/**
 * Legt einen neuen Entwurf an (ohne Nummer – die wird erst bei der
 * Finalisierung vergeben) und gibt dessen id zurück.
 */
export async function insertDraftDocument(
  companyId: string,
  isKleinunternehmer: boolean,
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
      customer_snapshot: {},
      total_amount: 0,
      // issue_date direkt setzen: Schritt 1 (Kunde) ist überspringbar, das
      // Ausstellungsdatum (§14-Pflichtangabe) darf dabei nicht fehlen. Die
      // Kundenwahl überschreibt es nicht (updateDraftCustomer setzt nur, wenn leer).
      issue_date: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[insertDraftDocument] insert failed:", error);
    return { error: error?.message ?? "unknown" };
  }
  return { id: data.id as string };
}

/** Dokumenttyp direkt in den Draft schreiben (Schalter in Schritt 1). */
export async function setDraftDocumentType(
  documentId: string,
  docType: DocType,
): Promise<{ error?: string }> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({ document_type: docType })
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
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

/** Kundenwahl festschreiben: customer_id + eingefrorener Snapshot (+ ggf. issue_date). */
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

/** Dokument als bezahlt markieren (setzt status + paid_at). */
export async function markDocumentPaid(documentId: string): Promise<{ error?: string }> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({
      status: "paid",
      paid_at: new Date().toISOString()
    })
    .eq("id", documentId)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  return {};
}

/** documents.total_amount setzen (nur Entwürfe – finalisierte sind eingefroren). */
export async function setDraftDocumentTotal(
  companyId: string,
  documentId: string,
  total: number,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("documents")
    .update({ total_amount: total })
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft");
}

/**
 * RPC `finalize_document`: Nummernvergabe + Statuswechsel laufen atomar in der
 * SQL-Funktion (SECURITY DEFINER). Die Nummer wird NIE im Client erzeugt.
 * Liefert die vergebene Nummer oder die rohe Postgres-Fehlermeldung.
 */
export async function finalizeDocumentRpc(
  documentId: string,
): Promise<{ number: string } | { errorMessage: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finalize_document", {
    p_document_id: documentId,
  });

  if (error) return { errorMessage: error.message };
  if (typeof data !== "string" || data.length === 0) {
    return { errorMessage: "unknown" };
  }
  return { number: data };
}

/** Die 5 zuletzt angelegten Dokumente (RLS-scoped, Dashboard). */
export async function getRecentDocuments(limit: number): Promise<
  Array<
    Pick<
      DocumentRow,
      | "id"
      | "document_type"
      | "document_number"
      | "status"
      | "total_amount"
      | "issue_date"
      | "customer_snapshot"
    >
  >
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select(
      "id, document_type, document_number, status, total_amount, issue_date, customer_snapshot",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Array<
    Pick<
      DocumentRow,
      | "id"
      | "document_type"
      | "document_number"
      | "status"
      | "total_amount"
      | "issue_date"
      | "customer_snapshot"
    >
  >;
}

/** Beträge aller offenen (finalisiert/versendet, unbezahlt) Dokumente (RLS-scoped). */
export async function getOpenDocumentAmounts(): Promise<Array<{ total_amount: number | null }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("total_amount")
    .is("paid_at", null)
    .in("status", ["finalized", "sent"]);
  return data ?? [];
}

/** Beträge aller bezahlten Dokumente (RLS-scoped). */
export async function getPaidDocumentAmounts(): Promise<Array<{ total_amount: number | null }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("total_amount")
    .not("paid_at", "is", null);
  return data ?? [];
}
