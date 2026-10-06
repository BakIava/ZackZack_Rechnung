/**
 * Geometrie und Stylesheet der Vorlage `erhan-excel`. Die Referenz ist ein
 * Excel-Blatt (Arial 10, Standardzeilenhöhe 12,75 pt, 100 % Zoom): 1 px der
 * Bildschirmaufnahme entspricht 0,75 pt, die Blattbreite (494 pt) genau A4 mit
 * Excels Standardrändern (links 50,4 pt, oben 54 pt). Lagen folgen daraus:
 * x = 50,4 + 0,75·(px − 1), y = 54 + 0,75·px — auf das Zeilenraster eingerastet.
 *
 * Schrift: Hanken Grotesk läuft bei gleicher Größe praktisch so breit wie Arial
 * (normal ≈ 1,00, fett ≈ 0,95). Unterhalb des Titels: 12 pt auf 15-pt-Zeilen.
 * React-PDF: Grundlinie = Boxoberkante + fontSize; einheitenloses lineHeight
 * multipliziert das fontSize derselben Regel — daher tragen alle Regeln mit
 * lineHeight ihr fontSize.
 */

import { StyleSheet } from "@react-pdf/renderer";
import { PDF_A4_SIZE } from "@/lib/pdf/document-pages";
import { PDF_FONT_FAMILY } from "@/lib/pdf/pdf-font-family";

const TEXT = "#000000";
const BOLD = "bold" as const;

export const ERHAN_BODY_SIZE = 12;
export const ERHAN_ROW = 15;

/** Spaltengrenzen A–F mit Platz für größere Beträge und zweizeilige Überschriften. */
export const ERHAN_COLUMNS = [50.4, 83.4, 260.4, 323.65, 386.15, 469.9, 544.65] as const;

export const ERHAN_GEOMETRY = {
  left: 54.9,
  /** Logobox; proportional um rund 10 % vergrößert, rechtsbündig und mit unveränderter Unterkante über dem Kontaktblock. */
  logo: { left: 338.8, top: 51.4, width: 202.6, height: 72.6 },
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
  /** Erste Einsatzort-Zeile der Referenz; ohne Einsatzort bleibt die Angebotsgültigkeit hier. */
  validUntilBaseline: 315.75,
  /** Hängender Einzug: alle Ortsangaben beginnen nach der festen Beschriftung. */
  locationIndent: 76,
  serviceTimingX: 86.4,
  serviceTimingBaseline: 354,
  continuationNumberBaseline: 66,
  /** Tabellenkopf (zwei Zeilen hoch) und erste Positionszeile. */
  gridTop: 369.75,
  firstRowsTop: 414.75,
  continuationGridTop: 76.5,
  continuationRowsTop: 106.5,
  headHeight: 2 * ERHAN_ROW,
  /** Unterkante der Summen auf der Schlussseite (Rasterlinie). */
  totalsBottom: 650.25,
  /** Unterkante des Rasters auf Nicht-Schlussseiten (letzte Zeile = Zwischensumme). */
  gridBottom: 739.5,
  notesTop: 663,
  notesWidth: 486,
  /** Nur bei mehrseitigen Belegen: „Seite x von y“ rechts über der Fußzeile. */
  pageNumberBaseline: 774,
  /** Drei Fußzeilen je Spalte (Firma | Bank | Steuernummer/Inhaber). */
  footerBaselines: [788, 800, 812],
} as const;

const G = ERHAN_GEOMETRY;
const [A, B, C, D, E, F, END] = ERHAN_COLUMNS;

export const FOOTER_SIZE = 9;
export const FOOTER_COLUMN = (END - G.left) / 3;

function top(baseline: number, size: number): number {
  return baseline - size;
}

const cell = { paddingLeft: 2.5, paddingRight: 2.5 };

