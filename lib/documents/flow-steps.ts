/**
 * Zentrale Definition der Flow-Schritte (Kunde → Positionen → Vorschau).
 * Einzige Quelle der Wahrheit für Schrittanzahl und -reihenfolge:
 * neue Schritte werden ausschließlich hier ergänzt.
 * `labelKey` verweist auf den i18n-Schlüssel im "Create"-Namespace.
 */
export const FLOW_STEPS = [
  { step: 1, labelKey: "step1" },
  { step: 2, labelKey: "step2" },
  { step: 3, labelKey: "step3" },
] as const;

export const TOTAL_STEPS = FLOW_STEPS.length;

export type FlowStep = (typeof FLOW_STEPS)[number];
