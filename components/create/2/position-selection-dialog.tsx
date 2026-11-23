"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import { SUPPORTED_TAX_RATES } from "@/lib/documents/tax";
import type { BulkItemError } from "@/lib/documents/item-bulk-actions";
import type { DraftItem, DraftItemBatchChange, TaxRate } from "@/types/document";
import "./position-selection-dialog.css";

interface PositionSelectionDialogProps {
  kind: DraftItemBatchChange["kind"];
  items: DraftItem[];
  defaultRate: TaxRate;
  dir: "ltr" | "rtl";
  pending: boolean;
  error: BulkItemError | null;
  onClose: () => void;
  onSubmit: (change: DraftItemBatchChange) => void;
}

function initialRate(items: DraftItem[]): TaxRate | null | undefined {
  const rates = new Set(items.map((item) => item.taxRateOverridden ? item.taxRate : null));
  return rates.size === 1 ? rates.values().next().value : undefined;
}

export function PositionSelectionDialog({
  kind, items, defaultRate, dir, pending, error, onClose, onSubmit,
}: PositionSelectionDialogProps) {
  const t = useTranslations("Step2");
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const optionsName = useId();
  const [rate, setRate] = useState(() => initialRate(items));
  const count = items.length;
  const title = kind === "delete" ? t("bulkDeleteTitle", { count }) : t("bulkEditVat");
  const canSubmit = !pending && error !== "bulkOutcomeUnknown" && count > 0 && (kind === "delete" || rate !== undefined);

  function submit() {
    if (kind === "delete") onSubmit({ kind });
    else if (rate !== undefined) onSubmit({ kind, taxRate: rate });
  }

  return (
    <Modal open onClose={onClose} dir={dir} size="sm" busy={pending} labelledBy={titleId}
      initialFocus={kind === "delete" ? cancel : undefined}>
      <div className="position-selection-dialog">
        <h2 id={titleId}>{title}</h2>
        {kind === "vat" && (
          <fieldset className="position-selection-dialog-rates" disabled={pending}>
            <legend>{t("bulkVatForCount", { count })}</legend>
            {[null, ...SUPPORTED_TAX_RATES].map((option) => (
              <label key={option ?? "default"}>
                <input type="radio" name={optionsName} checked={option === rate} onChange={() => setRate(option)} />
                {option === null ? t("vatStdOn", { rate: defaultRate }) : <bdi dir="ltr">{option} %</bdi>}
              </label>
            ))}
          </fieldset>
        )}
        {error && (
          <p className="position-selection-dialog-error" role="alert">
            {t(error === "bulkOutcomeUnknown" ? "bulkOutcomeUnknown"
              : error === "selectionChanged" || error === "draftNotFound" ? "bulkSelectionChanged" : "bulkSaveFailed")}
          </p>
        )}
        <div className="position-selection-dialog-actions">
          <Button type="button" variant="outline" ref={cancel} disabled={pending} onClick={onClose}>{t("cancel")}</Button>
          <Button type="button" variant={kind === "delete" ? "destructive" : "default"} disabled={!canSubmit} onClick={submit}>
            {pending ? t("bulkSaving") : t(kind === "delete" ? "delete" : "bulkApplyVat")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
