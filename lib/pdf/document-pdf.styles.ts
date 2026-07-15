/**
 * Stylesheet für den PDF-Beleg (@react-pdf/renderer). Werte spiegeln die
 * A4-HTML-Vorschau (step3.css) in Print-Maßstab: gleiche Marken-/Flächenfarben,
 * gleiche Hierarchie. Der Beleg ist IMMER LTR/Deutsch — kein RTL, keine
 * UI-Sprache. Schrift ist die eingebettete Marken-Schrift (siehe fonts.ts), die
 * Türkisch/Deutsch/€/§ abdeckt; fontFamily wird von der Page vererbt, Fettung
 * über fontWeight.
 */

import { StyleSheet } from "@react-pdf/renderer";
import { PDF_FONT_FAMILY } from "@/lib/pdf/fonts";

const INK = "#23303a";
const HEAD = "#0f2a3f";
const MUTED = "#6a7682";
const FAINT = "#99a1a9";
const LINE = "#eef1f4";
const RULE = "#16242f";
const ACCENT = "#fb6202";
const BOLD = "bold" as const;

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 44,
    // Reserviert Platz für den absolut positionierten Footer (s. foot unten),
    // damit fließender Inhalt nie unter ihm verschwindet.
    paddingBottom: 130,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: PDF_FONT_FAMILY,
    color: INK,
    lineHeight: 1.5,
  },

  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
  },
  coName: { fontSize: 15, fontWeight: BOLD, color: HEAD },
  coAddr: { fontSize: 8.5, color: MUTED, marginTop: 7 },
  coContact: { fontSize: 8.5, color: MUTED },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: ACCENT,
    color: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 16, fontWeight: BOLD, color: "#ffffff" },
  logoImg: { width: 44, height: 44, objectFit: "contain" },

  mid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },
  midLeft: { flexGrow: 1, flexShrink: 1, paddingRight: 24 },
  sender: {
    fontSize: 7.5,
    color: FAINT,
    paddingBottom: 3,
    marginBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#c7ced4",
  },
  toLabel: {
    fontSize: 7.5,
    fontWeight: BOLD,
    color: FAINT,
    letterSpacing: 1,
    marginBottom: 5,
  },
  toName: { fontSize: 12, fontWeight: BOLD, color: "#1a2430" },
  toAddr: { fontSize: 10, color: "#3a4651", marginTop: 3 },

  meta: { width: 200, flexShrink: 0 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  metaKey: { fontSize: 9.5, color: MUTED },
  metaVal: { fontSize: 9.5, fontWeight: BOLD, color: "#1a2430" },
  metaValDraft: { fontSize: 9, color: "#d85402" },

  h1: {
    fontSize: 18,
    fontWeight: BOLD,
    color: HEAD,
    marginTop: 24,
    marginBottom: 14,
  },

  tHead: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: RULE,
    paddingBottom: 6,
  },
  tHeadCell: {
    fontSize: 8,
    fontWeight: BOLD,
    color: MUTED,
    letterSpacing: 0.5,
  },
  tRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  cPos: { width: "8%", color: FAINT },
  cDesc: { width: "36%", fontWeight: BOLD, color: "#1a2430" },
  cDescNoVat: { width: "44%", fontWeight: BOLD, color: "#1a2430" },
  cQty: { width: "14%", textAlign: "right" },
  cQtyNoVat: { width: "16%", textAlign: "right" },
  cPrice: { width: "14%", textAlign: "right" },
  cPriceNoVat: { width: "16%", textAlign: "right" },
  cVat: { width: "12%", textAlign: "right" },
  cTotal: { width: "16%", textAlign: "right" },
  cellText: { fontSize: 10, color: INK },

  sumWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  sumBox: { width: 240 },
  sumLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  sumLineLabel: { fontSize: 10, color: "#3a4651" },
  sumLineVal: { fontSize: 10, color: "#3a4651" },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    paddingHorizontal: 6,
    borderTopWidth: 2,
    borderTopColor: RULE,
  },
  grandLabel: { fontSize: 11, fontWeight: BOLD, color: HEAD },
  grandVal: { fontSize: 15, fontWeight: BOLD, color: HEAD },

  vat: {
    marginTop: 18,
    padding: 11,
    backgroundColor: "#f4f6f8",
    borderRadius: 6,
    fontSize: 9.5,
    color: "#2c3742",
  },
  pay: { marginTop: 12, fontSize: 9.5, color: "#3a4651" },
  thanks: { marginTop: 12, fontSize: 10, fontWeight: BOLD, color: "#1a2430" },

  foot: {
    position: "absolute",
    bottom: 40,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  footCol: { width: "31%" },
  footHead: {
    fontSize: 7.5,
    fontWeight: BOLD,
    color: "#5a6671",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  footText: { fontSize: 8.5, color: "#8a929b" },
});
