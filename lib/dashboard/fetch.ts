import { createClient } from "@/lib/supabase/server";
import type { UiDocumentStatus, DashboardDoc } from "@/types/document";

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

function mapStatus(dbStatus: string): UiDocumentStatus {
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

  // Kein separater supabase.auth.getUser() mehr: Die Middleware validiert und
  // refresht das Token bereits vor dem Rendern der Seite, und alle Queries hier
  // sind per RLS auf die Firma des eingeloggten Users beschränkt. Der frühere
  // (ergebnislose) Aufruf war damit ein reiner zusätzlicher Auth-Roundtrip.
  const [companyRes, docsRes, customersRes, catalogRes, openRes, paidRes] =
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
      type: doc.document_type,
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
