"use client";

import { ArrowUpDown, ListChecks, Percent, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import "./position-selection-bar.css";

interface PositionSelectionBarProps {
  active: boolean;
  count: number;
  pending: boolean;
  outcomeUnknown: boolean;
  showOutcomeError: boolean;
  onStart: () => void;
  onEnd: () => void;
  onDelete: () => void;
  onVat: () => void;
  onReorder?: () => void;
}

export function PositionSelectionBar({
  active, count, pending, outcomeUnknown, showOutcomeError, onStart, onEnd, onDelete, onVat, onReorder,
}: PositionSelectionBarProps) {
  const t = useTranslations("Step2");
  const disabled = pending || outcomeUnknown || count === 0;
  return (
    <div className="position-selection-bar">
      {showOutcomeError && (
        <p className="position-selection-bar-error" role="alert">{t("bulkOutcomeUnknown")}</p>
      )}
      {active ? (
        <div className="position-selection-bar-controls" role="group" aria-label={t("bulkSelectionActions")}>
          <span className="position-selection-bar-count" role="status">{t("bulkSelectedCount", { count })}</span>
          <Button type="button" variant="outline" disabled={disabled} onClick={onVat}>
            <Percent aria-hidden /> {t("bulkEditVat")}
          </Button>
          <Button type="button" variant="destructive" className="position-selection-bar-delete" disabled={disabled} onClick={onDelete}>
            <Trash2 aria-hidden /> {t("delete")}
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={onEnd}>
            <X aria-hidden /> {t("bulkSelectionEnd")}
          </Button>
        </div>
      ) : (
        <div className="position-selection-bar-controls">
          {onReorder && (
            <Button type="button" variant="outline" className="d2-reorder-open" disabled={pending} onClick={onReorder}>
              <ArrowUpDown aria-hidden /> {t("reorderOpen")}
            </Button>
          )}
          <Button type="button" variant="outline" disabled={pending || outcomeUnknown} onClick={onStart}>
            <ListChecks aria-hidden /> {t("bulkSelect")}
          </Button>
        </div>
      )}
    </div>
  );
}
