/**
 * Font-Registrierung für den PDF-Beleg. Die eingebettete Schrift ist die
 * Marken-UI-Schrift (Hanken Grotesk) — so gleicht der PDF-Look der A4-Vorschau
 * am Bildschirm. Wichtig: Standard-Helvetica deckt Türkisch (ı ş ğ İ) NICHT ab;
 * die Zielgruppe trägt genau solche Namen (z. B. „Yılmaz"). Hanken Grotesk deckt
 * Latin Extended inkl. Türkisch sowie €/§ ab.
 *
 * Die TTFs liegen im Repo (lib/pdf/fonts) und werden als Bytes eingebettet →
 * offline-fähig, deterministisch, kein Nachladen zur Renderzeit. SIL-OFL, siehe
 * lib/pdf/fonts/OFL.txt.
 */

import path from "node:path";
import { Font } from "@react-pdf/renderer";

export const PDF_FONT_FAMILY = "ZackZack Sans";

let registered = false;

export function registerPdfFonts(): void {
  if (registered) return;

  const dir = path.join(process.cwd(), "lib", "pdf", "fonts");
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: path.join(dir, "HankenGrotesk-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(dir, "HankenGrotesk-Bold.ttf"), fontWeight: "bold" },
    ],
  });

  // Deutsche Begriffe nicht automatisch trennen (react-pdf würde sonst mit „-"
  // umbrechen); wir geben das Wort unverändert zurück.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
