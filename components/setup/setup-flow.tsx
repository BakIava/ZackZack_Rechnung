"use client";

import { useState, useEffect } from "react";
import "./setup.css";
import { T, type Lang, type Phase, type SetupFlowProps } from "./translations";
import { SetupWelcome } from "./setup-welcome";
import { SetupEntry } from "./setup-entry";
import { SetupUpload } from "./setup-upload";
import { SetupReview } from "./setup-review";
import { SetupDone } from "./setup-done";
import { SetupWizard } from "./setup-wizard";
import { INITIAL_FORM_DATA } from "./form-defaults";
import type {
  OnboardingErrorCode,
  SetupFormData,
  SetupFormErrors,
  SetupValidationErrors,
} from "@/types/company";
import { completeOnboarding } from "@/lib/onboarding/actions";

export function SetupFlow({
  lang = "de",
  dir = "ltr",
  locale,
  tradeLabels,
  errorMessages,
  onComplete,
  onDashboard,
}: SetupFlowProps) {
  const t = T[lang];
  const TOTAL = 5;
  const [phase, setPhase] = useState<Phase>("welcome");
  const [step, setStep] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState<SetupFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<SetupValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<OnboardingErrorCode | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (phase !== "scanning") return;
    const id = setTimeout(() => setPhase("review"), 2400);
    return () => clearTimeout(id);
  }, [phase]);

  const handleFormChange = <K extends keyof SetupFormData>(
    key: K,
    value: SetupFormData[K],
  ) => {
    setFormData((prev: SetupFormData) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev: SetupValidationErrors) => ({ ...prev, [key]: undefined }));
    }
  };

  const displayErrors: SetupFormErrors = {};
  for (const key of Object.keys(errors) as Array<keyof SetupFormData>) {
    const errorCode = errors[key];
    if (errorCode) displayErrors[key] = errorMessages[errorCode];
  }

  const handlePhase = async (p: Phase) => {
    if (p === "done") {
      setSubmitting(true);
      setSubmitError(null);
      const result = await completeOnboarding(locale, formData);
      setSubmitting(false);
      if (result?.error) {
        setSubmitError(result.error);
        if (result.errors) setErrors(result.errors);
        return;
      }
      // redirect already happened server-side; show done as fallback
      setPhase("done");
      return;
    }
    setPhase(p);
  };

  const shared = { t, lang: lang as Lang, dir: dir as "ltr" | "rtl", isMobile };
  const goComplete = onComplete ?? (() => {});
  const goDash = onDashboard ?? (() => {});

  if (phase === "welcome") {
    return <SetupWelcome {...shared} onNext={() => setPhase("entry")} />;
  }
  if (phase === "entry") {
    return (
      <SetupEntry
        {...shared}
        onUpload={() => setPhase("upload")}
        onManual={() => { setStep(1); setPhase("wizard"); }}
      />
    );
  }
  if (phase === "upload" || phase === "scanning") {
    return (
      <SetupUpload
        {...shared}
        phase={phase}
        onScan={() => setPhase("scanning")}
        onBack={() => setPhase("entry")}
        onManual={() => { setStep(1); setPhase("wizard"); }}
      />
    );
  }
  if (phase === "review") {
    return (
      <SetupReview
        {...shared}
        onApply={() => {
          setStep(1);
          setPhase("wizard");
        }}
        onBack={() => setPhase("upload")}
        submitting={submitting}
      />
    );
  }
  if (phase === "done") {
    return <SetupDone {...shared} onComplete={goComplete} onDashboard={goDash} />;
  }

  return (
    <>
      {submitError && (
        <div className="ob-submit-error" role="alert">
          {errorMessages[submitError]}
        </div>
      )}
      <SetupWizard
        {...shared}
        step={step}
        setStep={setStep}
        TOTAL={TOTAL}
        onPhase={handlePhase}
        formData={formData}
        errors={displayErrors}
        onFormChange={handleFormChange}
        tradeLabels={tradeLabels}
        submitting={submitting}
      />
    </>
  );
}
