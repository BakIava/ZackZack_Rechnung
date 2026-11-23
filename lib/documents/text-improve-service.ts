import type { CustomerAiQuota } from "@/types/customer-intake";
import type { DraftItem } from "@/types/document";
import type {
  TextImproveFeld,
  TextImproveKiAntwort,
  TextImproveListeAntwort,
  TextImproveListeEintrag,
  TextImproveResult,
  TextPruefungResult,
} from "@/types/text-improve";
import { bewerteTextPruefung, pruefbareTexte, textCheckAnfrage } from "./text-check";
import { bewerteTextVorschlag, validiereTextImproveEingabe } from "./text-improve";

interface TextImproveDependencies {
  consumeAiQuota: () => Promise<CustomerAiQuota>;
  improve: (text: string, feld: TextImproveFeld) => Promise<TextImproveKiAntwort>;
}

/**
 * Eingabe prüfen → Kontingent → Claude → Vorschlag absichern. Ungültige
 * Eingaben verbrauchen kein Kontingent. Nichts wird gespeichert.
 */
export async function processTextImprove(
  text: unknown,
  feld: unknown,
  dependencies: TextImproveDependencies,
): Promise<TextImproveResult> {
  const eingabe = validiereTextImproveEingabe(text, feld);
  if (!eingabe) return { status: "fehler" };

  let quota: CustomerAiQuota;
  try {
    quota = await dependencies.consumeAiQuota();
  } catch {
    return { status: "fehler" };
  }
  if (!quota.allowed) return { status: "limit", dailyLimit: quota.dailyLimit };

  let antwort: TextImproveKiAntwort;
  try {
    antwort = await dependencies.improve(eingabe.text, eingabe.feld);
  } catch {
    return { status: "fehler" };
  }
  return bewerteTextVorschlag(eingabe.text, antwort, eingabe.feld);
}

interface TextPruefungDependencies {
  consumeAiQuota: () => Promise<CustomerAiQuota>;
  improveAll: (positionen: TextImproveListeEintrag[]) => Promise<TextImproveListeAntwort[]>;
}

/**
 * „Texte prüfen“: alle prüfbaren Positionen in einem KI-Aufruf, eine Einheit
 * des Tageslimits. Ohne prüfbare Position wird kein Kontingent verbraucht.
 */
export async function processTextPruefung(
  items: readonly DraftItem[],
  dependencies: TextPruefungDependencies,
): Promise<TextPruefungResult> {
  const { eingaben, uebersprungen } = pruefbareTexte(items);
  if (eingaben.length === 0) return { status: "keine_positionen" };

  let quota: CustomerAiQuota;
  try {
    quota = await dependencies.consumeAiQuota();
  } catch {
    return { status: "fehler" };
  }
  if (!quota.allowed) return { status: "limit", dailyLimit: quota.dailyLimit };

  let antworten: TextImproveListeAntwort[];
  try {
    antworten = await dependencies.improveAll(textCheckAnfrage(eingaben));
  } catch {
    return { status: "fehler" };
  }
  return bewerteTextPruefung(eingaben, antworten, uebersprungen);
}
