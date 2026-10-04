import path from "node:path";
import { readFile } from "node:fs/promises";

export const runtime = "nodejs";

interface FontRouteContext {
  params: Promise<{ weight: string }>;
}

const FONT_FILES: Record<string, string> = {
  regular: "HankenGrotesk-Regular.ttf",
  bold: "HankenGrotesk-Bold.ttf",
};

/** Authentifizierte, self-hosted Schriftquelle für den Browser-Renderer. */
export async function GET(_request: Request, { params }: FontRouteContext) {
  const { weight } = await params;
  const fileName = FONT_FILES[weight];
  if (!fileName) return new Response("Not found", { status: 404 });

  const file = await readFile(path.join(process.cwd(), "lib", "pdf", "fonts", fileName));
  return new Response(file, {
    headers: {
      "Content-Type": "font/ttf",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
