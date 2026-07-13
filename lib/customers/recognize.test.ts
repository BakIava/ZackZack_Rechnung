import { describe, expect, it } from "vitest";
import { parseCustomerText } from "./recognize";

describe("parseCustomerText – Freitext → Kundenfelder", () => {
  it("leerer Text → nichts erkannt", () => {
    const r = parseCustomerText("");
    expect(r.ok).toBe(false);
    expect(r.count).toBe(0);
    expect(r.fields.firstname).toBe("");
  });

  it("Firma: erkennt Firmenname, Adresse, Telefon, E-Mail", () => {
    const r = parseCustomerText(
      "Müller GmbH, industriestr 8, 63065 offenbach, Tel 069 887654, kontakt@mueller-gmbh.de",
    );
    expect(r.ok).toBe(true);
    expect(r.fields.customerType).toBe("business");
    expect(r.fields.companyName).toBe("Müller GmbH");
    expect(r.fields.zip).toBe("63065");
    expect(r.fields.email).toBe("kontakt@mueller-gmbh.de");
    expect(r.found.companyName).toBe(true);
    expect(r.found.phone).toBe(true);
  });

  it("Adresse wird an amtliche Schreibweise angepasst (Straße + Ort)", () => {
    const r = parseCustomerText("Familie Schneider, berger str 147, 60385 frankfurt");
    expect(r.fields.customerType).toBe("private");
    expect(r.fields.firstname).toBe("Familie");
    expect(r.fields.lastname).toBe("Schneider");
    expect(r.fields.street).toBe("Berger Straße");
    expect(r.fields.houseNo).toBe("147");
    expect(r.fields.city).toBe("Frankfurt am Main");
    expect(r.corrected.street).toBe(true);
    expect(r.corrected.city).toBe(true);
  });

  it("wenig Infos (nur Name + Telefon) → ok über Kontakt", () => {
    const r = parseCustomerText("Herr Yılmaz, 0176 55 44 33");
    expect(r.ok).toBe(true);
    expect(r.found.phone).toBe(true);
    expect(r.fields.firstname).toBe("Herr");
    expect(r.fields.lastname).toBe("Yılmaz");
  });

  it("nur ein Name ohne Ident → nicht ok (Name bleibt vorbefüllt)", () => {
    const r = parseCustomerText("Familie Schneider");
    expect(r.ok).toBe(false);
    expect(r.fields.lastname).toBe("Schneider");
  });
});
