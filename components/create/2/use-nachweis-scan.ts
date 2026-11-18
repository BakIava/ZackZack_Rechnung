"use client";

import { useMemo, useRef, useState } from "react";
import { readNachweis } from "@/lib/documents/nachweis-actions";
import {
  nachweisGesamtStunden,
  nachweisImportZeilen,
  nachweisSatzOptionen,
  nachweisStartSatz,
  nachweisStartZeilen,
  nachweisVorschlaege,
  type NachweisSatz,
} from "@/lib/documents/nachweis-positionen";
import { MAX_NACHWEIS_BYTES } from "@/lib/documents/nachweis-service";
import { downscaleImage } from "@/lib/images/downscale-image";
import type {
  NachweisErgebnis,
  NachweisErrorCode,
  NachweisMaterialZeile,
  NachweisZeile,
} from "@/types/nachweis";

/** Nur Komfort auf diesem Gerät: zuletzt gewählter Stundensatz. */
const LAST_RATE_KEY = "zz-nachweis-last-rate";

export type NachweisScanPhase = "upload" | "reading" | "review";

export interface NachweisScanError {
  code: NachweisErrorCode;
  dailyLimit?: number;
}

type ZeilenPatch = Partial<Pick<NachweisZeile, "name" | "stunden" | "serviceId">>;
type MaterialPatch = Partial<Pick<NachweisMaterialZeile, "anzahl" | "unitPrice">>;

interface UseNachweisScanArgs {
  documentId: string;
  services: NachweisSatz[];
}

function readLastRate(): string | null {
  try {
    return window.localStorage.getItem(LAST_RATE_KEY);
  } catch {
    return null;
  }
}

function writeLastRate(serviceId: string | null): void {
  if (!serviceId) return;
  try {
    window.localStorage.setItem(LAST_RATE_KEY, serviceId);
  } catch {
    // Privater Modus o. Ä. – die Vorauswahl ist nur Komfort.
  }
}

/** Ablauf im Reiter „Nachweis“: Datei → Lesen → Zeilen prüfen/korrigieren → übernehmen. */
export function useNachweisScan({ documentId, services }: UseNachweisScanArgs) {
  const [phase, setPhase] = useState<NachweisScanPhase>("upload");
  const [error, setError] = useState<NachweisScanError | null>(null);
  const [ergebnis, setErgebnis] = useState<NachweisErgebnis | null>(null);
  const [zeilen, setZeilen] = useState<NachweisZeile[]>([]);
  const [material, setMaterial] = useState<NachweisMaterialZeile[]>([]);
  const [eigenerPreis, setEigenerPreis] = useState<number | null>(null);
  const nextKey = useRef(0);
  // Vorauswahl nur aus den angebotenen Sätzen, sonst zeigt die Auswahl etwas anderes als gilt.
  const startSatz = () => nachweisStartSatz(nachweisSatzOptionen(services), readLastRate());

  const vorschlaege = useMemo(
    () =>
      ergebnis
        ? nachweisVorschlaege({ kopf: ergebnis, zeilen, material, services, eigenerPreis })
        : [],
    [ergebnis, zeilen, material, services, eigenerPreis],
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
      const start = nachweisStartZeilen(result.ergebnis, startSatz());
      setErgebnis(result.ergebnis);
      setZeilen(start.zeilen);
      setMaterial(start.material);
      setEigenerPreis(null);
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
    if (patch.serviceId !== undefined) writeLastRate(patch.serviceId);
  }

  function addZeile() {
    nextKey.current += 1;
    setZeilen((current) => [
      ...current,
      {
        key: `neu${nextKey.current}`,
        name: "",
        stunden: 0,
        serviceId: current.at(-1)?.serviceId ?? startSatz(),
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
    zeilen,
    material,
    eigenerPreis,
    gesamtStunden,
    vorschlaege,
    importZeilen,
    read,
    updateZeile,
    addZeile,
    removeZeile,
    updateMaterial,
    removeMaterial,
    setEigenerPreis,
    reset,
  };
}

export type NachweisScanState = ReturnType<typeof useNachweisScan>;
