import type { CustomerIntakeResult } from "@/types/customer-intake";
import type { CustomerType } from "@/types/database";

/** Felder, die im „Neuer Kunde"-Formular eine „KI"-Markierung tragen können. */
export type IntakeField =
  | "type"
  | "companyName"
  | "firstname"
  | "lastname"
  | "street"
  | "houseNo"
  | "zip"
  | "city"
  | "phone"
  | "email";

/** Formularwerte in der Form, die der Dialog direkt in seinen State setzt. */
export interface IntakeFieldValues {
  customerType: CustomerType;
  companyName: string;
  firstname: string;
  lastname: string;
  street: string;
  houseNo: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
}

export interface MappedIntake {
  /** true, sobald mindestens ein Feld befüllt wurde. */
  recognized: boolean;
  values: IntakeFieldValues;
  /** Pro Feld, ob es erkannt wurde → steuert die „KI"-Badges. */
  found: Partial<Record<IntakeField, boolean>>;
  /** Adressfelder, die das Geocoding an die amtliche Schreibweise angepasst hat. */
  corrected: Partial<Record<"street" | "city", boolean>>;
  /** Anzahl erkannter Felder (ohne Kundenart) – für den Erfolgs-Banner. */
  count: number;
}

function str(value: string | null | undefined): string {
  return value ?? "";
}

function differs(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("de") !== b.trim().toLocaleLowerCase("de");
}

/**
 * Übersetzt das Ergebnis der Kundeneingabe-Server-Action
 * ({@link CustomerIntakeResult}) in die Formular-/Badge-Sicht des Dialogs.
 * Bei `address_matches` wird der beste Geocoding-Treffer übernommen und – wenn
 * er von der Eingabe abweicht – als „korrigiert" markiert.
 */
export function mapIntakeResult(result: CustomerIntakeResult): MappedIntake {
  const c = result.customer;
  const values: IntakeFieldValues = {
    customerType: c.customer_type ?? "private",
    companyName: str(c.company_name),
    firstname: str(c.firstname),
    lastname: str(c.lastname),
    street: str(c.street),
    houseNo: str(c.street_no),
    zip: str(c.postcode),
    city: str(c.city),
    phone: str(c.phone),
    email: str(c.email),
  };
  const corrected: MappedIntake["corrected"] = {};

  if (result.status === "address_matches" && result.addresses.length > 0) {
    const best = result.addresses[0];
    const extractedStreet = values.street;
    const extractedCity = values.city;
    if (best.street !== null) values.street = best.street;
    if (best.street_no !== null) values.houseNo = best.street_no;
    if (best.postcode !== null) values.zip = best.postcode;
    if (best.city !== null) values.city = best.city;
    if (extractedStreet && values.street && differs(values.street, extractedStreet)) {
      corrected.street = true;
    }
    if (extractedCity && values.city && differs(values.city, extractedCity)) {
      corrected.city = true;
    }
  }

  const found: MappedIntake["found"] = {};
  if (c.customer_type !== null) found.type = true;
  if (values.companyName) found.companyName = true;
  if (values.firstname) found.firstname = true;
  if (values.lastname) found.lastname = true;
  if (values.street) found.street = true;
  if (values.houseNo) found.houseNo = true;
  if (values.zip) found.zip = true;
  if (values.city) found.city = true;
  if (values.phone) found.phone = true;
  if (values.email) found.email = true;

  const count = (Object.keys(found) as IntakeField[]).filter((k) => k !== "type").length;
  return { recognized: count > 0, values, found, corrected, count };
}
