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
import {
  discardUploadedOnboardingDocument,
  extractUploadedOnboardingDocument,
  prepareOnboardingUpload,
} from "@/lib/onboarding/extraction-actions";
import { resolveOnboardingDocumentMediaType } from "@/lib/onboarding/extraction-file";
import { uploadOnboardingDocument } from "@/lib/repositories/onboarding-uploads.client";
import { emptyOnboardingExtractionStatuses } from "@/lib/onboarding/extraction-validation";
import { validateCompanyLogoSelection } from "@/lib/company-logo/constants";
import type {
  OnboardingExtractableField,
  OnboardingExtractionErrorCode,
  OnboardingExtractionStatuses,
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
  const [errors, setErrors] = useState<SetupValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<OnboardingErrorCode | null>(null);
  const [extractionStatuses, setExtractionStatuses] =
    useState<OnboardingExtractionStatuses>(emptyOnboardingExtractionStatuses);
  const [extractionError, setExtractionError] =
    useState<OnboardingExtractionErrorCode | null>(null);
  const [scanFileName, setScanFileName] = useState("");
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

  const handleFormChange = <K extends keyof SetupFormData>(
    key: K,
    value: SetupFormData[K],
  ) => {
    setFormData((prev: SetupFormData) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev: SetupValidationErrors) => ({ ...prev, [key]: undefined }));
    }
  };

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

  const handleOnboardingFile = async (file: File) => {
    const contentType = resolveOnboardingDocumentMediaType(file.name, file.type);
    if (!contentType) {
      setExtractionError("unsupported_file");
      return;
    }

    setScanFileName(file.name);
    setExtractionError(null);
    setPhase("scanning");
    let uploadedReference: Parameters<typeof extractUploadedOnboardingDocument>[0] | null = null;
    try {
      const prepared = await prepareOnboardingUpload(
        file.name,
        contentType,
        file.size,
      );
      if (prepared.status === "error") {
        setExtractionError(prepared.error);
        setPhase("upload");
        return;
      }

      const uploaded = await uploadOnboardingDocument(prepared.target, file);
      uploadedReference = {
        path: prepared.target.path,
        fileName: prepared.target.fileName,
        contentType: prepared.target.contentType,
        size: prepared.target.size,
      };
      if (!uploaded) {
        await discardUploadedOnboardingDocument(uploadedReference);
        setExtractionError("upload_failed");
        setPhase("upload");
        return;
      }

      const result = await extractUploadedOnboardingDocument(uploadedReference);
      if (result.status === "error") {
        setExtractionError(result.error);
        setPhase("upload");
        return;
      }

      setFormData((previous) => ({
        ...previous,
        ...result.values,
        trade_ids: previous.trade_ids,
      }));
      setExtractionStatuses(result.statuses);
      setPhase("review");
    } catch {
      if (uploadedReference) {
        await discardUploadedOnboardingDocument(uploadedReference);
      }
      setExtractionError("upload_failed");
      setPhase("upload");
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
      const logoFormData = logoFile ? new FormData() : undefined;
      if (logoFormData && logoFile) logoFormData.set("logo", logoFile);
      const result = await completeOnboarding(locale, formData, logoFormData);
      setSubmitting(false);
      if (!result.ok) {
        setSubmitError(result.error);
        if (result.errors) setErrors(result.errors);
        return;
      }
      setLogoUploaded(result.logoUploaded);
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
        onFileSelect={handleOnboardingFile}
        onBack={() => setPhase("entry")}
        onManual={() => { setStep(1); setPhase("wizard"); }}
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
        logoFile={logoFile}
        logoPreviewUrl={logoPreviewUrl}
        logoStatusLabel={logoMessages.ready}
        logoErrorMessage={logoError ? errorMessages[logoError] : null}
        onLogoSelect={handleLogoSelect}
        onLogoRemove={handleLogoRemove}
      />
    </>
  );
}
