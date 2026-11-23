import { MAX_NACHWEIS_TAGE, istNachweisDatum } from "@/lib/documents/nachweis-datum";
import {
  NACHWEIS_FREIE_ARTEN,
  NACHWEIS_UNSICHERHEITEN,
  type NachweisExtraktion,
  type NachweisFreieLeistung,
} from "@/types/nachweis";
import {
  NACHWEIS_AUSRICHTUNG_SCHEMA,
  NACHWEIS_EXTRACTION_SCHEMA,
  parseNachweisAusrichtungJson,
  parseNachweisExtractionJson,
} from "./nachweis-extraction-contract";

const MAX_LEISTUNGEN = 100;

const freieLeistung = {
  art: { enum: NACHWEIS_FREIE_ARTEN },
  descriptionDe: { type: "string" },
  amount: { type: ["number", "null"] },
  unit: { type: ["string", "null"] },
  tage: { type: "array", items: { type: "string" } },
  unsicher: { type: "array", items: { enum: NACHWEIS_UNSICHERHEITEN } },
};

const frei = {
  variante: { const: "frei" },
  ausrichtung: NACHWEIS_AUSRICHTUNG_SCHEMA.properties.ausrichtung,
  nachweis_nummer: { type: "string" },
  leistungen: {
    type: "array",
    items: {
      type: "object",
      properties: freieLeistung,
      required: Object.keys(freieLeistung),
      additionalProperties: false,
    },
  },
  stunden_laut_blatt: { type: ["number", "null"] },
};

export const NACHWEIS_VARIANTEN_SCHEMA = {
  type: "object",
  properties: {
    nachweis: {
      anyOf: [
        {
          ...NACHWEIS_EXTRACTION_SCHEMA,
          properties: { variante: { const: "tabelle" }, ...NACHWEIS_EXTRACTION_SCHEMA.properties },
          required: ["variante", ...NACHWEIS_EXTRACTION_SCHEMA.required],
        },
        { type: "object", properties: frei, required: Object.keys(frei), additionalProperties: false },
      ],
    },
  },
  required: ["nachweis"],
  additionalProperties: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hatFelder(value: Record<string, unknown>, felder: string[]): boolean {
  return Object.keys(value).length === felder.length && felder.every((feld) => Object.hasOwn(value, feld));
}

export function istNachweisMenge(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 100_000;
}

export function parseFreieLeistung(value: unknown): NachweisFreieLeistung | null {
  if (!isRecord(value) || !hatFelder(value, Object.keys(freieLeistung))) return null;
  const { descriptionDe, amount, unit, tage, unsicher } = value;
  const art = NACHWEIS_FREIE_ARTEN.find((entry) => entry === value.art);
  if (
    !art ||
    typeof descriptionDe !== "string" || !descriptionDe.trim() || descriptionDe.length > 200 ||
    (amount !== null && !istNachweisMenge(amount)) ||
    (unit !== null && (typeof unit !== "string" || !unit.trim() || unit.length > 30)) ||
    (unit === "Pauschale" && amount !== 1 && amount !== null) ||
    !Array.isArray(tage) || tage.length > MAX_NACHWEIS_TAGE || !tage.every(istNachweisDatum) ||
    !Array.isArray(unsicher) || unsicher.length > NACHWEIS_UNSICHERHEITEN.length
  ) return null;

  const markierungen = NACHWEIS_UNSICHERHEITEN.filter((entry) => unsicher.includes(entry));
  if (markierungen.length !== unsicher.length) return null;

  return {
    art,
    descriptionDe: descriptionDe.trim(),
    amount,
    unit: unit?.trim() ?? null,
    tage: [...new Set(tage)].sort(),
    unsicher: markierungen,
  };
}

/** Ungültige strukturierte Antworten einheitlich ablehnen, auch wenn das SDK sie liefert. */
export function parseNachweisVariantenJson(raw: string): NachweisExtraktion | null {
  let response: unknown;
  try {
    response = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(response) || !hatFelder(response, ["nachweis"]) || !isRecord(response.nachweis)) return null;
  const { variante, ...daten } = response.nachweis;

  if (variante === "tabelle") {
    if (!hatFelder(daten, [...NACHWEIS_EXTRACTION_SCHEMA.required])) return null;
    const tabelle = parseNachweisExtractionJson(JSON.stringify(daten));
    return tabelle ? { variante, ...tabelle } : null;
  }
  if (variante !== "frei" || !hatFelder(response.nachweis, Object.keys(frei))) return null;
  const ausrichtung = parseNachweisAusrichtungJson(JSON.stringify(daten));
  const { nachweis_nummer, leistungen, stunden_laut_blatt } = daten;
  if (
    !ausrichtung ||
    typeof nachweis_nummer !== "string" || nachweis_nummer.length > 60 ||
    !Array.isArray(leistungen) || leistungen.length > MAX_LEISTUNGEN ||
    (stunden_laut_blatt !== null && !istNachweisMenge(stunden_laut_blatt))
  ) return null;

  const zeilen = leistungen.map(parseFreieLeistung);
  if (zeilen.some((zeile) => zeile === null)) return null;
  return {
    variante,
    ausrichtung,
    nummer: nachweis_nummer.trim(),
    leistungen: zeilen.filter((zeile) => zeile !== null),
    stundenLautBlatt: stunden_laut_blatt,
  };
}
