import { renderToStream } from "@react-pdf/renderer";
import {
  SampleInvoiceDocument,
  sampleInvoiceData,
} from "@/lib/pdf/invoice-document";

export async function renderSampleInvoicePdf() {
  return renderToStream(
    <SampleInvoiceDocument data={sampleInvoiceData} />,
  );
}
