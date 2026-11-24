const sharp = require("sharp");
const fs = require("fs");

const MARK = "public/assets/zackzack-mark.png";
const BRAND_ORANGE = "#FC6200";
const OUT_DIR = "public/icons";

/** Weißes Pfeil-Logo in der gewünschten Breite (Form aus dem Alphakanal des Originals). */
async function whiteMark(width) {
  const shape = await sharp(MARK).resize({ width }).png().toBuffer();
  const { height } = await sharp(shape).metadata();
  const buffer = await sharp({ create: { width, height, channels: 4, background: "#ffffff" } })
    .composite([{ input: shape, blend: "dest-in" }])
    .png()
    .toBuffer();
  return { buffer, width, height };
}

/**
 * Orange Fläche mit zentriertem weißem Logo.
 * markScale: Logobreite relativ zur Kantenlänge.
 * radius: Eckenrundung relativ zur Kantenlänge (0 = vollflächig, z. B. für iOS/maskable).
 */
async function renderIconBuffer(size, { markScale, radius }) {
  const mark = await whiteMark(Math.round(size * markScale));
  const rx = Math.round(size * radius);
  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${rx}" fill="${BRAND_ORANGE}"/></svg>`,
  );
  let icon = sharp(background).composite([{
    input: mark.buffer,
    left: Math.round((size - mark.width) / 2),
    top: Math.round((size - mark.height) / 2),
  }]);
  // Vollflächige Icons ohne Alphakanal ausgeben (iOS zeigt Transparenz sonst schwarz).
  if (radius === 0) icon = sharp(await icon.png().toBuffer()).flatten({ background: BRAND_ORANGE });
  return icon.png().toBuffer();
}

async function renderIcon(file, size, options) {
  fs.writeFileSync(`${OUT_DIR}/${file}`, await renderIconBuffer(size, options));
}

/** ICO-Container mit eingebetteten PNGs (von allen aktuellen Browsern unterstützt). */
function packIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserviert
  header.writeUInt16LE(1, 2); // Typ: Icon
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Breite
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Höhe
    entry.writeUInt8(0, 2); // Palette
    entry.writeUInt8(0, 3); // reserviert
    entry.writeUInt16LE(1, 4); // Farbebenen
    entry.writeUInt16LE(32, 6); // Bit pro Pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...pngs.map(({ data }) => data)]);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Manifest "any": abgerundet wie bisher.
  await renderIcon("icon-192.png", 192, { markScale: 0.62, radius: 0.1875 });
  await renderIcon("icon-512.png", 512, { markScale: 0.62, radius: 0.1875 });
  // Manifest "maskable": vollflächig, Logo innerhalb der 80-%-Sicherheitszone (Android schneidet zu).
  await renderIcon("icon-512-maskable.png", 512, { markScale: 0.52, radius: 0 });
  // iOS/iPadOS: 180×180, ohne Transparenz und ohne eigene Rundung (rundet das System selbst).
  await renderIcon("apple-touch-icon.png", 180, { markScale: 0.62, radius: 0 });

  // Browser-Tab: app/favicon.ico (Next.js-Dateikonvention), Logo etwas größer für kleine Größen.
  const faviconPngs = await Promise.all([16, 32, 48].map(async (size) => ({
    size,
    data: await renderIconBuffer(size, { markScale: 0.72, radius: 0.1875 }),
  })));
  fs.writeFileSync("app/favicon.ico", packIco(faviconPngs));

  console.log("PWA icons generated.");
}

main();
