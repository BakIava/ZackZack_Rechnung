/* Beispieldaten für Schritt 3 (Vorschau & Versand) — verbindliche Demodaten aus
   dem Design-Handoff. Reine Kundensicht: KEIN Einkaufspreis / keine Marge.
   Beträge als ganzzahlige Cents. Eigennamen bleiben deutsch (so stehen sie auf
   dem Dokument). */

export interface InvoicePosition {
  id: string;
  /** Deutscher Dokumentbegriff (nie das übersetzte Katalogfeld). */
  label: string;
  qty: number;
  unit: string;
  /** Einzelpreis in Cent. */
  priceCents: number;
}

export interface InvoiceIssuer {
  name: string;
  owner: string;
  initials: string;
  street: string;
  city: string;
  taxNo: string;
  phone: string;
  email: string;
  iban: string;
  bank: string;
}

export interface InvoiceRecipient {
  name: string;
  street: string;
  city: string;
}

export interface InvoicePreview {
  number: string;
  /** Reserviert, erst beim PDF-Export endgültig verbraucht. */
  reserved: boolean;
  date: string;
  issuer: InvoiceIssuer;
  recipient: InvoiceRecipient;
  positions: InvoicePosition[];
}

export const INVOICE_PREVIEW: InvoicePreview = {
  number: "2026-0042",
  reserved: true,
  date: "06.06.2026",
  issuer: {
    name: "Yılmaz Malerbetrieb",
    owner: "Mehmet Yılmaz",
    initials: "YM",
    street: "Neckarstraße 45",
    city: "70190 Stuttgart",
    taxNo: "26/123/45678",
    phone: "0711 24 88 90",
    email: "info@yilmaz-malerbetrieb.de",
    iban: "DE21 6005 0101 0002 1234 56",
    bank: "BW-Bank Stuttgart",
  },
  recipient: {
    name: "Familie Schneider",
    street: "Hauptstraße 12",
    city: "55411 Bingen am Rhein",
  },
  positions: [
    { id: "i1", label: "Malerarbeiten Wandfläche", qty: 45, unit: "m²", priceCents: 1250 },
    { id: "i2", label: "Materialpauschale", qty: 1, unit: "Pauschal", priceCents: 8500 },
  ],
};

/** Zeilensumme einer Position in Cent. */
export function lineTotalCents(p: InvoicePosition): number {
  return p.qty * p.priceCents;
}

/** Rechnungsbetrag (Summe aller Positionen) in Cent. */
export function invoiceTotalCents(invoice: InvoicePreview): number {
  return invoice.positions.reduce((sum, p) => sum + lineTotalCents(p), 0);
}

/* ── Dokumenttexte: IMMER Deutsch (unabhängig von der Bediensprache) ──────────
   Hard-Regel: Dokumentinhalt bleibt LTR/Deutsch. Diese Labels kommen daher
   bewusst NICHT aus i18n, sondern sind hier als deutsche Konstanten fixiert. */
export const DOC_DE = {
  trade: "Maler- & Lackierarbeiten",
  reserved: "reserviert",
  no: "Rechnungs-Nr.",
  date: "Datum",
  taxNo: "Steuernummer",
  invoice: "Rechnung",
  to: "Rechnungsempfänger",
  pos: "Pos.",
  desc: "Bezeichnung",
  qty: "Menge",
  unitPrice: "Einzelpreis",
  lineSum: "Gesamt",
  netSum: "Gesamt (netto)",
  total: "Rechnungsbetrag",
  vatNote: "Gemäß §19 UStG wird keine Umsatzsteuer berechnet.",
  payNote:
    "Zahlbar innerhalb von 14 Tagen ohne Abzug auf das unten genannte Konto.",
  thanks: "Vielen Dank für Ihren Auftrag.",
  owner: "Inhaber",
  footContact: "Kontakt",
  footBankTax: "Bank & Steuer",
} as const;
