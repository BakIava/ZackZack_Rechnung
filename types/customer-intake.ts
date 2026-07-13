import type { CustomerDbRow, CustomerType } from "./database";

type IntakeCustomerFields = Pick<
  CustomerDbRow,
  | "customer_type"
  | "firstname"
  | "lastname"
  | "company_name"
  | "street"
  | "street_no"
  | "postcode"
  | "city"
  | "phone"
  | "email"
>;

/** Nur transient verwendete, defensiv validierte Claude-Daten. */
export type CustomerIntakeData = Omit<IntakeCustomerFields, "customer_type"> & {
  customer_type: CustomerType | null;
};

/** Normalisierter Mapbox-Treffer; wird weder in Supabase noch anderweitig persistiert. */
export interface CustomerAddressCandidate {
  id: string;
  street: string | null;
  street_no: string | null;
  postcode: string | null;
  city: string | null;
  formatted_address: string;
}

export interface CustomerAiQuota {
  allowed: boolean;
  remaining: number;
  dailyLimit: number;
}

export type CustomerIntakeManualReason =
  | "not_authenticated"
  | "invalid_input"
  | "daily_limit_reached"
  | "quota_unavailable"
  | "extraction_failed"
  | "no_extracted_data"
  | "insufficient_address"
  | "geocoding_failed"
  | "no_matches";

export type CustomerIntakeResult =
  | {
      status: "address_matches";
      customer: CustomerIntakeData;
      addresses: CustomerAddressCandidate[];
    }
  | {
      status: "manual";
      reason: Exclude<CustomerIntakeManualReason, "daily_limit_reached">;
      customer: CustomerIntakeData;
    }
  | {
      status: "manual";
      reason: "daily_limit_reached";
      customer: CustomerIntakeData;
      dailyLimit: number;
    };
