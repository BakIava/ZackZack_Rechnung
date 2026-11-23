import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "scripts", "text-ai-daily-quota.sql"),
  "utf8",
).replaceAll("\r\n", "\n");

describe("text-ai-daily-quota.sql", () => {
  it("begrenzt „Text verbessern“ auf 50 Aufrufe pro Nutzer und Tag", () => {
    expect(migration).toContain("request_count BETWEEN 0 AND 50");
    expect(migration).toContain("v_daily_limit constant smallint := 50;");
    expect(migration).toContain("PRIMARY KEY (user_id, usage_date)");
  });

  it("zählt getrennt vom gemeinsamen Kunden-/Nachweis-Kontingent", () => {
    expect(migration).toContain("public.text_ai_usage_daily");
    expect(migration).toContain("FUNCTION public.consume_text_ai_quota()");
    expect(migration).not.toContain("public.ai_usage_daily");
    expect(migration).not.toContain("FUNCTION public.consume_customer_ai_quota");
  });

  it("erlaubt Zugriff nur über die RPC des angemeldeten Nutzers", () => {
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("v_user_id := auth.uid();");
    expect(migration).toContain("REVOKE ALL ON TABLE public.text_ai_usage_daily FROM anon, authenticated;");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.consume_text_ai_quota() FROM PUBLIC;");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.consume_text_ai_quota() TO authenticated;");
    expect(migration).not.toContain("CREATE POLICY");
  });
});
