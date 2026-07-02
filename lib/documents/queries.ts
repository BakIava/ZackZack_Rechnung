import { createClient } from "@/lib/supabase/server";
import type { DocumentListItem, DocumentsPageData } from "./types";

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
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
      (status === "final" || status === "sent") &&
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
