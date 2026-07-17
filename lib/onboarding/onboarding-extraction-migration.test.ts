import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const storageMigration = readFileSync(
  join(process.cwd(), "scripts", "onboarding-upload-storage.sql"),
  "utf8",
);
const quotaMigration = readFileSync(
  join(process.cwd(), "scripts", "onboarding-ai-daily-quota.sql"),
  "utf8",
);

describe("onboarding extraction migrations", () => {
  it("legt ausschließlich einen privaten, begrenzten Upload-Bucket an", () => {
    expect(storageMigration).toContain("'onboarding-uploads'");
    expect(storageMigration).toContain("10485760");
    expect(storageMigration).toContain("public = false");
    expect(storageMigration).not.toContain("CREATE POLICY");
  });

  it("begrenzt die Quote vor Anlage der public.users-Zeile", () => {
    expect(quotaMigration).toContain("REFERENCES auth.users(id)");
    expect(quotaMigration).toContain("consume_onboarding_ai_quota");
    expect(quotaMigration).toContain("SECURITY DEFINER");
    expect(quotaMigration).toContain("request_count BETWEEN 0 AND 10");
  });
});
