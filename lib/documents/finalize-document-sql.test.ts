import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const finalizeSql = readFileSync(
  join(process.cwd(), "scripts", "finalize_document.sql"),
  "utf8",
);

describe("finalize_document SQL-Vertrag", () => {
  it("enthält keine Unternehmensvalidierung mehr", () => {
    expect(finalizeSql).not.toContain("company_tax_id_missing");
    expect(finalizeSql).not.toContain("c.steuernummer");
    expect(finalizeSql).not.toContain("c.ust_id");
  });

  it("erzwingt die verbleibenden dokumentbezogenen Regeln", () => {
    expect(finalizeSql).toContain("issue_date_missing");
    expect(finalizeSql).toContain("positions_missing");
    expect(finalizeSql).toContain("valid_until_missing");
    expect(finalizeSql).toContain("valid_until_before_issue_date");
    expect(finalizeSql).toContain("v_type = 'quote' OR v_total > 25000");
    expect(finalizeSql).toContain("customer_name_missing");
    expect(finalizeSql).toContain("customer_address_missing");
    expect(finalizeSql).toContain("customer_snapshot");
    expect(finalizeSql).toContain("NOT COALESCE((");
  });

  it("lässt Nummernvergabe, Betragsberechnung und Logo-Snapshot bestehen", () => {
    expect(finalizeSql).toContain("get_next_document_number");
    expect(finalizeSql).toContain("round(i.unit_price::numeric * i.amount)");
    expect(finalizeSql).toContain("logo_url_snapshot");
    expect(finalizeSql).toContain("logo_snapshot_captured = true");
  });
});
