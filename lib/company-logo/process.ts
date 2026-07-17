import sharp from "sharp";
import {
  COMPANY_LOGO_MAX_BYTES,
  type CompanyLogoInputType,
  type CompanyLogoValidationError,
  type PreparedCompanyLogo,
  validateCompanyLogoSelection,
} from "./constants";

export type PrepareCompanyLogoResult =
  | { ok: true; logo: PreparedCompanyLogo }
  | { ok: false; error: CompanyLogoValidationError };

const EXPECTED_FORMAT: Record<CompanyLogoInputType, "png" | "jpeg" | "svg"> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/svg+xml": "svg",
};

const OUTPUT_SIZES = [1600, 1200, 900, 600, 400] as const;
const MAX_INPUT_PIXELS = 40_000_000;

export function sniffCompanyLogoInputType(bytes: Uint8Array): CompanyLogoInputType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const prefix = new TextDecoder().decode(bytes.slice(0, 1024)).trimStart();
  return /^(?:<\?xml[^>]*>\s*)?<svg\b/i.test(prefix) ? "image/svg+xml" : null;
}

function isUnsafeSvg(bytes: Uint8Array): boolean {
  const source = new TextDecoder().decode(bytes);
  if (
    /<!doctype|<!entity|<script\b|<foreignObject\b|<iframe\b|<object\b|<embed\b|<link\b|<audio\b|<video\b|<\?xml-stylesheet|@import/i.test(
      source,
    )
  ) {
    return true;
  }

  const isSafeReference = (value: string) => {
    const normalized = value.trim().toLowerCase();
    return (
      normalized.startsWith("#") ||
      /^data:image\/(?:png|jpeg);base64,/.test(normalized)
    );
  };

  for (const match of source.matchAll(/(?:href|xlink:href)\s*=\s*["']([^"']*)["']/gi)) {
    if (!isSafeReference(match[1])) return true;
  }
  for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    if (!isSafeReference(match[1])) return true;
  }
  return false;
}

async function renderStoredLogo(
  input: Uint8Array,
  inputFormat: "png" | "jpeg" | "svg",
  maxWidth: number,
): Promise<PreparedCompanyLogo> {
  const base = sharp(input, {
    density: inputFormat === "svg" ? 144 : 72,
    failOn: "error",
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .resize({
      width: maxWidth,
      height: Math.round(maxWidth / 2),
      fit: "inside",
      withoutEnlargement: true,
    });

  if (inputFormat === "jpeg") {
    const bytes = await base.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    return {
      bytes: new Uint8Array(bytes),
      contentType: "image/jpeg",
      extension: "jpg",
    };
  }

  const bytes = await base
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 92 })
    .toBuffer();
  return {
    bytes: new Uint8Array(bytes),
    contentType: "image/png",
    extension: "png",
  };
}

export async function prepareCompanyLogoBytes(
  bytes: Uint8Array,
  declaredType: string,
): Promise<PrepareCompanyLogoResult> {
  if (bytes.byteLength === 0) return { ok: false, error: "logoContentInvalid" };
  if (bytes.byteLength > COMPANY_LOGO_MAX_BYTES) {
    return { ok: false, error: "logoTooLarge" };
  }

  const expected = EXPECTED_FORMAT[declaredType as CompanyLogoInputType];
  if (!expected) return { ok: false, error: "logoTypeInvalid" };
  if (expected === "svg" && isUnsafeSvg(bytes)) {
    return { ok: false, error: "logoContentInvalid" };
  }

  try {
    const metadata = await sharp(bytes, {
      density: expected === "svg" ? 144 : 72,
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata();
    if (metadata.format !== expected || !metadata.width || !metadata.height) {
      return { ok: false, error: "logoContentInvalid" };
    }

    for (const maxWidth of OUTPUT_SIZES) {
      const logo = await renderStoredLogo(bytes, expected, maxWidth);
      if (logo.bytes.byteLength <= COMPANY_LOGO_MAX_BYTES) {
        return { ok: true, logo };
      }
    }
  } catch {
    return { ok: false, error: "logoContentInvalid" };
  }

  return { ok: false, error: "logoContentInvalid" };
}

export async function prepareCompanyLogo(file: File): Promise<PrepareCompanyLogoResult> {
  const selectionError = validateCompanyLogoSelection(file);
  if (selectionError) return { ok: false, error: selectionError };
  return prepareCompanyLogoBytes(new Uint8Array(await file.arrayBuffer()), file.type);
}
