"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { usePDF } from "@react-pdf/renderer";
import { LoadingOverlay } from "@/components/ui";
import { DocumentPdf } from "@/lib/pdf/document-pdf";
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import { registerBrowserPdfFonts } from "@/lib/pdf/browser-fonts";
import type { DocumentPreview } from "@/types/document";
import "./document-pdf-preview.css";

registerBrowserPdfFonts();

interface DocumentPdfPreviewProps {
  preview: DocumentPreview;
  logo: PdfLogo | null;
  testId?: string;
  loading?: boolean;
}

const PDF_VIEWER_FRAGMENT = "#toolbar=0&navpanes=0&view=FitH";
const PDF_PREVIEW_DEBOUNCE_MS = 650;

/** Produktive Browser-Vorschau desselben React-PDF-Baums wie der Server. */
export function DocumentPdfPreview({
  preview,
  logo,
  testId,
  loading = false,
}: DocumentPdfPreviewProps) {
  const [renderPreview, setRenderPreview] = useState(preview);
  const incomingPreviewKey = useMemo(() => JSON.stringify(preview), [preview]);
  const renderPreviewKey = useMemo(
    () => JSON.stringify(renderPreview),
    [renderPreview],
  );
  const [loadedViewerUrl, setLoadedViewerUrl] = useState<string | null>(null);
  const document = useMemo(
    () => <DocumentPdf preview={renderPreview} logo={logo} />,
    [logo, renderPreview],
  );
  const [loadedDocument, setLoadedDocument] = useState<ReactElement | null>(null);
  const [instance, updateInstance] = usePDF({ document });

  useEffect(() => {
    updateInstance(document);
  }, [document, updateInstance]);

  useEffect(() => {
    if (renderPreviewKey === incomingPreviewKey) return;
    const timer = window.setTimeout(() => {
      setRenderPreview(preview);
    }, PDF_PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [incomingPreviewKey, preview, renderPreviewKey]);

  const previewQueued = renderPreviewKey !== incomingPreviewKey;
  const viewerLoading = Boolean(
    !instance.error
      && (
        instance.loading
        || !instance.url
        || loadedViewerUrl !== instance.url
        || loadedDocument !== document
      ),
  );
  const showLoading = loading || previewQueued || viewerLoading;

  return (
    <div
      className="document-pdf-preview"
      data-testid={testId}
      data-render-state={instance.error ? "error" : showLoading ? "loading" : "ready"}
      aria-busy={showLoading}
      dir="ltr"
      lang="de"
    >
      {instance.url && (
        <iframe
          className="document-pdf-preview__frame"
          data-testid={testId ? `${testId}-frame` : undefined}
          src={`${instance.url}${PDF_VIEWER_FRAGMENT}`}
          title={renderPreview.documentNumber ?? renderPreview.docType}
          onLoad={() => {
            setLoadedViewerUrl(instance.url);
            setLoadedDocument(document);
          }}
        />
      )}
      <LoadingOverlay
        open={showLoading}
        className="document-pdf-preview__loading-overlay"
      />
    </div>
  );
}
