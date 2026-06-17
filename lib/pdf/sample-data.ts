/**
 * Document DTO + sample data. Money is integer cents.
 * Einkaufspreis/Marge are intentionally absent and must never be added here.
 */

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export type SampleInvoiceData = {
  invoiceNumber: string;
  issueDate: string;
  seller: { name: string; address: string };
  customer: { name: string; address: string };
  lineItems: InvoiceLineItem[];
  smallBusinessExempt: boolean;
};

export const sampleInvoiceData: SampleInvoiceData = {
  invoiceNumber: "2026-0001",
  issueDate: "09.06.2026",
  seller: {
    name: "Yılmaz Malerbetrieb",
    address: "Musterstraße 12, 10115 Berlin",
  },
  customer: {
    name: "Familie Schneider",
    address: "Gartenweg 4, 10117 Berlin",
  },
  lineItems: [
    {
      description: "Innenanstrich Wohnzimmer (2 Anstriche)",
      quantity: 1,
      unitPriceCents: 48000,
    },
    {
      description: "Material (Farbe, Grundierung)",
      quantity: 1,
      unitPriceCents: 9500,
    },
  ],
  smallBusinessExempt: true,
};
