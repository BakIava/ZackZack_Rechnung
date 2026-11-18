/**
 * Browser-Speicher für den Nachweis (localStorage, pro Firma, nur dieses Gerät).
 * Jeder Zugriff ist abgesichert: privater Modus, volle oder gesperrte Speicher
 * führen nie zu Fehlern – dann wird eben nichts gemerkt.
 */

import type { NachweisMitarbeiterGedaechtnis, NachweisScanEintrag } from "@/types/nachweis";
import { LEERES_GEDAECHTNIS } from "./nachweis-gedaechtnis";

const VERSION = 1;

function key(scope: string, name: "workers" | "scans"): string {
  return `zz-nachweis:${scope}:${name}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function read(storageKey: string): unknown {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) && parsed.v === VERSION ? parsed.data : null;
  } catch {
    return null;
  }
}

function write(storageKey: string, data: unknown): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ v: VERSION, data }));
  } catch {
    // Speicher voll oder gesperrt – Merken ist nur Komfort.
  }
}

export function readMitarbeiterGedaechtnis(scope: string): NachweisMitarbeiterGedaechtnis {
  const data = read(key(scope, "workers"));
  return isRecord(data) && isRecord(data.workers) && isRecord(data.aliases)
    ? (data as unknown as NachweisMitarbeiterGedaechtnis)
    : LEERES_GEDAECHTNIS;
}

export function writeMitarbeiterGedaechtnis(
  scope: string,
  gedaechtnis: NachweisMitarbeiterGedaechtnis,
): void {
  write(key(scope, "workers"), gedaechtnis);
}

function istScan(value: unknown): value is NachweisScanEintrag {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.savedAt === "number" &&
    typeof value.beschreibung === "string" &&
    Array.isArray(value.zeilen) &&
    Array.isArray(value.material) &&
    isRecord(value.ergebnis) &&
    isRecord(value.ergebnis.pruefung) &&
    Array.isArray(value.ergebnis.mitarbeiter)
  );
}

export function readScans(scope: string): NachweisScanEintrag[] {
  const data = read(key(scope, "scans"));
  return Array.isArray(data) ? data.filter(istScan) : [];
}

export function writeScans(scope: string, scans: NachweisScanEintrag[]): void {
  write(key(scope, "scans"), scans);
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
