import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  NACHWEIS_BILD_MAX_KANTE,
  NACHWEIS_VORSCHAU_KANTE,
  nachweisBildAufrichten,
  nachweisVorlage,
  nachweisVorschau,
} from "./nachweis-bild";

const encoder = new TextEncoder();

/** Querformat, linke Hälfte rot, rechte blau – zeigt, wohin sich das Bild dreht. */
async function zweiFarben(): Promise<Uint8Array> {
  const [breite, hoehe] = [40, 20];
  const raw = Buffer.alloc(breite * hoehe * 3);
  for (let y = 0; y < hoehe; y += 1) {
    for (let x = 0; x < breite; x += 1) {
      raw[(y * breite + x) * 3 + (x < breite / 2 ? 0 : 2)] = 255;
    }
  }
  return new Uint8Array(
    await sharp(raw, { raw: { width: breite, height: hoehe, channels: 3 } }).png().toBuffer(),
  );
}

async function farbe(bytes: Uint8Array, x: number, y: number): Promise<"rot" | "blau"> {
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  const index = (y * info.width + x) * info.channels;
  return data[index] > data[index + 2] ? "rot" : "blau";
}

/** PDF mit genau einem Seitenscan als JPEG. */
function scanPdf(jpeg: Uint8Array, breite: number, hoehe: number): Uint8Array {
  const kopf = encoder.encode(
    `%PDF-1.4\n2 0 obj\n<< /Type /XObject /Subtype /Image /Width ${breite} /Height ${hoehe}` +
      ` /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  );
  const fuss = encoder.encode("\nendstream\nendobj\n%%EOF\n");
  const pdf = new Uint8Array(kopf.length + jpeg.length + fuss.length);
  pdf.set(kopf);
  pdf.set(jpeg, kopf.length);
  pdf.set(fuss, kopf.length + jpeg.length);
  return pdf;
}

describe("nachweisVorlage", () => {
  it("schickt einen PDF-Scan als JPEG, höchstens in Claudes voller Auflösung", async () => {
    const jpeg = await sharp({
      create: { width: 1000, height: 3000, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toBuffer();
    const vorlage = await nachweisVorlage(scanPdf(new Uint8Array(jpeg), 1000, 3000), "application/pdf");
    expect(vorlage.mediaType).toBe("image/jpeg");
    const meta = await sharp(vorlage.bytes).metadata();
    expect(meta.height).toBe(NACHWEIS_BILD_MAX_KANTE);
  });

  it("lässt PDFs ohne Scan und Bilder unverändert", async () => {
    const pdf = encoder.encode("%PDF-1.7 ohne Bild");
    await expect(nachweisVorlage(pdf, "application/pdf")).resolves.toEqual({
      bytes: pdf,
      mediaType: "application/pdf",
    });
    const bild = await zweiFarben();
    await expect(nachweisVorlage(bild, "image/png")).resolves.toEqual({
      bytes: bild,
      mediaType: "image/png",
    });
  });
});

describe("nachweisVorschau", () => {
  it("verkleinert für die Vorprüfung, vergrößert aber nie", async () => {
    const gross = await sharp({
      create: { width: 2000, height: 3000, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toBuffer();
    const vorschau = await sharp(await nachweisVorschau(new Uint8Array(gross))).metadata();
    expect(vorschau).toMatchObject({ format: "jpeg", height: NACHWEIS_VORSCHAU_KANTE });

    const klein = await sharp(await nachweisVorschau(await zweiFarben())).metadata();
    expect(klein).toMatchObject({ width: 40, height: 20 });
  });
});

describe("nachweisBildAufrichten", () => {
  it("dreht so, dass der gemeldete Kopf oben liegt", async () => {
    const bild = await zweiFarben();

    const vonLinks = await nachweisBildAufrichten(bild, "kopf_links");
    expect(await sharp(vonLinks).metadata()).toMatchObject({ width: 20, height: 40 });
    expect(await farbe(vonLinks, 10, 2)).toBe("rot");

    expect(await farbe(await nachweisBildAufrichten(bild, "kopf_rechts"), 10, 2)).toBe("blau");

    const kopfueber = await nachweisBildAufrichten(bild, "kopfueber");
    expect(await sharp(kopfueber).metadata()).toMatchObject({ width: 40, height: 20 });
    expect(await farbe(kopfueber, 2, 10)).toBe("blau");
  });
});
