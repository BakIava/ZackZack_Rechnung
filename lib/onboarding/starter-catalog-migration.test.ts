import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TRADE_IDS } from "@/types/database";

const migration = readFileSync(
  join(process.cwd(), "scripts", "onboarding_trades_starter_catalog.sql"),
  "utf8",
);

function between(start: string, end: string): string {
  const from = migration.indexOf(start);
  const to = migration.indexOf(end, from + start.length);
  expect(from, `missing: ${start}`).toBeGreaterThanOrEqual(0);
  expect(to, `missing after ${start}: ${end}`).toBeGreaterThan(from);
  return migration.slice(from, to);
}

const sharedFunction = () =>
  between(
    "CREATE OR REPLACE FUNCTION public.complete_onboarding_for_user(",
    "REVOKE ALL ON FUNCTION public.complete_onboarding_for_user",
  );

const tenantFunction = () =>
  between(
    "CREATE OR REPLACE FUNCTION public.complete_onboarding(company_data jsonb)",
    "REVOKE ALL ON FUNCTION public.complete_onboarding(jsonb)",
  );

/** Statements (`;`-terminated) that mention the given function signature. */
function aclStatements(signature: string): string[] {
  return migration
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter((statement) => /^(GRANT|REVOKE) /.test(statement))
    .filter((statement) => statement.includes(`FUNCTION ${signature} `));
}

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
    expect(templateTable).toContain("default_price");
    expect(templateTable).not.toContain("tax_rate");

    const serviceCopy = migration.slice(
      migration.indexOf("INSERT INTO public.services"),
      migration.indexOf("RETURN v_company_id"),
    );
    expect(serviceCopy).toMatch(/default_price,[\s\S]*?starter_template_id[\s\S]*?template\.unit,\s+template\.default_price,\s+template\.id/);
    expect(serviceCopy).not.toContain("tax_rate");
  });

  it("keeps the complete onboarding write in one database function", () => {
    const functionBody = sharedFunction();
    expect(functionBody).toContain("INSERT INTO public.companies");
    expect(functionBody).toContain("INSERT INTO public.users");
    expect(functionBody).toContain("INSERT INTO public.company_trades");
    expect(functionBody).toContain("INSERT INTO public.services");
  });
});

describe("shared onboarding implementation for tenant and admin", () => {
  it("defines complete_onboarding_for_user with an explicit p_user_id", () => {
    expect(sharedFunction()).toMatch(
      /^CREATE OR REPLACE FUNCTION public\.complete_onboarding_for_user\(\s*p_user_id uuid,\s*company_data jsonb\s*\)\s*RETURNS uuid\s+LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = public/,
    );
  });

  it("derives the onboarded user from p_user_id, never from auth.uid()", () => {
    const body = sharedFunction();
    expect(body).toContain("v_user_id := p_user_id;");
    expect(body).not.toContain("auth.uid()");
  });

  it("keeps the shared body's validation and error codes", () => {
    const body = sharedFunction();
    for (const code of [
      "onboarding_not_authenticated",
      "onboarding_already_completed",
      "onboarding_trades_invalid",
      "onboarding_trades_required",
      "onboarding_tax_id_required",
    ]) {
      expect(body).toContain(`'${code}'`);
    }
    expect(body).toMatch(/EXCEPTION\s+WHEN unique_violation THEN/);
    expect(body).toContain("RETURN v_company_id;");
  });

  it("keeps complete_onboarding as a thin auth.uid() wrapper with the old signature", () => {
    const wrapper = tenantFunction();
    expect(wrapper).toMatch(
      /RETURNS uuid\s+LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = public/,
    );
    expect(wrapper).toContain(
      "RETURN public.complete_onboarding_for_user(auth.uid(), company_data);",
    );
    // No second copy of the onboarding body.
    expect(wrapper).not.toContain("INSERT INTO");
    expect(wrapper).not.toContain("RAISE EXCEPTION");
    expect(
      migration.match(/CREATE OR REPLACE FUNCTION public\.complete_onboarding\(/g),
    ).toHaveLength(1);
    expect(migration.match(/INSERT INTO public\.companies/g)).toHaveLength(1);
  });

  it("defines the shared implementation before the wrapper", () => {
    expect(
      migration.indexOf("FUNCTION public.complete_onboarding_for_user("),
    ).toBeLessThan(migration.indexOf("FUNCTION public.complete_onboarding(company_data jsonb)"));
  });

  it("revokes direct execution of the shared implementation from every application role", () => {
    const statements = aclStatements("public.complete_onboarding_for_user(uuid, jsonb)");
    expect(statements.some((s) => s.startsWith("GRANT"))).toBe(false);

    const revokedFrom = statements
      .filter((s) => s.startsWith("REVOKE ALL ON FUNCTION"))
      .flatMap((s) => s.slice(s.indexOf(" FROM ") + 6).split(","))
      .map((role) => role.trim());
    expect(revokedFrom).toEqual(
      expect.arrayContaining(["PUBLIC", "anon", "authenticated", "service_role"]),
    );

    // The revoke must come after the (re)definition, otherwise a fresh
    // CREATE would re-apply Supabase's default grants.
    expect(
      migration.indexOf("REVOKE ALL ON FUNCTION public.complete_onboarding_for_user"),
    ).toBeGreaterThan(migration.indexOf("FUNCTION public.complete_onboarding_for_user("));
  });

  it("leaves the tenant-facing grants on complete_onboarding unchanged", () => {
    expect(aclStatements("public.complete_onboarding(jsonb)")).toEqual([
      "REVOKE ALL ON FUNCTION public.complete_onboarding(jsonb) FROM PUBLIC",
      "GRANT EXECUTE ON FUNCTION public.complete_onboarding(jsonb) TO authenticated",
    ]);
  });
});
