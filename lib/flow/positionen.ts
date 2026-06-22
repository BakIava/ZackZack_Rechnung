/**
 * Positionen für den Rechnungs-/Angebots-Flow (Schritt 2).
 * Geld immer als ganzzahlige Cents.
 *
 * HARD RULE (Fremdleistung): Einkaufspreis und Aufschlag sind strikt intern.
 * Nur `verkaufCents` darf jemals auf das Dokument bzw. ins Dokument-DTO.
 */

import type { Locale } from "@/i18n/routing";

export interface NormalPosition {
  id: string;
  kind: "normal";
  /** Deutscher Begriff – erscheint so auf dem Dokument. */
  label: string;
  /** Bediensprachen-Begriffe, nur für die UI. null bei freier Position. */
  uebersetzungen: Record<Locale, string> | null;
  qty: number;
  unit: string;
  preisCents: number;
}

export interface FremdPosition {
  id: string;
  kind: "fremd";
  label: string;
  unit: string;
  /** Intern – niemals aufs Dokument. */
  einkaufCents: number;
  /** Intern – niemals aufs Dokument. */
  aufschlagPct: number;
  /** Verkaufspreis – einziger Wert, der aufs Dokument darf. */
  verkaufCents: number;
}

export type Position = NormalPosition | FremdPosition;

/** Zeilensumme in Cents (Fremdleistung: nur Verkaufspreis). */
export function lineTotalCents(position: Position): number {
  return position.kind === "fremd"
    ? position.verkaufCents
    : position.qty * position.preisCents;
}

/** Gesamtsumme aller Positionen in Cents. */
export function summeCents(positionen: Position[]): number {
  return positionen.reduce((sum, p) => sum + lineTotalCents(p), 0);
}
