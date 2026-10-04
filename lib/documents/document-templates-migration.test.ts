import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOCUMENT_TEMPLATE_IDS } from "@/types/database";

const migration = readFileSync(join(process.cwd(), "scripts", "document-templates.sql"), "utf8");
// finalize_document.sql ist mit CRLF gespeichert.
const finalizeSql = readFileSync(join(process.cwd(), "scripts", "finalize_document.sql"), "utf8")
  .replace(/\r\n/g, "\n");

/** Werte einer `<spalte> IN ('a', 'b')`-Liste aus dem SQL. */
function allowedValues(sql: string, column: string): string[] {
  const match = sql.match(new RegExp(`${column} IN \\(([^)]*)\\)`));
  expect(match, `CHECK-Liste für ${column}`).not.toBeNull();
  return match![1].split(",").map((value) => value.trim().replace(/^'|'$/g, ""));
}

describe("document-templates.sql", () => {
  it("gibt jeder bestehenden und neuen Firma die Standardvorlage", () => {
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS document_template_id text NOT NULL DEFAULT 'standard'",
    );
  });

  it("erlaubt in Firma und Beleg genau die Vorlagen-IDs des Codes", () => {
    expect(allowedValues(migration, "document_template_id").sort())
      .toEqual([...DOCUMENT_TEMPLATE_IDS].sort());
    expect(allowedValues(migration, "template_id").sort())
      .toEqual([...DOCUMENT_TEMPLATE_IDS].sort());
  });

  it("legt den Beleg-Snapshot nullable und nur vollständig an", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS template_id text NULL");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS template_version smallint NULL");
    expect(migration).toContain("CHECK ((template_id IS NULL) = (template_version IS NULL))");
    expect(migration).toContain("CHECK (template_version IS NULL OR template_version >= 1)");
  });

  it("schreibt keine bestehenden Zeilen um (kein Backfill finalisierter Belege)", () => {
    expect(migration).not.toMatch(/^\s*UPDATE\b/im);
    expect(migration).not.toMatch(/zackzack\.migrating/);
  });
});

describe("finalize_document: Vorlagen-Snapshot", () => {
  it("nimmt Vorlage und Version als optionale Parameter und ersetzt die alte Signatur", () => {
    expect(finalizeSql).toContain("p_template_id text DEFAULT NULL");
    expect(finalizeSql).toContain("p_template_version smallint DEFAULT NULL");
    expect(finalizeSql).toContain("DROP FUNCTION IF EXISTS public.finalize_document(uuid, boolean);");
    expect(finalizeSql).toContain(
      "GRANT EXECUTE ON FUNCTION public.finalize_document(uuid, boolean, text, smallint) TO authenticated;",
    );
  });

  it("friert nur die aktuelle Firmenwahl ein und prüft Vollständigkeit und Version", () => {
    expect(finalizeSql).toContain("SELECT c.document_template_id INTO v_company_template");
    expect(finalizeSql).toContain("IF p_template_id IS DISTINCT FROM v_company_template THEN");
    expect(finalizeSql).toContain("template_mismatch");
    expect(finalizeSql).toContain("template_snapshot_incomplete");
    expect(finalizeSql).toContain("template_version_invalid");
  });

  it("schreibt den Snapshot im selben UPDATE wie Nummer und Status", () => {
    const update = finalizeSql.slice(finalizeSql.indexOf("UPDATE documents\n     SET document_number"));
    const statement = update.slice(0, update.indexOf(";"));
    expect(statement).toContain("status          = 'finalized'");
    expect(statement).toContain("template_id       = p_template_id");
    expect(statement).toContain("template_version  = p_template_version");
  });
});
