"use client";

import { useId, useRef } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import type { DeleteDraftError } from "@/lib/documents/delete-draft-actions";
import "./delete-draft-dialog.css";

interface DeleteDraftDialogProps {
  dir: "ltr" | "rtl";
  pending: boolean;
  error: DeleteDraftError | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Rückfrage vor „Entwurf löschen". Der Fokus startet auf „Abbrechen", weil
 * Löschen endgültig ist; Escape/Backdrop brechen ab, solange nichts läuft.
 */
export function DeleteDraftDialog({
  dir,
  pending,
  error,
  onConfirm,
  onCancel,
}: DeleteDraftDialogProps) {
  const t = useTranslations("Documents");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return (
    <Modal
      open
      onClose={onCancel}
      dir={dir}
      size="sm"
      busy={pending}
      labelledBy={titleId}
      initialFocus={cancelRef}
    >
      <div className="delete-draft-dialog">
        <span className="delete-draft-dialog-icon">
          <Trash2 size={22} strokeWidth={1.75} aria-hidden />
        </span>
        <h2 id={titleId}>{t("deleteDraftTitle")}</h2>
        <p>{t("deleteDraftBody")}</p>
        {error && (
          <p className="delete-draft-dialog-error" role="alert">
            {t(error === "draftNotDeletable" ? "deleteDraftLocked" : "deleteDraftError")}
          </p>
        )}
        <div className="delete-draft-dialog-actions">
          <Button type="button" variant="outline" size="touch" ref={cancelRef}
            disabled={pending} onClick={onCancel}>
            {t("deleteDraftCancel")}
          </Button>
          <Button type="button" variant="destructive" size="touch"
            disabled={pending || error === "draftNotDeletable"} onClick={onConfirm}>
            {pending ? t("deletingDraft") : t("deleteDraftConfirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
