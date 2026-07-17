import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TRADE_IDS } from "@/types/database";

const migration = readFileSync(
  join(process.cwd(), "scripts", "onboarding_trades_starter_catalog.sql"),
  "utf8",
);

describe("starter catalog onboarding migration", () => {
  it("separates central templates, company trades and personal services", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.company_trades");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.service_templates");
    expect(migration).toContain("INSERT INTO public.services");
    expect(migration).toContain("starter_template_id");
  });

  it("contains every supported stable trade id", () => {
    for (const tradeId of TRADE_IDS) {
      expect(migration).toContain(`('${tradeId}',`);
    }
  });

  it("deduplicates repeated template copies without overwriting personal entries", () => {
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS services_company_starter_template_unique\s+ON public\.services\(company_id, starter_template_id\)/,
    );
    expect(migration).toMatch(
      /ON CONFLICT \(company_id, starter_template_id\)[\s\S]*?DO NOTHING/,
    );
    expect(migration).not.toMatch(
      /ON CONFLICT \(company_id, starter_template_id\)[\s\S]*?DO UPDATE/,
    );
  });

  it("copies starter services without prices or a parallel tax model", () => {
    const templateTable = migration.slice(
      migration.indexOf("CREATE TABLE IF NOT EXISTS public.service_templates"),
      migration.indexOf("CREATE INDEX IF NOT EXISTS idx_service_templates_active_trade_sort"),
    );
    expect(templateTable).not.toContain("default_price");
    expect(templateTable).not.toContain("tax_rate");

    const serviceCopy = migration.slice(
      migration.indexOf("INSERT INTO public.services"),
      migration.indexOf("RETURN v_company_id"),
    );
    expect(serviceCopy).toMatch(/default_price,[\s\S]*?starter_template_id[\s\S]*?template\.unit,\s+NULL,\s+template\.id/);
    expect(serviceCopy).not.toContain("tax_rate");
  });

  it("keeps the complete onboarding write in one database function", () => {
    const functionBody = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.complete_onboarding"),
      migration.indexOf("REVOKE ALL ON FUNCTION public.complete_onboarding"),
    );
    expect(functionBody).toContain("INSERT INTO public.companies");
    expect(functionBody).toContain("INSERT INTO public.users");
    expect(functionBody).toContain("INSERT INTO public.company_trades");
    expect(functionBody).toContain("INSERT INTO public.services");
  });
});
