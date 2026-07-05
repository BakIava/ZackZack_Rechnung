import { createClient } from "@/lib/supabase/server";
import type { DocStatus, DocType, DashboardDoc } from "@/lib/demo/dashboard-data";

export interface DashboardData {
  companyName: string;
  companyInitials: string;
  director: string;
  customerCount: number;
  catalogCount: number;
  docs: DashboardDoc[];
  openCount: number;
  openSumCents: number;
  paidSumCents: number;
}

function mapType(dbType: string): DocType {
  return dbType === "invoice" ? "rechnung" : "angebot";
}

function mapStatus(dbStatus: string): DocStatus {
  switch (dbStatus) {
    case "paid":
      return "bezahlt";
    case "sent":
      return "versendet";
    case "draft":
      return "entwurf";
    default:
      return "offen"; // "finalized" and "cancelled" treated as offen for display
  }
}

function toInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  // Position 5 (supabase.auth.getUser()) wird weiterhin aufgerufen, das Ergebnis
  // aber nicht gebunden — bewusst per Elision, um den bisherigen Aufruf (und dessen
  // Netz-/Auth-Seiteneffekt) unverändert zu lassen.
  const [companyRes, docsRes, customersRes, catalogRes, , openRes, paidRes] =
    await Promise.all([
      supabase.from("companies").select("name, director").single(),
      supabase
        .from("documents")
        .select(
          "id, document_type, document_number, status, total_amount, issue_date, customer_snapshot",
        )
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("services").select("id", { count: "exact", head: true }),
      supabase.auth.getUser(),
      supabase
        .from("documents")
        .select("total_amount")
        .is("paid_at", null)
        .in("status", ["finalized", "sent"]),
      supabase
        .from("documents")
        .select("total_amount")
        .not("paid_at", "is", null)
    ]);

  const companyName = companyRes.data?.name ?? "";
  const director = companyRes.data?.director ?? "";

  const docs: DashboardDoc[] = (docsRes.data ?? []).map((doc) => {
    const snapshot = doc.customer_snapshot as { name?: string } | null;
    return {
      id: doc.id,
      type: mapType(doc.document_type),
      customer: snapshot?.name ?? "—",
      number: doc.document_number ?? "",
      amount: doc.total_amount ?? 0,
      date: doc.issue_date,
      status: mapStatus(doc.status),
    };
  });  

  const openDocs = openRes.data ?? [];
  const paidDocs = paidRes.data ?? [];

  return {
    companyName,
    companyInitials: toInitials(companyName),
    director,
    customerCount: customersRes.count ?? 0,
    catalogCount: catalogRes.count ?? 0,
    docs,
    openCount: openDocs.length,
    openSumCents: openDocs.reduce((s, d) => s + (d.total_amount ?? 0), 0),
    paidSumCents: paidDocs.reduce((s, d) => s + (d.total_amount ?? 0), 0),
  };
}
