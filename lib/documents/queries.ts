import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import type {
  DocStatus,
  DocumentListItem,
  DocumentsPageData,
  DraftDoc,
  FlowDocMeta,
} from "@/types/document";
import type { DocumentCustomer } from "@/types/customer";

type DB = Awaited<ReturnType<typeof createClient>>;

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
async function deleteEmptyDrafts(supabase: DB, companyId: string): Promise<void> {
  const cutoff = new Date(Date.now() - EMPTY_DRAFT_MAX_AGE_MS).toISOString();

  const { data: drafts, error } = await supabase
    .from("documents")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "draft")
    .lt("created_at", cutoff);
  if (error || !drafts || drafts.length === 0) return;

  const draftIds = drafts.map((d) => d.id as string);
  const { data: itemRows } = await supabase
    .from("document_items")
    .select("document_id")
    .eq("company_id", companyId)
    .in("document_id", draftIds);
  const hasItems = new Set((itemRows ?? []).map((r) => r.document_id as string));

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
  const [docsRes, companyRes] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, document_type, document_number, status, issue_date, total_amount, paid_at, customer_id, customer_snapshot",
      )
      .eq("company_id", companyId)
      .order("issue_date", { ascending: false }),
    supabase.from("companies").select("name, payment_days").eq("id", companyId).maybeSingle(),
    deleteEmptyDrafts(supabase, companyId),
  ]);

  const paymentDays = companyRes.data?.payment_days ?? 14;
  const companyName = (companyRes.data?.name as string | null) ?? "";
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
      customerName: customer?.name ?? snapshot?.name ?? "—",
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

/**
 * Lädt mehrere Kunden auf einen Schlag (z. B. um eine Dokumentenliste mit
 * aktuellen Kundendaten statt dem eingefrorenen `customer_snapshot` anzureichern),
 * scoped auf die eigene Firma. Fremde/unbekannte IDs werden stillschweigend
 * übersprungen; leere `customerIds` sparen den Roundtrip.
 */
export async function getCustomersByIds(customerIds: string[]): Promise<DocumentCustomer[]> {
  if (customerIds.length === 0) return [];

  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, street, street_no, postcode, city, email, phone")
    .eq("company_id", companyId)
    .in("id", customerIds);
  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    street: (c.street as string | null) ?? null,
    streetNo: (c.street_no as string | null) ?? null,
    postcode: (c.postcode as string | null) ?? null,
    city: (c.city as string | null) ?? null,
    email: (c.email as string | null) ?? null,
    phone: (c.phone as string | null) ?? null,
  }));
}
