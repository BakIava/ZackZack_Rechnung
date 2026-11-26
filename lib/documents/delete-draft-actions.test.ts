import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  deleteDraftDocumentRpc: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({ getCurrentUser: h.getCurrentUser }));
vi.mock("@/lib/repositories/document-draft-deletion", () => ({
  deleteDraftDocumentRpc: h.deleteDraftDocumentRpc,
}));

import { deleteDraft } from "./delete-draft-actions";

const ID = "6f1c2d3e-4a5b-4c6d-8e7f-90a1b2c3d4e5";

beforeEach(() => {
  vi.clearAllMocks();
  h.getCurrentUser.mockResolvedValue({ id: "user-1" });
  h.deleteDraftDocumentRpc.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("deleteDraft", () => {
  it("löscht den Entwurf über die SQL-Funktion", async () => {
    await expect(deleteDraft(ID)).resolves.toEqual({ ok: true });
    expect(h.deleteDraftDocumentRpc).toHaveBeenCalledWith(ID);
  });

  it("ruft ohne Anmeldung die Datenbank nicht auf", async () => {
    h.getCurrentUser.mockResolvedValue(null);
    await expect(deleteDraft(ID)).resolves.toEqual({ error: "notAuthenticated" });
    expect(h.deleteDraftDocumentRpc).not.toHaveBeenCalled();
  });

  it("lehnt eine ungültige ID ab, ohne die Datenbank zu fragen", async () => {
    await expect(deleteDraft("kein-uuid")).resolves.toEqual({ error: "draftNotDeletable" });
    expect(h.deleteDraftDocumentRpc).not.toHaveBeenCalled();
  });

  it.each([
    "draft_not_deletable",
    "numbered_document_delete_forbidden",
    "linked_document_delete_forbidden",
    "finalized_document_immutable",
  ])("bildet die Sperre %s auf draftNotDeletable ab", async (message) => {
    h.deleteDraftDocumentRpc.mockResolvedValue({ errorMessage: message });
    await expect(deleteDraft(ID)).resolves.toEqual({ error: "draftNotDeletable" });
  });

  it("bildet fehlende Anmeldung in der Datenbank ab", async () => {
    h.deleteDraftDocumentRpc.mockResolvedValue({
      errorMessage: "draft_delete_not_authenticated",
    });
    await expect(deleteDraft(ID)).resolves.toEqual({ error: "notAuthenticated" });
  });

  it("gibt unbekannte Datenbankfehler nicht roh weiter", async () => {
    h.deleteDraftDocumentRpc.mockResolvedValue({ errorMessage: "connection reset" });
    await expect(deleteDraft(ID)).resolves.toEqual({ error: "unknown" });
  });
});
