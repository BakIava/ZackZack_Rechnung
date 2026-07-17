import { describe, expect, it } from "vitest";
import {
  MAX_ONBOARDING_UPLOAD_BYTES,
  detectOnboardingDocumentMediaType,
  uploadBelongsToUser,
  validateOnboardingUploadMetadata,
} from "./extraction-file";

describe("onboarding extraction files", () => {
  it("erkennt die unterstützten Dateisignaturen", () => {
    expect(detectOnboardingDocumentMediaType(new TextEncoder().encode("%PDF-1.7")))
      .toBe("application/pdf");
    expect(detectOnboardingDocumentMediaType(new Uint8Array([0xff, 0xd8, 0xff])))
      .toBe("image/jpeg");
    expect(detectOnboardingDocumentMediaType(new Uint8Array([1, 2, 3])))
      .toBeNull();
  });

  it("begrenzt Typ und Dateigröße", () => {
    expect(validateOnboardingUploadMetadata("rechnung.pdf", "application/pdf", 42))
      .toBe("ok");
    expect(validateOnboardingUploadMetadata("rechnung.docx", "application/docx", 42))
      .toBe("unsupported_file");
    expect(validateOnboardingUploadMetadata(
      "rechnung.pdf",
      "application/pdf",
      MAX_ONBOARDING_UPLOAD_BYTES + 1,
    )).toBe("file_too_large");
  });

  it("akzeptiert nur den signierten Pfad des aktuellen Auth-Users", () => {
    const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const upload = {
      path: `${userId}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf`,
      fileName: "rechnung.pdf",
      contentType: "application/pdf" as const,
      size: 42,
    };
    expect(uploadBelongsToUser(upload, userId)).toBe(true);
    expect(uploadBelongsToUser(upload, "cccccccc-cccc-4ccc-8ccc-cccccccccccc"))
      .toBe(false);
  });
});
