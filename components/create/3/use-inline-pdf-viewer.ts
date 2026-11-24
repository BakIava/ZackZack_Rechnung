"use client";

import { useSyncExternalStore } from "react";

const FINE_POINTER_QUERY = "(pointer: fine)";

/**
 * Desktop-Browser mit eingebautem PDF-Viewer zeigen die Vorschau selbst an.
 * Tablets/Handys (Touch als Hauptbedienung) und Browser ohne Viewer – etwa
 * Chrome auf Android – nutzen pdf.js. Das iPad meldet zwar einen Viewer,
 * zeigt im iframe aber oft nur Seite 1; deshalb zusätzlich die Zeiger-Abfrage.
 */
function readInlinePdfViewer(): boolean {
  return navigator.pdfViewerEnabled === true
    && window.matchMedia(FINE_POINTER_QUERY).matches;
}

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(FINE_POINTER_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** `null` beim Server-Rendering, danach `true` = iframe, `false` = pdf.js. */
export function useInlinePdfViewer(): boolean | null {
  return useSyncExternalStore(subscribe, readInlinePdfViewer, () => null);
}
