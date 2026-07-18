"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type {
  OnboardingErrorCode,
  SetupFormData,
  SetupFormErrors,
  SetupValidationErrors,
} from "@/types/company";
import type { Phase } from "./translations";
import {
  getFirstSetupErrorStep,
  getOrderedSetupErrorFields,
  getSetupErrorSteps,
  SETUP_FIELD_STEPS,
  validateSetupStep,
  type SetupStep,
} from "@/lib/onboarding/validation";

interface UseSetupValidationProps {
  phase: Phase;
  step: number;
  formData: SetupFormData;
  errorMessages: Record<OnboardingErrorCode, string>;
  setFormData: Dispatch<SetStateAction<SetupFormData>>;
  setStep: Dispatch<SetStateAction<number>>;
}

export function useSetupValidation({
  phase,
  step,
  formData,
  errorMessages,
  setFormData,
  setStep,
}: UseSetupValidationProps) {
  const [errors, setErrors] = useState<SetupValidationErrors>({});
  const [submitError, setSubmitError] = useState<OnboardingErrorCode | null>(null);
  const [focusField, setFocusField] = useState<keyof SetupFormData | null>(null);

  useEffect(() => {
    if (!focusField || phase !== "wizard") return;
    const frame = window.requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(
        `[data-setup-field="${focusField}"]`,
      );
      const target = field?.querySelector<HTMLElement>(
        "input, button, [tabindex]",
      );
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
      setFocusField(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusField, phase, step]);

  const handleFormChange = <K extends keyof SetupFormData>(
    key: K,
    value: SetupFormData[K],
  ) => {
    setFormData((previous) => ({ ...previous, [key]: value }));
    setSubmitError(null);
    if (errors[key]) {
      setErrors((previous) => ({ ...previous, [key]: undefined }));
    }
  };

  const replaceStepErrors = (
    targetStep: SetupStep,
    stepErrors: SetupValidationErrors,
  ) => {
    setErrors((current) => {
      const next: SetupValidationErrors = {};
      for (const [field, error] of Object.entries(current) as Array<
        [keyof SetupFormData, OnboardingErrorCode | undefined]
      >) {
        if (error && SETUP_FIELD_STEPS[field] !== targetStep) {
          next[field] = error;
        }
      }
      return { ...next, ...stepErrors };
    });
  };

  const validateCurrentStep = (): boolean => {
    const currentStep = step as SetupStep;
    const stepErrors = validateSetupStep(currentStep, formData);
    const firstField = getOrderedSetupErrorFields(stepErrors)[0];

    replaceStepErrors(currentStep, stepErrors);
    setSubmitError(null);
    if (firstField) {
      setFocusField(firstField);
      return false;
    }
    return true;
  };

  const handleSubmissionError = (
    error: OnboardingErrorCode,
    serverErrors?: SetupValidationErrors,
  ) => {
    if (serverErrors) {
      setErrors(serverErrors);
      const firstStep = getFirstSetupErrorStep(serverErrors);
      const firstField = getOrderedSetupErrorFields(serverErrors)[0];
      if (firstStep) setStep(firstStep);
      if (firstField) setFocusField(firstField);
    }
    setSubmitError(error === "required_fields" ? null : error);
  };

  const displayErrors: SetupFormErrors = {};
  for (const key of Object.keys(errors) as Array<keyof SetupFormData>) {
    const errorCode = errors[key];
    if (errorCode) displayErrors[key] = errorMessages[errorCode];
  }

  return {
    displayErrors,
    errorSteps: getSetupErrorSteps(errors),
    errorCount: getOrderedSetupErrorFields(errors).filter(
      (field) => SETUP_FIELD_STEPS[field] === step,
    ).length,
    submitErrorMessage: submitError ? errorMessages[submitError] : null,
    clearSubmitError: () => setSubmitError(null),
    handleFormChange,
    handleSubmissionError,
    validateCurrentStep,
  };
}
