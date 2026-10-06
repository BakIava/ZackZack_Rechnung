/**
 * Geometrie und Stylesheet der Vorlage `ths-classic`. Alle Lagen stammen aus
 * der Vermessung der THS-Referenzrechnung (A4, Punkte, Ursprung oben links).
 *
 * Schrift: Die Referenz ist in Calibri gesetzt; eingebettet wird weiterhin die
 * Dokumentschrift Hanken Grotesk. Sie läuft ≈ 9 % breiter, Versal- und
 * x-Höhe liegen bei Faktor 0,917 praktisch auf Calibri — deshalb sind alle
 * Schriftgrade mit 0,917 skaliert (10,08 → 9,25 pt usw.), damit Zeilenlängen
 * und Grauwert der Referenz entsprechen.
 *
 * React-PDF setzt die Grundlinie genau eine Schriftgröße unter die Oberkante
 * der Textbox (Ascender 1,0 em) — daher überall `top = Grundlinie − Größe`;
 * jede weitere Zeile folgt im Abstand `lineHeight`. Ein einheitenloses
 * `lineHeight` multipliziert React-PDF mit dem `fontSize` DERSELBEN Stilregel
 * (fehlt es, mit 18 pt) — deshalb trägt jede Regel mit `lineHeight` ihr `fontSize`.
 */

import { StyleSheet } from "@react-pdf/renderer";
import { PDF_A4_SIZE } from "@/lib/pdf/document-pages";
import { PDF_FONT_FAMILY } from "@/lib/pdf/pdf-font-family";

const BLACK = "#000000";
const WHITE = "#ffffff";
const BOLD = "bold" as const;

/** Schriftgrade (Referenz-Calibri × 0,917). */
export const THS_TYPE = {
  body: 9.25,
  number: 11,
  band: 10.1,
  wordmark: 37,
  footer: 7.25,
  description: 8.25,
} as const;

/** Grundlinien und Kanten der Referenz in Punkten. */
export const THS_GEOMETRY = {
  marginLeft: 70.8,
  rightColumn: 354.4,
  metaColumn: 439.6,
  band: { left: 48.25, top: 38.5, width: 529, height: 74 },
  wordmarkBaseline: 86.5,
  bandNameBaseline: 99.2,
  /** Leistungszeilen rechts im Kopfband: Grundlinien 58,9 / 72,3 / 85,8 / 99,2 pt. */
  servicesBaseline: 58.9,
  servicesLineHeight: 13.43,
  logo: { top: 46, height: 36, maxWidth: 250 },
  addressBaseline: 148.5,
  addressLineHeight: 14.03,
  /**
   * Einsatzort rechts neben der Anschrift (Platz der „Lieferadresse“ der
   * Referenz): höchstens 5 Zeilen, damit er über dem Belegdatum endet.
   */
  serviceLocationMaxLines: 5,
  /**
   * Rechte Spalte über der Belegnummer: Belegdatum, Gültig bis (Angebot),
   * Sachbearbeiter — von oben gefüllt, ohne Lücken. Ein umbrechender
   * Sachbearbeiter läuft nach unten in die freie Spalte neben der Belegnummer.
   */
  metaBaselines: [216.9, 232.7, 248.5],
  metaLineHeight: 15.8,
  numberBaseline: 270,
  /**
   * Linke Zeilen unter der Belegnummer: Ansprechpartner, Telefon,
   * Liefer-/Montagetermin — von oben gefüllt, ohne Lücken.
   */
  infoBaselines: [286, 301, 316],
  introBaseline: 334,
  tableTop: 352.5,
  continuationNumberBaseline: 148.5,
  continuationTableTop: 162.5,
  footer: { top: 741, firstBaseline: 755.8, lineHeight: 9.74 },
  footerColumns: [70.8, 212.7, 354.4],
  /** Unterkante des Inhalts: 12 pt Abstand zum schwarzen Footer. */
  contentBottom: 729,
  table: {
    left: 77,
    width: 484,
    inset: 5.3,
    headRule: 1.25,
    headHeight: 12.5,
    rowLineHeight: 13.7,
    summaryRule: 1.5,
    summaryHeight: 12.25,
    gapBeforeSummary: 9.05,
    /** Textoberkante in Kopf- und Summenzeilen (Grundlinie 9,75 pt unter der Linie). */
    textInset: 0.5,
    /**
     * Spaltenbreiten ab dem Einzug (5,3 pt): Spaltenanfänge 82,3 / 164,5 / 217,3 /
     * 380,3 / 437,0 / 502,8 pt wie in der Referenz. Positionszeilen geben 10,8 pt
     * vom E-Preis an den rechtsbündigen G-Preis ab, damit große Beträge nicht umbrechen.
     */
    columns: {
      position: 82.2,
      menge: 52.8,
      bezeichnung: 163,
      ust: 56.7,
      einzelpreisHead: 65.8,
      gesamtpreisHead: 52.9,
      einzelpreis: 55,
      gesamtpreis: 63.7,
    },
  },
  closing: {
    noteGap: 14.7,
    noteLineHeight: 14,
    blockGap: 14,
    termsLineHeight: 14.2,
    width: 470,
  },
} as const;

