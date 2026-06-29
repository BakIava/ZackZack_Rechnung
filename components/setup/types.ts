export interface SetupFormData {
  // Step 1: Betrieb
  name: string;
  legal_form: string;
  street: string;
  street_no: string;
  postcode: string;
  city: string;
  handelsregister_nr: string;
  registergericht: string;
  // Step 2: Kontaktdaten
  email: string;
  phone: string;
  mobile: string;
  fax: string;
  // Step 3: Steuerdaten
  steuernummer: string;
  ust_id: string;
  kleinunternehmer: boolean;
  // Step 4: Bankverbindung
  iban: string;
  bic: string;
  bank_name: string;
  account_holder: string;
}

export type SetupFormErrors = Partial<Record<keyof SetupFormData, string>>;

export const INITIAL_FORM_DATA: SetupFormData = {
  name: "",
  legal_form: "einzel",
  street: "",
  street_no: "",
  postcode: "",
  city: "",
  handelsregister_nr: "",
  registergericht: "",
  email: "",
  phone: "",
  mobile: "",
  fax: "",
  steuernummer: "",
  ust_id: "",
  kleinunternehmer: true,
  iban: "",
  bic: "",
  bank_name: "",
  account_holder: "",
};
