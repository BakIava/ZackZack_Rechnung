import sharp from "sharp";
import { scanJpegAusPdf } from "@/lib/images/pdf-scan-jpeg";
import type { NachweisAusrichtung, NachweisMediaType } from "@/types/nachweis";

/** Längste Kante, die Claude ohne eigenes Verkleinern verarbeitet. */
export const NACHWEIS_BILD_MAX_KANTE = 2576;
/** Reicht, um die Ausrichtung zu erkennen (Test: alle Drehungen richtig). */
export const NACHWEIS_VORSCHAU_KANTE = 1024;
const JPEG_QUALITAET = 90;

export interface NachweisVorlage {
  bytes: Uint8Array;
  mediaType: NachweisMediaType;
}

export type NachweisGedreht = Exclude<NachweisAusrichtung, "aufrecht">;

/** Drehung im Uhrzeigersinn, die den Kopf des Formulars nach oben bringt. */
const DREHUNG: Record<NachweisGedreht, 90 | 180 | 270> = {
  kopf_links: 90,
  kopfueber: 180,
  kopf_rechts: 270,
};

/**
 * Ein gescanntes PDF geht als Bild an Claude: in voller Auflösung statt der
 * gröberen PDF-Rasterung, und nur ein Bild lässt sich bei Bedarf drehen.
 * Alles andere bleibt unverändert.
 */
export async function nachweisVorlage(
  bytes: Uint8Array,
  mediaType: NachweisMediaType,
): Promise<NachweisVorlage> {
  if (mediaType !== "application/pdf") return { bytes, mediaType };
  const scan = scanJpegAusPdf(bytes);
  if (!scan) return { bytes, mediaType };
  try {
    const jpeg = await sharp(scan)
      .resize({
        width: NACHWEIS_BILD_MAX_KANTE,
        height: NACHWEIS_BILD_MAX_KANTE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITAET })
      .toBuffer();
    return { bytes: new Uint8Array(jpeg), mediaType: "image/jpeg" };
  } catch {
    return { bytes, mediaType };
  }
}

/** Kleines Vorschaubild für die günstige Prüfung der Ausrichtung. */
export async function nachweisVorschau(bytes: Uint8Array): Promise<Uint8Array> {
  const jpeg = await sharp(bytes)
    .resize({
      width: NACHWEIS_VORSCHAU_KANTE,
      height: NACHWEIS_VORSCHAU_KANTE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
  return new Uint8Array(jpeg);
}

/** Bild so drehen, dass der Kopf des Formulars oben liegt. */
export async function nachweisBildAufrichten(
  bytes: Uint8Array,
  ausrichtung: NachweisGedreht,
): Promise<Uint8Array> {
  const jpeg = await sharp(bytes)
    .rotate(DREHUNG[ausrichtung])
    .jpeg({ quality: JPEG_QUALITAET })
    .toBuffer();
  return new Uint8Array(jpeg);
}
