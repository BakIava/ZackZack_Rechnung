export interface CompanySettings {
  id: string;
  name: string;
  legal_form: string;
  street: string;
  street_no: string;
  postcode: string;
  city: string;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  email: string | null;
  director: string | null;
  steuernummer: string;
  ust_id: string | null;
  registergericht: string | null;
  handelsregister_nr: string | null;
  kleinunternehmer: boolean;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  account_holder: string | null;
  logo_url: string | null;
  payment_days: number;
  invoice_footer: string | null;
}

export interface SettingsData {
  company: CompanySettings;
  authEmail: string | null;
  currentInvoiceNumber: string | null;
}
