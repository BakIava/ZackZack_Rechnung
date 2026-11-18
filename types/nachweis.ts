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
  bemerkungen: string;
  hinweise: string[];
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
  bemerkungen: string;
  hinweise: string[];
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

/** Mitarbeiter-Key → gewählter Katalogeintrag (null = ohne Katalog, Preis eingeben). */
export type NachweisSatzZuordnung = Record<string, string | null>;

/** Abgeleiteter Positionsvorschlag im Prüfschritt (noch ohne Nutzerkorrekturen). */
export interface NachweisVorschlag {
  /** Stabil je Gruppe: `svc:<id>`, `hours` (ohne Katalog) oder `mat:<index>`. */
  key: string;
  quelle: "stunden" | "material";
  serviceId: string | null;
  descriptionDe: string;
  unit: string;
  amount: number;
  /** Cents; null = muss im Prüfschritt eingegeben werden. */
  unitPrice: number | null;
  additionalDescriptionDe: string | null;
}

/** Korrekturen des Nutzers im Prüfschritt, je Vorschlags-Key. */
export interface NachweisKorrekturen {
  amounts: Record<string, number>;
  /** Cents, nur für Vorschläge ohne Katalogpreis. */
  prices: Record<string, number>;
  excluded: string[];
}

/** Bestätigte Zeile, wie sie an `addNachweisItems` geht. */
export type NachweisImportLine =
  | {
      kind: "catalog";
      serviceId: string;
      amount: number;
      additionalDescriptionDe: string | null;
    }
  | {
      kind: "free";
      descriptionDe: string;
      amount: number;
      unit: string;
      unitPrice: number;
      additionalDescriptionDe: string | null;
    };
