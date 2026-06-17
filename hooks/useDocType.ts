"use client";

import { useState } from "react";

/** Rechnung und Angebot teilen denselben Flow, unterschieden per Schalter. */
export type DocType = "angebot" | "rechnung";

export function useDocType(initial: DocType = "rechnung") {
  const [docType, setDocType] = useState<DocType>(initial);

  function toggle() {
    setDocType((prev) => (prev === "rechnung" ? "angebot" : "rechnung"));
  }

  return { docType, setDocType, toggle };
}
