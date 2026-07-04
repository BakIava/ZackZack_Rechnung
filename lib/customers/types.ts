export interface CustomerDocRow {
  id: string;
  document_type: "rechnung" | "angebot";
  document_number: string | null;
  status: string;
  total_amount: number;
  issue_date: string;
}

export interface CustomerRow {
  id: string;
  name: string;
  street: string | null;
  street_no: string | null;
  postcode: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  customer_number: number;
  created_at: string;
  documents: CustomerDocRow[];
}

export interface CustomerMutationResult {
  error?: string;
  id?: string;
}

export interface CustomerListItem {
  id: string;
  name: string;
  city: string | null;
  street: string | null;
  initials: string;
  isNew?: boolean;
}
