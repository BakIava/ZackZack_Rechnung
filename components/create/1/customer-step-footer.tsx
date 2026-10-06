"use client";

import { Check, ChevronLeft, ChevronRight, Loader2, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CustomerListItem } from "@/types/customer";
import "./customer-step-footer.css";

const STROKE = 1.75;
const STROKE_BOLD = 2.4;

interface CustomerStepFooterProps {
  dir: "ltr" | "rtl";
  inert: boolean;
  selectedCustomer: CustomerListItem | null;
  saveError: string | null;
  saving: boolean;
  editLoadingId: string | null;
  showFixHint: boolean;
  onEdit: (id: string) => void;
  onNext: () => void;
}

export function CustomerStepFooter({ dir, inert, selectedCustomer, saveError, saving,
  editLoadingId, showFixHint, onEdit, onNext }: CustomerStepFooterProps) {
  const t = useTranslations("Create");
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
      <div className="dflow-foot" inert={inert}>
        <div className="dflow-foot-sel">
          {saveError ? (
            <span className="dflow-error">{saveError}</span>
          ) : selectedCustomer ? (
            <>
              <Check
                size={16}
                strokeWidth={STROKE_BOLD}
                color="var(--ok)"
                aria-hidden
              />
              <span>
                <b>                
                {selectedCustomer.firstname
                  ? `${selectedCustomer.firstname} ${selectedCustomer.lastname}`
                  : ""}
                </b>{" "}
                {t("selected")}
              </span>
              <button
                type="button"
                className={`dflow-edit${showFixHint ? " dflow-edit--pulse" : ""}`}
                onClick={() => onEdit(selectedCustomer.id)}
                disabled={editLoadingId !== null}
              >
                {editLoadingId === selectedCustomer.id ? (
                  <Loader2
                    size={15}
                    strokeWidth={STROKE_BOLD}
                    className="dbtn-spin"
                    aria-hidden
                  />
                ) : (
                  <Pencil size={15} strokeWidth={STROKE} aria-hidden />
                )}
                {t("editCustomer")}
              </button>
            </>
          ) : (
            <span>{t("customerOptionalHint")}</span>
          )}
        </div>
        <button
          type="button"
          className="step1-next-button"
          disabled={saving}
          onClick={onNext}
        >
          {saving ? (
            <Loader2
              size={20}
              strokeWidth={STROKE_BOLD}
              className="dbtn-spin"
              aria-hidden
            />
          ) : (
            <Chevron size={20} strokeWidth={STROKE_BOLD} aria-hidden />
          )}
          {t("next")}
        </button>
      </div>
  );
}
