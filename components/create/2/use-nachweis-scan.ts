"use client";

import { useMemo, useRef, useState } from "react";
import { readNachweis } from "@/lib/documents/nachweis-actions";
import {
  nachweisGesamtStunden,
  nachweisImportZeilen,
  nachweisPreisSetzen,
  nachweisStartBeschreibung,
  nachweisStartZeilen,
  nachweisVorschlaege,
} from "@/lib/documents/nachweis-positionen";
import { MAX_NACHWEIS_BYTES } from "@/lib/documents/nachweis-service";
import { downscaleImage } from "@/lib/images/downscale-image";
import type {
  NachweisErgebnis,
  NachweisErrorCode,
  NachweisMaterialZeile,
  NachweisZeile,
} from "@/types/nachweis";

/** Nur Komfort auf diesem Gerät: zuletzt eingegebener Stundenpreis (Cents). */
const LAST_PRICE_KEY = "zz-nachweis-last-price";

export type NachweisScanPhase = "upload" | "reading" | "review";

export interface NachweisScanError {
  code: NachweisErrorCode;
  dailyLimit?: number;
}

type ZeilenPatch = Partial<Pick<NachweisZeile, "name" | "stunden">>;
type MaterialPatch = Partial<Pick<NachweisMaterialZeile, "anzahl" | "unitPrice">>;

function readLastPrice(): number | null {
  try {
    const value = Number(window.localStorage.getItem(LAST_PRICE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeLastPrice(cents: number | null): void {
  if (!cents) return;
  try {
    window.localStorage.setItem(LAST_PRICE_KEY, String(cents));
  } catch {
    // Privater Modus o. Ä. – die Vorbelegung ist nur Komfort.
  }
}

/** Ablauf im Reiter „Nachweis“: Datei → Lesen → Zeilen prüfen/korrigieren → übernehmen. */
export function useNachweisScan(documentId: string) {
  const [phase, setPhase] = useState<NachweisScanPhase>("upload");
  const [error, setError] = useState<NachweisScanError | null>(null);
  const [ergebnis, setErgebnis] = useState<NachweisErgebnis | null>(null);
  const [beschreibung, setBeschreibung] = useState("");
  const [zeilen, setZeilen] = useState<NachweisZeile[]>([]);
  const [material, setMaterial] = useState<NachweisMaterialZeile[]>([]);
  const nextKey = useRef(0);

  const vorschlaege = useMemo(
    () =>
      ergebnis ? nachweisVorschlaege({ kopf: ergebnis, beschreibung, zeilen, material }) : [],
    [ergebnis, beschreibung, zeilen, material],
  );
  const importZeilen = useMemo(() => nachweisImportZeilen(vorschlaege), [vorschlaege]);
  const gesamtStunden = nachweisGesamtStunden(zeilen);

  async function read(file: File) {
    setError(null);
    setPhase("reading");
    try {
      const upload = await downscaleImage(file);
      if (upload.size > MAX_NACHWEIS_BYTES) {
        setError({ code: "file_too_large" });
        setPhase("upload");
        return;
      }
      const formData = new FormData();
      formData.append("file", upload, file.name);
      const result = await readNachweis(documentId, formData);
      if (result.status === "error") {
        setError({ code: result.error, dailyLimit: result.dailyLimit });
        setPhase("upload");
        return;
      }
      const start = nachweisStartZeilen(result.ergebnis, readLastPrice());
      setErgebnis(result.ergebnis);
      setBeschreibung(nachweisStartBeschreibung(result.ergebnis));
      setZeilen(start.zeilen);
      setMaterial(start.material);
      setPhase("review");
    } catch {
      setError({ code: "provider_unavailable" });
      setPhase("upload");
    }
  }

  function updateZeile(key: string, patch: ZeilenPatch) {
    // Selbst eingetippte Stunden gelten als geprüft – die Markierung „unsicher“ entfällt.
    const bestaetigt = patch.stunden !== undefined ? { unsicher: false } : {};
    setZeilen((current) =>
      current.map((zeile) => (zeile.key === key ? { ...zeile, ...patch, ...bestaetigt } : zeile)),
    );
  }

  function setPreis(key: string, cents: number | null) {
    setZeilen((current) => nachweisPreisSetzen(current, key, cents));
    writeLastPrice(cents);
  }

  function addZeile() {
    nextKey.current += 1;
    setZeilen((current) => [
      ...current,
      {
        key: `neu${nextKey.current}`,
        name: "",
        stunden: 0,
        preis: current.at(-1)?.preis ?? readLastPrice(),
        preisManuell: false,
        unsicher: false,
      },
    ]);
  }

  function removeZeile(key: string) {
    setZeilen((current) => current.filter((zeile) => zeile.key !== key));
  }

  function updateMaterial(key: string, patch: MaterialPatch) {
    setMaterial((current) =>
      current.map((zeile) => (zeile.key === key ? { ...zeile, ...patch } : zeile)),
    );
  }

  function removeMaterial(key: string) {
    setMaterial((current) => current.filter((zeile) => zeile.key !== key));
  }

  function reset() {
    setPhase("upload");
    setError(null);
    setErgebnis(null);
  }

  return {
    phase,
    error,
    ergebnis,
    beschreibung,
    zeilen,
    material,
    gesamtStunden,
    vorschlaege,
    importZeilen,
    read,
    setBeschreibung,
    updateZeile,
    setPreis,
    addZeile,
    removeZeile,
    updateMaterial,
    removeMaterial,
    reset,
  };
}

export type NachweisScanState = ReturnType<typeof useNachweisScan>;