export const erhanStyles = StyleSheet.create({
  page: {
    width: PDF_A4_SIZE.width,
    height: PDF_A4_SIZE.height,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: ERHAN_BODY_SIZE,
    color: TEXT,
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
  /** Lage des Kontaktblocks setzt `erhanContactBlock` (mittig unter dem Logo). */
  contactLabel: {
    position: "absolute",
    fontSize: 12,
    lineHeight: 1,
    fontWeight: BOLD,
  },
  contactValue: {
    position: "absolute",
    lineHeight: 1,
    fontWeight: BOLD,
    maxLines: 1,
  },
  /** Lage und Schriftgrad setzt `erhanDateLine`; die Zeile bricht nie um. */
  date: {
    position: "absolute",
    lineHeight: 1,
    fontWeight: BOLD,
    maxLines: 1,
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
    fontSize: ERHAN_BODY_SIZE,
    lineHeight: 1,
    fontWeight: BOLD,
  },
  locationLabel: {
    position: "absolute",
    fontSize: ERHAN_BODY_SIZE,
    lineHeight: 1,
    fontWeight: BOLD,
    maxLines: 1,
  },
  locationValue: {
    position: "absolute",
    fontSize: ERHAN_BODY_SIZE,
    lineHeight: 1,
    maxLines: 1,
  },
  locationName: { fontWeight: BOLD },
  serviceTiming: {
    position: "absolute",
    left: G.serviceTimingX,
    top: top(G.serviceTimingBaseline, ERHAN_BODY_SIZE),
    fontSize: ERHAN_BODY_SIZE,
    lineHeight: 1,
  },

  rows: { position: "absolute", left: A, width: END - A },
  headRow: { height: G.headHeight, flexDirection: "row", fontSize: ERHAN_BODY_SIZE, lineHeight: ERHAN_ROW / ERHAN_BODY_SIZE, fontWeight: BOLD },
  headSingle: { paddingTop: ERHAN_ROW / 2 },
  itemRow: { flexDirection: "row", fontSize: ERHAN_BODY_SIZE, lineHeight: ERHAN_ROW / ERHAN_BODY_SIZE },
  cA: { ...cell, width: B - A, textAlign: "center" },
  cB: { ...cell, width: C - B },
  cC: { ...cell, width: D - C, textAlign: "right" },
  cD: { ...cell, width: E - D, textAlign: "center" },
  cE: { ...cell, width: F - E, textAlign: "center" },
  cF: { ...cell, width: END - F, textAlign: "right" },
  centered: { textAlign: "center" },

  totals: { position: "absolute", left: D, width: END - D },
  totalsRow: { height: ERHAN_ROW, fontSize: ERHAN_BODY_SIZE, lineHeight: 1, fontWeight: BOLD },
  totalsLabel: { position: "absolute", left: 0, top: 0.5, width: 112, textAlign: "right" },
  totalsValue: { position: "absolute", right: 2.5, top: 0.5, width: END - D - 122, textAlign: "right" },
  totalsRule: { height: 1.5, backgroundColor: TEXT, marginTop: -0.75 },
  totalsGap: { height: ERHAN_ROW - 0.75 },

  notes: {
    position: "absolute",
    left: G.left,
    top: G.notesTop,
    width: G.notesWidth,
    fontSize: ERHAN_BODY_SIZE,
    lineHeight: ERHAN_ROW / ERHAN_BODY_SIZE,
  },
  /** Drei gleich breite Fußspalten: links Firma, Mitte Bank, rechts Steuer/Inhaber. */
  footerCell: { position: "absolute", width: FOOTER_COLUMN, lineHeight: 1, maxLines: 1 },
  footerLeft: { left: G.left },
  footerCenter: { left: G.left + FOOTER_COLUMN, textAlign: "center" },
  footerRight: { left: G.left + 2 * FOOTER_COLUMN, paddingRight: 2.5, textAlign: "right" },
  footerPage: {
    position: "absolute",
    left: G.left,
    top: top(G.pageNumberBaseline, FOOTER_SIZE),
    width: END - G.left - 2.5,
    fontSize: FOOTER_SIZE,
    lineHeight: 1,
    textAlign: "right",
  },
});

export const erhanTop = top;
