"use client";

import { useEffect, useRef, useState } from "react";
import { findNachweisUsage, readNachweis } from "@/lib/documents/nachweis-actions";
import { dateiFingerabdruck, readScans, writeScans } from "@/lib/documents/nachweis-cache";
import { scanMerken, scanZurDatei } from "@/lib/documents/nachweis-gedaechtnis";
import { leereFreieZeile, nachweisReviewStart } from "@/lib/documents/nachweis-review-zustand";
import { MAX_NACHWEIS_BYTES } from "@/lib/documents/nachweis-service";
import { downscaleImage } from "@/lib/images/downscale-image";
import type {
  NachweisCacheEintrag, NachweisErrorCode, NachweisFreieZeile, NachweisReviewDaten, NachweisVerwendung,
} from "@/types/nachweis";
import { nachweisTabellenSteuerung } from "./use-nachweis-tabelle";

export interface NachweisScanError {
  code: NachweisErrorCode;
  dailyLimit?: number;
}

type FreieZeilenPatch = Partial<Omit<NachweisFreieZeile, "key" | "tage" | "unsicher">>;

function neueScanId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useNachweisScan(
  documentId: string,
  cacheScope: string,
  readAction = readNachweis,
  findUsageAction = findNachweisUsage,
) {
  const [phase, setPhase] = useState<"upload" | "reading" | "review">("upload");
  const [error, setError] = useState<NachweisScanError | null>(null);
  const [eintrag, setEintrag] = useState<NachweisCacheEintrag | null>(null);
  const [zuletzt, setZuletzt] = useState(() => readScans(cacheScope));
  const [verwendungen, setVerwendungen] = useState<NachweisVerwendung[]>([]);
  const [ausSpeicher, setAusSpeicher] = useState(false);
  const letzteDatei = useRef<File | null>(null);
  const erneut = useRef<NachweisCacheEintrag | null>(null);
  const request = useRef(0);

  useEffect(() => () => { request.current += 1; }, [cacheScope, documentId]);

  useEffect(() => {
    if (phase !== "review" || !eintrag) return;
    const jetzt = Date.now();
    writeScans(cacheScope, scanMerken(readScans(cacheScope, jetzt), { ...eintrag, savedAt: jetzt }, jetzt), jetzt);
  }, [phase, eintrag, cacheScope]);

  const nummer = phase === "review" ? eintrag?.review.ergebnis.nummer : undefined;
  const id = eintrag?.id;
  useEffect(() => {
    if (!nummer) return;
    let aktiv = true;
    const anfrage = request.current;
    findUsageAction(documentId, nummer)
      .then((treffer) => {
        if (aktiv && request.current === anfrage) setVerwendungen(treffer);
      })
      .catch(() => undefined);
    return () => { aktiv = false; };
  }, [documentId, nummer, id, findUsageAction]);

  function oeffnen(gespeichert: NachweisCacheEintrag, datei: File | null = null) {
    request.current += 1;
    letzteDatei.current = datei;
    erneut.current = null;
    setAusSpeicher(true);
    setError(null);
    setVerwendungen([]);
    setEintrag(gespeichert);
    setPhase("review");
  }

  function reset() {
    request.current += 1;
    letzteDatei.current = null;
    erneut.current = null;
    setPhase("upload");
    setError(null);
    setEintrag(null);
    setVerwendungen([]);
    setZuletzt(readScans(cacheScope));
  }

  async function read(file: File, ersetzeId: string | null = null) {
    const anfrage = ++request.current;
    letzteDatei.current = file;
    setError(null);
    setVerwendungen([]);
    setEintrag(null);
    setPhase("reading");

    function fehler(next: NachweisScanError) {
      if (request.current !== anfrage) return;
      setError(next);
      setZuletzt(readScans(cacheScope));
      setPhase("upload");
    }

    try {
      const hash = await dateiFingerabdruck(file);
      if (request.current !== anfrage) return;
      const angefordert = erneut.current;
      const gleicheDatei = angefordert && hash !== null && angefordert.hash === hash;
      const erneuteId = ersetzeId ?? (gleicheDatei ? angefordert.id : null);
      const gemerkt = erneuteId ? null : scanZurDatei(readScans(cacheScope), hash, Date.now());
      if (gemerkt) {
        oeffnen(gemerkt, file);
        return;
      }

      const upload = await downscaleImage(file);
      if (request.current !== anfrage) return;
      if (upload.size > MAX_NACHWEIS_BYTES) {
        fehler({ code: "file_too_large" });
        return;
      }
      const formData = new FormData();
      formData.append("file", upload, file.name);
      const result = await readAction(documentId, formData);
      if (request.current !== anfrage) return;
      if (result.status === "error") {
        fehler({ code: result.error, dailyLimit: result.dailyLimit });
        return;
      }
      erneut.current = null;
      setEintrag({
        id: erneuteId ?? neueScanId(),
        hash,
        review: nachweisReviewStart(result.ergebnis, cacheScope),
        savedAt: Date.now(),
      });
      setAusSpeicher(false);
      setPhase("review");
    } catch {
      fehler({ code: "provider_unavailable" });
    }
  }

  function neuLesen() {
    if (!eintrag) return;
    if (letzteDatei.current) {
      erneut.current = eintrag;
      void read(letzteDatei.current, eintrag.id);
      return;
    }
    reset();
    erneut.current = eintrag;
  }

  function update(change: (review: NachweisReviewDaten) => NachweisReviewDaten) {
    setEintrag((current) => current ? { ...current, review: change(current.review) } : null);
  }

  function updateFreieZeile(key: string, patch: FreieZeilenPatch) {
    update((review) => review.variante === "frei" ? {
      ...review,
      zeilen: review.zeilen.map((zeile) => zeile.key === key ? { ...zeile, ...patch } : zeile),
    } : review);
  }

  function addFreieZeile() {
    update((review) => review.variante === "frei"
      ? { ...review, zeilen: [...review.zeilen, leereFreieZeile(review.zeilen)] } : review);
  }

  function removeFreieZeile(key: string) {
    update((review) => review.variante === "frei"
      ? { ...review, zeilen: review.zeilen.filter((zeile) => zeile.key !== key) } : review);
  }

  const review = eintrag?.review ?? null;
  return {
    ...nachweisTabellenSteuerung(review?.variante === "tabelle" ? review : null, update, cacheScope),
    phase, error, review, zuletzt, verwendungen, ausSpeicher, read, oeffnen, neuLesen, reset,
    updateFreieZeile, addFreieZeile, removeFreieZeile,
  };
}

export type NachweisScanState = ReturnType<typeof useNachweisScan>;
