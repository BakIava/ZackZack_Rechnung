/**
 * Stundennachweis (Tageslohn-/Regienachweis) → Positionsvorschläge.
 * Das Modell liest nur ab (`NachweisExtraction`); Summen, Prüfung und
 * Positionen entstehen in `lib/documents/nachweis-*`.
 */

export type NachweisMediaType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp";

/** Zustand einer Stundenzelle, wie sie auf dem Blatt steht. */
export type NachweisZelle = "zahl" | "leer" | "durchgestrichen" | "unleserlich";

export interface NachweisEintrag {
  /** ISO-Datum YYYY-MM-DD (vom Modell, ungeprüft). */
  datum: string;
  stunden: number;
  zelle: NachweisZelle;
  unsicher: boolean;
}

export interface NachweisMaterial {
  anzahl: number;
  einheit: string;
  bezeichnung: string;
}

/** Validiertes Leseergebnis des Modells – nur Abgelesenes, nichts gerechnet. */
export interface NachweisExtraction {
  nummer: string;
  projekt: string;
  tage: { datum: string; gesamtLautBlatt: number }[];
  mitarbeiter: { name: string; eintraege: NachweisEintrag[] }[];
  gesamtSummeLautBlatt: number;
  material: NachweisMaterial[];
  /** Text unter „Arbeitsleistungen/Bemerkungen“ – Vorschlag für die Positionsbeschreibung. */
  arbeitsleistung: string;
}

/** Von uns gerechnete Summen im Vergleich zur handschriftlichen Gesamtzeile. */
export interface NachweisPruefung {
  tage: { datum: string; gerechnet: number; lautBlatt: number }[];
  gesamt: number;
  gesamtLautBlatt: number;
  /** Daten, an denen gerechnete und notierte Tagessumme abweichen. */
  abweichungen: string[];
  gesamtAbweichung: boolean;
  /** Das Blatt enthält überhaupt eine Gesamtzeile, gegen die geprüft werden kann. */
  vergleichbar: boolean;
  ok: boolean;
}

/** Mitarbeiter nur für die Anzeige im Prüfschritt – wird nie gespeichert. */
export interface NachweisMitarbeiter {
  key: string;
  name: string;
  stunden: number;
  unsicher: boolean;
}

export interface NachweisErgebnis {
  nummer: string;
  projekt: string;
  zeitraumVon: string | null;
  zeitraumBis: string | null;
  pruefung: NachweisPruefung;
  mitarbeiter: NachweisMitarbeiter[];
  material: NachweisMaterial[];
  arbeitsleistung: string;
}

export type NachweisErrorCode =
  | "not_authenticated"
  | "draft_not_found"
  | "unsupported_file"
  | "file_too_large"
  | "quota_reached"
  | "quota_unavailable"
  | "provider_unavailable"
  | "no_hours_found";

export type NachweisReadResult =
  | { status: "success"; ergebnis: NachweisErgebnis }
  | { status: "error"; error: NachweisErrorCode; dailyLimit?: number };

/** Bearbeitbare Mitarbeiterzeile im Prüfschritt – lebt nur im Browser, wird nie gespeichert. */
export interface NachweisZeile {
  key: string;
  name: string;
  /** Name, wie die KI ihn gelesen hat – für gemerkte Korrekturen („Hezih“ → „Nezih“). */
  gelesenName: string;
  stunden: number;
  /** Stundenpreis in Cents; null = noch nicht eingegeben. */
  preis: number | null;
  /** Preis in dieser Zeile selbst eingetippt – folgt dann nicht mehr anderen Zeilen. */
  preisManuell: boolean;
  unsicher: boolean;
}

/** Bearbeitbare Materialzeile im Prüfschritt. */
export interface NachweisMaterialZeile {
  key: string;
  bezeichnung: string;
  anzahl: number;
  einheit: string;
  /** Cents; null = noch nicht eingegeben. */
  unitPrice: number | null;
}

/** Abgeleitete Position („Das kommt aufs Dokument“) – eine je Stundenpreis bzw. Materialzeile. */
export interface NachweisVorschlag {
  /** Stabil je Gruppe: `std:<cents>`, `std:offen` (Preis fehlt) oder der Key der Materialzeile. */
  key: string;
  quelle: "stunden" | "material";
  descriptionDe: string;
  unit: string;
  amount: number;
  /** Cents; null = Preis fehlt noch. */
  unitPrice: number | null;
  additionalDescriptionDe: string | null;
}

/** Im Browser gemerkt (pro Firma, nur dieses Gerät): Mitarbeiter mit Stundenpreis. */
export interface NachweisMitarbeiterGedaechtnis {
  /** Normalisierter Name → zuletzt verwendeter Name und Preis. */
  workers: Record<string, { name: string; preis: number | null; updatedAt: number }>;
  /** Normalisierter gelesener Name → normalisierter korrigierter Name. */
  aliases: Record<string, string>;
}

/** Im Browser gemerkter Prüfschritt eines gelesenen Nachweises – inklusive Korrekturen. */
export interface NachweisScanEintrag {
  id: string;
  /** SHA-256 der Originaldatei; gleiche Datei → kein neuer KI-Aufruf. */
  hash: string | null;
  savedAt: number;
  ergebnis: NachweisErgebnis;
  beschreibung: string;
  zeilen: NachweisZeile[];
  material: NachweisMaterialZeile[];
}

/** Dokument, auf dem dieselbe Nachweis-Nummer schon steht (Warnung vor Doppelabrechnung). */
export interface NachweisVerwendung {
  documentId: string;
  docType: "invoice" | "quote";
  /** null = Entwurf ohne Nummer. */
  documentNumber: string | null;
  sameDocument: boolean;
}

/** Bestätigte Zeile, wie sie an `addNachweisItems` geht (freie Position). */
export interface NachweisImportLine {
  kind: "free";
  descriptionDe: string;
  amount: number;
  unit: string;
  /** Cents, vom Nutzer eingegeben. */
  unitPrice: number;
  additionalDescriptionDe: string | null;
}
