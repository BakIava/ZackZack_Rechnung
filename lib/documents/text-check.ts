/**
 * Reine Regeln für „Texte prüfen“: welche Positionen geprüft werden, wie die
 * KI-Antwort je Feld abgesichert wird und was beim Übernehmen zulässig ist.
 * Die Feldprüfung (inkl. Zahlen-Wächter) kommt aus text-improve.ts.
 */

import type { DraftItem } from "@/types/document";
import type {
  TextAenderung,
  TextImproveFeld,
  TextImproveListeAntwort,
  TextImproveListeEintrag,
  TextPruefungResult,
  TextPruefungVorschlag,
  TextUebernahme,
} from "@/types/text-improve";
import { TEXT_IMPROVE_MAX_LENGTH, bewerteTextVorschlag, istTextImproveLaenge } from "./text-improve";

/** Eine Prüfung = ein KI-Aufruf = eine Einheit des Tageslimits. */
export const MAX_TEXT_CHECK_POSITIONEN = 30;

type PruefbareItem = Pick<DraftItem, "id" | "position" | "serviceId" | "descriptionDe" | "additionalDescriptionDe">;

export interface TextCheckEingabe extends TextImproveListeEintrag {
  itemId: string;
  position: number;
  /** Originaltexte für die Anzeige „vorher“. */
  altBezeichnung: string;
  altZusatztext: string | null;
}

function pruefbar(text: string | null, feld: TextImproveFeld): string | null {
  return text !== null && istTextImproveLaenge(text, feld) ? text.trim() : null;
}

/**
 * Freie Positionen und Fremdleistungen; Katalog-Positionen nicht, deren
 * Begriff pflegt der Nutzer im Katalog. Höchstens 30 je Prüfung.
 */
export function pruefbareTexte(items: readonly PruefbareItem[]): { eingaben: TextCheckEingabe[]; uebersprungen: number } {
  const kandidaten = items
    .filter((item) => item.serviceId === null)
    .map((item) => ({
      itemId: item.id,
      position: item.position,
      altBezeichnung: item.descriptionDe,
      altZusatztext: item.additionalDescriptionDe ?? null,
      bezeichnung: pruefbar(item.descriptionDe, "bezeichnung"),
      zusatztext: pruefbar(item.additionalDescriptionDe ?? null, "zusatztext"),
    }))
    .filter((eingabe) => eingabe.bezeichnung !== null || eingabe.zusatztext !== null);
  const eingaben = kandidaten
    .slice(0, MAX_TEXT_CHECK_POSITIONEN)
    .map((eingabe, index) => ({ ...eingabe, id: `p${index + 1}` }));
  return { eingaben, uebersprungen: kandidaten.length - eingaben.length };
}

/** Nur die Felder an Claude, die geprüft werden sollen. */
export function textCheckAnfrage(eingaben: readonly TextCheckEingabe[]): TextImproveListeEintrag[] {
  return eingaben.map(({ id, bezeichnung, zusatztext }) => ({ id, bezeichnung, zusatztext }));
}

function feldVorschlag(
  eingabe: string | null,
  alt: string | null,
  antwort: TextImproveListeAntwort,
  vorschlag: string | null,
  feld: TextImproveFeld,
): TextAenderung | null {
  if (eingabe === null || alt === null || vorschlag === null) return null;
  const ergebnis = bewerteTextVorschlag(eingabe, { deutsch: antwort.deutsch, textDe: vorschlag }, feld);
  return ergebnis.status === "vorschlag" ? { alt, neu: ergebnis.text } : null;
}

/**
 * Jedes Feld wird einzeln abgesichert: Ein verworfener Vorschlag (z. B. mit
 * geänderter Zahl) fällt nur für dieses Feld weg, der Rest bleibt.
 */
export function bewerteTextPruefung(
  eingaben: readonly TextCheckEingabe[],
  antworten: readonly TextImproveListeAntwort[],
  uebersprungen: number,
): TextPruefungResult {
  const nachId = new Map(antworten.map((antwort) => [antwort.id, antwort]));
  const vorschlaege = eingaben.flatMap((eingabe): TextPruefungVorschlag[] => {
    const antwort = nachId.get(eingabe.id);
    if (!antwort) return [];
    const bezeichnung = feldVorschlag(eingabe.bezeichnung, eingabe.altBezeichnung, antwort, antwort.bezeichnung, "bezeichnung");
    const zusatztext = feldVorschlag(eingabe.zusatztext, eingabe.altZusatztext, antwort, antwort.zusatztext, "zusatztext");
    return bezeichnung || zusatztext
      ? [{ itemId: eingabe.itemId, position: eingabe.position, bezeichnung, zusatztext }]
      : [];
  });
  return vorschlaege.length > 0
    ? { status: "vorschlaege", vorschlaege, uebersprungen }
    : { status: "alles_gut", uebersprungen };
}

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function neuerText(value: unknown, feld: TextImproveFeld): string | null | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= TEXT_IMPROVE_MAX_LENGTH[feld]
    ? value.trim()
    : null;
}

/** Vom Browser bestätigte Texte prüfen; eine ungültige Zeile verwirft alles. */
export function parseTextUebernahme(input: unknown): TextUebernahme[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_TEXT_CHECK_POSITIONEN) return null;
  const ids = new Set<string>();
  const result: TextUebernahme[] = [];
  for (const entry of input) {
    if (!isRecord(entry) || typeof entry.itemId !== "string" || !UUID.test(entry.itemId)) return null;
    const itemId = entry.itemId.toLowerCase();
    const descriptionDe = neuerText(entry.descriptionDe, "bezeichnung");
    const additionalDescriptionDe = neuerText(entry.additionalDescriptionDe, "zusatztext");
    if (
      ids.has(itemId) || descriptionDe === null || additionalDescriptionDe === null ||
      (descriptionDe === undefined && additionalDescriptionDe === undefined)
    ) {
      return null;
    }
    ids.add(itemId);
    result.push({
      itemId,
      ...(descriptionDe !== undefined && { descriptionDe }),
      ...(additionalDescriptionDe !== undefined && { additionalDescriptionDe }),
    });
  }
  return result;
}
