import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  DbDocumentStatus,
  DocumentListItem,
  DocumentsPageData,
  DraftDoc,
} from "./types";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { documents: [], paymentDays: 14 };

  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!userData?.company_id) return { documents: [], paymentDays: 14 };

  const companyId = userData.company_id;

  // Verwaiste, positionslose Entwürfe aufräumen, bevor die Liste geladen wird.
  await deleteEmptyDrafts(supabase, companyId);

  const [docsRes, companyRes] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, document_type, document_number, status, issue_date, total_amount, paid_at, customer_snapshot",
      )
      .eq("company_id", companyId)
      .order("issue_date", { ascending: false }),
    supabase.from("companies").select("payment_days").eq("id", companyId).maybeSingle(),
  ]);

  const paymentDays = companyRes.data?.payment_days ?? 14;
  const today = new Date().toISOString().split("T")[0];

  const documents: DocumentListItem[] = (docsRes.data ?? []).map((doc) => {
    const snapshot = doc.customer_snapshot as { name?: string } | null;
    const status = doc.status as DocumentListItem["status"];
    const paidAt = doc.paid_at as string | null;

    const isOverdue =
      paidAt === null &&
      (status === "finalized" || status === "sent") &&
      addDays(doc.issue_date, paymentDays) < today;

    return {
      id: doc.id,
      type: doc.document_type as DocumentListItem["type"],
      documentNumber: doc.document_number ?? "",
      customerName: snapshot?.name ?? "—",
      status,
      issueDate: doc.issue_date,
      totalAmount: doc.total_amount ?? 0,
      paidAt,
      isOverdue,
    };
  });

  return { documents, paymentDays };
}

export interface FlowDocMeta {
  id: string;
  status: DbDocumentStatus;
  docType: "rechnung" | "angebot";
}

/**
 * Leichtgewichtiger Zugehörigkeits-/Status-Check für den Flow-Layout-Guard und
 * die Schritt-1/2-Weichen: liefert Status & Typ eines EIGENEN Dokuments,
 * unabhängig vom Status (draft, finalized, …). Fremde/nicht existierende
 * Dokumente ergeben null. `cache()` dedupliziert den Fetch pro Request.
 */
export const getFlowDocMeta = cache(
  async (documentId: string): Promise<FlowDocMeta | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userData } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!userData?.company_id) return null;

    const { data } = await supabase
      .from("documents")
      .select("id, status, document_type")
      .eq("id", documentId)
      .eq("company_id", userData.company_id)
      .maybeSingle();
    if (!data) return null;

    return {
      id: data.id as string,
      status: data.status as DbDocumentStatus,
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userData } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!userData?.company_id) return null;

    const { data } = await supabase
      .from("documents")
      .select("id, document_type, customer_id")
      .eq("id", documentId)
      .eq("company_id", userData.company_id)
      .eq("status", "draft")
      .maybeSingle();

    if (!data) return null;

    return {
      id: data.id as string,
      docType: data.document_type === "quote" ? "angebot" : "rechnung",
      customerId: (data.customer_id as string | null) ?? null,
    };
  },
);
