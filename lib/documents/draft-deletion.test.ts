import { describe, expect, it } from "vitest";
import { isDeletableDraft } from "./draft-deletion";

const draft = { id: "doc-1", status: "draft" as const, documentNumber: null };

describe("isDeletableDraft", () => {
  it("erlaubt einen normalen Entwurf ohne Nummer", () => {
    expect(isDeletableDraft(draft, [])).toBe(true);
  });

  it("ignoriert Verknüpfungen anderer Belege", () => {
    expect(isDeletableDraft(draft, [{ targetDocumentId: "doc-2" }])).toBe(true);
  });

  it("sperrt eine wieder geöffnete Rechnung mit Nummer", () => {
    expect(isDeletableDraft({ ...draft, documentNumber: "R-2026-041" }, [])).toBe(false);
  });

  it("sperrt umgewandelte und angepasste Entwürfe (Ziel einer Verknüpfung)", () => {
    expect(isDeletableDraft(draft, [{ targetDocumentId: "doc-1" }])).toBe(false);
  });

  it.each(["finalized", "sent", "paid", "cancelled"] as const)(
    "sperrt festgeschriebene Belege (%s)",
    (status) => {
      expect(isDeletableDraft({ ...draft, status }, [])).toBe(false);
    },
  );
});
