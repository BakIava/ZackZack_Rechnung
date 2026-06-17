const sharp = require("sharp");
const fs = require("fs");

fs.mkdirSync("public/icons", { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#171717"/>
  <text x="256" y="290" font-family="Arial,sans-serif" font-size="180" font-weight="bold" fill="#ffffff" text-anchor="middle">ZZ</text>
</svg>`;

async function main() {
  const buffer = Buffer.from(svg);
  await sharp(buffer).resize(192, 192).png().toFile("public/icons/icon-192.png");
  await sharp(buffer).resize(512, 512).png().toFile("public/icons/icon-512.png");
  await sharp(buffer).resize(512, 512).png().toFile("public/icons/icon-512-maskable.png");
  console.log("PWA icons generated.");
}

main();
