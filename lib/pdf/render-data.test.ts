import { describe, expect, it } from "vitest";
import { calculateDocumentTotals, calculateLineAmounts } from "@/lib/documents/tax";
import type { PreviewCompany } from "@/types/company";
import type { DocumentItem, DocumentPreview, TaxRate } from "@/types/document";
import { buildDocumentRenderData } from "./render-data";

const company: PreviewCompany = {
  name: "Yılmaz Malerbetrieb",
  legalForm: null,
  street: "Musterstraße",
  streetNo: "12",
  postcode: "10115",
  city: "Berlin",
  phone: "030 123456",
  mobile: null,
  fax: null,
  email: "info@yilmaz-maler.de",
  director: "Ahmet Yılmaz",
  steuernummer: "12/345/67890",
  ustId: null,
  bankName: "Sparkasse Berlin",
  iban: "DE12 3456 7890 1234 5678 90",
  bic: null,
  accountHolder: null,
  logoUrl: null,
  paymentDays: 14,
};

/** Position wie im Produktionsweg: Zeilenwerte aus der zentralen Steuerlogik. */
function line(
  position: number,
  descriptionDe: string,
  amount: number,
  unit: string,
  unitPrice: number,
  taxRate: TaxRate,
): DocumentItem {
  const amounts = calculateLineAmounts(unitPrice, amount, taxRate);
  return {
    position,
    descriptionDe,
    additionalDescriptionDe: null,
    amount,
    unit,
    unitPrice,
    totalAmount: amounts.netAmount,
    taxRate,
    taxAmount: amounts.taxAmount,
    grossAmount: amounts.grossAmount,
  };
}

/** Preview mit Summen wie im Repository (calculateDocumentTotals über die Zeilen). */
function preview(items: DocumentItem[], overrides: Partial<DocumentPreview> = {}): DocumentPreview {
  const totals = calculateDocumentTotals(items.map((item) => ({
    netAmount: item.totalAmount,
    taxRate: item.taxRate,
    taxAmount: item.taxAmount,
    grossAmount: item.grossAmount,
  })));
  return {
    id: "doc-1",
    docType: "invoice",
    status: "finalized",
    documentNumber: "R-2026-041",
    issueDate: "2026-06-09",
    serviceDate: null,
    servicePeriodStart: null,
    servicePeriodEnd: null,
    validUntil: null,
    isKleinunternehmer: true,
    defaultTaxRate: 0,
    netAmount: totals.netAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.grossAmount,
    taxGroups: totals.taxGroups,
    company,
    customer: {
      customer_type: "private",
      firstname: "Familie",
      lastname: "Schneider",
      company_name: null,
      street: "Gartenweg",
      streetNo: "4",
      postcode: "10117",
      city: "Berlin",
      email: null,
      phone: null,
    },
    items,
    convertedInvoiceId: null,
    basedOnQuoteId: null,
    template: { id: "standard", version: 1 },
    ...overrides,
  };
}

const NBSP_EURO = / €$/;

