"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask } from "pdfjs-dist/legacy/build/pdf.mjs";
import "./pdf-canvas-pages.css";

interface PdfCanvasPagesProps {
  /** Blob-URL des im Browser erzeugten PDFs. */
  src: string;
  testId?: string;
  onLoad: () => void;
  onError: () => void;
}

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

/** Höchstens doppelte Pixeldichte: scharf genug, ohne schwache Tablets mit riesigen Canvas zu belasten. */
const MAX_PIXEL_RATIO = 2;

let pdfJsPromise: Promise<PdfJs> | null = null;

/** Lädt pdf.js erst bei Bedarf (Legacy-Build für ältere Tablets) – Desktop lädt es nie. */
function loadPdfJs(): Promise<PdfJs> {
  pdfJsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs")
    .then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return pdfjs;
    })
    .catch((error: unknown) => {
      pdfJsPromise = null;
      throw error;
    });
  return pdfJsPromise;
}

/**
 * Zeichnet alle PDF-Seiten mit pdf.js untereinander – für Geräte, deren
 * Browser PDFs nicht im iframe anzeigt (Android) oder nur Seite 1 zeigt (iPad).
 * Neue Seiten ersetzen die alten erst, wenn alle fertig sind (kein Flackern).
 */
export function PdfCanvasPages({ src, testId, onLoad, onError }: PdfCanvasPagesProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(() => setWidth(Math.round(host.clientWidth)));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || width === 0) return;
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    async function render(target: HTMLDivElement): Promise<void> {
      const pdfjs = await loadPdfJs();
      const data = await (await fetch(src)).arrayBuffer();
      if (cancelled) return;
      loadingTask = pdfjs.getDocument({ data });
      const pdf = await loadingTask.promise;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const canvases: HTMLCanvasElement[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const scale = (width * ratio) / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });
        const canvas = window.document.createElement("canvas");
        canvas.className = "pdf-canvas-pages__page";
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas, viewport }).promise;
        if (cancelled) return;
        canvases.push(canvas);
      }
      target.replaceChildren(...canvases);
      onLoadRef.current();
    }

    render(host)
      .catch(() => {
        if (!cancelled) onErrorRef.current();
      })
      .finally(() => {
        void loadingTask?.destroy();
      });

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [src, width]);

  return (
    <div
      ref={hostRef}
      className="pdf-canvas-pages"
      data-testid={testId}
      data-page-src={src}
    />
  );
}
