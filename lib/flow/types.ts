export type FlowDocType = "invoice" | "quote";

export interface FlowDocument {
  id: string;
  documentType: FlowDocType;
  customerId: string | null;
  issueDate: string | null;
}

export interface FlowCustomer {
  id: string;
  name: string;
  street: string | null;
  streetNo: string | null;
  postcode: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  customerNumber: number;
}

export interface Step1Data {
  document: FlowDocument;
  customers: FlowCustomer[];
}