describe("buildDocumentRenderData – Rechnungsberechnung unverändert", () => {
  it("§19-Rechnung: Summen aus den Zeilen, kein Steuerausweis, §19-Hinweis, Zahlungsziel", () => {
    const data = buildDocumentRenderData(preview([
      line(1, "Innenanstrich Wohnzimmer", 1, "psch", 48_000, 0),
      line(2, "Material", 2.5, "Eimer", 3_800, 0),
    ]), null);

    expect(data.totals).toMatchObject({
      netAmount: 57_500,
      taxAmount: 0,
      grossAmount: 57_500,
      taxGroups: [{ rate: 0, netAmount: 57_500, taxAmount: 0 }],
    });
    expect(data.totals.grossAmountText).toMatch(/^575,00/);
    expect(data.totals.grossAmountText).toMatch(NBSP_EURO);
    expect(data.items[1]).toMatchObject({
      quantityText: "2.5 Eimer",
      totalAmount: 9_500,
      taxRateText: "0 %",
    });
    expect(data.tax).toEqual({
      isKleinunternehmer: true,
      defaultTaxRate: 0,
      showTaxDetails: false,
      showKleinunternehmerHinweis: true,
      kleinunternehmerHinweis: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    });
    expect(data.payment).toMatchObject({
      paymentDays: 14,
      dueDate: "2026-06-23",
      dueDateText: "23.06.2026",
      termsText:
        "Zahlbar innerhalb von 14 Tagen (bis 23.06.2026) ohne Abzug auf das unten genannte Konto.",
    });
    expect(data.document).toMatchObject({
      isInvoice: true,
      title: "Rechnung R-2026-041",
      numberLabel: "Rechnungs-Nr.",
      recipientLabel: "Rechnungsempfänger",
      sumLabel: "Rechnungsbetrag",
      closingText: "Vielen Dank für Ihren Auftrag.",
    });
  });

  it("Regelbesteuerung mit gemischten Sätzen: zeilenweise gerundet, Gruppen absteigend", () => {
    const data = buildDocumentRenderData(preview([
      line(1, "Fliesen verlegen", 24.5, "m²", 4_500, 19),
      line(2, "Fachbuch", 1, "Stk.", 2_990, 7),
      line(3, "Entsorgung", 1, "psch", 5_000, 0),
    ], { isKleinunternehmer: false, defaultTaxRate: 19 }), null);

    // 24,5 × 45,00 = 1.102,50 → 19 % = 209,475 → 209,48 (Zeilenrundung)
    expect(data.items[0]).toMatchObject({ totalAmount: 110_250, taxAmount: 20_948, grossAmount: 131_198 });
    expect(data.totals).toMatchObject({ netAmount: 118_240, taxAmount: 21_157, grossAmount: 139_397 });
    expect(data.totals.taxGroups.map(({ rate, taxAmount, label }) => ({ rate, taxAmount, label }))).toEqual([
      { rate: 19, taxAmount: 20_948, label: "Umsatzsteuer 19 %" },
      { rate: 7, taxAmount: 209, label: "Umsatzsteuer 7 %" },
      { rate: 0, taxAmount: 0, label: "Umsatzsteuer 0 %" },
    ]);
    expect(data.totals.grossAmountText).toMatch(/^1\.393,97/);
    expect(data.tax.showTaxDetails).toBe(true);
    expect(data.tax.showKleinunternehmerHinweis).toBe(false);
  });

  it("§19 mit ausdrücklicher 19-%-Position weist Steuer aus und unterdrückt den §19-Hinweis", () => {
    const data = buildDocumentRenderData(preview([
      line(1, "Innenanstrich", 1, "psch", 48_000, 0),
      line(2, "Gerüst", 1, "psch", 25_000, 19),
    ]), null);
    expect(data.tax.showTaxDetails).toBe(true);
    expect(data.tax.showKleinunternehmerHinweis).toBe(false);
    expect(data.totals).toMatchObject({ netAmount: 73_000, taxAmount: 4_750, grossAmount: 77_750 });
  });

  it("übernimmt Summen 1:1 aus dem Snapshot und rechnet nie selbst nach", () => {
    const base = preview([line(1, "Anfahrt", 1, "psch", 3_500, 0)]);
    const data = buildDocumentRenderData({ ...base, netAmount: 1, taxAmount: 2, totalAmount: 3 }, null);
    expect(data.totals).toMatchObject({ netAmount: 1, taxAmount: 2, grossAmount: 3 });
  });
});

describe("buildDocumentRenderData – Angebotsberechnung unverändert", () => {
  it("Angebot: gleiche Summenlogik, Gültigkeit statt Zahlungsziel", () => {
    const data = buildDocumentRenderData(preview(
      [line(1, "Elektroinstallation Küche", 1, "psch", 120_000, 19)],
      {
        docType: "quote",
        documentNumber: "A-2026-088",
        validUntil: "2026-07-09",
        isKleinunternehmer: false,
        defaultTaxRate: 19,
      },
    ), null);

    expect(data.totals).toMatchObject({ netAmount: 120_000, taxAmount: 22_800, grossAmount: 142_800 });
    expect(data.dates).toMatchObject({ validUntil: "2026-07-09", validUntilText: "09.07.2026" });
    expect(data.payment).toMatchObject({ dueDate: null, dueDateText: null, termsText: null });
    expect(data.document).toMatchObject({
      isInvoice: false,
      title: "Angebot A-2026-088",
      numberLabel: "Angebots-Nr.",
      recipientLabel: "Angebot für",
      sumLabel: "Angebotssumme",
      closingText: "Wir freuen uns auf Ihren Auftrag.",
    });
  });

  it("§19-Angebot zeigt den §19-Hinweis wie eine Rechnung", () => {
    const data = buildDocumentRenderData(preview(
      [line(1, "Fassadenanstrich", 120, "m²", 1_850, 0)],
      { docType: "quote", documentNumber: "A-2026-089", validUntil: "2026-07-09" },
    ), null);
    expect(data.totals.grossAmount).toBe(222_000);
    expect(data.tax.showKleinunternehmerHinweis).toBe(true);
  });

  it("eine Rechnung zeigt nie ein Gültigkeitsdatum", () => {
    const data = buildDocumentRenderData(
      preview([line(1, "Anfahrt", 1, "psch", 3_500, 0)], { validUntil: "2026-07-09" }),
      null,
    );
    expect(data.dates.validUntil).toBeNull();
    expect(data.dates.validUntilText).toBeNull();
  });
});

