import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "scripts", "delete_draft_document.sql"),
  "utf8",
);

function functionBody(name: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  return sql.slice(start, sql.indexOf("$$;", start));
}

describe("delete_draft_document SQL-Vertrag", () => {
  const body = functionBody("delete_draft_document");

  it("läuft mit den Rechten des Nutzers, damit RLS greift", () => {
    expect(body).toContain("SECURITY INVOKER");
    expect(body).not.toContain("SECURITY DEFINER");
    expect(body).toContain("SET search_path = ''");
  });

  it("löscht nur eigene Entwürfe ohne Nummer und sperrt sie vorher", () => {
    expect(body).toContain("RAISE EXCEPTION 'draft_delete_not_authenticated'");
    expect(body).toContain("AND d.company_id = v_company_id");
    expect(body).toContain("AND d.status = 'draft'");
    expect(body).toContain("AND d.document_number IS NULL");
    expect(body).toContain("FOR UPDATE");
    expect(body).toContain("RAISE EXCEPTION 'draft_not_deletable'");
  });

  it("lässt verknüpfte Entwürfe (umgewandelt, angepasst) stehen", () => {
    expect(body).toMatch(
      /FROM public\.document_relations AS r\s+WHERE r\.target_document_id = p_document_id/,
    );
  });

  it("löscht erst die Positionen, dann das Dokument, und prüft das Ergebnis", () => {
    const items = body.indexOf("DELETE FROM public.document_items");
    const doc = body.indexOf("DELETE FROM public.documents");
    const check = body.indexOf("GET DIAGNOSTICS v_deleted = ROW_COUNT");
    expect(items).toBeGreaterThan(body.indexOf("FOR UPDATE"));
    expect(doc).toBeGreaterThan(items);
    expect(check).toBeGreaterThan(doc);
  });

  it("vergibt und verändert keine Nummern", () => {
    expect(body).not.toContain("get_next_document_number");
    expect(body).not.toContain("number_sequences");
    expect(body).not.toMatch(/^\s*UPDATE\s/m);
  });

  it("ist nur für angemeldete Nutzer ausführbar", () => {
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.delete_draft_document(uuid) FROM PUBLIC, anon",
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.delete_draft_document(uuid) TO authenticated",
    );
  });
});
