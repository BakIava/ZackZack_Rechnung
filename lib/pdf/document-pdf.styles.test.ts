import { describe, expect, it } from "vitest";
import { pdfStyles } from "./document-pdf.styles";

describe("document-pdf header layout", () => {
  it("reserviert auch ohne Telefon oder E-Mail ausreichend Platz für das Logo", () => {
    expect(pdfStyles.top).toMatchObject({
      minHeight: 72,
      paddingBottom: 8,
    });
  });

  it("setzt den Positionsnamen stärker als die vollständige Beschreibung", () => {
    expect(pdfStyles.itemName).toMatchObject({ fontSize: 10, fontWeight: "bold" });
    expect(pdfStyles.itemDescription).toMatchObject({ fontSize: 8.5, fontWeight: "normal" });
    expect(pdfStyles.itemDescription).not.toHaveProperty("maxLines");
    expect(pdfStyles.itemDescription).not.toHaveProperty("textOverflow");
  });
});