describe("buildDocumentRenderData – vorlagenunabhängig", () => {
  const items = [line(1, "Innenanstrich", 1, "psch", 48_000, 0)];

  it("hängt nicht von der gewählten Vorlage ab und enthält keine Vorlagenauswahl", () => {
    const standard = buildDocumentRenderData(preview(items), null);
    const other = buildDocumentRenderData(
      preview(items, { template: { id: "erhan-excel", version: 7 } }),
      null,
    );
    expect(other).toEqual(standard);
    expect(JSON.stringify(standard)).not.toMatch(/standard|ths-classic|erhan-excel|template/i);
  });

  it("enthält nie Einkaufspreis, Aufschlag oder Marge", () => {
    const serialized = JSON.stringify(buildDocumentRenderData(preview(items), null)).toLowerCase();
    expect(serialized).not.toMatch(/purchase|surcharge|einkauf|marge|aufschlag/);
  });

  it("Entwurf: Platzhalter statt Nummer, Empfänger leer, Logo-Monogramm aus der Firma", () => {
    const data = buildDocumentRenderData(
      preview(items, { status: "draft", documentNumber: null, customer: null }),
      null,
    );
    expect(data.document).toMatchObject({ numberText: "Entwurf", isDraftNumber: true, title: "Rechnung" });
    expect(data.customer).toEqual({
      snapshot: null, name: "", streetLine: "", cityLine: "", contactPersonName: null, phone: null,
    });
    expect(data.logo).toEqual({ image: null, monogram: "YM", initials: "YM" });
  });

  it("liefert Beträge und Sätze zusätzlich ohne Währungszeichen", () => {
    const data = buildDocumentRenderData(preview([
      line(1, "Fliesen verlegen", 24.5, "m²", 4_500, 19),
      line(2, "Fachbuch", 1, "Stk.", 2_990, 7),
    ], { isKleinunternehmer: false, defaultTaxRate: 19 }), null);
    expect(data.items[0]).toMatchObject({
      unitPriceDecimalText: "45,00",
      totalAmountDecimalText: "1.102,50",
      amountDecimalText: "24,50",
    });
    expect(data.items[1].amountDecimalText).toBe("1,00");
    expect(data.totals).toMatchObject({
      netAmountDecimalText: "1.132,40",
      taxAmountDecimalText: "211,57",
      grossAmountDecimalText: "1.343,97",
    });
    expect(data.totals.taxGroups.map((group) => [group.rateDecimalText, group.taxAmountDecimalText]))
      .toEqual([["19,00", "209,48"], ["7,00", "2,09"]]);
  });

  it("bildet die Wortmarke aus allen Namenswörtern", () => {
    const initials = (name: string) =>
      buildDocumentRenderData(preview(items, { company: { ...company, name } }), null).logo.initials;
    expect(initials("Technik Hilfe Sander")).toBe("THS");
    expect(initials("Yılmaz Malerbetrieb")).toBe("YM");
    expect(initials("Schmidt & Söhne Bau")).toBe("SSB");
    expect(initials("Fliesenmeister")).toBe("FL");
    expect(initials("   ")).toBe("—");
  });

  it("übernimmt die Faxnummer der Firma", () => {
    const withFax = preview(items, { company: { ...company, fax: "06132-1234568" } });
    expect(buildDocumentRenderData(withFax, null).company.fax).toBe("06132-1234568");
    expect(buildDocumentRenderData(preview(items), null).company.fax).toBeNull();
  });

  it("Ansprechpartner nur bei Firmenkunden, Telefon bei allen Kunden", () => {
    const business = (overrides: Partial<NonNullable<DocumentPreview["customer"]>>) =>
      buildDocumentRenderData(preview(items, {
        customer: {
          customer_type: "business", firstname: "Muammer", lastname: "Şahin",
          company_name: "Normtec GmbH", street: null, streetNo: null, postcode: null,
          city: null, email: null, phone: " 06131 617030 ", ...overrides,
        },
      }), null).customer;

    expect(business({})).toMatchObject({ contactPersonName: "Muammer Şahin", phone: "06131 617030" });
    expect(business({ firstname: null }).contactPersonName).toBe("Şahin");
    expect(business({ firstname: " ", lastname: null }).contactPersonName).toBeNull();
    expect(business({ phone: "  " }).phone).toBeNull();

    const privat = buildDocumentRenderData(preview(items, {
      customer: { ...preview(items).customer!, phone: "0171 2345678" },
    }), null).customer;
    expect(privat).toMatchObject({ contactPersonName: null, phone: "0171 2345678" });
    expect(buildDocumentRenderData(preview(items), null).customer.phone).toBeNull();
  });

  it("reicht das serverseitig vorbereitete Logo unverändert durch", () => {
    const logo = { dataUrl: "data:image/png;base64,AAAA" };
    expect(buildDocumentRenderData(preview(items), logo).logo.image).toBe(logo);
  });

  it("ist deterministisch", () => {
    const p = preview(items);
    expect(buildDocumentRenderData(p, null)).toEqual(buildDocumentRenderData(p, null));
  });
});
