import { describe, expect, it } from "vitest";
import { scanJpegAusPdf } from "./pdf-scan-jpeg";

const encoder = new TextEncoder();
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x01, 0x02, 0x03, 0xff, 0xd9]);
const SCAN = "/Type /XObject /Subtype /Image /Width 2409 /Height 3437 /Filter /DCTDecode";
const LOGO = "/Type /XObject /Subtype /Image /Width 200 /Height 80 /Filter /DCTDecode";

/** Minimales PDF: Katalog plus je ein Stream-Objekt pro Bild. */
function pdf(bilder: { dict: string; daten?: Uint8Array }[]): Uint8Array {
  const teile: Uint8Array[] = [encoder.encode("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n")];
  bilder.forEach(({ dict, daten = JPEG }, index) => {
    teile.push(
      encoder.encode(`${index + 2} 0 obj\n<< ${dict} /Length ${daten.length} >>\nstream\r\n`),
      daten,
      encoder.encode("\r\nendstream\nendobj\n"),
    );
  });
  teile.push(encoder.encode("trailer\n<< /Root 1 0 R >>\n%%EOF\n"));
  const ergebnis = new Uint8Array(teile.reduce((summe, teil) => summe + teil.length, 0));
  let offset = 0;
  for (const teil of teile) {
    ergebnis.set(teil, offset);
    offset += teil.length;
  }
  return ergebnis;
}

describe("scanJpegAusPdf", () => {
  it("liefert das JPEG eines Seitenscans unverändert, ohne Zeilenumbruch", () => {
    expect(scanJpegAusPdf(pdf([{ dict: SCAN }]))).toEqual(JPEG);
  });

  it("akzeptiert den Filter als Liste und übergeht kleine Bilder wie Logos", () => {
    const dict = SCAN.replace("/Filter /DCTDecode", "/Filter [/DCTDecode]");
    expect(scanJpegAusPdf(pdf([{ dict: LOGO }, { dict }]))).toEqual(JPEG);
  });

  it.each([
    ["kein Bild", []],
    ["nur ein Logo", [{ dict: LOGO }]],
    ["mehrseitiger Scan", [{ dict: SCAN }, { dict: SCAN }]],
    ["anders komprimierter Scan", [{ dict: SCAN.replace("DCTDecode", "FlateDecode") }]],
    [
      "Filterkette",
      [{ dict: SCAN.replace("/Filter /DCTDecode", "/Filter [/FlateDecode /DCTDecode]") }],
    ],
    ["indirekte Größe", [{ dict: SCAN.replace("/Width 2409", "/Width 7 0 R") }]],
    ["kein JPEG im Stream", [{ dict: SCAN, daten: encoder.encode("kein jpeg") }]],
  ])("liefert null bei %s", (_label, bilder) => {
    expect(scanJpegAusPdf(pdf(bilder))).toBeNull();
  });
});
