"use client";

import { Font } from "@react-pdf/renderer";
import { PDF_FONT_FAMILY } from "@/lib/pdf/pdf-font-family";

let registered = false;

/** Browser-Registrierung; enthält bewusst keine Node-/fs-Abhängigkeit. */
export function registerBrowserPdfFonts(): void {
  if (registered) return;
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: "/api/document-renderer/font/regular", fontWeight: "normal" },
      { src: "/api/document-renderer/font/bold", fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
