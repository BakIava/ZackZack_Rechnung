import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDocumentServiceLocation } from "./service-location";

const valid = {
  name: "Baustelle Familie Schneider", street: "Gartenstraße", houseNumber: "12",
  postcode: "55116", city: "Mainz", addressExtra: "Hinterhaus",
};

describe("document service location", () => {
  it("speichert nur strukturierte Angaben, keinen KI-Freitext oder Zusatzfelder", () => {
    expect(parseDocumentServiceLocation({ ...valid, sourceText: "privater Freitext", extra: "x" }))
      .toEqual(valid);
  });

  it("verwirft unvollständige und überlange Snapshots", () => {
    expect(parseDocumentServiceLocation({ ...valid, street: " ".repeat(161) })).toBeNull();
    expect(parseDocumentServiceLocation({ ...valid, city: 123 })).toBeNull();
    expect(parseDocumentServiceLocation({ ...valid, name: "", street: "", city: "" })).toBeNull();
    expect(parseDocumentServiceLocation([])).toBeNull();
  });

  it("Migration ergänzt nur ein Feld am Beleg und schreibt keine alten Belege um", () => {
    const sql = readFileSync(join(process.cwd(), "scripts", "document-service-location.sql"), "utf8");
    expect(sql).toMatch(/alter table public\.documents\s+add column if not exists service_location jsonb/i);
    expect(sql).not.toMatch(/^\s*update\b/im);
  });
});
