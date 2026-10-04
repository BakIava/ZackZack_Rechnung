import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PDF_DIR = path.join(process.cwd(), "lib", "pdf");
const TEMPLATES_DIR = path.join(PDF_DIR, "templates");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Alles, was eine Vorlage ausmacht: Layouts unter templates/ plus das Standard-View-Model. */
const TEMPLATE_FILES = [...sourceFiles(TEMPLATES_DIR), path.join(PDF_DIR, "pdf-view-model.ts")];

/** Berechnung, Formatierung und Datenzugriff gehören in render-data bzw. Repositories. */
const FORBIDDEN_IN_TEMPLATES: Array<[string, RegExp]> = [
  ["Steuer-/Summenlogik", /@\/lib\/documents\/(tax|margin|document-dates)["']/],
  ["Datenzugriff", /@\/lib\/(supabase|repositories)\//],
  ["Formatierer", /@\/lib\/format["']/],
  ["Geld-/Datumsformatierung", /\bformat(Money|DateDE|DateShort|Percent|Decimal|RateDecimal|QuantityDecimal)\b/],
  ["Summen-/Zeilenberechnung", /\bcalculate(DocumentTotals|LineAmounts|PageSubtotal)\b/],
  ["§19-/USt.-Entscheidung", /\b(shouldShowTaxDetails|resolveTaxRate|resolveDocumentDefaultTaxRate)\b/],
  ["Margenberechnung", /\bcomputeUnitPrice\b/],
  ["Datums-/Zahlungszielberechnung", /\b(zahlungszielText|faelligkeitsdatum|serviceTimingDisplay)\b/],
  ["Empfängerableitung", /\bgetCustomerName\b/],
  ["Supabase-Aufruf", /\.(from|rpc)\(\s*["']/],
];

describe("Vorlagen enthalten keine Geschäftslogik", () => {
  it("findet die Vorlagendateien", () => {
    expect(TEMPLATE_FILES.map((file) => path.basename(file))).toEqual(
      expect.arrayContaining([
        "standard-template.tsx",
        "ths-classic-template.tsx",
        "ths-classic-table.tsx",
        "ths-classic-blocks.tsx",
        "ths-classic-layout.ts",
        "erhan-excel-template.tsx",
        "erhan-excel-table.tsx",
        "erhan-excel-blocks.tsx",
        "erhan-excel-layout.ts",
        "template-registry.tsx",
        "pdf-view-model.ts",
      ]),
    );
  });

  it.each(TEMPLATE_FILES.map((file) => [path.relative(process.cwd(), file), file]))(
    "%s rechnet, formatiert und liest keine Daten",
    (_label, file) => {
      const source = readFileSync(file, "utf8");
      const violations = FORBIDDEN_IN_TEMPLATES
        .filter(([, pattern]) => pattern.test(source))
        .map(([rule]) => rule);
      expect(violations).toEqual([]);
    },
  );
});

describe("Renderdaten enthalten keine vorlagenspezifische Logik", () => {
  const source = readFileSync(path.join(PDF_DIR, "render-data.ts"), "utf8");

  it("kennt weder Vorlagen-Module noch Vorlagen-IDs", () => {
    expect(source).not.toMatch(/from\s+["'][^"']*templates/);
    expect(source).not.toMatch(/["'](standard|ths-classic|erhan-excel)["']/);
  });

  it("hängt nicht von React-PDF oder Layout-Styles ab", () => {
    expect(source).not.toMatch(/@react-pdf\/renderer|document-pdf\.styles|document-pages/);
  });
});
