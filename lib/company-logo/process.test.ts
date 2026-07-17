import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  COMPANY_LOGO_MAX_BYTES,
  validateCompanyLogoSelection,
} from "./constants";
import { prepareCompanyLogo } from "./process";

function file(bytes: Uint8Array, name: string, type: string): File {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new File([copy], name, { type });
}

describe("company logo validation", () => {
  it("akzeptiert PNG, JPEG und SVG bis 2 MB", () => {
    expect(validateCompanyLogoSelection(file(new Uint8Array([1]), "logo.png", "image/png"))).toBeNull();
    expect(validateCompanyLogoSelection(file(new Uint8Array([1]), "logo.jpg", "image/jpeg"))).toBeNull();
    expect(validateCompanyLogoSelection(file(new Uint8Array([1]), "logo.svg", "image/svg+xml"))).toBeNull();
  });

  it("lehnt unbekannte Typen und Dateien über 2 MB ab", () => {
    expect(validateCompanyLogoSelection(file(new Uint8Array([1]), "logo.webp", "image/webp"))).toBe("logoTypeInvalid");
    expect(
      validateCompanyLogoSelection(
        file(new Uint8Array(COMPANY_LOGO_MAX_BYTES + 1), "logo.png", "image/png"),
      ),
    ).toBe("logoTooLarge");
  });

  it("prüft echte Bildbytes und rastert SVG zu PNG", async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80"><rect width="320" height="80" fill="#fb6202"/></svg>',
    );
    const result = await prepareCompanyLogo(file(svg, "wordmark.svg", "image/svg+xml"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.logo.contentType).toBe("image/png");
    expect((await sharp(result.logo.bytes).metadata()).format).toBe("png");
  });

  it("lehnt MIME-Manipulation und aktive/externe SVG-Inhalte ab", async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 4, background: "#ffffff" },
    }).png().toBuffer();
    const mismatch = await prepareCompanyLogo(
      file(new Uint8Array(png), "fake.jpg", "image/jpeg"),
    );
    expect(mismatch).toEqual({ ok: false, error: "logoContentInvalid" });

    const unsafeSvg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    expect(await prepareCompanyLogo(file(unsafeSvg, "unsafe.svg", "image/svg+xml")))
      .toEqual({ ok: false, error: "logoContentInvalid" });

    const externalSvg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://attacker.test/pixel.png"/></svg>',
    );
    expect(await prepareCompanyLogo(file(externalSvg, "external.svg", "image/svg+xml")))
      .toEqual({ ok: false, error: "logoContentInvalid" });
  });
});
