import { describe, expect, it } from "vitest";
import { buildPdfViewModel } from "./pdf-view-model";
import type {
  DocumentPreview,
  PreviewCompany,
  PreviewCustomer,
  PreviewItem,
} from "@/lib/documents/preview-types";

function company(overrides: Partial<PreviewCompany> = {}): PreviewCompany {
  return {
    name: "Yılmaz Malerbetrieb",
    legalForm: null,
    street: "Musterstraße",
    streetNo: "12",
    postcode: "10115",
    city: "Berlin",
    phone: "030 123456",
    mobile: null,
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
    ...overrides,
  };
}

function customer(overrides: Partial<PreviewCustomer> = {}): PreviewCustomer {
  return {
    name: "Familie Schneider",
    street: "Gartenweg",
    streetNo: "4",
    postcode: "10117",
    city: "Berlin",
    email: "schneider@example.de",
    phone: "0170 1234567",
    ...overrides,
  };
}

function preview(overrides: Partial<DocumentPreview> = {}): DocumentPreview {
  const items: PreviewItem[] = [
    { position: 1, descriptionDe: "Innenanstrich Wohnzimmer", amount: 1, unit: "psch", unitPrice: 48000, totalAmount: 48000 },
    { position: 2, descriptionDe: "Material (Farbe, Grundierung)", amount: 1, unit: "psch", unitPrice: 9500, totalAmount: 9500 },
  ];
  return {
    id: "doc-1",
    docType: "invoice",
    status: "finalized",
    documentNumber: "R-2026-041",
    issueDate: "2026-06-09",
    serviceDate: null,
    isKleinunternehmer: true,
    totalAmount: 57500,
    company: company(),
    customer: customer(),
    items,
    ...overrides,
  };
}

describe("buildPdfViewModel – harte Regeln", () => {
  it("berechnet die Summe strikt aus den Zeilen (Verkaufspreis)", () => {
    const vm = buildPdfViewModel(preview());
    // 48000 + 9500 = 57500 → 575,00 €
    expect(vm.totalText).toContain("575,00");
    expect(vm.rows).toHaveLength(2);
    expect(vm.rows[0].unitPriceText).toContain("480,00");
  });

  it("§19-Kleinunternehmer: Hinweis gesetzt, keine USt.-Aufschlüsselung im Model", () => {
    const vm = buildPdfViewModel(preview({ isKleinunternehmer: true }));
    expect(vm.showKleinunternehmerHinweis).toBe(true);
    expect(vm.kleinunternehmerHinweis).toBe(
      "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    );
    // Kein VAT/Steuer-Betragsfeld im View-Model.
    const serialized = JSON.stringify(vm).toLowerCase();
    expect(serialized).not.toContain("umsatzsteuer:");
    expect(vm).not.toHaveProperty("vatAmount");
    expect(vm).not.toHaveProperty("taxRate");
  });

  it("kein Kleinunternehmer → kein §19-Hinweis", () => {
    const vm = buildPdfViewModel(preview({ isKleinunternehmer: false }));
    expect(vm.showKleinunternehmerHinweis).toBe(false);
  });

  it("leakt niemals Einkaufspreis/Marge/Aufschlag", () => {
    const vm = buildPdfViewModel(preview());
    const serialized = JSON.stringify(vm).toLowerCase();
    expect(serialized).not.toContain("einkauf");
    expect(serialized).not.toContain("marge");
    expect(serialized).not.toContain("aufschlag");
    expect(serialized).not.toContain("purchase");
  });

  it("Empfänger stammt aus dem Snapshot (Name + Anschrift)", () => {
    const vm = buildPdfViewModel(preview());
    expect(vm.recipientName).toBe("Familie Schneider");
    expect(vm.recipientStreetLine).toBe("Gartenweg 4");
    expect(vm.recipientCityLine).toBe("10117 Berlin");
  });

  it("Rechnung mit Datum → Zahlungsziel; Angebot → keins", () => {
    const rechnung = buildPdfViewModel(preview({ docType: "invoice" }));
    expect(rechnung.paymentText).toContain("Zahlbar innerhalb von 14 Tagen");
    expect(rechnung.bankLine).toContain("IBAN");

    const angebot = buildPdfViewModel(preview({ docType: "offer" }));
    expect(angebot.paymentText).toBeNull();
    expect(angebot.sumLabel).toBe("Angebotssumme");
  });

  it("nutzt Steuernummer, sonst USt-IdNr.", () => {
    const mitSteuer = buildPdfViewModel(preview());
    expect(mitSteuer.steuerLabel).toBe("Steuernummer");
    expect(mitSteuer.steuerValue).toBe("12/345/67890");

    const mitUst = buildPdfViewModel(
      preview({ company: company({ steuernummer: null, ustId: "DE123456789" }) }),
    );
    expect(mitUst.steuerLabel).toBe("USt-IdNr.");
    expect(mitUst.steuerValue).toBe("DE123456789");
  });

  it("ist reproduzierbar: gleiche Eingabe → gleiches Model", () => {
    const p = preview();
    expect(buildPdfViewModel(p)).toEqual(buildPdfViewModel(p));
  });
});
