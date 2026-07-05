import { describe, expect, it } from "vitest";
import { shareMessage, shareSubject } from "./share-message";

describe("share-message – immer Deutsch, deterministisch", () => {
  it("Betreff nennt Belegart + Nummer", () => {
    expect(shareSubject("invoice", "R-2026-041")).toBe("Rechnung R-2026-041");
    expect(shareSubject("offer", "A-2026-088")).toBe("Angebot A-2026-088");
  });

  it("Begleittext ist höflich, deutsch, mit Grußzeile", () => {
    const msg = shareMessage("invoice", "R-2026-041", "Yılmaz Malerbetrieb");
    expect(msg).toContain("Guten Tag");
    expect(msg).toContain("Ihre Rechnung R-2026-041");
    expect(msg).toContain("Mit freundlichen Grüßen");
    expect(msg).toContain("Yılmaz Malerbetrieb");
  });

  it("ohne Firmenname keine leere Grußzeile", () => {
    const msg = shareMessage("offer", "A-2026-088", null);
    expect(msg).toContain("Ihr Angebot A-2026-088");
    expect(msg).not.toContain("Mit freundlichen Grüßen");
  });

  it("gleiche Eingabe → gleiche Ausgabe", () => {
    expect(shareMessage("invoice", "R-1", "X")).toBe(shareMessage("invoice", "R-1", "X"));
  });
});
