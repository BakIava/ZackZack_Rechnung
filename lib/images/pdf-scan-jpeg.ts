/**
 * Scanner legen eine Seite als ein einziges JPEG im PDF ab. Dieses Bild lässt
 * sich ohne PDF-Bibliothek herauslösen: Bilddaten liegen nie in komprimierten
 * Objekt-Streams, das Bildobjekt steht also lesbar in der Datei.
 */

/** Kleinere Bilder sind Logos o. Ä., kein Seitenscan (A4 mit 100 dpi ≈ 827 × 1169). */
const MIN_KURZE_KANTE = 800;

const STREAM_OBJEKT = /\d+\s+\d+\s+obj\s*<<((?:(?!endobj)[\s\S])*?)>>\s*stream\r?\n/g;

/** Direkt angegebene Zahl; indirekte Verweise („12 0 R“) zählen als unbekannt (0). */
function zahl(dict: string, schluessel: string): number {
  const treffer = new RegExp(`/${schluessel}\\s+(\\d+)\\b(?!\\s+\\d+\\s+R)`).exec(dict);
  return treffer ? Number(treffer[1]) : 0;
}

/** Ende hinter dem letzten EOI-Marker (FF D9) vor „endstream“, ohne Zeilenumbruch. */
function jpegEnde(pdf: Uint8Array, start: number, ende: number): number {
  for (let i = ende - 1; i > start + 1; i -= 1) {
    if (pdf[i - 1] === 0xff && pdf[i] === 0xd9) return i + 1;
  }
  return -1;
}

/**
 * JPEG-Bytes des Seitenscans, wenn das PDF genau ein seitengroßes Bild enthält
 * und dieses reines JPEG ist – sonst null (digital ausgefülltes PDF,
 * mehrseitiger Scan, andere Kompression). Dann bleibt es beim PDF.
 */
export function scanJpegAusPdf(pdf: Uint8Array): Uint8Array | null {
  const text = Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength).toString("latin1");
  const scans: { jpeg: boolean; start: number }[] = [];

  for (const treffer of text.matchAll(STREAM_OBJEKT)) {
    const dict = treffer[1];
    if (!/\/Subtype\s*\/Image\b/.test(dict)) continue;
    if (Math.min(zahl(dict, "Width"), zahl(dict, "Height")) < MIN_KURZE_KANTE) continue;
    scans.push({
      // Filterketten (z. B. Flate + DCT) gelten nicht als reines JPEG.
      jpeg: /\/Filter\s*(?:\/DCTDecode|\[\s*\/DCTDecode\s*\])/.test(dict),
      start: treffer.index + treffer[0].length,
    });
  }
  if (scans.length !== 1 || !scans[0].jpeg) return null;

  const { start } = scans[0];
  const ende = jpegEnde(pdf, start, text.indexOf("endstream", start));
  if (ende < 0 || pdf[start] !== 0xff || pdf[start + 1] !== 0xd8) return null;
  return pdf.slice(start, ende);
}
