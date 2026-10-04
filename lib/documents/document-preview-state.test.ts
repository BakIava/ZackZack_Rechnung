import { describe, expect, it } from "vitest";
import {
  EMPTY_TEMPORARY_DOCUMENT_ITEM,
  FREE_TEMPORARY_DOCUMENT_ITEM,
  FREMD_TEMPORARY_DOCUMENT_ITEM,
  toDocumentItems,
  withEditedDocumentItem,
  withPersistedDocumentItems,
  withTemporaryDocumentItem,
} from "./document-preview-state";
import type { DocumentPreview, DraftItem } from "@/types/document";

const draftItem: DraftItem = {
  id: "item-1",
  serviceId: null,
  position: 1,
  descriptionDe: "Gerüststellung",
  additionalDescriptionDe: "Montage und Abbau\ninklusive Transport",
  amount: 1,
  unit: "Pauschale",
  unitPrice: 12_500,
  totalAmount: 12_500,
  taxRate: 0,
  taxRateOverridden: false,
  taxAmount: 0,
  grossAmount: 12_500,
  purchasePrice: 10_000,
  surcharge: 2_500,
  surchargeType: "fixed",
};

function preview(): DocumentPreview {
  return {
    id: "doc-1",
    docType: "invoice",
    status: "draft",
    documentNumber: null,
    issueDate: "2026-09-30",
    serviceDate: null,
    servicePeriodStart: null,
    servicePeriodEnd: null,
    validUntil: null,
    isKleinunternehmer: true,
    defaultTaxRate: 0,
    totalAmount: 0,
    netAmount: 0,
    taxAmount: 0,
    taxGroups: [],
    company: {
      name: "Yılmaz Malerbetrieb",
      legalForm: null,
      street: "Musterstraße",
      streetNo: "1",
      postcode: "10115",
      city: "Berlin",
      phone: null,
      mobile: null,
      fax: null,
      email: null,
      director: null,
      steuernummer: "12/345/67890",
      ustId: null,
      bankName: null,
      iban: null,
      bic: null,
      accountHolder: null,
      logoUrl: null,
      paymentDays: 14,
    },
    customer: null,
    items: [],
    convertedInvoiceId: null,
    basedOnQuoteId: null,
    template: { id: "standard", version: 1 },
  };
}

