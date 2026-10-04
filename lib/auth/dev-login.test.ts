import { describe, expect, it } from "vitest";
import { DEV_TEST_EMAIL, isDevTestLogin } from "./dev-login";

describe("isDevTestLogin", () => {
  it("erlaubt das Test-Konto im Dev-Modus (Groß-/Kleinschreibung, Leerzeichen egal)", () => {
    expect(isDevTestLogin(DEV_TEST_EMAIL, "development")).toBe(true);
    expect(isDevTestLogin("  ZackZack@Test.com ", "development")).toBe(true);
  });

  it("erlaubt jede @test.com-Adresse im Dev-Modus", () => {
    expect(isDevTestLogin("max@test.com", "development")).toBe(true);
    expect(isDevTestLogin("  Foo.Bar@TEST.com ", "development")).toBe(true);
  });

  it.each(["production", "test", undefined])("ist unter NODE_ENV=%s gesperrt", (nodeEnv) => {
    expect(isDevTestLogin(DEV_TEST_EMAIL, nodeEnv)).toBe(false);
    expect(isDevTestLogin("max@test.com", nodeEnv)).toBe(false);
  });

  it.each(["kunde@example.com", "@test.com", "x@sub.test.com", "x@test.com.evil.de", "x@test.co"])(
    "lehnt %s ab",
    (email) => {
      expect(isDevTestLogin(email, "development")).toBe(false);
    },
  );
});
