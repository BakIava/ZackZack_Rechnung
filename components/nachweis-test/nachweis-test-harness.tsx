"use client";

import { useRef, useState } from "react";
import { CatalogPicker } from "@/components/create/2/catalog-picker";
import { PositionAddEnd } from "@/components/create/2/position-add-end";
import { PositionPickerModal } from "@/components/create/2/position-picker-modal";
import { isRtlLocale, type Locale } from "@/i18n/routing";
import { freieAbrechnung, freieKalendernotiz, freieLeistung } from "@/lib/documents/nachweis-frei-fixtures";
import { processNachweis } from "@/lib/documents/nachweis-service";
import { parseNachweisVariantenJson } from "@/lib/integrations/anthropic/nachweis-varianten-contract";
import type { NachweisImportAntwort, NachweisImportLine, NachweisReadResult, NachweisVerwendung } from "@/types/nachweis";
import "./nachweis-test-harness.css";

const TABELLE = {
  variante: "tabelle", ausrichtung: "aufrecht", nachweis_nummer: "TEST-42", projekt: "",
  tage: [{ datum: "2026-11-09", gesamt_laut_blatt: 7 }],
  mitarbeiter: [{ name: "Testkraft A", eintraege: [{ datum: "2026-11-09", stunden: 6, zelle: "zahl", unsicher: true }] }],
  gesamt_summe_laut_blatt: 7, material: [], arbeitsleistung: "Tore einstellen",
};

function fixtureFuerDatei(name: string) {
  if (name === "tabelle.pdf") return TABELLE;
  if (name === "abrechnung.pdf") return freieAbrechnung();
  if (name === "material.pdf") {
    return {
      ...freieAbrechnung(),
      leistungen: [freieLeistung({ art: "material", descriptionDe: "Fliesenkleber", amount: 1, unit: "Sack" })],
    };
  }
  if (name === "leer.pdf") return { ...freieKalendernotiz(), leistungen: [] };
  if (name === "viele.pdf") {
    return {
      ...freieAbrechnung(),
      leistungen: Array.from({ length: 21 }, (_, index) =>
        freieLeistung({ descriptionDe: `Montage Bereich ${index + 1}`, unit: "Stk.", amount: 1 })),
    };
  }
  return freieKalendernotiz();
}

async function readFixture(_documentId: string, data: FormData): Promise<NachweisReadResult> {
  const file = data.get("file");
  return processNachweis(file, {
    consumeAiQuota: async () => ({ allowed: true, remaining: 9, dailyLimit: 10 }),
    extractNachweis: async () => {
      const name = file instanceof File ? file.name : "";
      if (name === "defekt.pdf") throw new Error("synthetic provider error");
      if (name === "langsam.pdf") await new Promise((resolve) => setTimeout(resolve, 900));
      const nachweis = fixtureFuerDatei(name);
      const ergebnis = parseNachweisVariantenJson(JSON.stringify({ nachweis }));
      if (!ergebnis) throw new Error("invalid synthetic fixture");
      return ergebnis;
    },
    prepareNachweis: async (bytes, mediaType) => ({ bytes, mediaType }),
    detectOrientation: async () => "aufrecht",
    rotateNachweis: async (bytes) => bytes,
  });
}

async function findFixtureUsage(_documentId: string, nummer: string): Promise<NachweisVerwendung[]> {
  return nummer === "TEST-42"
    ? [{ documentId: "test-doc", docType: "invoice", documentNumber: null, sameDocument: true }] : [];
}

interface NachweisTestHarnessProps {
  locale: Locale;
  importMode: "fail-once" | "unknown" | null;
}

export function NachweisTestHarness({ locale, importMode }: NachweisTestHarnessProps) {
  const [importiert, setImportiert] = useState<NachweisImportLine[]>([]);
  const [versuche, setVersuche] = useState(0);
  const [lesungen, setLesungen] = useState(0);
  const [offen, setOffen] = useState(true);
  const [pending, setPending] = useState(false);
  const zaehler = useRef(0);

  async function importFixture(lines: NachweisImportLine[]): Promise<NachweisImportAntwort> {
    const versuch = ++zaehler.current;
    setVersuche(versuch);
    setPending(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (importMode === "unknown") throw new Error("synthetic network error");
      if (importMode === "fail-once" && versuch === 1) return "error";
      setImportiert(lines);
      setOffen(false);
      return "success";
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="zz-create nachweis-test-harness" data-testid="nachweis-test-harness">
      <PositionAddEnd empty onAdd={() => setOffen(true)} onAddNachweis={() => setOffen(true)} />
      {offen && (
        <PositionPickerModal dir={isRtlLocale(locale) ? "rtl" : "ltr"} pending={pending} onClose={() => setOffen(false)}>
          <CatalogPicker
            documentId="test-doc" nachweisCacheScope="test-firma" initialTab="nachweis" locale={locale} services={[]}
            onAddCatalog={() => undefined} onAddFree={() => undefined} onAddFremd={() => undefined}
            onPreviewChange={() => undefined} onAddNachweis={importFixture}
            nachweisReadAction={async (documentId, data) => {
              const result = await readFixture(documentId, data);
              setLesungen((count) => count + 1);
              return result;
            }}
            nachweisUsageAction={findFixtureUsage}
          />
        </PositionPickerModal>
      )}
      <output data-testid="imported-lines" data-attempts={versuche} data-reads={lesungen}>{JSON.stringify(importiert)}</output>
    </main>
  );
}
