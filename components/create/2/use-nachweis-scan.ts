"use client";

import { useMemo, useState } from "react";
import { readNachweis } from "@/lib/documents/nachweis-actions";
import {
  nachweisImportZeilen,
  nachweisStartSatz,
  nachweisVorschlaege,
  type NachweisSatz,
} from "@/lib/documents/nachweis-positionen";
import { MAX_NACHWEIS_BYTES } from "@/lib/documents/nachweis-service";
import { downscaleImage } from "@/lib/images/downscale-image";
import type {
  NachweisErgebnis,
  NachweisErrorCode,
  NachweisKorrekturen,
  NachweisSatzZuordnung,
} from "@/types/nachweis";

/** Nur Komfort auf diesem Gerät: zuletzt gewählter Stundensatz. */
const LAST_RATE_KEY = "zz-nachweis-last-rate";
const NO_CORRECTIONS: NachweisKorrekturen = { amounts: {}, prices: {}, excluded: [] };

export type NachweisScanPhase = "upload" | "reading" | "review";

export interface NachweisScanError {
  code: NachweisErrorCode;
  dailyLimit?: number;
}

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

/** Stundenmengen hängen an der Gruppierung; nach einer Satzänderung neu ableiten. */
function withoutHourAmounts(korrekturen: NachweisKorrekturen): NachweisKorrekturen {
  return {
    ...korrekturen,
    amounts: Object.fromEntries(
      Object.entries(korrekturen.amounts).filter(([key]) => key.startsWith("mat:")),
    ),
  };
}

/** Ablauf im Reiter „Nachweis“: Datei → Lesen → Prüfen und Stundensätze zuordnen. */
export function useNachweisScan({ documentId, services }: UseNachweisScanArgs) {
  const [phase, setPhase] = useState<NachweisScanPhase>("upload");
  const [error, setError] = useState<NachweisScanError | null>(null);
  const [ergebnis, setErgebnis] = useState<NachweisErgebnis | null>(null);
  const [zuordnung, setZuordnung] = useState<NachweisSatzZuordnung>({});
  const [korrekturen, setKorrekturen] = useState<NachweisKorrekturen>(NO_CORRECTIONS);

  const vorschlaege = useMemo(
    () => (ergebnis ? nachweisVorschlaege(ergebnis, zuordnung, services) : []),
    [ergebnis, zuordnung, services],
  );
  const importZeilen = useMemo(
    () => nachweisImportZeilen(vorschlaege, korrekturen),
    [vorschlaege, korrekturen],
  );

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
      const start = nachweisStartSatz(services, readLastRate());
      setErgebnis(result.ergebnis);
      setZuordnung(
        Object.fromEntries(result.ergebnis.mitarbeiter.map((entry) => [entry.key, start])),
      );
      setKorrekturen(NO_CORRECTIONS);
      setPhase("review");
    } catch {
      setError({ code: "provider_unavailable" });
      setPhase("upload");
    }
  }

  function setRate(workerKey: string, serviceId: string | null) {
    setZuordnung((current) => ({ ...current, [workerKey]: serviceId }));
    setKorrekturen(withoutHourAmounts);
    writeLastRate(serviceId);
  }

  function setRateForAll(serviceId: string | null) {
    setZuordnung((current) =>
      Object.fromEntries(Object.keys(current).map((key) => [key, serviceId])),
    );
    setKorrekturen(withoutHourAmounts);
    writeLastRate(serviceId);
  }

  function setAmount(key: string, amount: number) {
    setKorrekturen((current) => ({ ...current, amounts: { ...current.amounts, [key]: amount } }));
  }

  function setPrice(key: string, cents: number) {
    setKorrekturen((current) => ({ ...current, prices: { ...current.prices, [key]: cents } }));
  }

  function toggle(key: string) {
    setKorrekturen((current) => ({
      ...current,
      excluded: current.excluded.includes(key)
        ? current.excluded.filter((entry) => entry !== key)
        : [...current.excluded, key],
    }));
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
    zuordnung,
    korrekturen,
    vorschlaege,
    importZeilen,
    read,
    setRate,
    setRateForAll,
    setAmount,
    setPrice,
    toggle,
    reset,
  };
}

export type NachweisScanState = ReturnType<typeof useNachweisScan>;
