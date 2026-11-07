import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "scripts", "negative-line-items.sql"),
  "utf8",
);

/** Nur der ausführbare Teil – Kommentare dürfen alte Regeln erwähnen. */
const statements = migration
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

describe("Migration negative Positionen (Abzüge)", () => {
  it("läuft als eine Transaktion", () => {
    expect(statements).toMatch(/^\s*BEGIN;/m);
    expect(statements).toMatch(/^\s*COMMIT;/m);
  });

  it("erlaubt negative Einzelpreise und Zeilenbeträge, aber keine negative Menge", () => {
    expect(statements).toContain(
      "DROP CONSTRAINT IF EXISTS document_items_tax_totals_valid",
    );
    const itemCheck = statements.slice(
      statements.indexOf("ADD CONSTRAINT document_items_tax_totals_valid"),
      statements.indexOf("ALTER TABLE public.documents"),
    );
    expect(itemCheck).toContain("amount > 0");
    expect(itemCheck).toContain("gross_amount = total_amount + tax_amount");
    expect(itemCheck).not.toMatch(/unit_price\s*>=\s*0/);
    expect(itemCheck).not.toMatch(/total_amount\s*>=\s*0/);
    expect(itemCheck).not.toMatch(/tax_amount\s*>=\s*0/);
  });

  it("lässt negative Belegsummen nur im Entwurf zu", () => {
    expect(statements).toContain("DROP CONSTRAINT IF EXISTS documents_tax_totals_valid");
    const documentCheck = statements.slice(
      statements.indexOf("ADD CONSTRAINT documents_tax_totals_valid"),
    );
    expect(documentCheck).toContain("subtotal_amount + tax_amount = total_amount");
    expect(documentCheck).toContain("status = 'draft'");
    expect(documentCheck).toContain(
      "subtotal_amount >= 0 AND tax_amount >= 0 AND total_amount >= 0",
    );
  });

  it("schreibt keine Bestandszeilen um", () => {
    expect(statements).not.toMatch(/\bUPDATE\b/i);
    expect(statements).not.toMatch(/\bDELETE\b/i);
  });
});
