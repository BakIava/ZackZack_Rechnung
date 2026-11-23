import { detectOnboardingDocumentMediaType } from "@/lib/onboarding/extraction-file";
import type { CustomerAiQuota } from "@/types/customer-intake";
import type {
  NachweisAusrichtung,
  NachweisExtraktion,
  NachweisLeseErgebnis,
  NachweisMediaType,
  NachweisReadResult,
} from "@/types/nachweis";
// Nur Typen: der Service wird auch im Browser importiert (MAX_NACHWEIS_BYTES), sharp nicht.
import type { NachweisGedreht, NachweisVorlage } from "./nachweis-bild";
import { freiesNachweisErgebnis } from "./nachweis-frei";
import { nachweisErgebnis } from "./nachweis-pruefung";

/** Unter der Vercel-Grenze von 4,5 MB je Anfrage; Fotos verkleinert der Browser vorher. */
export const MAX_NACHWEIS_BYTES = 4 * 1024 * 1024;

interface NachweisDependencies {
  consumeAiQuota: () => Promise<CustomerAiQuota>;
  extractNachweis: (
    bytes: Uint8Array,
    mediaType: NachweisMediaType,
  ) => Promise<NachweisExtraktion>;
  /** Gescanntes PDF als Bild herauslösen; alles andere unverändert. */
  prepareNachweis: (bytes: Uint8Array, mediaType: NachweisMediaType) => Promise<NachweisVorlage>;
  /** Günstige Vorprüfung: Wie liegt das Blatt im Bild? */
  detectOrientation: (bytes: Uint8Array) => Promise<NachweisAusrichtung>;
  /** Bild drehen, bis der Kopf des Formulars oben liegt. */
  rotateNachweis: (bytes: Uint8Array, ausrichtung: NachweisGedreht) => Promise<Uint8Array>;
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

/**
 * Gedreht liest das Modell Zeilen und Spalten unzuverlässig – und teuer. Die
 * günstige Vorprüfung richtet das Bild vorher auf, damit das Hauptmodell nur
 * einmal liest. Scheitert sie, liest das Hauptmodell das Bild wie es ist.
 */
async function vorabAufrichten(
  vorlage: NachweisVorlage,
  dependencies: NachweisDependencies,
): Promise<NachweisVorlage> {
  if (vorlage.mediaType === "application/pdf") return vorlage;
  try {
    const ausrichtung = await dependencies.detectOrientation(vorlage.bytes);
    if (ausrichtung === "aufrecht") return vorlage;
    return {
      bytes: await dependencies.rotateNachweis(vorlage.bytes, ausrichtung),
      mediaType: "image/jpeg",
    };
  } catch {
    return vorlage;
  }
}

/**
 * Netz für den seltenen Fehlgriff der Vorprüfung: Meldet das Hauptmodell das
 * Blatt trotzdem als gedreht, einmal aufgerichtet neu lesen. Ein PDF lässt sich
 * nicht drehen. Scheitert der zweite Versuch, bleibt das erste Ergebnis; die
 * Prüfung warnt dann bei Abweichungen von der Gesamtzeile.
 */
async function aufrechtLesen(
  vorlage: NachweisVorlage,
  erste: NachweisExtraktion,
  dependencies: NachweisDependencies,
): Promise<NachweisExtraktion> {
  if (erste.ausrichtung === "aufrecht" || vorlage.mediaType === "application/pdf") return erste;
  try {
    const gedreht = await dependencies.rotateNachweis(vorlage.bytes, erste.ausrichtung);
    const zweite = await dependencies.extractNachweis(gedreht, "image/jpeg");
    return leseErgebnis(zweite) ? zweite : erste;
  } catch {
    return erste;
  }
}

/**
 * Datei prüfen → Kontingent → Ausrichtung prüfen und aufrichten → Claude liest
 * ab → wir rechnen und prüfen. Ein Kontingent je Datei. Nichts wird gespeichert.
 */
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

  let extraction: NachweisExtraktion;
  try {
    const vorlage = await vorabAufrichten(
      await dependencies.prepareNachweis(bytes, mediaType),
      dependencies,
    );
    const erste = await dependencies.extractNachweis(vorlage.bytes, vorlage.mediaType);
    extraction = await aufrechtLesen(vorlage, erste, dependencies);
  } catch {
    return { status: "error", error: "provider_unavailable" };
  }

  const ergebnis = leseErgebnis(extraction);
  if (!ergebnis) {
    return { status: "error", error: extraction.variante === "tabelle" ? "no_hours_found" : "no_work_found" };
  }
  return { status: "success", ergebnis };
}

function leseErgebnis(extraction: NachweisExtraktion): NachweisLeseErgebnis | null {
  if (extraction.variante === "frei") {
    return extraction.leistungen.length > 0 ? freiesNachweisErgebnis(extraction) : null;
  }
  const ergebnis = nachweisErgebnis(extraction);
  const hatStunden = ergebnis.mitarbeiter.some((mitarbeiter) => mitarbeiter.stunden > 0);
  return hatStunden || ergebnis.material.length > 0 ? { ...ergebnis, variante: "tabelle" } : null;
}
