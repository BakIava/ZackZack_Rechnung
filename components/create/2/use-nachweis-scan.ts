"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { findNachweisUsage, readNachweis } from "@/lib/documents/nachweis-actions";
import {
  dateiFingerabdruck,
  readMitarbeiterGedaechtnis,
  readScans,
  writeMitarbeiterGedaechtnis,
  writeScans,
} from "@/lib/documents/nachweis-cache";
import {
  gedaechtnisAnwenden,
  gueltigeScans,
  mitarbeiterMerken,
  scanMerken,
  scanZurDatei,
} from "@/lib/documents/nachweis-gedaechtnis";
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
  NachweisScanEintrag,
  NachweisVerwendung,
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

function neueScanId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Ablauf im Reiter „Nachweis“: Datei → Lesen → Zeilen prüfen/korrigieren → übernehmen.
 * `cacheScope` (Firma) trennt den Browser-Speicher, falls sich mehrere Firmen ein Gerät teilen.
 * Wird nur nach einem Klick im Browser gerendert – localStorage ist beim ersten Render da.
 */
export function useNachweisScan(documentId: string, cacheScope: string) {
  const [phase, setPhase] = useState<NachweisScanPhase>("upload");
  const [error, setError] = useState<NachweisScanError | null>(null);
  const [ergebnis, setErgebnis] = useState<NachweisErgebnis | null>(null);
  const [beschreibung, setBeschreibung] = useState("");
  const [zeilen, setZeilen] = useState<NachweisZeile[]>([]);
  const [material, setMaterial] = useState<NachweisMaterialZeile[]>([]);
  const [scan, setScan] = useState<{ id: string; hash: string | null } | null>(null);
  const [zuletzt, setZuletzt] = useState<NachweisScanEintrag[]>(() =>
    gueltigeScans(readScans(cacheScope), Date.now()),
  );
  const [verwendungen, setVerwendungen] = useState<NachweisVerwendung[]>([]);
  const nextKey = useRef(0);

  // Prüfschritt samt Korrekturen laufend merken – so geht nach versehentlichem Schließen nichts verloren.
  useEffect(() => {
    if (phase !== "review" || !ergebnis || !scan) return;
    const eintrag = { ...scan, savedAt: Date.now(), ergebnis, beschreibung, zeilen, material };
    writeScans(cacheScope, scanMerken(readScans(cacheScope), eintrag, Date.now()));
  }, [phase, scan, ergebnis, beschreibung, zeilen, material, cacheScope]);

  // Warnung vor Doppelabrechnung: steht diese Nummer schon auf einem Dokument?
  const nummer = phase === "review" ? ergebnis?.nummer ?? "" : "";
  useEffect(() => {
    if (!nummer) return;
    let aktiv = true;
    findNachweisUsage(documentId, nummer)
      .then((treffer) => aktiv && setVerwendungen(treffer))
      .catch(() => undefined);
    return () => {
      aktiv = false;
    };
  }, [documentId, nummer]);

  function oeffnen(eintrag: NachweisScanEintrag) {
    setError(null);
    setVerwendungen([]);
    setErgebnis(eintrag.ergebnis);
    setBeschreibung(eintrag.beschreibung);
    setZeilen(eintrag.zeilen);
    setMaterial(eintrag.material);
    setScan({ id: eintrag.id, hash: eintrag.hash });
    setPhase("review");
  }

  const vorschlaege = useMemo(
    () =>
      ergebnis ? nachweisVorschlaege({ kopf: ergebnis, beschreibung, zeilen, material }) : [],
    [ergebnis, beschreibung, zeilen, material],
  );
  const importZeilen = useMemo(() => nachweisImportZeilen(vorschlaege), [vorschlaege]);
  const gesamtStunden = nachweisGesamtStunden(zeilen);

  async function read(file: File) {
    setError(null);
    setVerwendungen([]);
    setPhase("reading");
    try {
      // Gleiche Datei schon gelesen? Dann ohne neuen KI-Aufruf den gemerkten Stand öffnen.
      const hash = await dateiFingerabdruck(file);
      const gemerkt = scanZurDatei(readScans(cacheScope), hash, Date.now());
      if (gemerkt) {
        oeffnen(gemerkt);
        return;
      }

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
      setZeilen(gedaechtnisAnwenden(start.zeilen, readMitarbeiterGedaechtnis(cacheScope)));
      setMaterial(start.material);
      setScan({ id: neueScanId(), hash });
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
        gelesenName: "",
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

  /** Beim Übernehmen: Namen, Korrekturen und Preise für den nächsten Zettel merken. */
  function mitarbeiterFuerNaechstesMalMerken() {
    const gedaechtnis = readMitarbeiterGedaechtnis(cacheScope);
    writeMitarbeiterGedaechtnis(cacheScope, mitarbeiterMerken(gedaechtnis, zeilen, Date.now()));
  }

  function reset() {
    setPhase("upload");
    setError(null);
    setErgebnis(null);
    setVerwendungen([]);
    setZuletzt(gueltigeScans(readScans(cacheScope), Date.now()));
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
    zuletzt,
    verwendungen,
    read,
    oeffnen,
    mitarbeiterFuerNaechstesMalMerken,
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
