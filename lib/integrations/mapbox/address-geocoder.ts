import "server-only";

import type {
  CustomerAddressCandidate,
  CustomerIntakeData,
} from "@/types/customer-intake";
import {
  buildMapboxStructuredParams,
  parseMapboxAddressResponse,
} from "./address-geocoder-mapper";

const MAPBOX_GEOCODING_URL =
  "https://api.mapbox.com/search/geocode/v6/forward";

export type AddressGeocodingErrorCode =
  | "configuration"
  | "invalid_request"
  | "request_failed"
  | "invalid_response";

export class AddressGeocodingError extends Error {
  constructor(readonly code: AddressGeocodingErrorCode) {
    super(`Address geocoding failed: ${code}`);
    this.name = "AddressGeocodingError";
  }
}

export async function geocodeCustomerAddress(
  customer: CustomerIntakeData,
): Promise<CustomerAddressCandidate[]> {
  if (!customer.street || (!customer.postcode && !customer.city)) {
    throw new AddressGeocodingError("invalid_request");
  }

  const accessToken = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (!accessToken) throw new AddressGeocodingError("configuration");

  const params = buildMapboxStructuredParams(customer, accessToken);
  let response: Response;
  try {
    response = await fetch(`${MAPBOX_GEOCODING_URL}?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new AddressGeocodingError("request_failed");
  }

  if (!response.ok) throw new AddressGeocodingError("request_failed");

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AddressGeocodingError("invalid_response");
  }
  return parseMapboxAddressResponse(body);
}
