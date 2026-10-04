import { DEFAULT_DOCUMENT_TEMPLATE } from "@/lib/pdf/templates/template-catalog";
import type { DocumentItem, DocumentPreview } from "@/types/document";

const company: DocumentPreview["company"] = {
  name: "Yılmaz Ölçü & Größe",
  legalForm: "Einzelunternehmen",
  street: "Musterstraße",
  streetNo: "12a",
  postcode: "10115",
  city: "Berlin",
  phone: "+49 30 1234567",
  mobile: null,
  fax: null,
  email: "info@example.test",
  director: "İlker Yılmaz",
  steuernummer: "12/345/67890",
  ustId: null,
  bankName: "Testbank",
  iban: "DE02120300000000202051",
  bic: null,
  accountHolder: "İlker Yılmaz",
  logoUrl: null,
  paymentDays: 14,
};

const customer: NonNullable<DocumentPreview["customer"]> = {
  customer_type: "private",
  firstname: "Jürgen",
  lastname: "Şahin",
  company_name: null,
  street: "Gartenweg",
  streetNo: "4",
  postcode: "10117",
  city: "Berlin",
  email: "kunde@example.test",
  phone: null,
};

function item(position: number, unitPrice: number, description: string): DocumentItem {
  return {
    position,
    descriptionDe: description,
    amount: 1,
    unit: "Stk.",
    unitPrice,
    totalAmount: unitPrice,
    taxRate: 0,
    taxAmount: 0,
    grossAmount: unitPrice,
  };
}

function documentWithItems(id: string, items: DocumentItem[]): DocumentPreview {
  const total = items.reduce((sum, current) => sum + current.totalAmount, 0);
  return {
    id,
    docType: "invoice",
    status: "draft",
    documentNumber: null,
    issueDate: "2026-09-29",
    serviceDate: "2026-09-28",
    servicePeriodStart: null,
    servicePeriodEnd: null,
    validUntil: null,
    isKleinunternehmer: true,
    defaultTaxRate: 0,
    totalAmount: total,
    netAmount: total,
    taxAmount: 0,
    taxGroups: [],
    company,
    customer,
    items,
    template: DEFAULT_DOCUMENT_TEMPLATE,
    convertedInvoiceId: null,
    basedOnQuoteId: null,
  };
}

export function createSinglePageDocument(unitPrice = 48_000): DocumentPreview {
  return documentWithItems("renderer-single", [
    item(1, unitPrice, "Innenanstrich für Küche und Größe prüfen"),
    item(2, 9_500, "Material: weiße Farbe, Ölgrund und Bürsten"),
    item(3, 12_400, "Türrahmen in İstanbul-Blau lackieren"),
  ]);
}

function createPageCountDocument(
  id: string,
  itemCount: number,
  unitPrice = 12_500,
): DocumentPreview {
  const items = Array.from({ length: itemCount }, (_, index) =>
    item(
      index + 1,
      index === 0 ? unitPrice : 8_000 + index * 125,
      `Position ${index + 1}: Wände, Türen und Größen sorgfältig bearbeiten – Yılmaz Qualität`,
    ),
  );
  return documentWithItems(id, items);
}

/** Kontrollierte visuelle Fixture: 9 Zeilen ergeben zwei explizite A4-Seiten. */
export function createTwoPageDocument(): DocumentPreview {
  return createPageCountDocument("renderer-two-pages", 9);
}

/** Regressionsfixture: 15 Zeilen passen ausgewogen auf zwei Seiten (8 / 7). */
export function createFifteenPositionDocument(): DocumentPreview {
  return createPageCountDocument("renderer-fifteen-positions", 15);
}

/** Kontrollierte visuelle Fixture: 21 Zeilen ergeben drei explizite A4-Seiten. */
export function createThreePageDocument(unitPrice = 12_500): DocumentPreview {
  return createPageCountDocument("renderer-three-pages", 21, unitPrice);
}

export function createMultiPageDocument(unitPrice = 12_500): DocumentPreview {
  return createThreePageDocument(unitPrice);
}

export const PACKAGE_02_VARIANTS = [
  "invoice-ku",
  "quote-ku",
  "ku-tax",
  "standard-tax",
  "empty-item",
  "multi-page",
] as const;

export type Package02Variant = (typeof PACKAGE_02_VARIANTS)[number];

function taxedItem(
  position: number,
  descriptionDe: string,
  netAmount: number,
  taxRate: 0 | 7 | 19,
): DocumentItem {
  const taxAmount = Math.round((netAmount * taxRate) / 100);
  return {
    position,
    descriptionDe,
    amount: 1,
    unit: "Stk.",
    unitPrice: netAmount,
    totalAmount: netAmount,
    taxRate,
    taxAmount,
    grossAmount: netAmount + taxAmount,
  };
}

function package02Document(
  id: string,
  items: DocumentItem[],
  overrides: Partial<DocumentPreview> = {},
): DocumentPreview {
  const netAmount = items.reduce((sum, current) => sum + current.totalAmount, 0);
  const taxAmount = items.reduce((sum, current) => sum + current.taxAmount, 0);
  const taxGroups = ([0, 7, 19] as const)
    .map((rate) => {
      const matching = items.filter((entry) => entry.taxRate === rate);
      return {
        rate,
        netAmount: matching.reduce((sum, entry) => sum + entry.totalAmount, 0),
        taxAmount: matching.reduce((sum, entry) => sum + entry.taxAmount, 0),
      };
    })
    .filter((group) => group.netAmount > 0);

  return {
    ...documentWithItems(id, items),
    netAmount,
    taxAmount,
    totalAmount: netAmount + taxAmount,
    taxGroups,
    ...overrides,
  };
}

export function createPackage02Document(variant: Package02Variant): DocumentPreview {
  switch (variant) {
    case "quote-ku":
      return package02Document(
        variant,
        [taxedItem(1, "Angebot für Fassadenanstrich", 42_000, 0)],
        {
          docType: "quote",
          serviceDate: null,
          servicePeriodStart: "2026-09-01",
          servicePeriodEnd: "2026-09-15",
          validUntil: "2026-10-31",
        },
      );
    case "ku-tax":
      return package02Document(
        variant,
        [taxedItem(1, "Steuerpflichtige Sonderleistung", 10_000, 19)],
        { isKleinunternehmer: true, defaultTaxRate: 0 },
      );
    case "standard-tax":
      return package02Document(
        variant,
        [
          taxedItem(1, "Malerarbeiten", 20_000, 19),
          taxedItem(2, "Begünstigte Nebenleistung", 10_000, 7),
        ],
        { isKleinunternehmer: false, defaultTaxRate: 19 },
      );
    case "empty-item":
      return package02Document(
        variant,
        [{
          position: 1,
          descriptionDe: "",
          amount: 0,
          unit: "Stk.",
          unitPrice: 0,
          totalAmount: 0,
          taxRate: 0,
          taxAmount: 0,
          grossAmount: 0,
        }],
      );
    case "multi-page":
      return createMultiPageDocument();
    case "invoice-ku":
      return package02Document(
        variant,
        [taxedItem(1, "Innenanstrich für Jürgen Yılmaz", 48_000, 0)],
      );
  }
}

export const GLYPH_EVIDENCE = "Straße · Größe · Jürgen · Yılmaz · İstanbul · ş · ğ · ı";
