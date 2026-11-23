import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getCurrentCompanyId: vi.fn(),
  isDraftDocument: vi.fn(),
  getDraftTaxConfig: vi.fn(),
  setDraftDocumentTotals: vi.fn(),
  getNextItemPosition: vi.fn(),
  extractNachweisVarianten: vi.fn(),
  consumeCustomerAiQuota: vi.fn(),
  insertDocumentItems: vi.fn(),
  getDraftItems: vi.fn(),
  revalidatePath: vi.fn(),
  findDocumentsMentioningNachweis: vi.fn(),
}));

vi.mock("@/lib/repositories/nachweis-usages", () => ({
  findDocumentsMentioningNachweis: h.findDocumentsMentioningNachweis,
}));

vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/supabase/auth", () => ({ getCurrentCompanyId: h.getCurrentCompanyId }));
vi.mock("@/lib/integrations/anthropic/nachweis-extractor", () => ({
  NachweisExtractionError: class extends Error {},
  extractNachweisVarianten: h.extractNachweisVarianten,
  erkenneNachweisAusrichtung: vi.fn(),
}));
vi.mock("@/lib/repositories/ai-usage", () => ({ consumeCustomerAiQuota: h.consumeCustomerAiQuota }));
vi.mock("@/lib/repositories/document-drafts", () => ({
  isDraftDocument: h.isDraftDocument,
  getDraftTaxConfig: h.getDraftTaxConfig,
  setDraftDocumentTotals: h.setDraftDocumentTotals,
}));
vi.mock("@/lib/repositories/document-items", () => ({
  getNextItemPosition: h.getNextItemPosition,
  insertDocumentItems: h.insertDocumentItems,
  getDraftItems: h.getDraftItems,
}));

import { parseNachweisVariantenJson } from "@/lib/integrations/anthropic/nachweis-varianten-contract";
import { addNachweisItems, findNachweisUsage, readNachweis } from "./nachweis-actions";
import { freieKalendernotiz } from "./nachweis-frei-fixtures";
import { freieNachweisBereitschaft } from "./nachweis-frei";
import { nachweisImportZeilen, nachweisPreisSetzen, nachweisVorschlaege } from "./nachweis-positionen";
import { nachweisReviewStart } from "./nachweis-review-zustand";

afterEach(() => vi.restoreAllMocks());

const ZUSATZ = "lt. Stundennachweis Nr. 2026-040, 07.09.–12.09.2026";
const line = (amount: number, unitPrice: number) => ({
  kind: "free",
  descriptionDe: "633 636 611 Arbeit EG/1.OG",
  amount,
  unit: "Std.",
  unitPrice,
  additionalDescriptionDe: ZUSATZ,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.getCurrentCompanyId.mockResolvedValue("company-1");
  h.isDraftDocument.mockResolvedValue(true);
  h.getDraftTaxConfig.mockResolvedValue({ defaultTaxRate: 0 });
  h.getNextItemPosition.mockResolvedValue(3);
  h.insertDocumentItems.mockResolvedValue({});
  h.getDraftItems.mockResolvedValue([]);
});

