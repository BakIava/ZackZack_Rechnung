import type { DocumentTotals, DraftItem } from "./document";

/** Art des Textfelds; bestimmt Längengrenze und Schreibstil. */
export type TextImproveFeld = "bezeichnung" | "zusatztext";

/** Defensiv validierte Claude-Antwort; nur transient, wird nie gespeichert. */
export interface TextImproveKiAntwort {
  /** false, wenn der Text überwiegend nicht deutsch ist – dann wird nichts übersetzt. */
  deutsch: boolean;
  textDe: string;
}

/** Eine Position der Sammelprüfung an Claude; id ist ein kurzer Schlüssel (p1, p2 …). */
export interface TextImproveListeEintrag {
  id: string;
  /** null = Feld wird nicht geprüft (leer oder zu lang). */
  bezeichnung: string | null;
  zusatztext: string | null;
}

/** Defensiv validierte Claude-Antwort je Position der Sammelprüfung. */
export interface TextImproveListeAntwort extends TextImproveListeEintrag {
  deutsch: boolean;
}

export interface TextAenderung {
  alt: string;
  neu: string;
}

/** Verbesserungsvorschlag für eine Position; null = Feld bleibt unverändert. */
export interface TextPruefungVorschlag {
  itemId: string;
  position: number;
  bezeichnung: TextAenderung | null;
  zusatztext: TextAenderung | null;
}

/** Ergebnis von „Texte prüfen“ (alle freien Positionen eines Entwurfs). */
export type TextPruefungResult =
  | { status: "vorschlaege"; vorschlaege: TextPruefungVorschlag[]; uebersprungen: number }
  | { status: "alles_gut"; uebersprungen: number }
  | { status: "keine_positionen" }
  | { status: "limit"; dailyLimit: number }
  | { status: "fehler" };

/** Vom Nutzer bestätigte neue Texte einer Position. */
export interface TextUebernahme {
  itemId: string;
  descriptionDe?: string;
  additionalDescriptionDe?: string;
}

export type TextUebernahmeError =
  | "notAuthenticated"
  | "textsInvalid"
  | "draftNotFound"
  | "textsChanged"
  | "textsSaveFailed";

/** Ergebnis von „Texte übernehmen“ für die Oberfläche. */
export type TextUebernahmeResult =
  | { items: DraftItem[]; totals: DocumentTotals }
  | { error: TextUebernahmeError };

/** Ergebnis von „Text verbessern“ für die Oberfläche. */
export type TextImproveResult =
  | { status: "vorschlag"; text: string }
  | { status: "unveraendert" }
  | { status: "kein_deutsch" }
  | { status: "limit"; dailyLimit: number }
  | { status: "fehler" };
