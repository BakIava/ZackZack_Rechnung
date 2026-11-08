import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const reopenSql = readFileSync(
  join(process.cwd(), "scripts", "reopen_invoice.sql"),
  "utf8",
);
const finalizeSql = readFileSync(
  join(process.cwd(), "scripts", "finalize_document.sql"),
  "utf8",
);

function functionBody(sql: string, name: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  return sql.slice(start, sql.indexOf("$$;", start));
}

describe("reopen_invoice SQL-Vertrag", () => {
  const reopen = functionBody(reopenSql, "reopen_invoice");

  it("öffnet nur eigene, festgeschriebene, unbezahlte Rechnungen mit Nummer", () => {
    expect(reopen).toContain("SECURITY DEFINER");
    expect(reopen).toContain("AND company_id = v_company_id");
    expect(reopen).toContain("AND document_type = 'invoice'");
    expect(reopen).toContain("AND status IN ('finalized', 'sent')");
    expect(reopen).toContain("AND paid_at IS NULL");
    expect(reopen).toContain("AND document_number IS NOT NULL");
    expect(reopen).toContain("FOR UPDATE");
    expect(reopen).toContain("RAISE EXCEPTION 'invoice_not_reopenable'");
  });

  it("setzt nur den Status zurück und lässt die Nummer unangetastet", () => {
    expect(reopen).toContain("SET status = 'draft'");
    expect(reopen).toContain("set_config('zackzack.reopening', 'on', true)");
    expect(reopen).not.toMatch(/SET\s+document_number/);
    expect(reopen).not.toContain("get_next_document_number");
  });

  it("ist nur für angemeldete Nutzer ausführbar", () => {
    expect(reopenSql).toContain(
      "REVOKE ALL ON FUNCTION public.reopen_invoice(uuid) FROM PUBLIC",
    );
    expect(reopenSql).toContain(
      "GRANT EXECUTE ON FUNCTION public.reopen_invoice(uuid) TO authenticated",
    );
  });
});

describe("protect_document_history mit Korrektur", () => {
  const trigger = functionBody(reopenSql, "protect_document_history");

  it("erlaubt den Weg zurück zum Entwurf nur über reopen_invoice", () => {
    expect(trigger).toContain("NEW.status = 'draft'");
    expect(trigger).toContain("current_setting('zackzack.reopening', true)");
    expect(trigger).toContain("RAISE EXCEPTION 'reopen_via_rpc_required'");
  });

  it("verbietet das Löschen eines Entwurfs mit Nummer (keine Lücke)", () => {
    const deleteBranch = trigger.slice(
      trigger.indexOf("IF TG_OP = 'DELETE' THEN"),
      trigger.indexOf("RETURN OLD;"),
    );
    expect(deleteBranch).toContain("OLD.document_number IS NOT NULL");
    expect(deleteBranch).toContain("RAISE EXCEPTION 'numbered_document_delete_forbidden'");
  });

  it("hält Nummer und Typ eines nummerierten Entwurfs fest", () => {
    expect(trigger).toContain("NEW.document_number IS DISTINCT FROM OLD.document_number");
    expect(trigger).toContain("NEW.document_type IS DISTINCT FROM OLD.document_type");
    expect(trigger).toContain("RAISE EXCEPTION 'document_number_immutable'");
  });

  it("behält alle bisherigen Schutzregeln", () => {
    expect(trigger).toContain("RAISE EXCEPTION 'finalized_document_immutable'");
    expect(trigger).toContain("RAISE EXCEPTION 'linked_document_delete_forbidden'");
    expect(trigger).toContain("RAISE EXCEPTION 'quote_not_payable'");
    expect(trigger).toContain("RAISE EXCEPTION 'linked_document_type_immutable'");
    expect(trigger).toContain("RAISE EXCEPTION 'finalize_via_rpc_required'");
    expect(trigger).toContain("ARRAY['status', 'paid_at', 'updated_at']");
  });
});

describe("finalize_document nach einer Korrektur", () => {
  it("übernimmt eine vorhandene Nummer und zieht dann keine neue Sequenz", () => {
    expect(finalizeSql).toMatch(
      /customer_snapshot, document_number\s+INTO v_type, v_issue_date, v_valid_until, v_customer_snapshot, v_existing_number/,
    );
    const keep = finalizeSql.indexOf("IF v_existing_number IS NOT NULL THEN");
    const elseBranch = finalizeSql.indexOf("ELSE", keep);
    const draw = finalizeSql.indexOf("v_seq := get_next_document_number(");
    expect(keep).toBeGreaterThan(0);
    expect(finalizeSql.slice(keep, elseBranch)).toContain("v_number := v_existing_number;");
    // Die Sequenz wird nur im ELSE-Zweig gezogen, der direkt nach dem
    // Formatieren der neuen Nummer endet.
    expect(draw).toBeGreaterThan(elseBranch);
    expect(finalizeSql).toMatch(
      /v_number := format_document_number\(v_pattern, v_seq, v_year\);\s+END IF;/,
    );
    expect(finalizeSql.indexOf("v_number := format_document_number(")).toBeGreaterThan(draw);
  });
});
