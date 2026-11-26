"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteDraft, type DeleteDraftError } from "@/lib/documents/delete-draft-actions";
import { DeleteDraftDialog } from "./delete-draft-dialog";
import "./delete-draft-button.css";

interface DeleteDraftButtonProps {
  documentId: string;
  dir: "ltr" | "rtl";
  /** "icon": Papierkorb neben der Listenzeile; "label": Knopf mit Text im Flow-Kopf. */
  variant: "icon" | "label";
  /** Nach erfolgreichem Löschen: Liste neu laden bzw. zur Liste navigieren. */
  onDeleted: () => void;
}

/**
 * „Entwurf löschen" mit Rückfrage. Nur für Entwürfe ohne Nummer und ohne
 * Verknüpfung einblenden (`deletable`); die Datenbank prüft es noch einmal.
 */
export function DeleteDraftButton({ documentId, dir, variant, onDeleted }: DeleteDraftButtonProps) {
  const t = useTranslations("Documents");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<DeleteDraftError | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpen() {
    setError(null);
    setOpen(true);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteDraft(documentId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onDeleted();
    });
  }

  return (
    <>
      <button
        type="button"
        className={`ddraft-btn ddraft-btn--${variant}`}
        aria-label={variant === "icon" ? t("deleteDraftAria") : undefined}
        title={variant === "icon" ? t("deleteDraftAria") : undefined}
        onClick={handleOpen}
      >
        <Trash2 size={variant === "icon" ? 19 : 17} strokeWidth={1.75} aria-hidden />
        {variant === "label" && t("deleteDraft")}
      </button>
      {open && (
        <DeleteDraftDialog
          dir={dir}
          pending={pending}
          error={error}
          onConfirm={handleConfirm}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
