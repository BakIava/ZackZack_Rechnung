/**
 * Erzeugt aus `lib/pdf/templates/erhan-excel/erhan-excel-logo.png` das Modul
 * `erhan-excel-logo.ts` mit einer verkleinerten PNG-Data-URL und deren
 * Pixelmaßen. Die Vorlage rendert auch im Browser (Live-Vorschau) — eine
 * Data-URL funktioniert dort wie im Node-Renderer ohne Dateizugriff.
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const DIR = path.join("lib", "pdf", "templates", "erhan-excel");
const SOURCE = path.join(DIR, "erhan-excel-logo.png");
const TARGET = path.join(DIR, "erhan-excel-logo.ts");
/** ≈ 525 dpi bei der gedruckten Breite von ≈ 164 pt. */
const WIDTH = 1200;

async function main() {
  const png = await sharp(SOURCE)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 92 })
    .toBuffer();
  const { width, height } = await sharp(png).metadata();
  const source = [
    "/**",
    " * Festes Logo der Vorlage `erhan-excel` — generiert aus `erhan-excel-logo.png`",
    " * per `npm run logo:erhan`. Nicht von Hand bearbeiten.",
    " */",
    "",
    "/** Pixelmaße des eingebetteten Bildes — bestimmen die gedruckte Logobreite (objectFit contain). */",
    `export const ERHAN_LOGO_SIZE = { width: ${width}, height: ${height} } as const;`,
    "",
    `export const ERHAN_LOGO_DATA_URL =\n  "data:image/png;base64,${png.toString("base64")}";`,
    "",
  ].join("\n");
  fs.writeFileSync(TARGET, source);
  console.log(`${TARGET} generated (${width}×${height}, ${png.length} bytes PNG).`);
}

main();
