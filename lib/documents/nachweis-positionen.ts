import type { KatalogEintrag } from "@/types/service";
import type {
  NachweisErgebnis,
  NachweisImportLine,
  NachweisKorrekturen,
  NachweisSatzZuordnung,
  NachweisVorschlag,
} from "@/types/nachweis";
import { round2 } from "./nachweis-pruefung";

/** Dokumenttexte sind immer Deutsch, unabhängig von der Bediensprache. */
export const NACHWEIS_STUNDEN_OHNE_KATALOG = "Arbeitsstunden";
export const NACHWEIS_STUNDEN_EINHEIT = "Std.";
const MATERIAL_EINHEIT = "Stk.";

export type NachweisSatz = Pick<KatalogEintrag, "id" | "de" | "einheit" | "preisCents">;

function deDatum(iso: string, mitJahr: boolean): string {
  const [jahr, monat, tag] = iso.split("-");
  return mitJahr ? `${tag}.${monat}.${jahr}` : `${tag}.${monat}.`;
}

/** „07.09.–12.09.2026“; ohne Zeitzonen-Umrechnung, da reine Kalenderdaten. */
export function nachweisZeitraumText(von: string | null, bis: string | null): string {
  if (!von || !bis) return "";
  if (von === bis) return deDatum(von, true);
  const gleichesJahr = von.slice(0, 4) === bis.slice(0, 4);
  return `${deDatum(von, !gleichesJahr)}–${deDatum(bis, true)}`;
}

/** Zusatztext jeder Stundenposition – deterministisch und ohne Mitarbeiternamen. */
export function nachweisZusatztext(
  ergebnis: Pick<NachweisErgebnis, "nummer" | "projekt" | "zeitraumVon" | "zeitraumBis">,
): string {
  const teile = [
    ergebnis.nummer ? `lt. Stundennachweis Nr. ${ergebnis.nummer}` : "lt. Stundennachweis",
  ];
  const zeitraum = nachweisZeitraumText(ergebnis.zeitraumVon, ergebnis.zeitraumBis);
  if (zeitraum) teile.push(zeitraum);
  if (ergebnis.projekt) teile.push(ergebnis.projekt);
  return teile.join(", ");
}

export function istStundenEinheit(einheit: string): boolean {
  const normalized = einheit.trim().toLowerCase().replace(/\.$/, "");
  return ["std", "h", "stunde", "stunden"].includes(normalized);
}

/** Vorauswahl: zuletzt genutzter Satz, sonst der einzige Stunden-Eintrag, sonst keiner. */
export function nachweisStartSatz(
  services: NachweisSatz[],
  zuletzt: string | null,
): string | null {
  if (zuletzt && services.some((service) => service.id === zuletzt)) return zuletzt;
  const stunden = services.filter((service) => istStundenEinheit(service.einheit));
  return stunden.length === 1 ? stunden[0].id : null;
}

/**
 * Eine Stundenposition je gewähltem Satz (Reihenfolge = erstes Vorkommen),
 * Mitarbeiter ohne Satz gemeinsam als „Arbeitsstunden“, Material je Zeile.
 * Preise stammen nur aus dem Katalog – sonst muss der Nutzer sie eingeben.
 */
export function nachweisVorschlaege(
  ergebnis: NachweisErgebnis,
  zuordnung: NachweisSatzZuordnung,
  services: NachweisSatz[],
): NachweisVorschlag[] {
  const zusatz = nachweisZusatztext(ergebnis);
  const byId = new Map(services.map((service) => [service.id, service]));
  const gruppen = new Map<string, NachweisVorschlag>();

  for (const mitarbeiter of ergebnis.mitarbeiter) {
    if (mitarbeiter.stunden <= 0) continue;
    const satz = byId.get(zuordnung[mitarbeiter.key] ?? "") ?? null;
    const key = satz ? `svc:${satz.id}` : "hours";
    const vorhanden = gruppen.get(key);
    if (vorhanden) {
      vorhanden.amount = round2(vorhanden.amount + mitarbeiter.stunden);
      continue;
    }
    gruppen.set(key, {
      key,
      quelle: "stunden",
      serviceId: satz?.id ?? null,
      descriptionDe: satz?.de ?? NACHWEIS_STUNDEN_OHNE_KATALOG,
      unit: satz?.einheit || NACHWEIS_STUNDEN_EINHEIT,
      amount: mitarbeiter.stunden,
      unitPrice: satz ? satz.preisCents : null,
      additionalDescriptionDe: zusatz,
    });
  }

  const material = ergebnis.material.flatMap((entry, index): NachweisVorschlag[] =>
    entry.bezeichnung
      ? [{
          key: `mat:${index}`,
          quelle: "material",
          serviceId: null,
          descriptionDe: entry.bezeichnung,
          unit: entry.einheit || MATERIAL_EINHEIT,
          amount: entry.anzahl > 0 ? entry.anzahl : 1,
          unitPrice: null,
          additionalDescriptionDe: null,
        }]
      : [],
  );

  return [...gruppen.values(), ...material];
}

/** Wendet die Korrekturen an; `vollstaendig` erst, wenn jede gewählte Zeile Menge und Preis hat. */
export function nachweisImportZeilen(
  vorschlaege: NachweisVorschlag[],
  korrekturen: NachweisKorrekturen,
): { lines: NachweisImportLine[]; vollstaendig: boolean } {
  const excluded = new Set(korrekturen.excluded);
  const lines: NachweisImportLine[] = [];
  let vollstaendig = true;

  for (const vorschlag of vorschlaege) {
    if (excluded.has(vorschlag.key)) continue;
    const amount = korrekturen.amounts[vorschlag.key] ?? vorschlag.amount;
    if (!(amount > 0)) {
      vollstaendig = false;
      continue;
    }
    if (vorschlag.serviceId) {
      lines.push({
        kind: "catalog",
        serviceId: vorschlag.serviceId,
        amount,
        additionalDescriptionDe: vorschlag.additionalDescriptionDe,
      });
      continue;
    }
    const unitPrice = korrekturen.prices[vorschlag.key] ?? vorschlag.unitPrice;
    if (unitPrice === null || unitPrice <= 0) {
      vollstaendig = false;
      continue;
    }
    lines.push({
      kind: "free",
      descriptionDe: vorschlag.descriptionDe,
      amount,
      unit: vorschlag.unit,
      unitPrice,
      additionalDescriptionDe: vorschlag.additionalDescriptionDe,
    });
  }

  return { lines, vollstaendig: vollstaendig && lines.length > 0 };
}
