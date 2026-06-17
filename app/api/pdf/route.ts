import { renderSampleInvoicePdf } from "@/lib/pdf/render-invoice";

export async function GET() {
  const stream = await renderSampleInvoicePdf();

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="beispiel-rechnung.pdf"',
    },
  });
}
