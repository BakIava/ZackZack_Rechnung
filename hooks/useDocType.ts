"use client";

import { DocType } from "@/shared/doc";
import { useState } from "react";

/** Rechnung und Angebot teilen denselben Flow, unterschieden per Schalter. */

export function useDocType(initial: DocType = "invoice") {
  const [docType, setDocType] = useState<DocType>(initial);

  function toggle() {
    setDocType((prev) => (prev === "invoice" ? "offer" : "invoice"));
  }

  return { docType, setDocType, toggle };
}
