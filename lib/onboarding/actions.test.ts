import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SetupFormData } from "@/types/company";

const h = vi.hoisted(() => ({
  completeOnboardingRpc: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentCompanyId: vi.fn(),
  deleteAllOnboardingUploadsForUser: vi.fn(),
  saveCompanyLogo: vi.fn(),
  prepareCompanyLogo: vi.fn(),
}));

vi.mock("@/lib/repositories/onboarding", () => ({
  completeOnboardingRpc: h.completeOnboardingRpc,
}));
vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: h.getCurrentUser,
  getCurrentCompanyId: h.getCurrentCompanyId,
}));
vi.mock("@/lib/repositories/onboarding-uploads", () => ({
  deleteAllOnboardingUploadsForUser: h.deleteAllOnboardingUploadsForUser,
}));
vi.mock("@/lib/repositories/companies", () => ({ saveCompanyLogo: h.saveCompanyLogo }));
vi.mock("@/lib/company-logo/process", () => ({ prepareCompanyLogo: h.prepareCompanyLogo }));

import { completeOnboarding } from "./actions";

const form: SetupFormData = {
  name: "Yılmaz Malerbetrieb",
  legal_form: "einzel",
  director: "Mehmet Yılmaz",
  street: "Musterstraße",
  street_no: "1",
  postcode: "10115",
  city: "Berlin",
  handelsregister_nr: "",
  registergericht: "",
  trade_ids: ["painter"],
  email: "info@example.de",
  phone: "",
  mobile: "",
  fax: "",
  steuernummer: "12/345/67890",
  ust_id: "",
  kleinunternehmer: true,
  iban: "DE02120300000000202051",
  bic: "",
  bank_name: "",
  account_holder: "Mehmet Yılmaz",
};

beforeEach(() => {
  vi.clearAllMocks();
  h.getCurrentUser.mockResolvedValue({ id: "user-1" });
  h.completeOnboardingRpc.mockResolvedValue({ ok: true, companyId: "company-1" });
  h.prepareCompanyLogo.mockResolvedValue({
    ok: true,
    logo: {
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
      extension: "png",
    },
  });
  h.saveCompanyLogo.mockResolvedValue({ publicUrl: "https://example.test/logo.png" });
});

describe("completeOnboarding logo flow", () => {
  it("meldet konkrete Pflichtfelder einschließlich der IBAN", async () => {
    const result = await completeOnboarding("de", {
      ...form,
      name: "",
      street: "",
      iban: "",
    });

    expect(result).toEqual({
      ok: false,
      error: "required_fields",
      errors: {
        name: "name_required",
        street: "street_required",
        iban: "iban_required",
      },
    });
    expect(h.completeOnboardingRpc).not.toHaveBeenCalled();

    await completeOnboarding("de", { ...form, iban: "" });
    expect(h.completeOnboardingRpc).not.toHaveBeenCalled();
  });

  it("legt zuerst die Firma an und speichert danach das vorgemerkte Logo", async () => {
    const logoData = new FormData();
    logoData.set("logo", new File(["svg"], "logo.svg", { type: "image/svg+xml" }));

    const result = await completeOnboarding("de", form, logoData);

    expect(result).toEqual({ ok: true, logoUploaded: true });
    expect(h.completeOnboardingRpc).toHaveBeenCalledOnce();
    expect(h.saveCompanyLogo).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({ contentType: "image/png" }),
    );
    expect(h.completeOnboardingRpc.mock.invocationCallOrder[0]).toBeLessThan(
      h.saveCompanyLogo.mock.invocationCallOrder[0],
    );
  });

  it("erhält den erfolgreichen Setup-Abschluss bei einem Uploadfehler", async () => {
    h.saveCompanyLogo.mockResolvedValue({ error: "storage unavailable" });
    const logoData = new FormData();
    logoData.set("logo", new File(["png"], "logo.png", { type: "image/png" }));

    await expect(completeOnboarding("de", form, logoData)).resolves.toEqual({
      ok: false,
      error: "logoUploadFailed",
      setupCompleted: true,
    });
  });
});
