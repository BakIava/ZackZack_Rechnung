import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NachweisCacheEintrag } from "@/types/nachweis";
import { freieKalendernotiz } from "./nachweis-frei-fixtures";
import { parseNachweisVariantenJson } from "@/lib/integrations/anthropic/nachweis-varianten-contract";
import { readScans, writeScans } from "./nachweis-cache";
import { freiesNachweisErgebnis } from "./nachweis-frei";
import { scanZurDatei, SCAN_GUELTIG_MS } from "./nachweis-gedaechtnis";
import { leereFreieZeile, nachweisReviewStart, neuerNachweisZeilenKey } from "./nachweis-review-zustand";

const jetzt = 1_800_000_000_000;
const hash = "a".repeat(64);
const inhalt = new Map<string, string>();
const speichern = (scope: string, v: number, data: unknown) =>
  inhalt.set(`zz-nachweis:${scope}:scans`, JSON.stringify({ v, data }));

beforeEach(() => {
  inhalt.clear();
  vi.stubGlobal("window", {
    localStorage: { getItem: (key: string) => inhalt.get(key), setItem: (key: string, value: string) => inhalt.set(key, value) },
  });
});
afterEach(() => vi.unstubAllGlobals());

function frei(): NachweisCacheEintrag {
  const extraktion = parseNachweisVariantenJson(JSON.stringify({ nachweis: freieKalendernotiz() }));
  if (extraktion?.variante !== "frei") throw new Error("Freie Fixture erwartet");
  return { id: "frei-1", hash, savedAt: jetzt, review: nachweisReviewStart(freiesNachweisErgebnis(extraktion), "a") };
}

const alt = {
  id: "alt", hash, savedAt: jetzt, beschreibung: "Tore ausrichten",
  ergebnis: {
    nummer: "TEST-3", projekt: "", arbeitsleistung: "Montage", zeitraumVon: null, zeitraumBis: null,
    pruefung: { tage: [], gesamt: 2, gesamtLautBlatt: 2, abweichungen: [], vergleichbar: true, ok: true, gesamtAbweichung: false },
    mitarbeiter: [{ name: "Testkraft A", key: "m0", stunden: 2, unsicher: false }], material: [],
  },
  zeilen: [{
    key: "neu1", name: "Testkraft A", gelesenName: "Testkraft A", stunden: 2,
    preis: 4800, preisManuell: true, unsicher: false,
  }],
  material: [],
};

describe("Nachweis-Cache", () => {
  it("liest gültige v1-Tabellen samt Korrekturen und schreibt sie als v2", () => {
    speichern("a", 1, [alt, { ...alt, id: "kaputt", zeilen: [null] }]);
    const scans = readScans("a", jetzt);
    expect(scans).toHaveLength(1);
    const [scan] = scans;
    expect(scan.review).toMatchObject({ variante: "tabelle", beschreibung: "Tore ausrichten", zeilen: alt.zeilen });
    expect(scanZurDatei(scans, hash, jetzt)?.id).toBe("alt");
    expect(neuerNachweisZeilenKey(alt.zeilen, "neu")).toBe("neu2");
    writeScans("a", scans, jetzt);
    expect(inhalt.get("zz-nachweis:a:scans")).toContain('"v":2');
    expect(readScans("a", jetzt)).toEqual(scans);
    expect(readScans("b", jetzt)).toEqual([]);
  });

  it("behält freie Eingaben und neue Keys beim Wiederöffnen", () => {
    inhalt.set("zz-nachweis-last-price", "7700");
    const scan = frei();
    const { review } = scan;
    if (review.variante !== "frei") throw new Error("Freie Fixture erwartet");
    expect(review.zeilen.every((zeile) => zeile.unitPrice === null)).toBe(true);
    review.zeilen[0] = { ...review.zeilen[0], tageEingabe: "2026-11-12", unitPrice: 4500 };
    review.zeilen.push(leereFreieZeile(review.zeilen));
    writeScans("a", [scan], jetzt);
    const [gelesen] = readScans("a", jetzt);
    expect(gelesen).toEqual(scan);
    expect(leereFreieZeile(gelesen.review.variante === "frei" ? gelesen.review.zeilen : []).key).toBe("frei-neu:2");
  });

  it("übernimmt alte Zeilen ohne Prüfstatus und überspringt früher abgewählte Zeilen", () => {
    const scan = frei();
    if (scan.review.variante !== "frei") throw new Error("Freie Fixture erwartet");
    const [erste, zweite, ...rest] = scan.review.zeilen;
    speichern("a", 2, [{
      ...scan,
      review: {
        ...scan.review,
        zeilen: [{ ...erste, ausgewaehlt: true, bestaetigt: false }, { ...zweite, ausgewaehlt: false }, ...rest],
      },
    }]);
    expect(readScans("a", jetzt)[0].review).toMatchObject({ zeilen: [erste, ...rest] });
  });

  it("verwirft nur unvollständige Altdaten aus dem entfernten Datumsfeld", () => {
    const scan = frei();
    if (scan.review.variante !== "frei") throw new Error("Freie Fixture erwartet");
    scan.review.zeilen[0] = { ...scan.review.zeilen[0], tageEingabe: "2026-", unitPrice: 4500 };
    speichern("a", 2, [scan]);
    expect(readScans("a", jetzt)[0].review).toMatchObject({
      zeilen: [expect.objectContaining({ tageEingabe: "", unitPrice: 4500 }), ...scan.review.zeilen.slice(1)],
    });
  });

  it("begrenzt Ablauf und Anzahl, ignoriert kaputte Einzelwerte und fremde Versionen", () => {
    const scan = frei();
    speichern("a", 2, [
      { ...scan, id: "alt", savedAt: jetzt - SCAN_GUELTIG_MS },
      { ...scan, id: "kaputt", review: { ...scan.review, zeilen: [null] } },
      ...Array.from({ length: 6 }, (_, i) => ({ ...scan, id: String(i), savedAt: jetzt + i })),
    ]);
    expect(readScans("a", jetzt).map(({ id }) => id)).toEqual(["5", "4", "3", "2", "1"]);
    speichern("b", 3, [scan]);
    expect(readScans("b", jetzt)).toEqual([]);
    expect(inhalt.get("zz-nachweis:b:scans")).toContain('"v":3');
    vi.stubGlobal("window", { get localStorage() { throw new Error("gesperrt"); } });
    expect(readScans("a", jetzt)).toEqual([]);
    expect(() => writeScans("a", [scan], jetzt)).not.toThrow();
  });
});
