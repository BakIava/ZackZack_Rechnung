import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { registerPdfFonts, PDF_FONT_FAMILY } from "./fonts";
import { measureText, wrapTextToWidth } from "./text-metrics";

const SAMPLES = [
  "Mauer, Trockenbau und Fliesenarbeiten",
  "WANDFLIESEN GROSSFORMAT VERLEGEN ÜBER ZWEI WÄNDE",
  "Natursteinfensterbankaustauschvorbereitungsarbeiten",
  "Yılmaz İstanbul Şahin Ğ ğ ş ı – € 1.234,56 § 19 „Größe“",
  "info@fliesen-muster-ingelheim.example",
];

/** Breiten derselben Texte, wie React-PDF sie mit der eingebetteten Schrift setzt. */
async function renderedWidths(weight: "normal" | "bold"): Promise<number[]> {
  registerPdfFonts();
  const buffer = await renderToBuffer(
    <Document>
      <Page size={[2000, 400]} style={{ fontFamily: PDF_FONT_FAMILY, fontSize: 10 }}>
        {SAMPLES.map((sample, index) => (
          <Text key={sample} style={{ position: "absolute", left: 10, top: 10 + index * 30, fontWeight: weight }}>
            {sample}
          </Text>
        ))}
      </Page>
    </Document>,
  );
  const task = getDocument({ data: new Uint8Array(buffer) });
  try {
    const page = await (await task.promise).getPage(1);
    const items = (await page.getTextContent()).items.filter((item) => "str" in item && item.str.trim());
    return SAMPLES.map((sample) => items
      .filter((item) => "str" in item && sample.includes(item.str))
      .reduce((max, item) => Math.max(max, "width" in item ? item.width : 0), 0));
  } finally {
    await task.destroy();
  }
}

describe("text-metrics", () => {
  it.each([["regular", "normal"], ["bold", "bold"]] as const)(
    "%s: Tabellenbreiten entsprechen dem gerenderten PDF (Kerning macht nur schmaler)",
    async (weight, cssWeight) => {
      const widths = await renderedWidths(cssWeight);
      SAMPLES.forEach((sample, index) => {
        const planned = measureText(sample, 10, weight);
        expect(widths[index]).toBeGreaterThan(0);
        expect(widths[index]).toBeLessThanOrEqual(planned + 0.05);
        expect(widths[index]).toBeGreaterThan(planned * 0.97);
      });
    },
    60_000,
  );

  it("bricht so um, dass jede Zeile in die Breite passt", () => {
    for (const sample of SAMPLES) {
      for (const width of [40, 90, 215]) {
        for (const line of wrapTextToWidth(sample, width, 10, "regular")) {
          expect(measureText(line, 10, "regular")).toBeLessThanOrEqual(width);
        }
      }
    }
  });

  it("erhält harte Umbrüche und Wörter, teilt nur überlange Wörter", () => {
    expect(wrapTextToWidth("Erste Zeile\nZweite Zeile", 500, 10)).toEqual(["Erste Zeile", "Zweite Zeile"]);
    expect(wrapTextToWidth("", 100, 10)).toEqual([""]);
    const parts = wrapTextToWidth("Natursteinfensterbankaustauschvorbereitungsarbeiten", 60, 10);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join("")).toBe("Natursteinfensterbankaustauschvorbereitungsarbeiten");
    expect(wrapTextToWidth("Fliesen im Bad verlegen", 75, 10)).toEqual(["Fliesen im Bad", "verlegen"]);
  });
});
