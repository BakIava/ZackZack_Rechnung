/**
 * Ergebnis einer KI-Erfassung (Freitext → Formularfelder) aus Sicht des
 * gemeinsamen Erfassungsdialogs. Die fachlichen Ergebnisse (Kunde,
 * Einsatzort) werden in `lib/` auf diese Form abgebildet.
 */
export type AiIntakeOutcome =
  | { kind: "ok" }
  | { kind: "fail" }
  | { kind: "limit"; limit: number };
