import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("company logo SQL", () => {
  it("begrenzt den Bucket und scoped Schreibzugriffe auf die eigene Firma", () => {
    const sql = readFileSync(join(process.cwd(), "scripts/company-logo-storage.sql"), "utf8");
    expect(sql).toContain("2097152");
    expect(sql).toContain("ARRAY['image/png', 'image/jpeg']");
    expect(sql).toContain("public.get_user_company_id()::text");
    expect(sql).toContain("company_logos_delete_own");
  });

  it("friert die Logo-URL beim Finalisieren ein", () => {
    const migration = readFileSync(join(process.cwd(), "scripts/document-logo-snapshot.sql"), "utf8");
    const finalize = readFileSync(join(process.cwd(), "scripts/finalize_document.sql"), "utf8");
    expect(migration).toContain("logo_snapshot_captured boolean NOT NULL DEFAULT false");
    expect(finalize).toContain("logo_url_snapshot");
    expect(finalize).toContain("logo_snapshot_captured = true");
  });
});
