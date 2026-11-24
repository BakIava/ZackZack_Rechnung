"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { usePDF } from "@react-pdf/renderer";
import { LoadingOverlay } from "@/components/ui";
import { DocumentPdf } from "@/lib/pdf/document-pdf";
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import { registerBrowserPdfFonts } from "@/lib/pdf/browser-fonts";
import type { DocumentPreview } from "@/types/document";
import { PdfCanvasPages } from "./pdf-canvas-pages";
import { useInlinePdfViewer } from "./use-inline-pdf-viewer";
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
  const [failedViewerUrl, setFailedViewerUrl] = useState<string | null>(null);
  const inlineViewer = useInlinePdfViewer();
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
  const viewerFailed = Boolean(instance.url && failedViewerUrl === instance.url);
  const renderFailed = Boolean(instance.error) || viewerFailed;
  const viewerLoading = Boolean(
    !renderFailed
      && (
        instance.loading
        || !instance.url
        || loadedViewerUrl !== instance.url
        || loadedDocument !== document
      ),
  );
  const showLoading = loading || previewQueued || viewerLoading;
  const markViewerLoaded = () => {
    setLoadedViewerUrl(instance.url);
    setLoadedDocument(document);
  };

  return (
    <div
      className="document-pdf-preview"
      data-testid={testId}
      data-render-state={renderFailed ? "error" : showLoading ? "loading" : "ready"}
      data-viewer={inlineViewer === null ? undefined : inlineViewer ? "inline" : "canvas"}
      aria-busy={showLoading}
      dir="ltr"
      lang="de"
    >
      {instance.url && inlineViewer === true && (
        <iframe
          className="document-pdf-preview__frame"
          data-testid={testId ? `${testId}-frame` : undefined}
          src={`${instance.url}${PDF_VIEWER_FRAGMENT}`}
          title={renderPreview.documentNumber ?? renderPreview.docType}
          onLoad={markViewerLoaded}
        />
      )}
      {instance.url && inlineViewer === false && (
        <PdfCanvasPages
          src={instance.url}
          testId={testId ? `${testId}-pages` : undefined}
          onLoad={markViewerLoaded}
          onError={() => setFailedViewerUrl(instance.url)}
        />
      )}
      <LoadingOverlay
        open={showLoading}
        className="document-pdf-preview__loading-overlay"
      />
    </div>
  );
}
