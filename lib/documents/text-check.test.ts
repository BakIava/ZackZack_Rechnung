import { describe, expect, it } from "vitest";
import type { DraftItem } from "@/types/document";
import {
  MAX_TEXT_CHECK_POSITIONEN,
  bewerteTextPruefung,
  parseTextUebernahme,
  pruefbareTexte,
  textCheckAnfrage,
} from "./text-check";

type Item = Pick<DraftItem, "id" | "position" | "serviceId" | "descriptionDe" | "additionalDescriptionDe">;

function item(position: number, descriptionDe: string, extra: Partial<Item> = {}): Item {
  return {
    id: `00000000-0000-0000-0000-${String(position).padStart(12, "0")}`,
    position,
    serviceId: null,
    descriptionDe,
    additionalDescriptionDe: null,
    ...extra,
  };
}

describe("pruefbareTexte", () => {
  it("prüft freie Positionen und Fremdleistungen, aber keine Katalog-Positionen", () => {
    const { eingaben, uebersprungen } = pruefbareTexte([
      item(1, "fliesen verlegn"),
      item(2, "Malerarbeiten", { serviceId: "katalog-1" }),
      item(3, "geruest", { additionalDescriptionDe: "inkl auf und abbau" }),
    ]);
    expect(uebersprungen).toBe(0);
    expect(textCheckAnfrage(eingaben)).toEqual([
      { id: "p1", bezeichnung: "fliesen verlegn", zusatztext: null },
      { id: "p2", bezeichnung: "geruest", zusatztext: "inkl auf und abbau" },
    ]);
    expect(eingaben.map((eingabe) => eingabe.position)).toEqual([1, 3]);
  });

  it("lässt zu kurze oder zu lange Felder weg und Positionen ohne prüfbares Feld aus", () => {
    const { eingaben } = pruefbareTexte([
      item(1, "x"),
      item(2, "F".repeat(201), { additionalDescriptionDe: "mit abdecken" }),
    ]);
    expect(textCheckAnfrage(eingaben)).toEqual([{ id: "p1", bezeichnung: null, zusatztext: "mit abdecken" }]);
  });

  it("prüft höchstens 30 Positionen und meldet den Rest", () => {
    const items = Array.from({ length: MAX_TEXT_CHECK_POSITIONEN + 3 }, (_, index) => item(index + 1, `text ${index}`));
    const { eingaben, uebersprungen } = pruefbareTexte(items);
    expect(eingaben).toHaveLength(MAX_TEXT_CHECK_POSITIONEN);
    expect(uebersprungen).toBe(3);
  });
});

describe("bewerteTextPruefung", () => {
  const { eingaben } = pruefbareTexte([
    item(1, "fliesen verlegn bad 12qm"),
    item(2, "Silikonfugen erneuern", { additionalDescriptionDe: "inkl entfernen alter fugen" }),
    item(3, "wand streichen 2x"),
    item(4, "banyo fayans"),
  ]);

  it("liefert nur geänderte, abgesicherte Felder mit altem und neuem Text", () => {
    const result = bewerteTextPruefung(eingaben, [
      { id: "p1", deutsch: true, bezeichnung: "Fliesen verlegen im Bad, 12 m²", zusatztext: null },
      { id: "p2", deutsch: true, bezeichnung: "Silikonfugen erneuern", zusatztext: "Inkl. Entfernen der alten Fugen" },
      { id: "p3", deutsch: true, bezeichnung: "Wand streichen, 3-mal", zusatztext: null },
      { id: "p4", deutsch: false, bezeichnung: "banyo fayans", zusatztext: null },
    ], 0);
    expect(result).toEqual({
      status: "vorschlaege",
      uebersprungen: 0,
      vorschlaege: [
        {
          itemId: eingaben[0].itemId, position: 1, zusatztext: null,
          bezeichnung: { alt: "fliesen verlegn bad 12qm", neu: "Fliesen verlegen im Bad, 12 m²" },
        },
        {
          itemId: eingaben[1].itemId, position: 2, bezeichnung: null,
          zusatztext: { alt: "inkl entfernen alter fugen", neu: "Inkl. Entfernen der alten Fugen" },
        },
      ],
    });
  });

  it("meldet „alles gut“, wenn nichts zu verbessern ist oder Antworten fehlen", () => {
    expect(bewerteTextPruefung(eingaben, [
      { id: "p2", deutsch: true, bezeichnung: "Silikonfugen erneuern", zusatztext: "inkl entfernen alter fugen" },
    ], 2)).toEqual({ status: "alles_gut", uebersprungen: 2 });
  });
});

describe("parseTextUebernahme", () => {
  const id = "00000000-0000-0000-0000-00000000000A";

  it("übernimmt nur gültige Texte und normalisiert die ID", () => {
    expect(parseTextUebernahme([{ itemId: id, descriptionDe: " Fliesen verlegen " }]))
      .toEqual([{ itemId: id.toLowerCase(), descriptionDe: "Fliesen verlegen" }]);
    expect(parseTextUebernahme([{ itemId: id, additionalDescriptionDe: "Zeile 1\nZeile 2" }]))
      .toEqual([{ itemId: id.toLowerCase(), additionalDescriptionDe: "Zeile 1\nZeile 2" }]);
  });

  it.each([
    ["keine Liste", "x"],
    ["leere Liste", []],
    ["keine UUID", [{ itemId: "1", descriptionDe: "Fliesen" }]],
    ["ohne Text", [{ itemId: id }]],
    ["leere Bezeichnung", [{ itemId: id, descriptionDe: "  " }]],
    ["zu lange Bezeichnung", [{ itemId: id, descriptionDe: "F".repeat(201) }]],
    ["doppelte Position", [{ itemId: id, descriptionDe: "A" }, { itemId: id.toLowerCase(), descriptionDe: "B" }]],
    ["zu viele Positionen", Array.from({ length: 31 }, () => ({ itemId: id, descriptionDe: "A" }))],
  ])("lehnt ab: %s", (_name, input) => {
    expect(parseTextUebernahme(input)).toBeNull();
  });
});
