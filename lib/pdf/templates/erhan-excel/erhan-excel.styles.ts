/**
 * Geometrie und Stylesheet der Vorlage `erhan-excel`. Die Referenz ist ein
 * Excel-Blatt (Arial 10, Standardzeilenhöhe 12,75 pt, 100 % Zoom): 1 px der
 * Bildschirmaufnahme entspricht 0,75 pt, die Blattbreite (494 pt) genau A4 mit
 * Excels Standardrändern (links 50,4 pt, oben 54 pt). Lagen folgen daraus:
 * x = 50,4 + 0,75·(px − 1), y = 54 + 0,75·px — auf das Zeilenraster eingerastet.
 *
 * Schrift: Hanken Grotesk läuft bei gleicher Größe praktisch so breit wie Arial
 * (normal ≈ 1,00, fett ≈ 0,95) — Schriftgrade bleiben deshalb wie in Excel.
 * React-PDF: Grundlinie = Boxoberkante + fontSize; einheitenloses lineHeight
 * multipliziert das fontSize derselben Regel — daher tragen alle Regeln mit
 * lineHeight ihr fontSize.
 */

import { StyleSheet } from "@react-pdf/renderer";
import { PDF_A4_SIZE } from "@/lib/pdf/document-pages";
import { PDF_FONT_FAMILY } from "@/lib/pdf/pdf-font-family";

const BLACK = "#000000";
const GRID = "#cfcfcf";
const BOLD = "bold" as const;

export const ERHAN_ROW = 12.75;

/** Spaltengrenzen A–F. Art ist 11 pt breiter als in Excel („Pauschale“ passt ungetrennt), Leistung entsprechend schmaler. */
export const ERHAN_COLUMNS = [50.4, 83.4, 300.4, 353.65, 405.15, 480.9, 544.65] as const;

export const ERHAN_GEOMETRY = {
  left: 54.9,
  logo: { left: 357.2, top: 65.25, width: 184.2, height: 52.5 },
  senderBaseline: 128.25,
  recipientBaseline: 151.5,
  recipientLineHeight: 13.5,
  contactLabelX: 363.2,
  contactValueX: 409.6,
  /** Kontaktwerte dürfen bis 20 pt vor den Blattrand laufen (lange E-Mail-Adressen). */
  contactValueRight: 575.28,
  contactBaseline: 144,
  contactLineHeight: 12.25,
  dateX: 377.9,
  dateBaseline: 213.75,
  titleBaseline: 261.4,
  numberBaseline: 287.25,
  /** Freie Einsatzort-Zeile der Referenz: trägt bei Angeboten die Gültigkeit. */
  validUntilBaseline: 315.75,
  serviceTimingX: 86.4,
  serviceTimingBaseline: 354,
  continuationNumberBaseline: 66,
  /** Tabellenkopf (zwei Zeilen hoch) und erste Positionszeile. */
  gridTop: 369.75,
  firstRowsTop: 408,
  continuationGridTop: 76.5,
  continuationRowsTop: 102,
  headHeight: 2 * ERHAN_ROW,
  /** Unterkante der Summen auf der Schlussseite (Rasterlinie). */
  totalsBottom: 650.25,
  /** Unterkante des Rasters auf Nicht-Schlussseiten (letzte Zeile = Zwischensumme). */
  gridBottom: 739.5,
  notesTop: 663,
  notesWidth: 486,
  footerBaselines: [770, 780],
} as const;

const G = ERHAN_GEOMETRY;
const [A, B, C, D, E, F, END] = ERHAN_COLUMNS;

function top(baseline: number, size: number): number {
  return baseline - size;
}

const cell = { paddingLeft: 2.5, paddingRight: 2.5 };

