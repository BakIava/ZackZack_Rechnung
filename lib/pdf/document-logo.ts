/**
 * Bereitet das Firmenlogo für die PDF-Einbettung vor. @react-pdf/renderer bettet
 * Rasterbilder (PNG/JPEG) als Data-URL zuverlässig ein; SVG unterstützt <Image>
 * nicht. Deshalb: Rasterlogo → Data-URL, sonst (SVG, Fehler, kein Logo) → null,
 * und die Komponente fällt sauber auf das Firmen-Monogramm zurück.
 *
 * Bewusst self-contained: das Logo wird als Bytes eingebettet, nicht per URL zur
 * Renderzeit nachgeladen — so bleibt der Beleg auch offline reproduzierbar.
 */

import type { PdfLogo } from "@/lib/pdf/document-pdf";

const RASTER_TYPES: Record<string, string> = {
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
};

/** Erkennt Rasterformate anhand der Magic Bytes (Content-Type ist oft unzuverlässig). */
function sniffRaster(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}

export async function loadPdfLogo(logoUrl: string | null): Promise<PdfLogo | null> {
  if (!logoUrl) return null;

  try {
    const res = await fetch(logoUrl, { cache: "no-store" });
    if (!res.ok) return null;

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0) return null;

    const headerType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const mime = RASTER_TYPES[headerType] ?? sniffRaster(buf);
    if (!mime) return null; // SVG o. Ä. → Monogramm-Fallback

    const base64 = Buffer.from(buf).toString("base64");
    return { dataUrl: `data:${mime};base64,${base64}` };
  } catch {
    return null;
  }
}
