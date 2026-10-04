import { renderDocumentPdfBuffer } from "@/lib/pdf/render-document";
import {
  createMultiPageDocument,
  createSinglePageDocument,
} from "@/components/renderer-spike/sample-documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }
  const variant = new URL(request.url).searchParams.get("variant");
  const preview = variant === "multi"
    ? createMultiPageDocument()
    : createSinglePageDocument();
  const pdf = await renderDocumentPdfBuffer(preview, null);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
    },
  });
}