export const erhanStyles = StyleSheet.create({
  page: {
    width: PDF_A4_SIZE.width,
    height: PDF_A4_SIZE.height,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    color: BLACK,
  },
  bold: { fontWeight: BOLD },

  logo: {
    position: "absolute",
    left: G.logo.left,
    top: G.logo.top,
    width: G.logo.width,
    height: G.logo.height,
    objectFit: "contain",
    objectPosition: "right",
  },
  logoText: {
    position: "absolute",
    left: G.logo.left,
    top: G.logo.top + 12,
    width: G.logo.width,
    fontSize: 16,
    lineHeight: 1.15,
    fontWeight: BOLD,
    textAlign: "right",
    maxLines: 2,
  },
  sender: {
    position: "absolute",
    left: G.left,
    top: top(G.senderBaseline, 7),
    width: G.contactLabelX - G.left - 20,
    fontSize: 7,
    lineHeight: 1.2,
    textDecoration: "underline",
  },
  recipient: {
    position: "absolute",
    left: G.left,
    top: top(G.recipientBaseline, 12),
    width: G.contactLabelX - G.left - 30,
    fontSize: 12,
    lineHeight: G.recipientLineHeight / 12,
    fontWeight: BOLD,
  },
  contactLabel: {
    position: "absolute",
    left: G.contactLabelX,
    fontSize: 12,
    lineHeight: 1,
    fontWeight: BOLD,
  },
  contactValue: {
    position: "absolute",
    left: G.contactValueX,
    width: G.contactValueRight - G.contactValueX,
    lineHeight: 1,
    fontWeight: BOLD,
    maxLines: 1,
  },
  date: {
    position: "absolute",
    left: G.dateX,
    top: top(G.dateBaseline, 12),
    width: END - G.dateX,
    fontSize: 12,
    lineHeight: 1,
    fontWeight: BOLD,
  },
  title: {
    position: "absolute",
    left: G.left,
    top: top(G.titleBaseline, 16),
    fontSize: 16,
    lineHeight: 1,
    fontWeight: BOLD,
  },
  number: {
    position: "absolute",
    left: G.left,
    fontSize: 10,
    lineHeight: 1,
    fontWeight: BOLD,
  },
  serviceTiming: {
    position: "absolute",
    left: G.serviceTimingX,
    top: top(G.serviceTimingBaseline, 10),
    fontSize: 10,
    lineHeight: 1,
  },

  gridLineH: { position: "absolute", left: A, width: END - A, height: 0.5, backgroundColor: GRID },
  gridLineV: { position: "absolute", width: 0.5, backgroundColor: GRID },
  rows: { position: "absolute", left: A, width: END - A },
  headRow: { height: G.headHeight, flexDirection: "row", fontSize: 10, lineHeight: 11.5 / 10, fontWeight: BOLD },
  headSingle: { paddingTop: 5.75 },
  itemRow: { flexDirection: "row", fontSize: 10, lineHeight: ERHAN_ROW / 10 },
  cA: { ...cell, width: B - A, textAlign: "center" },
  cB: { ...cell, width: C - B },
  cC: { ...cell, width: D - C, textAlign: "right" },
  cD: { ...cell, width: E - D, textAlign: "center" },
  cE: { ...cell, width: F - E, textAlign: "center" },
  cF: { ...cell, width: END - F, textAlign: "right" },
  centered: { textAlign: "center" },

  totals: { position: "absolute", left: E, width: END - E },
  totalsRow: { height: ERHAN_ROW, fontSize: 10, lineHeight: 1, fontWeight: BOLD },
  totalsLabel: { position: "absolute", left: 0, top: 0.5, width: F - E, textAlign: "center" },
  totalsLabelWide: { position: "absolute", right: END - F, top: 0.5, width: F - D, paddingRight: 2.5, textAlign: "right" },
  /** Summenbeträge dürfen leicht in die zentrierte Beschriftungsspalte reichen. */
  totalsValue: { position: "absolute", right: 2.5, top: 0.5, width: END - F + 14, textAlign: "right" },
  totalsRule: { height: 1.5, backgroundColor: BLACK, marginTop: -0.75 },
  totalsGap: { height: ERHAN_ROW - 0.75 },

  notes: {
    position: "absolute",
    left: G.left,
    top: G.notesTop,
    width: G.notesWidth,
    fontSize: 10,
    lineHeight: ERHAN_ROW / 10,
  },
  footerLine: {
    position: "absolute",
    left: G.left,
    width: END - G.left,
    fontSize: 8,
    lineHeight: 1,
  },
  footerPage: {
    position: "absolute",
    left: G.left,
    width: END - G.left - 2.5,
    fontSize: 8,
    lineHeight: 1,
    textAlign: "right",
  },
});

export const erhanTop = top;
