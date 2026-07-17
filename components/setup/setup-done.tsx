"use client";

import "./setup-done.css";
import { SetupIcon } from "./setup-icon";
import { type Translations, type Lang } from "./translations";
import { LangLink, DesktopBar } from "./setup-primitives";
import type { SetupFormData } from "@/types/company";

interface DoneProps {
  t: Translations;
  lang: Lang;
  dir: "ltr" | "rtl";
  isMobile: boolean;
  onComplete: () => void;
  onDashboard: () => void;
  formData: SetupFormData;
  logoUploaded: boolean;
  logoSkippedLabel: string;
}

export function SetupDone({
  t,
  lang,
  dir,
  isMobile,
  onComplete,
  onDashboard,
  formData,
  logoUploaded,
  logoSkippedLabel,
}: DoneProps) {
  const contact = formData.email || formData.phone || formData.mobile || "—";
  const bank = formData.iban || "—";
  const logo = logoUploaded ? t.logoDone : logoSkippedLabel;

  if (isMobile) {
    const sumRows = [
      { ic: "building", lbl: t.sumBetrieb, val: formData.name },
      { ic: "phone", lbl: t.sumKontakt, val: contact },
      { ic: "idcard", lbl: t.sumSteuer, val: formData.steuernummer },
      { ic: "shieldCheck", lbl: t.sumKu, val: t.kuShort },
      { ic: "bank", lbl: t.sumBank, val: bank },
      { ic: "brush", lbl: t.sumLogo, val: logo },
    ];
    return (
      <div className="ob-root" dir={dir}>
        <div className="ob-done">
          <div className="ob-done-check">
            <SetupIcon name="check" size={46} weight="bold" />
          </div>
          <div className="ob-done-t">{t.doneT}</div>
          <div className="ob-done-s">{t.doneS}</div>
          <div className="ob-summary">
            {sumRows.map((r, i) => (
              <div className="ob-sum-row" key={i}>
                <div className="ob-sum-ic"><SetupIcon name={r.ic} size={19} /></div>
                <div className="ob-sum-tx">
                  <div className="ob-sum-lbl">{r.lbl}</div>
                  <div className="ob-sum-val">{r.val}</div>
                </div>
                <div className="ob-sum-check">
                  <SetupIcon name="check" size={14} weight="bold" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="ob-done-foot">
          <button className="ob-next ob-next--gold" onClick={onComplete}>
            <SetupIcon name="plus" size={20} weight="bold" />{t.firstInvoice}
          </button>
          <button className="ob-skip" onClick={onDashboard}><b>{t.toDash}</b></button>
          <LangLink lang={lang} />
        </div>
      </div>
    );
  }

  const sumRows = [
    { lbl: t.sumBetrieb, val: formData.name },
    { lbl: t.sumKontakt, val: contact },
    { lbl: t.sumSteuer, val: formData.steuernummer },
    { lbl: t.sumKu, val: t.kuShort },
    { lbl: t.sumBank, val: bank },
    { lbl: t.sumLogo, val: logo },
  ];
  return (
    <div className="ob-d" dir={dir}>
      <DesktopBar t={t} />
      <div className="ob-d-scroll">
        <div className="ob-d-wrap">
          <div className="ob-d-done">
            <div className="ob-d-done-check">
              <SetupIcon name="check" size={44} weight="bold" />
            </div>
            <div className="ob-d-done-t">{t.doneT}</div>
            <div className="ob-d-done-s">{t.doneS}</div>
            <div className="ob-d-done-sum">
              {sumRows.map((r, i) => (
                <div className="ob-sum-row" key={i}>
                  <div className="ob-sum-ic">
                    <SetupIcon name="check" size={17} weight="bold" />
                  </div>
                  <div className="ob-sum-tx">
                    <div className="ob-sum-lbl">{r.lbl}</div>
                    <div className="ob-sum-val">{r.val}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="ob-d-done-cta">
              <button className="ob-d-btn ob-d-btn--accent" onClick={onComplete}>
                <SetupIcon name="plus" size={19} weight="bold" />{t.firstInvoice}
              </button>
              <button className="ob-d-back" onClick={onDashboard}>{t.toDash}</button>
            </div>
            <LangLink lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}
