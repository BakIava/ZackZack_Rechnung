import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "scripts", "document-number-patterns.sql"),
  "utf8",
);
// finalize_document.sql ist mit CRLF gespeichert.
const finalizeSql = readFileSync(join(process.cwd(), "scripts", "finalize_document.sql"), "utf8")
  .replace(/\r\n/g, "\n");

/** Rumpf einer CREATE-FUNCTION-Anweisung bis zum schließenden `$$;`. */
function functionBody(sql: string, name: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start, `Funktion ${name}`).toBeGreaterThanOrEqual(0);
  return sql.slice(start, sql.indexOf("$$;", start));
}

describe("document-number-patterns.sql", () => {
  it("behält für bestehende Firmen exakt das bisherige Format", () => {
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS invoice_number_pattern text NOT NULL DEFAULT 'R-{YYYY}-{NNN}'",
    );
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS quote_number_pattern text NOT NULL DEFAULT 'A-{YYYY}-{NNN}'",
    );
  });

  it("prüft beide Muster per CHECK und verbietet gleiche Muster", () => {
    expect(migration).toContain(
      "CHECK (public.is_valid_document_number_pattern(invoice_number_pattern))",
    );
    expect(migration).toContain(
      "CHECK (public.is_valid_document_number_pattern(quote_number_pattern))",
    );
    expect(migration).toContain("CHECK (invoice_number_pattern <> quote_number_pattern)");
  });

  it("verlangt genau ein Jahr und genau einen Zähler im Muster", () => {
    const validator = functionBody(migration, "is_valid_document_number_pattern");
    // Literale ohne Klammern, je ein Jahr- und Zähler-Platzhalter in beliebiger Reihenfolge.
    expect(validator).toContain("'^[A-Za-z0-9/._-]*'");
    expect(validator).toContain("'(\\{YY(YY)?\\}[A-Za-z0-9/._-]*\\{N{1,9}\\}'");
    expect(validator).toContain("'|\\{N{1,9}\\}[A-Za-z0-9/._-]*\\{YY(YY)?\\})'");
    expect(validator).toContain("'[A-Za-z0-9/._-]*$'");
  });

  it("füllt den Zähler nur auf und kürzt ihn nie", () => {
    const formatter = functionBody(migration, "format_document_number");
    expect(formatter).toContain("IF length(v_counter) < v_digits THEN");
    expect(formatter).toContain("RAISE EXCEPTION 'number_pattern_invalid'");
  });

  it("sichert die Einmaligkeit der Nummer per Unique-Index", () => {
    expect(migration).toContain(
      "ON public.documents (company_id, document_type, document_number)\n  WHERE document_number IS NOT NULL;",
    );
  });

  it("setzt Startwerte nur in unbenutzten Kreisen und nur als service_role", () => {
    const seed = functionBody(migration, "seed_document_number");
    expect(seed).toContain("RAISE EXCEPTION 'number_sequence_in_use'");
    expect(seed).toContain("AND d.document_number IS NOT NULL");
    expect(seed).toContain("FOR UPDATE;");
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.seed_document_number\([^)]*\)\s+FROM PUBLIC, anon, authenticated;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.seed_document_number\([^)]*\)\s+TO service_role;/);
  });

  it("schreibt keine bestehenden Zeilen um", () => {
    expect(migration).not.toMatch(/^\s*UPDATE\b/im);
  });
});

describe("finalize_document: Nummernmuster", () => {
  it("liest das Firmenmuster je Typ und baut die Nummer per format_document_number", () => {
    expect(finalizeSql).toContain("WHEN 'invoice' THEN c.invoice_number_pattern");
    expect(finalizeSql).toContain("WHEN 'quote'   THEN c.quote_number_pattern");
    expect(finalizeSql).toContain("RAISE EXCEPTION 'number_pattern_missing'");
    expect(finalizeSql).toContain("v_number := format_document_number(v_pattern, v_seq, v_year);");
  });

  it("verdrahtet kein Präfix mehr fest", () => {
    expect(finalizeSql).not.toContain("v_prefix");
    expect(finalizeSql).not.toContain("lpad(v_seq");
  });
});