async function leseSynthetischesPdf(nachweis: unknown) {
  h.consumeCustomerAiQuota.mockResolvedValueOnce({ quota: { allowed: true, remaining: 4, dailyLimit: 5 } });
  h.extractNachweisVarianten.mockImplementationOnce(async () => {
    const extraktion = parseNachweisVariantenJson(JSON.stringify({ nachweis }));
    if (!extraktion) throw new Error("invalid synthetic extraction");
    return extraktion;
  });
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const data = new FormData();
  data.append("file", new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" }), "synthetisch.pdf");
  const result = await readNachweis("document-1", data);
  expect(result.status).toBe("success");
  if (result.status !== "success") throw new Error("Review erwartet");
  expect(h.consumeCustomerAiQuota).toHaveBeenCalledOnce();
  return nachweisReviewStart(result.ergebnis, "company-1");
}

describe("Nachweis von PDF bis Repository", () => {
  it("hält freie Eingaben bei einer abgewiesenen Übernahme und schreibt den korrigierten Stand", async () => {
    const review = await leseSynthetischesPdf(freieKalendernotiz());
    if (review.variante !== "frei") throw new Error("Freie Notiz erwartet");
    expect(freieNachweisBereitschaft(review.ergebnis.nummer, review.zeilen).lines).toEqual([]);
    const zeilen = review.zeilen.map((zeile) => ({
      ...zeile, amount: zeile.amount ?? 1, unit: zeile.unit ?? "Stk.", unitPrice: 4350,
    }));
    zeilen[2].tageEingabe = "2026-11-31";
    expect(freieNachweisBereitschaft("", zeilen).lines).toEqual([]);
    zeilen[2].tageEingabe = "2026-11-09, 2026-11-13";
    const bereit = freieNachweisBereitschaft("", zeilen);
    expect(bereit.vollstaendig).toBe(true);

    h.insertDocumentItems.mockResolvedValueOnce({ error: "synthetic rejection" });
    await expect(addNachweisItems("document-1", bereit.lines)).resolves.toEqual({ error: "nachweisInsertFailed" });
    expect(h.setDraftDocumentTotals).not.toHaveBeenCalled();
    expect(freieNachweisBereitschaft("", zeilen).lines).toEqual(bereit.lines);
    await expect(addNachweisItems("document-1", bereit.lines)).resolves.toMatchObject({ totals: expect.anything() });

    expect(h.insertDocumentItems).toHaveBeenLastCalledWith("company-1", "document-1", [
      expect.objectContaining({ descriptionDe: "Wandöffnung schließen", position: 3, amount: 3, unitPrice: 4350 }),
      expect.objectContaining({ descriptionDe: "Fliesen verfugen", position: 4, amount: 2.5, unitPrice: 4350 }),
      expect.objectContaining({ descriptionDe: "Fugen abdichten", additionalDescriptionDe: "09.11.2026, 13.11.2026" }),
      expect.objectContaining({ descriptionDe: "Mauerstein 7,5 cm", unit: "Stk.", amount: 1 }),
      expect.objectContaining({ descriptionDe: "Anfahrt", unit: "Fahrt", amount: 3 }),
    ]);
    expect(JSON.stringify(bereit.lines)).not.toMatch(/mitarbeiter|kunde|projekt|Nr\.|6,5 Std/);
  });

  it("gruppiert Tabellenstunden und lässt Mitarbeiterdaten im Review", async () => {
    const tag = "2026-11-09";
    const review = await leseSynthetischesPdf({
      variante: "tabelle", ausrichtung: "aufrecht", nachweis_nummer: "SYN-01", projekt: "",
      tage: [{ datum: tag, gesamt_laut_blatt: 6 }], material: [], gesamt_summe_laut_blatt: 6,
      arbeitsleistung: "Tore einstellen",
      mitarbeiter: [
        { name: "KRAFT A", eintraege: [{ datum: tag, stunden: 2, zelle: "zahl", unsicher: true }] },
        { name: "KRAFT B", eintraege: [{ datum: tag, stunden: 4, zelle: "zahl", unsicher: false },
          { datum: tag, stunden: 7, zelle: "durchgestrichen", unsicher: false }] },
      ],
    });
    if (review.variante !== "tabelle") throw new Error("Tabelle erwartet");
    expect(review.zeilen[0]).toMatchObject({ name: "KRAFT A", unsicher: true });
    const zeilen = nachweisPreisSetzen(review.zeilen, review.zeilen[0].key, 5000);
    const { lines, vollstaendig } = nachweisImportZeilen(nachweisVorschlaege({ ...review, kopf: review.ergebnis, zeilen }));
    expect(vollstaendig).toBe(true);
    expect(lines).toEqual([{
      kind: "free", descriptionDe: "Tore einstellen", unit: "Std.", amount: 6, unitPrice: 5000,
      additionalDescriptionDe: "lt. Stundennachweis Nr. SYN-01, 09.11.2026",
    }]);
    await expect(addNachweisItems("document-1", lines)).resolves.toMatchObject({ totals: expect.anything() });
    expect(h.insertDocumentItems).toHaveBeenCalledExactlyOnceWith("company-1", "document-1", [
      expect.objectContaining({ amount: 6, unitPrice: 5000, totalAmount: 30_000 }),
    ]);
  });
});

describe("readNachweis", () => {
  it("prüft Anmeldung und Entwurfsstatus vor Kontingent und Provider", async () => {
    h.getCurrentCompanyId.mockResolvedValueOnce(null);
    h.isDraftDocument.mockResolvedValueOnce(false);
    await expect(readNachweis("document-1", new FormData())).resolves.toMatchObject({ error: "not_authenticated" });
    expect(h.isDraftDocument).not.toHaveBeenCalled();
    await expect(readNachweis("document-1", new FormData())).resolves.toMatchObject({ error: "draft_not_found" });
    expect(h.consumeCustomerAiQuota).not.toHaveBeenCalled();
    expect(h.extractNachweisVarianten).not.toHaveBeenCalled();
  });
});

describe("addNachweisItems", () => {
  it("legt alle Zeilen in einem Insert ab der nächsten freien Position an", async () => {
    const result = await addNachweisItems("document-1", [line(128, 4800), line(52, 3800)]);

    expect("error" in result).toBe(false);
    expect(h.insertDocumentItems).toHaveBeenCalledOnce();
    const [, , rows] = h.insertDocumentItems.mock.calls[0];
    expect(rows).toEqual([
      expect.objectContaining({
        serviceId: null,
        position: 3,
        descriptionDe: "633 636 611 Arbeit EG/1.OG",
        additionalDescriptionDe: ZUSATZ,
        amount: 128,
        unitPrice: 4800,
        totalAmount: 614_400,
      }),
      expect.objectContaining({ position: 4, amount: 52, unitPrice: 3800, totalAmount: 197_600 }),
    ]);
    expect(h.setDraftDocumentTotals).toHaveBeenCalledOnce();
  });

  it.each([0, 7, 19])("hängt getrennte freie Zeilen mit %i %% Dokumentsteuer an", async (taxRate) => {
    h.getDraftTaxConfig.mockResolvedValueOnce({ defaultTaxRate: taxRate });
    const lines = [
      { ...line(2.53, 4000), descriptionDe: "Fliesen verfugen" },
      { ...line(1, 4000), descriptionDe: "Wand schließen" },
      { ...line(8.04, 1250), descriptionDe: "Fugenmaterial", unit: "kg" },
      { ...line(3, 1500), descriptionDe: "Anfahrt", unit: "Fahrt" },
    ];
    const netto = [10_120, 4_000, 10_050, 4_500];
    const steuer = netto.map((wert) => Math.round(wert * taxRate / 100));
    const items = netto.map((wert, index) => ({
      id: `item-${index}`,
      totalAmount: wert,
      taxRate,
      taxAmount: steuer[index],
      grossAmount: wert + steuer[index],
    }));
    h.getDraftItems.mockResolvedValueOnce(items);

    const result = await addNachweisItems("document-1", lines);
    const netAmount = netto.reduce((a, b) => a + b, 0);
    const taxAmount = steuer.reduce((a, b) => a + b, 0);
    const totals = { netAmount, taxAmount, grossAmount: netAmount + taxAmount };
    expect(h.insertDocumentItems).toHaveBeenCalledExactlyOnceWith("company-1", "document-1",
      lines.map((zeile, index) => expect.objectContaining({
        position: index + 3, descriptionDe: zeile.descriptionDe, unit: zeile.unit,
        amount: zeile.amount, unitPrice: zeile.unitPrice,
        serviceId: null, totalAmount: netto[index], taxRate, taxAmount: steuer[index],
        grossAmount: netto[index] + steuer[index], taxRateOverridden: false,
      })),
    );
    expect(result).toMatchObject({ items, totals });
    expect(h.setDraftDocumentTotals).toHaveBeenCalledExactlyOnceWith(
      "company-1", "document-1", expect.objectContaining(totals), true,
    );
  });

  it("behandelt eine abgebrochene Insert-Antwort oder fehlende Summenbestätigung als unklar", async () => {
    h.insertDocumentItems.mockResolvedValueOnce({ error: "transport", outcomeUnknown: true });
    await expect(addNachweisItems("document-1", [line(1, 100)])).resolves.toEqual({ error: "nachweisOutcomeUnknown" });
    expect(h.setDraftDocumentTotals).not.toHaveBeenCalled();
    h.setDraftDocumentTotals.mockRejectedValueOnce(new Error("synthetic update error"));
    await expect(addNachweisItems("document-1", [line(1, 100)])).resolves.toEqual({ error: "nachweisOutcomeUnknown" });
  });

  it("schreibt ohne nächsten sicheren Index und ohne Anmeldung keine Zeilen", async () => {
    h.getNextItemPosition.mockRejectedValueOnce(new Error("synthetic read error"));
    await expect(addNachweisItems("document-1", [line(1, 100)])).resolves.toEqual({ error: "positionUnavailable" });
    h.getCurrentCompanyId.mockResolvedValueOnce(null);
    await expect(addNachweisItems("document-1", [line(1, 100)])).resolves.toEqual({ error: "notAuthenticated" });
    expect(h.insertDocumentItems).not.toHaveBeenCalled();
  });

  it("verwirft ungültige Zeilen ohne zu schreiben", async () => {
    await expect(addNachweisItems("document-1", [line(1, 4800), line(1, 0)])).resolves.toEqual({
      error: "linesInvalid",
    });
    expect(h.insertDocumentItems).not.toHaveBeenCalled();
  });

  it("schreibt nicht in festgeschriebene Dokumente", async () => {
    h.isDraftDocument.mockResolvedValue(false);
    await expect(addNachweisItems("document-1", [line(1, 4800)])).resolves.toEqual({
      error: "draftNotFound",
    });
    expect(h.insertDocumentItems).not.toHaveBeenCalled();
  });
});

describe("findNachweisUsage", () => {
  const usage = (documentId: string, zusatz: string, extra: Record<string, unknown> = {}) => ({
    documentId,
    additionalDescriptionDe: zusatz,
    docType: "invoice",
    documentNumber: "R-2026-041",
    status: "finalized",
    ...extra,
  });

  it("meldet Dokumente mit genau dieser Nummer, ohne Stornos und Doppelte", async () => {
    h.findDocumentsMentioningNachweis.mockResolvedValue([
      usage("doc-a", "lt. Arbeitsnachweis Nr. 2026-040, 09.11.2026"),
      usage("doc-a", ZUSATZ),
      usage("doc-b", "lt. Stundennachweis Nr. 2026-0401, 07.09.–12.09.2026"),
      usage("doc-c", ZUSATZ, { status: "cancelled" }),
      usage("document-1", ZUSATZ, { status: "draft", documentNumber: null, docType: "quote" }),
    ]);

    await expect(findNachweisUsage("document-1", " 2026-040 ")).resolves.toEqual([
      { documentId: "doc-a", docType: "invoice", documentNumber: "R-2026-041", sameDocument: false },
      { documentId: "document-1", docType: "quote", documentNumber: null, sameDocument: true },
    ]);
    expect(h.findDocumentsMentioningNachweis).toHaveBeenCalledWith(
      "company-1",
      "%lt. %nachweis Nr. 2026-040%",
    );
  });

  it("sucht ohne Nummer gar nicht erst", async () => {
    await expect(findNachweisUsage("document-1", "  ")).resolves.toEqual([]);
    expect(h.findDocumentsMentioningNachweis).not.toHaveBeenCalled();
  });
});
