import { detectOnboardingDocumentMediaType } from "@/lib/onboarding/extraction-file";
import type { CustomerAiQuota } from "@/types/customer-intake";
import type {
  NachweisExtraction,
  NachweisMediaType,
  NachweisReadResult,
} from "@/types/nachweis";
import { nachweisErgebnis } from "./nachweis-pruefung";

/** Unter der Vercel-Grenze von 4,5 MB je Anfrage; Fotos verkleinert der Browser vorher. */
export const MAX_NACHWEIS_BYTES = 4 * 1024 * 1024;

interface NachweisDependencies {
  consumeAiQuota: () => Promise<CustomerAiQuota>;
  extractNachweis: (
    bytes: Uint8Array,
    mediaType: NachweisMediaType,
  ) => Promise<NachweisExtraction>;
}

function isBlob(value: unknown): value is Blob {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function" &&
    "size" in value &&
    typeof value.size === "number"
  );
}

/** Datei prüfen → Kontingent → Claude liest ab → wir rechnen und prüfen. Nichts wird gespeichert. */
export async function processNachweis(
  file: unknown,
  dependencies: NachweisDependencies,
): Promise<NachweisReadResult> {
  if (!isBlob(file) || file.size <= 0) return { status: "error", error: "unsupported_file" };
  if (file.size > MAX_NACHWEIS_BYTES) return { status: "error", error: "file_too_large" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = detectOnboardingDocumentMediaType(bytes);
  if (!mediaType) return { status: "error", error: "unsupported_file" };

  let quota: CustomerAiQuota;
  try {
    quota = await dependencies.consumeAiQuota();
  } catch {
    return { status: "error", error: "quota_unavailable" };
  }
  if (!quota.allowed) {
    return { status: "error", error: "quota_reached", dailyLimit: quota.dailyLimit };
  }

  let extraction: NachweisExtraction;
  try {
    extraction = await dependencies.extractNachweis(bytes, mediaType);
  } catch {
    return { status: "error", error: "provider_unavailable" };
  }

  const ergebnis = nachweisErgebnis(extraction);
  const hatStunden = ergebnis.mitarbeiter.some((mitarbeiter) => mitarbeiter.stunden > 0);
  if (!hatStunden && ergebnis.material.length === 0) {
    return { status: "error", error: "no_hours_found" };
  }
  return { status: "success", ergebnis };
}
