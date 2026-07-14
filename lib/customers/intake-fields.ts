import type { CustomerIntakeResult } from "@/types/customer-intake";
import type { CustomerType } from "@/types/database";

/** Formularwerte in der Form, die der Dialog direkt in seinen State setzt. */
export interface IntakeFieldValues {
  customerType: CustomerType | null;
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
}

function str(value: string | null | undefined): string {
  return value ?? "";
}

/**
 * Übersetzt das Ergebnis der Kundeneingabe-Server-Action
 * ({@link CustomerIntakeResult}) in die Formular-Sicht des Dialogs. Bei
 * `address_matches` wird der beste Geocoding-Treffer übernommen.
 */
export function mapIntakeResult(result: CustomerIntakeResult): MappedIntake {
  const c = result.customer;
  const values: IntakeFieldValues = {
    customerType: c.customer_type,
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
  if (result.status === "address_matches" && result.addresses.length > 0) {
    const best = result.addresses[0];
    if (best.street !== null) values.street = best.street;
    if (best.street_no !== null) values.houseNo = best.street_no;
    if (best.postcode !== null) values.zip = best.postcode;
    if (best.city !== null) values.city = best.city;
  }

  const recognized = [
    values.companyName,
    values.firstname,
    values.lastname,
    values.street,
    values.houseNo,
    values.zip,
    values.city,
    values.phone,
    values.email,
  ].some(Boolean);
  return { recognized, values };
}
