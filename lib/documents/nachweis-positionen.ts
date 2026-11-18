import type { KatalogEintrag } from "@/types/service";
import type {
  NachweisErgebnis,
  NachweisImportLine,
  NachweisMaterialZeile,
  NachweisVorschlag,
  NachweisZeile,
} from "@/types/nachweis";
import { round2 } from "./nachweis-pruefung";

/** Dokumenttexte sind immer Deutsch, unabhängig von der Bediensprache. */
export const NACHWEIS_STUNDEN_OHNE_KATALOG = "Arbeitsstunden";
export const NACHWEIS_STUNDEN_EINHEIT = "Std.";
const MATERIAL_EINHEIT = "Stk.";

export type NachweisSatz = Pick<KatalogEintrag, "id" | "de" | "einheit" | "preisCents">;
type NachweisKopf = Pick<NachweisErgebnis, "nummer" | "projekt" | "zeitraumVon" | "zeitraumBis">;

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
export function nachweisZusatztext(kopf: NachweisKopf): string {
  const teile = [kopf.nummer ? `lt. Stundennachweis Nr. ${kopf.nummer}` : "lt. Stundennachweis"];
  const zeitraum = nachweisZeitraumText(kopf.zeitraumVon, kopf.zeitraumBis);
  if (zeitraum) teile.push(zeitraum);
  if (kopf.projekt) teile.push(kopf.projekt);
  return teile.join(", ");
}

export function istStundenEinheit(einheit: string): boolean {
  const normalized = einheit.trim().toLowerCase().replace(/\.$/, "");
  return ["std", "h", "stunde", "stunden"].includes(normalized);
}

/** Auswahl im Prüfschritt: nur Stundensätze – gibt es keine, alle Katalogeinträge. */
export function nachweisSatzOptionen<T extends NachweisSatz>(services: T[]): T[] {
  const stunden = services.filter((service) => istStundenEinheit(service.einheit));
  return stunden.length > 0 ? stunden : services;
}

/** Vorauswahl: zuletzt genutzter Satz, sonst der erste Stundensatz, sonst eigener Preis. */
export function nachweisStartSatz(
  services: NachweisSatz[],
  zuletzt: string | null,
): string | null {
  if (zuletzt && services.some((service) => service.id === zuletzt)) return zuletzt;
  return services.find((service) => istStundenEinheit(service.einheit))?.id ?? null;
}

/** Bearbeitbare Zeilen aus dem Leseergebnis; alle Mitarbeiter starten mit demselben Satz. */
export function nachweisStartZeilen(
  ergebnis: NachweisErgebnis,
  startSatz: string | null,
): { zeilen: NachweisZeile[]; material: NachweisMaterialZeile[] } {
  return {
    zeilen: ergebnis.mitarbeiter.map((mitarbeiter) => ({
      key: mitarbeiter.key,
      name: mitarbeiter.name,
      stunden: mitarbeiter.stunden,
      serviceId: startSatz,
      unsicher: mitarbeiter.unsicher,
    })),
    material: ergebnis.material.map((entry, index) => ({
      key: `mat:${index}`,
      bezeichnung: entry.bezeichnung,
      anzahl: entry.anzahl > 0 ? entry.anzahl : 1,
      einheit: entry.einheit || MATERIAL_EINHEIT,
      unitPrice: null,
    })),
  };
}

export function nachweisGesamtStunden(zeilen: NachweisZeile[]): number {
  return round2(zeilen.reduce((sum, zeile) => sum + Math.max(0, zeile.stunden), 0));
}

interface NachweisVorschlagInput {
  kopf: NachweisKopf;
  zeilen: NachweisZeile[];
  material: NachweisMaterialZeile[];
  services: NachweisSatz[];
  /** Cents für Mitarbeiter ohne Katalogsatz. */
  eigenerPreis: number | null;
}

/**
 * Eine Stundenposition je Stundensatz (Reihenfolge = erstes Vorkommen),
 * Mitarbeiter ohne Katalogsatz gemeinsam als „Arbeitsstunden“, Material je Zeile.
 * Preise stammen aus dem Katalog oder vom Nutzer – nie vom Modell.
 */
export function nachweisVorschlaege({
  kopf,
  zeilen,
  material,
  services,
  eigenerPreis,
}: NachweisVorschlagInput): NachweisVorschlag[] {
  const zusatz = nachweisZusatztext(kopf);
  const byId = new Map(services.map((service) => [service.id, service]));
  const gruppen = new Map<string, NachweisVorschlag>();

  for (const zeile of zeilen) {
    if (!(zeile.stunden > 0)) continue;
    const satz = byId.get(zeile.serviceId ?? "") ?? null;
    const key = satz ? `svc:${satz.id}` : "hours";
    const vorhanden = gruppen.get(key);
    if (vorhanden) {
      vorhanden.amount = round2(vorhanden.amount + zeile.stunden);
      continue;
    }
    gruppen.set(key, {
      key,
      quelle: "stunden",
      serviceId: satz?.id ?? null,
      descriptionDe: satz?.de ?? NACHWEIS_STUNDEN_OHNE_KATALOG,
      unit: satz?.einheit || NACHWEIS_STUNDEN_EINHEIT,
      amount: round2(zeile.stunden),
      unitPrice: satz ? satz.preisCents : eigenerPreis,
      additionalDescriptionDe: zusatz,
    });
  }

  const materialVorschlaege = material.flatMap((zeile): NachweisVorschlag[] =>
    zeile.bezeichnung.trim() && zeile.anzahl > 0
      ? [{
          key: zeile.key,
          quelle: "material",
          serviceId: null,
          descriptionDe: zeile.bezeichnung.trim(),
          unit: zeile.einheit || MATERIAL_EINHEIT,
          amount: round2(zeile.anzahl),
          unitPrice: zeile.unitPrice,
          additionalDescriptionDe: null,
        }]
      : [],
  );

  return [...gruppen.values(), ...materialVorschlaege];
}

/** Übernehmbar erst, wenn es Positionen gibt und jede einen Preis hat. */
export function nachweisImportZeilen(
  vorschlaege: NachweisVorschlag[],
): { lines: NachweisImportLine[]; vollstaendig: boolean } {
  const lines = vorschlaege.flatMap((vorschlag): NachweisImportLine[] => {
    if (vorschlag.serviceId) {
      return [{
        kind: "catalog",
        serviceId: vorschlag.serviceId,
        amount: vorschlag.amount,
        additionalDescriptionDe: vorschlag.additionalDescriptionDe,
      }];
    }
    if (vorschlag.unitPrice === null || vorschlag.unitPrice <= 0) return [];
    return [{
      kind: "free",
      descriptionDe: vorschlag.descriptionDe,
      amount: vorschlag.amount,
      unit: vorschlag.unit,
      unitPrice: vorschlag.unitPrice,
      additionalDescriptionDe: vorschlag.additionalDescriptionDe,
    }];
  });
  return {
    lines,
    vollstaendig: lines.length > 0 && lines.length === vorschlaege.length,
  };
}