const T = THS_GEOMETRY.table;
const C = T.columns;

function top(baseline: number, size: number): number {
  return baseline - size;
}

export const thsStyles = StyleSheet.create({
  page: {
    width: PDF_A4_SIZE.width,
    height: PDF_A4_SIZE.height,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: THS_TYPE.body,
    color: BLACK,
  },
  bold: { fontWeight: BOLD },

  band: {
    position: "absolute",
    left: THS_GEOMETRY.band.left,
    top: THS_GEOMETRY.band.top,
    width: THS_GEOMETRY.band.width,
    height: THS_GEOMETRY.band.height,
    backgroundColor: BLACK,
  },
  wordmark: {
    position: "absolute",
    left: THS_GEOMETRY.marginLeft,
    top: top(THS_GEOMETRY.wordmarkBaseline, THS_TYPE.wordmark),
    fontSize: THS_TYPE.wordmark,
    lineHeight: 1,
    color: WHITE,
  },
  logo: {
    position: "absolute",
    left: THS_GEOMETRY.marginLeft,
    top: THS_GEOMETRY.logo.top,
    height: THS_GEOMETRY.logo.height,
    maxWidth: THS_GEOMETRY.logo.maxWidth,
    objectFit: "contain",
    objectPosition: "left",
  },
  bandServices: {
    position: "absolute",
    left: THS_GEOMETRY.rightColumn,
    top: top(THS_GEOMETRY.servicesBaseline, THS_TYPE.band),
    width: THS_GEOMETRY.band.left + THS_GEOMETRY.band.width - THS_GEOMETRY.rightColumn - 8,
    fontSize: THS_TYPE.band,
    lineHeight: THS_GEOMETRY.servicesLineHeight / THS_TYPE.band,
    color: WHITE,
  },
  bandName: {
    position: "absolute",
    left: THS_GEOMETRY.marginLeft,
    top: top(THS_GEOMETRY.bandNameBaseline, THS_TYPE.band),
    width: THS_GEOMETRY.rightColumn - THS_GEOMETRY.marginLeft - 12,
    fontSize: THS_TYPE.band,
    lineHeight: 1,
    color: WHITE,
    maxLines: 1,
    textOverflow: "ellipsis",
  },

  address: {
    position: "absolute",
    fontSize: THS_TYPE.body,
    left: THS_GEOMETRY.marginLeft,
    top: top(THS_GEOMETRY.addressBaseline, THS_TYPE.body),
    width: THS_GEOMETRY.rightColumn - THS_GEOMETRY.marginLeft - 14,
    lineHeight: THS_GEOMETRY.addressLineHeight / THS_TYPE.body,
  },
  serviceLocation: {
    position: "absolute",
    fontSize: THS_TYPE.body,
    left: THS_GEOMETRY.rightColumn,
    top: top(THS_GEOMETRY.addressBaseline, THS_TYPE.body),
    width: THS_GEOMETRY.band.left + THS_GEOMETRY.band.width - THS_GEOMETRY.rightColumn,
    lineHeight: THS_GEOMETRY.addressLineHeight / THS_TYPE.body,
    maxLines: THS_GEOMETRY.serviceLocationMaxLines,
    textOverflow: "ellipsis",
  },
  metaLine: {
    position: "absolute",
    fontSize: THS_TYPE.body,
    left: THS_GEOMETRY.metaColumn,
    width: THS_GEOMETRY.band.left + THS_GEOMETRY.band.width - THS_GEOMETRY.metaColumn,
    lineHeight: THS_GEOMETRY.metaLineHeight / THS_TYPE.body,
  },
  /**
   * Ansprechpartner/Telefon/Termin: einzeilig bis zur rechten Tabellenkante (die
   * rechte Spalte ist auf dieser Höhe frei), damit nichts in die Folgezeile läuft.
   */
  infoLine: {
    position: "absolute",
    fontSize: THS_TYPE.body,
    left: THS_GEOMETRY.marginLeft,
    width: THS_GEOMETRY.table.left + THS_GEOMETRY.table.width - THS_GEOMETRY.marginLeft,
    lineHeight: 1,
    maxLines: 1,
    textOverflow: "ellipsis",
  },
  number: {
    position: "absolute",
    left: THS_GEOMETRY.marginLeft,
    top: top(THS_GEOMETRY.numberBaseline, THS_TYPE.number),
    width: THS_GEOMETRY.metaColumn - THS_GEOMETRY.marginLeft - 12,
    fontSize: THS_TYPE.number,
    fontWeight: BOLD,
    lineHeight: 1,
  },
  continuationNumber: {
    position: "absolute",
    left: THS_GEOMETRY.marginLeft,
    top: top(THS_GEOMETRY.continuationNumberBaseline, THS_TYPE.number),
    fontSize: THS_TYPE.number,
    fontWeight: BOLD,
    lineHeight: 1,
  },
  leftLine: {
    position: "absolute",
    fontSize: THS_TYPE.body,
    left: THS_GEOMETRY.marginLeft,
    width: THS_GEOMETRY.metaColumn - THS_GEOMETRY.marginLeft - 12,
    fontWeight: BOLD,
    lineHeight: 1,
  },

  flow: { position: "absolute", left: THS_GEOMETRY.marginLeft, width: T.left + T.width - THS_GEOMETRY.marginLeft },
  table: { marginLeft: T.left - THS_GEOMETRY.marginLeft, width: T.width },
  headRule: { height: T.headRule, backgroundColor: BLACK },
  summaryRule: { height: T.summaryRule, backgroundColor: BLACK },
  headRow: {
    fontSize: THS_TYPE.body,
    height: T.headHeight,
    paddingTop: T.textInset,
    paddingLeft: T.inset,
    flexDirection: "row",
    fontWeight: BOLD,
    lineHeight: 1,
  },
  summaryRow: {
    fontSize: THS_TYPE.body,
    height: T.summaryHeight,
    paddingTop: T.textInset,
    paddingLeft: T.inset,
    flexDirection: "row",
    fontWeight: BOLD,
    lineHeight: 1,
  },
  itemRow: {
    fontSize: THS_TYPE.body,
    paddingLeft: T.inset,
    flexDirection: "row",
    fontWeight: BOLD,
    lineHeight: T.rowLineHeight / THS_TYPE.body,
  },
  cPos: { width: C.position, paddingRight: 4 },
  cMenge: { width: C.menge, paddingRight: 6 },
  cBez: { width: C.bezeichnung, paddingRight: 10 },
  cBezWide: { width: C.bezeichnung + C.ust, paddingRight: 10 },
  cUst: { width: C.ust, paddingRight: 3 },
  cEinzelHead: { width: C.einzelpreisHead },
  cGesamtHead: { width: C.gesamtpreisHead },
  cEinzel: { width: C.einzelpreis, paddingRight: 3 },
  cGesamt: { width: C.gesamtpreis, textAlign: "right" },
  /** Summenzeile: Beschriftung bis zur USt.-Spalte, Satz, rechtsbündiger Betrag. */
  sLabel: { width: C.position + C.menge + C.bezeichnung },
  sRate: { width: C.ust + C.einzelpreis },
  sValue: { width: C.gesamtpreis, textAlign: "right" },
  description: {
    fontSize: THS_TYPE.description,
    fontWeight: "normal",
    lineHeight: 11 / THS_TYPE.description,
  },
  gapBeforeSummary: { height: T.gapBeforeSummary },

  note: {
    fontSize: THS_TYPE.body,
    marginTop: THS_GEOMETRY.closing.noteGap,
    width: THS_GEOMETRY.closing.width,
    fontWeight: BOLD,
    lineHeight: THS_GEOMETRY.closing.noteLineHeight / THS_TYPE.body,
  },
  termsHead: {
    fontSize: THS_TYPE.body,
    marginTop: THS_GEOMETRY.closing.blockGap,
    fontWeight: BOLD,
    textDecoration: "underline",
    lineHeight: 14 / THS_TYPE.body,
  },
  terms: {
    fontSize: THS_TYPE.body,
    marginTop: THS_GEOMETRY.closing.blockGap,
    width: THS_GEOMETRY.closing.width,
    lineHeight: THS_GEOMETRY.closing.termsLineHeight / THS_TYPE.body,
  },
  closingLine: { fontSize: THS_TYPE.body, marginTop: THS_GEOMETRY.closing.blockGap, lineHeight: 14 / THS_TYPE.body },

  footer: {
    position: "absolute",
    left: 0,
    top: THS_GEOMETRY.footer.top,
    width: PDF_A4_SIZE.width,
    height: PDF_A4_SIZE.height - THS_GEOMETRY.footer.top,
    backgroundColor: BLACK,
  },
  footerColumn: {
    position: "absolute",
    top: top(THS_GEOMETRY.footer.firstBaseline, THS_TYPE.footer) - THS_GEOMETRY.footer.top,
  },
  footerLine: {
    height: THS_GEOMETRY.footer.lineHeight,
    fontSize: THS_TYPE.footer,
    lineHeight: 1,
    color: WHITE,
    maxLines: 1,
  },
});
