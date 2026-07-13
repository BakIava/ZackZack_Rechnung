import type {
  CustomerAddressCandidate,
  CustomerIntakeData,
} from "@/types/customer-intake";

type StructuredAddress = Pick<
  CustomerIntakeData,
  "street" | "street_no" | "postcode" | "city"
>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function contextName(
  context: Record<string, unknown>,
  key: string,
): string | null {
  return asString(asRecord(context[key])?.name);
}

export function buildMapboxStructuredParams(
  address: StructuredAddress,
  accessToken: string,
): URLSearchParams {
  const params = new URLSearchParams({
    access_token: accessToken,
    street: address.street ?? "",
    country: "de",
    language: "de",
    types: "address,street",
    autocomplete: "false",
    permanent: "false",
    limit: "3",
  });
  if (address.street_no) params.set("address_number", address.street_no);
  if (address.postcode) params.set("postcode", address.postcode);
  if (address.city) params.set("place", address.city);
  return params;
}

function toCandidate(featureValue: unknown): CustomerAddressCandidate | null {
  const feature = asRecord(featureValue);
  const properties = asRecord(feature?.properties);
  if (!feature || !properties) return null;

  const featureType = asString(properties.feature_type);
  if (featureType !== "address" && featureType !== "street") return null;

  const context = asRecord(properties.context) ?? {};
  const address = asRecord(context.address) ?? {};
  const id = asString(properties.mapbox_id) ?? asString(feature.id);
  const street =
    asString(address.street_name) ??
    contextName(context, "street") ??
    (featureType === "street" ? asString(properties.name) : null);
  const streetNo = asString(address.address_number);
  const postcode = contextName(context, "postcode");
  const city = contextName(context, "place");
  if (!id || !street || (!postcode && !city)) return null;

  const formattedAddress =
    asString(properties.full_address) ??
    [asString(properties.name), asString(properties.place_formatted)]
      .filter(Boolean)
      .join(", ");
  if (!formattedAddress) return null;

  return {
    id,
    street,
    street_no: streetNo,
    postcode,
    city,
    formatted_address: formattedAddress,
  };
}

export function parseMapboxAddressResponse(
  value: unknown,
): CustomerAddressCandidate[] {
  const features = asRecord(value)?.features;
  if (!Array.isArray(features)) return [];

  return features
    .slice(0, 3)
    .map(toCandidate)
    .filter((candidate): candidate is CustomerAddressCandidate => candidate !== null);
}

