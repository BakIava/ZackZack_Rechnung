import { describe, expect, it } from "vitest";
import type { NachweisScanEintrag, NachweisZeile } from "@/types/nachweis";
import { beispielNachweis } from "./nachweis-test-fixtures";
import { nachweisErgebnis } from "./nachweis-pruefung";
import { nachweisStartZeilen } from "./nachweis-positionen";
import {
  LEERES_GEDAECHTNIS,
  MAX_GEMERKTE_SCANS,
  SCAN_GUELTIG_MS,
  gedaechtnisAnwenden,
  mitarbeiterMerken,
  nameSchluessel,
  scanMerken,
  scanVergessen,
  scanZurDatei,
} from "./nachweis-gedaechtnis";

const ergebnis = nachweisErgebnis(beispielNachweis());
const JETZT = 1_800_000_000_000;

function gelesen(): NachweisZeile[] {
  return nachweisStartZeilen(ergebnis, null).zeilen;
}

function scan(id: string, savedAt: number, hash: string | null = null): NachweisScanEintrag {
  return { id, hash, savedAt, ergebnis, beschreibung: "", zeilen: [], material: [] };
}

describe("nameSchluessel", () => {
  it("ignoriert Groß/klein, Leerzeichen, Akzente und das türkische ı", () => {
    expect(nameSchluessel("  Saygılı ")).toBe("saygili");
    expect(nameSchluessel("ŞAHİN  Öz")).toBe(nameSchluessel("sahin oz"));
  });
});

describe("Mitarbeiter merken", () => {
  it("merkt Name und Preis und wendet sie beim nächsten Zettel an", () => {
    const zeilen = gelesen().map((zeile, index) => ({ ...zeile, preis: index === 3 ? 3800 : 4800 }));
    const gedaechtnis = mitarbeiterMerken(LEERES_GEDAECHTNIS, zeilen, JETZT);

    const naechster = gedaechtnisAnwenden(gelesen(), gedaechtnis);
    expect(naechster.map((z) => [z.name, z.preis, z.preisManuell])).toEqual([
      ["Saygili", 4800, true],
      ["Esref", 4800, true],
      ["Nezih", 4800, true],
      ["Talal", 3800, true],
    ]);
  });

  it("merkt Namenskorrekturen: falsch gelesenes „Hezih“ wird wieder zu „Nezih“", () => {
    const zeilen = gelesen().map((zeile) =>
      zeile.name === "Nezih" ? { ...zeile, gelesenName: "Hezih", preis: 4800 } : zeile,
    );
    const gedaechtnis = mitarbeiterMerken(LEERES_GEDAECHTNIS, zeilen, JETZT);

    const falschGelesen = gelesen().map((zeile) =>
      zeile.name === "Nezih" ? { ...zeile, name: "Hezih", gelesenName: "Hezih" } : zeile,
    );
    const korrigiert = gedaechtnisAnwenden(falschGelesen, gedaechtnis);
    expect(korrigiert[2]).toMatchObject({ name: "Nezih", preis: 4800 });
  });

  it("lässt unbekannte Mitarbeiter und Zeilen ohne Namen unverändert", () => {
    const zeilen = [...gelesen(), { ...gelesen()[0], key: "neu1", name: " ", gelesenName: "" }];
    expect(gedaechtnisAnwenden(zeilen, LEERES_GEDAECHTNIS)).toEqual(zeilen);
    expect(Object.keys(mitarbeiterMerken(LEERES_GEDAECHTNIS, zeilen, JETZT).workers)).toHaveLength(4);
  });

  it("behält höchstens 100 Mitarbeiter, die zuletzt genutzten zuerst", () => {
    let gedaechtnis = LEERES_GEDAECHTNIS;
    for (let index = 0; index < 105; index += 1) {
      const zeile = { ...gelesen()[0], name: `M${index}`, gelesenName: `X${index}`, preis: 4800 };
      gedaechtnis = mitarbeiterMerken(gedaechtnis, [zeile], JETZT + index);
    }
    expect(Object.keys(gedaechtnis.workers)).toHaveLength(100);
    expect(gedaechtnis.workers.m0).toBeUndefined();
    expect(gedaechtnis.aliases.x0).toBeUndefined();
    expect(gedaechtnis.aliases.x104).toBe("m104");
  });
});

describe("Scans merken", () => {
  it("ersetzt denselben Scan, behält höchstens fünf und verwirft alte", () => {
    let scans: NachweisScanEintrag[] = [scan("alt", JETZT - SCAN_GUELTIG_MS - 1)];
    for (let index = 0; index < 7; index += 1) scans = scanMerken(scans, scan(`s${index}`, JETZT + index), JETZT);
    scans = scanMerken(scans, { ...scan("s6", JETZT + 10), beschreibung: "neu" }, JETZT);

    expect(scans).toHaveLength(MAX_GEMERKTE_SCANS);
    expect(scans.map((s) => s.id)).toEqual(["s6", "s5", "s4", "s3", "s2"]);
    expect(scans[0].beschreibung).toBe("neu");
  });

  it("vergisst einen einzelnen Scan, damit dieselbe Datei neu gelesen wird", () => {
    const scans = [scan("a", JETZT, "hash-a"), scan("b", JETZT, "hash-b")];
    const uebrig = scanVergessen(scans, "a");
    expect(uebrig.map((s) => s.id)).toEqual(["b"]);
    expect(scanZurDatei(uebrig, "hash-a", JETZT)).toBeNull();
  });

  it("findet einen Scan derselben Datei, solange er gültig ist", () => {
    const scans = [scan("a", JETZT, "hash-a"), scan("b", JETZT - SCAN_GUELTIG_MS - 1, "hash-b")];
    expect(scanZurDatei(scans, "hash-a", JETZT)?.id).toBe("a");
    expect(scanZurDatei(scans, "hash-b", JETZT)).toBeNull();
    expect(scanZurDatei(scans, null, JETZT)).toBeNull();
  });
});
