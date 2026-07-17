/**
 * Bereitet das Firmenlogo für die PDF-Einbettung vor. @react-pdf/renderer bettet
 * Rasterbilder (PNG/JPEG) als Data-URL zuverlässig ein. SVG wird deshalb mit
 * derselben sicheren Logo-Pipeline wie beim Upload serverseitig rasterisiert.
 *
 * Bewusst self-contained: das Logo wird als Bytes eingebettet, nicht per URL zur
 * Renderzeit nachgeladen — so bleibt der Beleg auch offline reproduzierbar.
 */

import type { PdfLogo } from "@/lib/pdf/document-pdf";
import { COMPANY_LOGO_MAX_BYTES } from "@/lib/company-logo/constants";
import {
  prepareCompanyLogoBytes,
  sniffCompanyLogoInputType,
} from "@/lib/company-logo/process";

function isConfiguredCompanyLogoUrl(logoUrl: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;
  try {
    const candidate = new URL(logoUrl);
    const configured = new URL(supabaseUrl);
    return (
      candidate.origin === configured.origin &&
      candidate.pathname.includes("/storage/v1/object/public/company-logos/")
    );
  } catch {
    return false;
  }
}

export async function loadPdfLogo(logoUrl: string | null): Promise<PdfLogo | null> {
  if (!logoUrl || !isConfiguredCompanyLogoUrl(logoUrl)) return null;

  try {
    const res = await fetch(logoUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const contentLength = Number(res.headers.get("content-length") ?? 0);
    if (contentLength > COMPANY_LOGO_MAX_BYTES) return null;

    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > COMPANY_LOGO_MAX_BYTES) return null;

    const headerType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const declaredType =
      headerType === "image/png" ||
      headerType === "image/jpeg" ||
      headerType === "image/svg+xml"
        ? headerType
        : sniffCompanyLogoInputType(buf);
    if (!declaredType) return null;
    const prepared = await prepareCompanyLogoBytes(buf, declaredType);
    if (!prepared.ok) return null;

    const base64 = Buffer.from(prepared.logo.bytes).toString("base64");
    return { dataUrl: `data:${prepared.logo.contentType};base64,${base64}` };
  } catch {
    return null;
  }
}
