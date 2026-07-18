"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { SetupFormData } from "@/types/company";
import type {
  OnboardingExtractionErrorCode,
  OnboardingExtractionStatuses,
} from "@/types/onboarding-extraction";
import type { Phase } from "./translations";
import {
  discardUploadedOnboardingDocument,
  extractUploadedOnboardingDocument,
  prepareOnboardingUpload,
} from "@/lib/onboarding/extraction-actions";
import { resolveOnboardingDocumentMediaType } from "@/lib/onboarding/extraction-file";
import { uploadOnboardingDocument } from "@/lib/repositories/onboarding-uploads.client";
import { emptyOnboardingExtractionStatuses } from "@/lib/onboarding/extraction-validation";

interface UseOnboardingDocumentScanProps {
  setFormData: Dispatch<SetStateAction<SetupFormData>>;
  setPhase: Dispatch<SetStateAction<Phase>>;
}

export function useOnboardingDocumentScan({
  setFormData,
  setPhase,
}: UseOnboardingDocumentScanProps) {
  const [statuses, setStatuses] = useState<OnboardingExtractionStatuses>(
    emptyOnboardingExtractionStatuses,
  );
  const [error, setError] = useState<OnboardingExtractionErrorCode | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  const handleFileSelect = (selectedFile: File) => {
    const contentType = resolveOnboardingDocumentMediaType(
      selectedFile.name,
      selectedFile.type,
    );
    if (!contentType) {
      setFile(null);
      setFileName("");
      setError("unsupported_file");
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError(null);
  };

  const clearFile = () => {
    setFile(null);
    setFileName("");
    setError(null);
  };

  const handleScan = async () => {
    if (!file) return;

    const contentType = resolveOnboardingDocumentMediaType(file.name, file.type);
    if (!contentType) {
      setError("unsupported_file");
      return;
    }

    setPhase("scanning");
    let uploadedReference: Parameters<
      typeof extractUploadedOnboardingDocument
    >[0] | null = null;
    try {
      const prepared = await prepareOnboardingUpload(
        file.name,
        contentType,
        file.size,
      );
      if (prepared.status === "error") {
        setError(prepared.error);
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
        setError("upload_failed");
        setPhase("upload");
        return;
      }

      const result = await extractUploadedOnboardingDocument(uploadedReference);
      if (result.status === "error") {
        setError(result.error);
        setPhase("upload");
        return;
      }

      setFormData((previous) => ({
        ...previous,
        ...result.values,
        trade_ids: previous.trade_ids,
      }));
      setStatuses(result.statuses);
      setPhase("review");
    } catch {
      if (uploadedReference) {
        await discardUploadedOnboardingDocument(uploadedReference);
      }
      setError("upload_failed");
      setPhase("upload");
    }
  };

  return {
    statuses,
    setStatuses,
    error,
    fileName,
    handleFileSelect,
    clearFile,
    handleScan,
  };
}
