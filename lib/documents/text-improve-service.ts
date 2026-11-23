import type { CustomerAiQuota } from "@/types/customer-intake";
import type { TextImproveFeld, TextImproveKiAntwort, TextImproveResult } from "@/types/text-improve";
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
