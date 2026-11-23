import { readMitarbeiterGedaechtnis, writeMitarbeiterGedaechtnis } from "@/lib/documents/nachweis-cache";
import { mitarbeiterMerken } from "@/lib/documents/nachweis-gedaechtnis";
import {
  nachweisGesamtStunden, nachweisImportZeilen, nachweisPreisSetzen, nachweisVorschlaege,
} from "@/lib/documents/nachweis-positionen";
import { neuerNachweisZeilenKey, readLastPrice, writeLastPrice } from "@/lib/documents/nachweis-review-zustand";
import type { NachweisMaterialZeile, NachweisReviewDaten, NachweisZeile } from "@/types/nachweis";

type Tabelle = Extract<NachweisReviewDaten, { variante: "tabelle" }>;
type ZeilenPatch = Partial<Pick<NachweisZeile, "name" | "stunden">>;
type MaterialPatch = Partial<Pick<NachweisMaterialZeile, "anzahl" | "unitPrice">>;

export function nachweisTabellenSteuerung(
  tabelle: Tabelle | null,
  update: (change: (review: NachweisReviewDaten) => NachweisReviewDaten) => void,
  cacheScope: string,
) {
  const zeilen = tabelle?.zeilen ?? [];
  const vorschlaege = tabelle ? nachweisVorschlaege({ ...tabelle, kopf: tabelle.ergebnis }) : [];
  const updateTabelle = (change: (current: Tabelle) => Tabelle) =>
    update((current) => current.variante === "tabelle" ? change(current) : current);

  return {
    beschreibung: tabelle?.beschreibung ?? "",
    zeilen,
    material: tabelle?.material ?? [],
    vorschlaege,
    importZeilen: nachweisImportZeilen(vorschlaege),
    gesamtStunden: nachweisGesamtStunden(zeilen),
    setBeschreibung: (beschreibung: string) => updateTabelle((current) => ({ ...current, beschreibung })),
    updateZeile: (key: string, patch: ZeilenPatch) => updateTabelle((current) => ({
      ...current,
      zeilen: current.zeilen.map((zeile) => zeile.key === key
        ? { ...zeile, ...patch, unsicher: patch.stunden === undefined && zeile.unsicher }
        : zeile),
    })),
    setPreis: (key: string, preis: number | null) => {
      updateTabelle((current) => ({ ...current, zeilen: nachweisPreisSetzen(current.zeilen, key, preis) }));
      writeLastPrice(preis);
    },
    addZeile: () => {
      const letzterPreis = readLastPrice();
      updateTabelle((current) => ({
        ...current,
        zeilen: [...current.zeilen, {
          key: neuerNachweisZeilenKey(current.zeilen, "neu"),
          name: "",
          gelesenName: "",
          stunden: 0,
          preis: current.zeilen.at(-1)?.preis ?? letzterPreis,
          preisManuell: false,
          unsicher: false,
        }],
      }));
    },
    removeZeile: (key: string) => updateTabelle((current) => ({
      ...current, zeilen: current.zeilen.filter((zeile) => zeile.key !== key),
    })),
    updateMaterial: (key: string, patch: MaterialPatch) => updateTabelle((current) => ({
      ...current,
      material: current.material.map((entry) => entry.key === key ? { ...entry, ...patch } : entry),
    })),
    removeMaterial: (key: string) => updateTabelle((current) => ({
      ...current, material: current.material.filter((entry) => entry.key !== key),
    })),
    mitarbeiterFuerNaechstesMalMerken: () => {
      if (!tabelle) return;
      const gedaechtnis = readMitarbeiterGedaechtnis(cacheScope);
      writeMitarbeiterGedaechtnis(cacheScope, mitarbeiterMerken(gedaechtnis, zeilen, Date.now()));
    },
  };
}
