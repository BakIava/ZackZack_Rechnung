"use client";

import dynamic from "next/dynamic";
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import type { DocumentPreview } from "@/types/document";

const DocumentPdfPreview = dynamic(
  () => import("./document-pdf-preview").then((module) => module.DocumentPdfPreview),
  { ssr: false },
);

interface DocumentPdfPreviewLoaderProps {
  preview: DocumentPreview;
  logo: PdfLogo | null;
  testId?: string;
  loading?: boolean;
}

/** Hält den browser-only React-PDF-Worker aus dem Server-Prerendering heraus. */
export function DocumentPdfPreviewLoader({
  preview,
  logo,
  testId,
  loading = false,
}: DocumentPdfPreviewLoaderProps) {
  return (
    <DocumentPdfPreview
      preview={preview}
      logo={logo}
      testId={testId}
      loading={loading}
    />
  );
}
