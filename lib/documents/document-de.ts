/**
 * Dokumenttexte für die Belegvorschau — IMMER Deutsch, unabhängig von der
 * Bediensprache (harte Regel: Dokumentinhalt bleibt LTR/Deutsch). Diese Labels
 * kommen daher bewusst NICHT aus next-intl, sondern sind hier fixiert.
 *
 * Zahlungsziel- und §19-Text hängen von echten Daten ab und werden über die
 * Helfer unten gebaut; feste Beschriftungen stehen in DOKUMENT_DE.
 */

import { formatDateDE } from "@/lib/format";

export const DOKUMENT_DE = {
  rechnung: "Rechnung",
  angebot: "Angebot",
  rechnungNr: "Rechnungs-Nr.",
  angebotNr: "Angebots-Nr.",
  datum: "Datum",
  leistungsdatum: "Leistungsdatum",
  steuerNr: "Steuernummer",
  ustId: "USt-IdNr.",
  empfaengerRechnung: "Rechnungsempfänger",
  empfaengerAngebot: "Angebot für",
  pos: "Pos.",
  bezeichnung: "Bezeichnung",
  menge: "Menge",
  einzelpreis: "Einzelpreis",
  gesamtSpalte: "Gesamt",
  gesamtNetto: "Gesamt (netto)",
  rechnungsbetrag: "Rechnungsbetrag",
  angebotssumme: "Angebotssumme",
  /** Exakter §19-Hinweis laut Vorgabe. */
  kleinunternehmerHinweis: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
  entwurfPlatzhalter: "Entwurf – noch keine Nummer vergeben",
  bankverbindung: "Bankverbindung",
  iban: "IBAN",
  bic: "BIC",
  danke: "Vielen Dank für Ihren Auftrag.",
  kontakt: "Kontakt",
  inhaber: "Inhaber",
  bankUndSteuer: "Bank & Steuer",
} as const;

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Zahlungsziel-Text für Rechnungen (nur dort – Angebote haben kein
 * Zahlungsziel). Fälligkeitsdatum = issue_date + payment_days.
 */
export function zahlungszielText(issueDateIso: string, paymentDays: number): string {
  const faellig = formatDateDE(addDaysIso(issueDateIso, paymentDays));
  return `Zahlbar innerhalb von ${paymentDays} Tagen (bis ${faellig}) ohne Abzug auf das unten genannte Konto.`;
}
