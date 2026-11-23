"use client";

import { useState } from "react";
import { normalisiereNachweisZiffern } from "@/lib/documents/nachweis-datum";

interface NachweisFreieZahlProps {
  id: string;
  wert: number | null;
  invalid: boolean;
  onChange: (zahl: number | null) => void;
}

export function NachweisFreieZahl({ id, wert, invalid, onChange }: NachweisFreieZahlProps) {
  const [eingabe, setEingabe] = useState<string | null>(null);
  return (
    <input
      id={id}
      inputMode="decimal"
      dir="ltr"
      value={eingabe ?? (wert === null ? "" : String(wert).replace(".", ","))}
      aria-invalid={invalid || undefined}
      maxLength={17}
      onChange={(event) => {
        const text = event.target.value;
        setEingabe(text);
        const normalisiert = normalisiereNachweisZiffern(text.trim()).replace(/[،٫,]/g, ".");
        const zahl = /^\d+(\.\d{0,2})?$/.test(normalisiert) ? Number(normalisiert) : null;
        onChange(zahl);
      }}
      onBlur={() => setEingabe(null)}
    />
  );
}
