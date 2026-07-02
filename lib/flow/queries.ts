import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FlowCustomer, FlowDocument, Step1Data } from "./types";

async function getCompanyCtx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.company_id) return null;
  return { supabase, userId: user.id, companyId: data.company_id as string };
}

export async function loadStep1Data(
  documentId: string,
  locale: string,
): Promise<Step1Data> {
  const ctx = await getCompanyCtx();
  if (!ctx) redirect(`/${locale}/login`);

  const [docRes, custRes] = await Promise.all([
    ctx.supabase
      .from("documents")
      .select("id, document_type, customer_id, status, issue_date")
      .eq("id", documentId)
      .eq("company_id", ctx.companyId)
      .maybeSingle(),
    ctx.supabase
      .from("customers")
      .select(
        "id, name, street, street_no, postcode, city, email, phone, customer_number",
      )
      .eq("company_id", ctx.companyId)
      .order("created_at", { ascending: false }),
  ]);

  if (!docRes.data || docRes.data.status !== "draft") {
    redirect(`/${locale}/documents`);
  }

  const document: FlowDocument = {
    id: docRes.data.id,
    documentType: docRes.data.document_type as FlowDocument["documentType"],
    customerId: docRes.data.customer_id ?? null,
    issueDate: docRes.data.issue_date ?? null,
  };

  const customers: FlowCustomer[] = (custRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    street: c.street ?? null,
    streetNo: c.street_no ?? null,
    postcode: c.postcode ?? null,
    city: c.city ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    customerNumber: c.customer_number,
  }));

  return { document, customers };
}