describe("document preview state", () => {
  it("projiziert DraftItem ohne interne Fremdleistungsfelder", () => {
    const items = toDocumentItems([draftItem]);
    expect(items[0].additionalDescriptionDe).toBe(draftItem.additionalDescriptionDe);
    expect(items[0]).not.toHaveProperty("id");
    expect(items[0]).not.toHaveProperty("purchasePrice");
    expect(items[0]).not.toHaveProperty("surcharge");
    expect(JSON.stringify(items)).not.toMatch(/purchase|surcharge|margin/i);
  });

  it("übernimmt nur erfolgreich zurückgegebene Positionen und Summen", () => {
    const initial = preview();
    const updated = withPersistedDocumentItems(initial, [draftItem], {
      netAmount: 12_500,
      taxAmount: 0,
      grossAmount: 12_500,
      taxGroups: [{ rate: 0, netAmount: 12_500, taxAmount: 0 }],
    });

    expect(initial.items).toEqual([]);
    expect(updated.items).toHaveLength(1);
    expect(updated.totalAmount).toBe(12_500);
    expect(updated.items[0].descriptionDe).toBe("Gerüststellung");
    expect(updated.items[0].additionalDescriptionDe).toBe(draftItem.additionalDescriptionDe);
  });

  it("hängt den allgemeinen leeren Startzustand lokal als Position n+1 an", () => {
    const initial = withPersistedDocumentItems(preview(), [draftItem], {
      netAmount: 12_500,
      taxAmount: 0,
      grossAmount: 12_500,
      taxGroups: [{ rate: 0, netAmount: 12_500, taxAmount: 0 }],
    });
    const updated = withTemporaryDocumentItem(initial, EMPTY_TEMPORARY_DOCUMENT_ITEM);

    expect(initial.items).toHaveLength(1);
    expect(updated.items).toHaveLength(2);
    expect(updated.items[1]).toMatchObject({
      position: 2,
      descriptionDe: "",
      amount: 0,
      unit: "",
      unitPrice: 0,
      totalAmount: 0,
      taxRate: 0,
    });
    expect(updated.totalAmount).toBe(12_500);
  });

  it("projiziert die unveränderten Formularstandards ohne interne Felder", () => {
    expect(FREE_TEMPORARY_DOCUMENT_ITEM).toEqual({
      descriptionDe: "",
      amount: 1,
      unit: "m²",
      unitPrice: 0,
    });
    expect(FREMD_TEMPORARY_DOCUMENT_ITEM).toEqual({
      descriptionDe: "",
      amount: 1,
      unit: "Pauschale",
      unitPrice: 0,
    });
    expect(JSON.stringify(FREMD_TEMPORARY_DOCUMENT_ITEM)).not.toMatch(
      /purchase|surcharge|markup|margin/i,
    );
  });

  it("berechnet den sichtbaren Verkaufspreis mit dem Dokument-Steuersatz", () => {
    const initial = { ...preview(), isKleinunternehmer: false, defaultTaxRate: 19 as const };
    const updated = withTemporaryDocumentItem(initial, {
      descriptionDe: "Gerüststellung",
      amount: 2,
      unit: "Pauschale",
      unitPrice: 12_500,
    });

    expect(updated.items[0]).toMatchObject({
      totalAmount: 25_000,
      taxRate: 19,
      taxAmount: 4_750,
      grossAmount: 29_750,
    });
    expect(updated).toMatchObject({
      netAmount: 25_000,
      taxAmount: 4_750,
      totalAmount: 29_750,
    });
  });

  it("berechnet eine lokale Bearbeitung mit den kanonischen Steuerfunktionen neu", () => {
    const initial = withPersistedDocumentItems(preview(), [draftItem], {
      netAmount: 12_500,
      taxAmount: 0,
      grossAmount: 12_500,
      taxGroups: [{ rate: 0, netAmount: 12_500, taxAmount: 0 }],
    });
    const updated = withEditedDocumentItem(initial, draftItem, {
      descriptionDe: "Gerüst – Vorschau",
      taxRate: 19,
      surcharge: 5_000,
      surchargeType: "fixed",
    });

    expect(updated.items[0]).toEqual({
      position: 1,
      descriptionDe: "Gerüst – Vorschau",
      additionalDescriptionDe: draftItem.additionalDescriptionDe,
      amount: 1,
      unit: "Pauschale",
      unitPrice: 15_000,
      totalAmount: 15_000,
      taxRate: 19,
      taxAmount: 2_850,
      grossAmount: 17_850,
    });
    expect(updated.taxGroups).toEqual([{ rate: 19, netAmount: 15_000, taxAmount: 2_850 }]);
    expect(JSON.stringify(updated)).not.toMatch(/purchase|surcharge|markup|margin/i);
  });

  it("zeigt mehrzeilige Beschreibungsänderungen live ohne Namens- oder Preisänderung", () => {
    const initial = { ...preview(), items: toDocumentItems([draftItem]) };
    const description = "Erster Schritt\n\nZweiter Schritt";

    const updated = withEditedDocumentItem(initial, draftItem, {
      additionalDescriptionDe: description,
    });

    expect(updated.items[0]).toMatchObject({
      descriptionDe: draftItem.descriptionDe,
      additionalDescriptionDe: description,
      unitPrice: draftItem.unitPrice,
      totalAmount: draftItem.totalAmount,
    });
    expect(JSON.stringify(updated)).not.toMatch(/purchase|surcharge|markup|margin/i);
  });

  it("entfernt die Beschreibung live bei Leerzeichen oder null", () => {
    const initial = { ...preview(), items: toDocumentItems([draftItem]) };

    expect(withEditedDocumentItem(initial, draftItem, {
      additionalDescriptionDe: " \n\t ",
    }).items[0].additionalDescriptionDe).toBeNull();
    expect(withEditedDocumentItem(initial, draftItem, {
      additionalDescriptionDe: null,
    }).items[0].additionalDescriptionDe).toBeNull();
  });

  it("lässt den gespeicherten Zustand bei ungültiger Zwischenmenge unangetastet", () => {
    const initial = withPersistedDocumentItems(preview(), [draftItem], {
      netAmount: 12_500,
      taxAmount: 0,
      grossAmount: 12_500,
      taxGroups: [{ rate: 0, netAmount: 12_500, taxAmount: 0 }],
    });

    expect(withEditedDocumentItem(initial, draftItem, { amount: 0 })).toBe(initial);
  });
});
