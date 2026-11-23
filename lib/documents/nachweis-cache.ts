import type { NachweisCacheEintrag, NachweisMitarbeiterGedaechtnis } from "@/types/nachweis";
import { istObjekt, leseCacheScan, zahl } from "./nachweis-cache-parser";
import { gueltigeScans, LEERES_GEDAECHTNIS } from "./nachweis-gedaechtnis";

function key(scope: string, name: "workers" | "scans"): string {
  return `zz-nachweis:${scope}:${name}`;
}

function read(storageKey: string): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return istObjekt(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function write(storageKey: string, v: 1 | 2, data: unknown): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ v, data }));
  } catch {
    // Speicher voll oder gesperrt – Merken ist nur Komfort.
  }
}

export function readMitarbeiterGedaechtnis(scope: string): NachweisMitarbeiterGedaechtnis {
  const entry = read(key(scope, "workers"));
  const data = entry?.v === 1 ? entry.data : null;
  if (!istObjekt(data) || !istObjekt(data.workers) || !istObjekt(data.aliases)) return LEERES_GEDAECHTNIS;

  const workers: NachweisMitarbeiterGedaechtnis["workers"] = Object.fromEntries(
    Object.entries(data.workers).flatMap(([id, worker]) => {
      if (!istObjekt(worker) || typeof worker.name !== "string" || !zahl(worker.updatedAt)) return [];
      const preis = zahl(worker.preis) && Number.isInteger(worker.preis) && worker.preis > 0 ? worker.preis : null;
      return [[id, { name: worker.name, preis, updatedAt: worker.updatedAt }]];
    }),
  );
  const aliases = Object.fromEntries(
    Object.entries(data.aliases).flatMap(([id, ziel]) =>
      typeof ziel === "string" && Object.hasOwn(workers, ziel) ? [[id, ziel]] : []),
  );
  return { workers, aliases };
}

export function writeMitarbeiterGedaechtnis(scope: string, gedaechtnis: NachweisMitarbeiterGedaechtnis): void {
  write(key(scope, "workers"), 1, gedaechtnis);
}

export function readScans(scope: string, jetzt = Date.now()): NachweisCacheEintrag[] {
  const entry = read(key(scope, "scans"));
  const version = entry?.v;
  if ((version !== 1 && version !== 2) || !Array.isArray(entry?.data)) return [];
  const scans = entry.data.flatMap((value) => {
    const scan = leseCacheScan(value, version);
    return scan ? [scan] : [];
  });
  return gueltigeScans(scans, jetzt);
}

export function writeScans(scope: string, scans: NachweisCacheEintrag[], jetzt = Date.now()): void {
  write(key(scope, "scans"), 2, gueltigeScans(scans, jetzt));
}

/** SHA-256 der Originaldatei; null, wo der Browser es nicht kann (z. B. ohne HTTPS). */
export async function dateiFingerabdruck(file: Blob): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}
