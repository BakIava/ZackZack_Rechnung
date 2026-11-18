import { describe, expect, it } from "vitest";
import { beispielNachweis } from "./nachweis-test-fixtures";
import {
  nachweisBlattGesamt,
  nachweisErgebnis,
  nachweisMitarbeiter,
  pruefeNachweis,
  stimmtMitBlatt,
} from "./nachweis-pruefung";

describe("pruefeNachweis", () => {
  it("rechnet das Beispielblatt nach und findet keine Abweichung", () => {
    const pruefung = pruefeNachweis(beispielNachweis());
    expect(pruefung.gesamt).toBe(180);
    expect(pruefung.tage.map((tag) => tag.gerechnet)).toEqual([24, 24, 32, 32, 32, 36]);
    expect(pruefung).toMatchObject({ ok: true, vergleichbar: true, abweichungen: [] });
  });

  it("meldet einen falsch gelesenen Tag und die Gesamtsumme", () => {
    const extraction = beispielNachweis();
    extraction.mitarbeiter[3].eintraege[5].stunden = 4;
    const pruefung = pruefeNachweis(extraction);
    expect(pruefung.abweichungen).toEqual(["2026-09-12"]);
    expect(pruefung.gesamtAbweichung).toBe(true);
    expect(pruefung.ok).toBe(false);
  });

  it("zählt durchgestrichene und unleserliche Zellen nie mit", () => {
    const extraction = beispielNachweis();
    extraction.mitarbeiter[0].eintraege[5] = {
      datum: "2026-09-12",
      stunden: 1,
      zelle: "durchgestrichen",
      unsicher: false,
    };
    extraction.mitarbeiter[1].eintraege[0] = {
      datum: "2026-09-07",
      stunden: 8,
      zelle: "unleserlich",
      unsicher: true,
    };
    expect(pruefeNachweis(extraction).gesamt).toBe(180);
  });

  it("ist ohne Gesamtzeile nicht vergleichbar und damit nicht ok", () => {
    const extraction = beispielNachweis();
    extraction.tage = extraction.tage.map((tag) => ({ ...tag, gesamtLautBlatt: 0 }));
    extraction.gesamtSummeLautBlatt = 0;
    expect(pruefeNachweis(extraction)).toMatchObject({
      vergleichbar: false,
      ok: false,
      abweichungen: [],
      gesamtAbweichung: false,
    });
  });

  it("vergleicht halbe Stunden ohne Float-Fehler", () => {
    const extraction = beispielNachweis();
    extraction.mitarbeiter[0].eintraege[0].stunden = 7.75;
    extraction.mitarbeiter[2].eintraege[0].stunden = 8.25;
    expect(pruefeNachweis(extraction).ok).toBe(true);
  });
});

describe("stimmtMitBlatt", () => {
  it("vergleicht die korrigierten Stunden live mit der Gesamtsumme des Blatts", () => {
    const pruefung = pruefeNachweis(beispielNachweis());
    expect(stimmtMitBlatt(pruefung, 180)).toBe(true);
    expect(stimmtMitBlatt(pruefung, 176)).toBe(false);
  });

  it("nimmt ohne Gesamtsumme die Tageszeilen und ohne beides gar nichts", () => {
    const extraction = beispielNachweis();
    extraction.gesamtSummeLautBlatt = 0;
    expect(nachweisBlattGesamt(pruefeNachweis(extraction))).toBe(180);

    extraction.tage = extraction.tage.map((tag) => ({ ...tag, gesamtLautBlatt: 0 }));
    expect(stimmtMitBlatt(pruefeNachweis(extraction), 180)).toBeNull();
  });
});

describe("nachweisErgebnis", () => {
  it("liefert Stunden je Mitarbeiter und den Zeitraum der gearbeiteten Tage", () => {
    const ergebnis = nachweisErgebnis(beispielNachweis());
    expect(ergebnis.mitarbeiter.map((m) => [m.key, m.stunden])).toEqual([
      ["m0", 40],
      ["m1", 36],
      ["m2", 52],
      ["m3", 52],
    ]);
    expect(ergebnis.zeitraumVon).toBe("2026-09-07");
    expect(ergebnis.zeitraumBis).toBe("2026-09-12");
  });

  it("markiert Mitarbeiter mit unsicher gelesenen Zellen", () => {
    const extraction = beispielNachweis();
    extraction.mitarbeiter[1].eintraege[2].unsicher = true;
    expect(nachweisMitarbeiter(extraction).map((m) => m.unsicher)).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });
});
