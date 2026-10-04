/**
 * Glyphbreiten der eingebetteten Dokumentschrift (Hanken Grotesk, lib/pdf/fonts)
 * für eine exakte, synchrone Zeilenplanung — in Node und im Browser gleich.
 *
 * Vorlagen, die ihre Zellen selbst umbrechen (`wrapTextToWidth`), übergeben
 * React-PDF nur noch Zeilen, die nachweislich passen: geplante und gerenderte
 * Zeilenzahl stimmen dann überein, unabhängig von Versalien oder Komposita.
 *
 * Breiten in 1/1000 em, erzeugt aus den TTF-Dateien (fontkit `advanceWidth`).
 * Kerning bleibt unberücksichtigt — es verkürzt Zeilen nur, die Planung bleibt
 * damit auf der sicheren Seite. Unbekannte Zeichen zählen mit 1060 (breiter als
 * jedes Zeichen der Tabelle). Bei einem Schriftwechsel muss die Tabelle neu
 * erzeugt werden; text-metrics.test.ts prüft sie gegen gerenderte PDFs.
 */

const CHARS =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~" +
  "ÄÖÜäöüßÉÈÁÀÂÊÎÔÛéèáàâêîôûçÇğĞıİşŞ€§°²³–—„“”‚‘’…·×÷µ½¼¾«»";

const REGULAR = [
  260, 240, 338, 699, 560, 747, 686, 174, 222, 222, 398, 560, 240, 327, 240, 418, 560, 560, 560, 560,
  560, 560, 560, 560, 560, 560, 240, 240, 560, 560, 560, 516, 874, 637, 601, 704, 682, 585, 565, 731,
  678, 246, 552, 634, 495, 839, 676, 748, 554, 774, 598, 564, 587, 656, 656, 957, 641, 602, 582, 258,
  448, 258, 552, 405, 292, 540, 587, 518, 587, 540, 335, 514, 547, 226, 226, 532, 265, 828, 547, 577,
  587, 587, 407, 470, 346, 547, 521, 748, 520, 521, 472, 239, 258, 239, 560, 637, 748, 656, 540, 577,
  547, 634, 585, 585, 637, 637, 637, 585, 246, 748, 656, 540, 540, 540, 540, 540, 540, 226, 577, 547,
  518, 704, 514, 731, 226, 246, 470, 564, 560, 577, 418, 418, 413, 412, 1058, 387, 436, 438, 288, 263,
  263, 668, 334, 560, 560, 547, 751, 714, 795, 469, 467,
];

const BOLD = [
  260, 252, 366, 694, 560, 735, 700, 193, 277, 277, 399, 560, 240, 327, 240, 420, 560, 560, 560, 560,
  560, 560, 560, 560, 560, 560, 240, 240, 560, 560, 560, 515, 873, 674, 611, 709, 674, 578, 558, 735,
  693, 263, 556, 663, 504, 856, 689, 747, 562, 785, 612, 575, 584, 657, 672, 979, 670, 625, 605, 299,
  467, 299, 627, 493, 312, 546, 574, 522, 574, 541, 348, 522, 564, 245, 245, 560, 278, 843, 564, 572,
  574, 574, 426, 472, 367, 564, 535, 755, 542, 535, 471, 283, 271, 283, 560, 674, 747, 657, 546, 572,
  564, 651, 578, 578, 674, 674, 674, 578, 263, 747, 657, 541, 541, 546, 546, 546, 541, 245, 572, 564,
  522, 709, 522, 735, 245, 263, 472, 575, 560, 606, 422, 407, 400, 428, 1058, 437, 462, 463, 285, 270,
  270, 692, 308, 560, 560, 564, 804, 764, 842, 541, 459,
];

const UNKNOWN = 1060;

export type FontWeightName = "regular" | "bold";

function table(weight: FontWeightName): Map<string, number> {
  const widths = weight === "bold" ? BOLD : REGULAR;
  return new Map(Array.from(CHARS).map((char, index) => [char, widths[index]]));
}

const TABLES: Record<FontWeightName, Map<string, number>> = {
  regular: table("regular"),
  bold: table("bold"),
};

/** Breite eines einzeiligen Textes in Punkten. */
export function measureText(text: string, fontSize: number, weight: FontWeightName = "regular"): number {
  const widths = TABLES[weight];
  let units = 0;
  for (const char of text) units += widths.get(char) ?? UNKNOWN;
  return (units / 1000) * fontSize;
}

function splitLongWord(word: string, maxWidth: number, fontSize: number, weight: FontWeightName): string[] {
  const parts: string[] = [];
  let current = "";
  for (const char of word) {
    if (current && measureText(current + char, fontSize, weight) > maxWidth) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * Bricht Text gierig an Leerzeichen auf `maxWidth` Punkte um; harte Umbrüche
 * bleiben erhalten, überlange Wörter werden zeichenweise geteilt. Jede
 * Ergebniszeile ist höchstens `maxWidth` breit.
 */
export function wrapTextToWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  weight: FontWeightName = "regular",
): string[] {
  return text.split("\n").flatMap((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measureText(candidate, fontSize, weight) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (measureText(word, fontSize, weight) <= maxWidth) {
        line = word;
      } else {
        const parts = splitLongWord(word, maxWidth, fontSize, weight);
        lines.push(...parts.slice(0, -1));
        line = parts.at(-1) ?? "";
      }
    }
    lines.push(line);
    return lines;
  });
}
