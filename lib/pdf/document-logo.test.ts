import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPdfLogo } from "./document-logo";

const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (previousSupabaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
  }
});

describe("loadPdfLogo", () => {
  it("lädt und rastert ein SVG für das finale PDF", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80"><text x="5" y="40">Firma</text></svg>';
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(svg, { headers: { "content-type": "image/svg+xml" } })),
    );

    const logo = await loadPdfLogo(
      "https://example.test/storage/v1/object/public/company-logos/company/logo.svg",
    );
    expect(logo?.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("fällt bei ungültigem Inhalt auf das Monogramm zurück", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not an image", { headers: { "content-type": "image/png" } })),
    );
    await expect(
      loadPdfLogo(
        "https://example.test/storage/v1/object/public/company-logos/company/logo.png",
      ),
    ).resolves.toBeNull();
  });

  it("ruft keine fremden Hosts aus logo_url auf", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadPdfLogo("https://attacker.test/logo.svg")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
