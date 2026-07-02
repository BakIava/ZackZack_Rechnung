export const FLOW_STEPS = ["schritt-1", "schritt-2", "schritt-3"] as const;
export type FlowStep = (typeof FLOW_STEPS)[number];
export const FLOW_TOTAL = FLOW_STEPS.length;
