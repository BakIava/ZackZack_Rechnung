/** Art des Textfelds; bestimmt Längengrenze und Schreibstil. */
export type TextImproveFeld = "bezeichnung" | "zusatztext";

/** Defensiv validierte Claude-Antwort; nur transient, wird nie gespeichert. */
export interface TextImproveKiAntwort {
  /** false, wenn der Text überwiegend nicht deutsch ist – dann wird nichts übersetzt. */
  deutsch: boolean;
  textDe: string;
}

/** Ergebnis von „Text verbessern“ für die Oberfläche. */
export type TextImproveResult =
  | { status: "vorschlag"; text: string }
  | { status: "unveraendert" }
  | { status: "kein_deutsch" }
  | { status: "limit"; dailyLimit: number }
  | { status: "fehler" };
