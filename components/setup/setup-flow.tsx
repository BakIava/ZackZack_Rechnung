"use client";

import { useState, useEffect } from "react";
import { T, type Lang, type Phase, type SetupFlowProps } from "./translations";
import { SetupWelcome } from "./setup-welcome";
import { SetupEntry } from "./setup-entry";
import { SetupUpload } from "./setup-upload";
import { SetupReview } from "./setup-review";
import { SetupDone } from "./setup-done";
import { SetupWizard } from "./setup-wizard";
import { INITIAL_FORM_DATA } from "./form-defaults";
import type { OnboardingErrorCode, SetupFormData } from "@/types/company";
import { completeOnboarding } from "@/lib/onboarding/actions";
import { validateCompanyLogoSelection } from "@/lib/company-logo/constants";
import { useSetupValidation } from "./use-setup-validation";
import { useOnboardingDocumentScan } from "./use-onboarding-document-scan";
import "./setup-flow.css";
import type {
  OnboardingExtractableField,
} from "@/types/onboarding-extraction";

export function SetupFlow({
  lang = "de",
  dir = "ltr",
  locale,
  tradeLabels,
  errorMessages,
  logoMessages,
  extractionErrorMessages,
  onComplete,
  onDashboard,
}: SetupFlowProps) {
  const t = T[lang];
  const TOTAL = 5;
  const [phase, setPhase] = useState<Phase>("welcome");
  const [step, setStep] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState<SetupFormData>(INITIAL_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<OnboardingErrorCode | null>(null);
  const [logoUploaded, setLogoUploaded] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [logoFile]);

  const handleLogoSelect = (file: File) => {
    const validationError = validateCompanyLogoSelection(file);
    if (validationError) {
      setLogoError(validationError);
      return;
    }
    setLogoFile(file);
    setLogoError(null);
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoError(null);
  };

  const {
    displayErrors,
    errorSteps,
    errorCount,
    submitErrorMessage,
    clearSubmitError,
    handleFormChange,
    handleSubmissionError,
    validateCurrentStep,
  } = useSetupValidation({
    phase,
    step,
    formData,
    errorMessages,
    setFormData,
    setStep,
  });
  const {
    statuses: extractionStatuses,
    setStatuses: setExtractionStatuses,
    error: extractionError,
    fileName: scanFileName,
    handleFileSelect: handleOnboardingFileSelect,
    clearFile: clearOnboardingFile,
    handleScan: handleOnboardingScan,
  } = useOnboardingDocumentScan({ setFormData, setPhase });

  const handleReviewFormChange = <K extends OnboardingExtractableField>(
    key: K,
    value: SetupFormData[K],
  ) => {
    handleFormChange(key, value);
    const present = typeof value === "boolean" ||
      (typeof value === "string" && value.trim().length > 0);
    setExtractionStatuses((prev) => ({
      ...prev,
      [key]: present ? "found" : "missing",
    }));
  };

  const handlePhase = async (p: Phase) => {
    if (p === "done") {
      setSubmitting(true);
      clearSubmitError();
      const logoFormData = logoFile ? new FormData() : undefined;
      if (logoFormData && logoFile) logoFormData.set("logo", logoFile);
      const result = await completeOnboarding(locale, formData, logoFormData);
      setSubmitting(false);
      if (!result.ok) {
        handleSubmissionError(result.error, result.errors);
        return;
      }
      setLogoUploaded(result.logoUploaded);
      setPhase("done");
      return;
    }
    setPhase(p);
  };

  const handleAdvance = async () => {
    if (!validateCurrentStep()) return;

    if (step === TOTAL) {
      await handlePhase("done");
      return;
    }
    setStep(step + 1);
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
        onFileSelect={handleOnboardingFileSelect}
        onFileClear={clearOnboardingFile}
        onContinue={() => void handleOnboardingScan()}
        onBack={() => { clearOnboardingFile(); setPhase("entry"); }}
        onManual={() => { clearOnboardingFile(); setStep(1); setPhase("wizard"); }}
        fileName={scanFileName}
        errorMessage={extractionError ? extractionErrorMessages[extractionError] : null}
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
        formData={formData}
        statuses={extractionStatuses}
        onFormChange={handleReviewFormChange}
      />
    );
  }
  if (phase === "done") {
    return (
      <SetupDone
        {...shared}
        onComplete={goComplete}
        onDashboard={goDash}
        formData={formData}
        logoUploaded={logoUploaded}
        logoSkippedLabel={logoMessages.skipped}
      />
    );
  }

  return (
      <SetupWizard
        {...shared}
        step={step}
        setStep={setStep}
        onAdvance={() => void handleAdvance()}
        TOTAL={TOTAL}
        onPhase={handlePhase}
        formData={formData}
        errors={displayErrors}
        errorSteps={errorSteps}
        errorCount={errorCount}
        submitErrorMessage={submitErrorMessage}
        onFormChange={handleFormChange}
        tradeLabels={tradeLabels}
        submitting={submitting}
        logoFile={logoFile}
        logoPreviewUrl={logoPreviewUrl}
        logoStatusLabel={logoMessages.ready}
        logoErrorMessage={logoError ? errorMessages[logoError] : null}
        onLogoSelect={handleLogoSelect}
        onLogoRemove={handleLogoRemove}
      />
  );
}
