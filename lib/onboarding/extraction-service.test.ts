import { describe, expect, it, vi } from "vitest";
import { ONBOARDING_EXTRACTABLE_FIELDS } from "@/types/onboarding-extraction";
import type { RawOnboardingExtraction } from "@/lib/integrations/anthropic/onboarding-extraction-contract";
import { processOnboardingExtraction } from "./extraction-service";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const upload = {
  path: `${USER_ID}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf`,
  fileName: "rechnung.pdf",
  contentType: "application/pdf" as const,
  size: 8,
};

function extraction(): RawOnboardingExtraction {
  const values = Object.fromEntries(
    ONBOARDING_EXTRACTABLE_FIELDS.map((field) => [
      field,
      field === "kleinunternehmer" ? "unknown" : "",
    ]),
  ) as RawOnboardingExtraction["values"];
  values.name = "Yılmaz Malerbetrieb";
  return {
    values,
    detected_fields: ["name"],
    ambiguous_fields: [],
    warnings: [],
  };
}

function dependencies() {
  return {
    downloadUpload: vi.fn().mockResolvedValue(
      new Blob([new TextEncoder().encode("%PDF-1.7")], { type: "application/pdf" }),
    ),
    deleteUpload: vi.fn().mockResolvedValue(true),
    consumeQuota: vi.fn().mockResolvedValue({ allowed: true }),
    extractDocument: vi.fn().mockResolvedValue(extraction()),
  };
}

describe("onboarding extraction service", () => {
  it("liefert normalisierte Ausstellerdaten und löscht den Upload", async () => {
    const deps = dependencies();
    const result = await processOnboardingExtraction(USER_ID, upload, deps);
    expect(result).toMatchObject({
      status: "success",
      values: { name: "Yılmaz Malerbetrieb" },
    });
    expect(deps.deleteUpload).toHaveBeenCalledWith(upload.path);
  });

  it("löscht auch nach einem Providerfehler", async () => {
    const deps = dependencies();
    deps.extractDocument.mockRejectedValue(new Error("provider secret"));
    await expect(processOnboardingExtraction(USER_ID, upload, deps)).resolves.toEqual({
      status: "error",
      error: "provider_unavailable",
    });
    expect(deps.deleteUpload).toHaveBeenCalledOnce();
  });

  it("ruft Claude bei falscher Dateisignatur nicht auf", async () => {
    const deps = dependencies();
    deps.downloadUpload.mockResolvedValue(new Blob(["not a pdf"]));
    const result = await processOnboardingExtraction(USER_ID, upload, deps);
    expect(result).toEqual({ status: "error", error: "invalid_document" });
    expect(deps.extractDocument).not.toHaveBeenCalled();
    expect(deps.deleteUpload).toHaveBeenCalledOnce();
  });

  it("blockiert fremde Objektpfade vor jedem Storage-Zugriff", async () => {
    const deps = dependencies();
    const result = await processOnboardingExtraction(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      upload,
      deps,
    );
    expect(result).toEqual({ status: "error", error: "invalid_document" });
    expect(deps.downloadUpload).not.toHaveBeenCalled();
  });
});
