import { getCompanyNameAndDirector } from "@/lib/repositories/companies";
import { countCustomers } from "@/lib/repositories/customers";
import { countServices } from "@/lib/repositories/services";
import {
  getOpenDocumentAmounts,
  getPaidDocumentAmounts,
  getRecentDocuments,
} from "@/lib/repositories/documents";
import { getCustomerName } from "@/lib/customers/utils";
import type { CustomerSnapshot } from "@/types/customer";
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
  // Kein separater supabase.auth.getUser() mehr: Die Middleware validiert und
  // refresht das Token bereits vor dem Rendern der Seite, und alle Queries hier
  // sind per RLS auf die Firma des eingeloggten Users beschränkt.
  const [company, recentDocs, customerCount, catalogCount, openDocs, paidDocs] =
    await Promise.all([
      getCompanyNameAndDirector(),
      getRecentDocuments(5),
      countCustomers(),
      countServices(),
      getOpenDocumentAmounts(),
      getPaidDocumentAmounts(),
    ]);

  const docs: DashboardDoc[] = recentDocs.map((doc) => {
    const snapshot = doc.customer_snapshot as CustomerSnapshot | null;
    return {
      id: doc.id,
      type: doc.document_type,
      customer: getCustomerName(snapshot) || "—",
      number: doc.document_number ?? "",
      amount: doc.total_amount ?? 0,
      date: doc.issue_date ?? "",
      status: mapStatus(doc.status),
    };
  });

  return {
    companyName: company.name,
    companyInitials: toInitials(company.name),
    director: company.director,
    customerCount,
    catalogCount,
    docs,
    openCount: openDocs.length,
    openSumCents: openDocs.reduce((s, d) => s + (d.total_amount ?? 0), 0),
    paidSumCents: paidDocs.reduce((s, d) => s + (d.total_amount ?? 0), 0),
  };
}
