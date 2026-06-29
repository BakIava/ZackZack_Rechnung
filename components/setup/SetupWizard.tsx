"use client";

import Image from "next/image";
import { SetupIcon } from "./SetupIcon";
import { type Translations, type Lang, type Phase } from "./translations";
import { LangLink, DesktopBar } from "./SetupPrimitives";
import { Step1Fields, Step2Fields, Step3Fields, Step4Fields, LogoEmpty, LogoPreview } from "./SetupStepFields";

interface WizardProps {
  t: Translations;
  lang: Lang;
  dir: "ltr" | "rtl";
  isMobile: boolean;
  step: number;
  setStep: (n: number) => void;
  TOTAL: number;
  onPhase: (p: Phase) => void;
  onComplete: () => void;
}

export function SetupWizard({ t, lang, dir, isMobile, step, setStep, TOTAL, onPhase, onComplete }: WizardProps) {
  const optional = step === 4 || step === 5;

  if (isMobile) {
    const stepMeta: Record<number, { ic: string; key: "s1" | "s2" | "s3" | "s4" | "s5" }> = {
      1: { ic: "building", key: "s1" },
      2: { ic: "phone", key: "s2" },
      3: { ic: "idcard", key: "s3" },
      4: { ic: "bank", key: "s4" },
      5: { ic: "brush", key: "s5" },
    };
    const meta = stepMeta[step];
    const titleKey = `${meta.key}_t` as "s1_t" | "s2_t" | "s3_t" | "s4_t" | "s5_t";
    const subKey = `${meta.key}_s` as "s1_s" | "s2_s" | "s3_s" | "s4_s" | "s5_s";

    const StepBodyMobile = () => {
      if (step === 1) return <Step1Fields t={t} />;
      if (step === 2) return <Step2Fields t={t} />;
      if (step === 3) return <Step3Fields t={t} />;
      if (step === 4) return <Step4Fields t={t} />;
      return <LogoEmpty t={t} />;
    };

    const advance = () => (step === TOTAL ? onPhase("done") : setStep(step + 1));

    return (
      <div className="ob-root" dir={dir}>
        <div className="ob-top">
          <button
            className="ob-back"
            disabled={step === 1}
            onClick={() => (step === 1 ? onPhase("entry") : setStep(step - 1))}
          >
            <SetupIcon name="chevronLeft" size={20} />
          </button>
          <div className="ob-top-mid">
            <div className="ob-top-brand">
              <Image src="/assets/zackzack-mark.png" alt="" width={18} height={18} style={{ height: 18, width: "auto" }} />
              {t.setup}
            </div>
            <div className="ob-top-sub">{t.setupSub}</div>
          </div>
          <div className="ob-top-spacer" />
        </div>

        <div className="ob-prog">
          <div className="ob-prog-head">
            <div className="ob-prog-step">
              {t.stepWord} <b>{step}</b> {t.ofWord} {TOTAL}
            </div>
            <div className="ob-prog-name">{t.progNames[step - 1]}</div>
          </div>
          <div className="ob-prog-bar">
            {Array.from({ length: TOTAL }).map((_, i) => {
              const state = i + 1 < step ? "done" : i + 1 === step ? "now" : "off";
              return (
                <span key={i} className="ob-prog-seg" data-state={state}>
                  <i />
                </span>
              );
            })}
          </div>
        </div>

        <div className="ob-body">
          <div className="ob-intro">
            <div className="ob-intro-ic"><SetupIcon name={meta.ic} size={26} /></div>
            <div className="ob-intro-tx">
              <div className="ob-intro-t">
                {t[titleKey]}
                <span className={"ob-badge " + (optional ? "ob-badge--opt" : "ob-badge--req")}>
                  {optional ? t.opt : t.req}
                </span>
              </div>
              <div className="ob-intro-s">{t[subKey]}</div>
            </div>
          </div>
          <StepBodyMobile />
        </div>

        <div className="ob-foot">
          <button className="ob-next" onClick={advance}>
            {t.next}<SetupIcon name="arrowRight" size={20} weight="bold" />
          </button>
          {optional && (
            <button className="ob-skip" onClick={advance}>
              {t.skip} — <b>{t.skipB}</b>
            </button>
          )}
          <LangLink lang={lang} />
        </div>
      </div>
    );
  }

  // Desktop wizard
  const sections: Record<number, { key: "s1" | "s2" | "s3" | "s4" | "s5"; req: boolean }> = {
    1: { key: "s1", req: true },
    2: { key: "s2", req: true },
    3: { key: "s3", req: true },
    4: { key: "s4", req: false },
    5: { key: "s5", req: false },
  };
  const cur = sections[step];
  const titleKey = `${cur.key}_t` as "s1_t" | "s2_t" | "s3_t" | "s4_t" | "s5_t";
  const subKey = `${cur.key}_s` as "s1_s" | "s2_s" | "s3_s" | "s4_s" | "s5_s";

  const StepBodyDesktop = () => {
    if (step === 1) return <Step1Fields t={t} />;
    if (step === 2) return <Step2Fields t={t} />;
    if (step === 3) return <Step3Fields t={t} />;
    if (step === 4) return <Step4Fields t={t} />;
    return <LogoPreview t={t} />;
  };

  const advance = () => (step === TOTAL ? onPhase("done") : setStep(step + 1));

  return (
    <div className="ob-d" dir={dir}>
      <DesktopBar t={t} />
      <div className="ob-d-scroll">
        <div className="ob-d-wrap">
          <div className="ob-d-head">
            <div className="ob-d-kicker">{t.dKicker}</div>
            <div className="ob-d-title">{t.dTitle}</div>
            <div className="ob-d-sub">{t.dSub}</div>
          </div>

          <div className="ob-d-steps">
            {t.progNames.map((nm, i) => {
              const n = i + 1;
              const isDone = n < step;
              const state = isDone ? "done" : n === step ? "now" : "off";
              return (
                <span key={i} style={{ display: "contents" }}>
                  <div
                    className={"ob-d-step" + (isDone ? " is-done" : "")}
                    data-state={state}
                    onClick={() => { if (isDone) setStep(n); }}
                  >
                    <div className="ob-d-step-dot">
                      {isDone ? <SetupIcon name="check" size={15} weight="bold" /> : n}
                    </div>
                    <div className="ob-d-step-lbl">{nm}</div>
                  </div>
                  {i < 4 && <div className="ob-d-step-line" data-state={isDone ? "done" : "off"} />}
                </span>
              );
            })}
          </div>

          <div className="ob-d-card">
            <div className="ob-d-sechead">
              <div className="ob-d-secnum">{step}</div>
              <div className="ob-d-sectx">
                <div className="ob-d-sect">
                  {t[titleKey]}
                  <span className={"ob-badge " + (cur.req ? "ob-badge--req" : "ob-badge--opt")}>
                    {cur.req ? t.req : t.opt}
                  </span>
                </div>
                <div className="ob-d-secs">{t[subKey]}</div>
              </div>
            </div>
            <StepBodyDesktop />
          </div>

          <div className="ob-d-wfoot">
            <button className="ob-d-back" onClick={() => (step === 1 ? onPhase("entry") : setStep(step - 1))}>
              <SetupIcon name="chevronLeft" size={19} />{t.back}
            </button>
            <div className="ob-d-wfoot-r">
              {optional && (
                <button className="ob-d-skip" onClick={advance}>
                  {t.skip}
                </button>
              )}
              <button className="ob-d-btn" onClick={advance}>
                {step === TOTAL ? t.finish : t.next}
                <SetupIcon name="arrowRight" size={20} weight="bold" />
              </button>
            </div>
          </div>
          <LangLink lang={lang} />
        </div>
      </div>
    </div>
  );
}
