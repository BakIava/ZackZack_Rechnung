/**
 * Firmen-Typen — abgeleitet aus `CompanyRow` (types/database.ts).
 */

import type { CompanyRow } from "./database";

/** Vollständige Firmen-Stammdaten (Einstellungen). Feldnamen wie in der DB. */
export type CompanySettings = CompanyRow;

export interface SettingsData {
  company: CompanySettings;
  authEmail: string | null;
  currentInvoiceNumber: string | null;
}

/** Firmenstammdaten für den Dokumentkopf (Verkaufssicht, alle Felder Deutsch). */
export interface PreviewCompany {
  name: string;
  legalForm: string | null;
  street: string | null;
  streetNo: string | null;
  postcode: string | null;
  city: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  director: string | null;
  steuernummer: string | null;
  ustId: string | null;
  bankName: string | null;
  iban: string | null;
  bic: string | null;
  accountHolder: string | null;
  logoUrl: string | null;
  paymentDays: number;
}

/**
 * Onboarding-Formular (Setup-Flow): Firmenfelder als Formular-Strings.
 * Pflichtfelder werden in der Action validiert, nicht per Typ erzwungen.
 */
export interface SetupFormData {
  // Step 1: Betrieb
  name: string;
  legal_form: string;
  director: string;
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
