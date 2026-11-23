"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DraftItem } from "@/types/document";
import "./additional-description-sheet.css";

interface AdditionalDescriptionSheetProps {
  item: DraftItem;
  onPreview: (value: string) => void;
  onCommit: (value: string) => void;
  onClose: () => void;
}

/** Eigener Editor für den optionalen deutschen Zeilentext. */
export function AdditionalDescriptionSheet({
  item,
  onPreview,
  onCommit,
  onClose,
}: AdditionalDescriptionSheetProps) {
  const t = useTranslations("Step2");
  const [value, setValue] = useState(item.additionalDescriptionDe ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <>
      <div className="zz-sheet-h">
        <div className="zz-sheet-tt">
          <span className="zz-sheet-lbl">{t("additionalDescriptionTitle")}</span>
          <span className="zz-sheet-name">{item.descriptionDe}</span>
        </div>
        <button type="button" className="zz-x" onClick={onClose} aria-label={t("close")}>
          <X size={18} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <p className="additional-description-sheet__hint" id="additional-description-hint">
        {t("additionalDescriptionHint")}
      </p>
      <textarea
        ref={textareaRef}
        className="additional-description-sheet__textarea"
        aria-label={t("additionalDescriptionTitle")}
        aria-describedby="additional-description-hint"
        dir="ltr"
        lang="de"
        value={value}
        placeholder={t("additionalDescriptionPlaceholder")}
        onChange={(event) => {
          setValue(event.target.value);
          onPreview(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            onCommit(value);
          }
        }}
      />
      <button type="button" className="zz-done" onClick={() => onCommit(value)}>
        <Check size={19} strokeWidth={2.4} aria-hidden />
        {t("save")}
      </button>
    </>
  );
}
