import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import "./ai-intake-field.css";

/** Breite im 6-Spalten-Raster: voll, halb, breit (⅔) oder schmal (⅓). */
export type AiIntakeFieldWidth = "full" | "half" | "wide" | "narrow";

interface AiIntakeFieldsProps {
  children: ReactNode;
}

/** Raster der Formularfelder im KI-Erfassungsdialog. */
export function AiIntakeFields({ children }: AiIntakeFieldsProps) {
  return <div className="ai-intake-fields">{children}</div>;
}

interface AiIntakeFieldProps {
  label: string;
  optional?: boolean;
  width?: AiIntakeFieldWidth;
  /** "div" für Button-Gruppen – ein <label> würde sonst den ersten Button auslösen. */
  as?: "label" | "div";
  children: ReactNode;
}

/** Feldzeile: Label (+ „optional") über einem input/textarea im einheitlichen Stil. */
export function AiIntakeField({
  label,
  optional = false,
  width = "full",
  as: Tag = "label",
  children,
}: AiIntakeFieldProps) {
  const t = useTranslations("AiIntake");
  return (
    <Tag className={`ai-intake-field ai-intake-field--${width}`}>
      <span className="ai-intake-field-label">
        {label}
        {optional && <span className="ai-intake-field-optional">{t("optional")}</span>}
      </span>
      {children}
    </Tag>
  );
}
