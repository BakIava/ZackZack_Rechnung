"use client";

import { useState } from "react";
import { TextCheck } from "@/components/create/2/text-check";
import { parseTextUebernahme } from "@/lib/documents/text-check";
import { processTextPruefung } from "@/lib/documents/text-improve-service";
import { calculateDocumentTotals } from "@/lib/documents/tax";
import type { DraftItem } from "@/types/document";
import type { TextImproveListeAntwort, TextImproveListeEintrag, TextPruefungResult, TextUebernahmeResult } from "@/types/text-improve";
import "./text-check-test-harness.css";

interface TextCheckTestHarnessProps {
  dir: "ltr" | "rtl";
}

const DOCUMENT_ID = "10000000-0000-0000-0000-000000000009";

function item(position: number, descriptionDe: string, serviceId: string | null, additional: string | null): DraftItem {
  return {
    id: `40000000-0000-0000-0000-00000000000${position}`, position, serviceId, descriptionDe,
    additionalDescriptionDe: additional, amount: 1, unit: "Stk.", unitPrice: 1000, totalAmount: 1000,
    taxRate: 19, taxRateOverridden: false, taxAmount: 190, grossAmount: 1190,
    purchasePrice: null, surcharge: null, surchargeType: null,
  };
}

const START_ITEMS = [
  item(1, "fliesen verlegn bad 12 m2", null, null),
  item(2, "Malerarbeiten Wandfläche", "50000000-0000-0000-0000-000000000001", null),
  item(3, "silikon fuge erneuern", null, "inkl entfernen alter fugen"),
];

/** Gespielte KI: bekannte Texte werden verbessert, alles andere bleibt gleich. */
const KORREKTUREN: Record<string, string> = {
  "fliesen verlegn bad 12 m2": "Fliesen verlegen im Bad, 12 m²",
  "silikon fuge erneuern": "Silikonfugen erneuern",
  "inkl entfernen alter fugen": "Inkl. Entfernen der alten Fugen",
};

async function fakeKi(positionen: TextImproveListeEintrag[]): Promise<TextImproveListeAntwort[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const korrigiere = (text: string | null) => (text === null ? null : KORREKTUREN[text] ?? text);
  return positionen.map((p) => ({ ...p, deutsch: true, bezeichnung: korrigiere(p.bezeichnung), zusatztext: korrigiere(p.zusatztext) }));
}

/** „Texte prüfen“ mit echter Prüflogik, aber ohne Claude und Datenbank. */
export function TextCheckTestHarness({ dir }: TextCheckTestHarnessProps) {
  const [items, setItems] = useState(START_ITEMS);
  const [checks, setChecks] = useState(0);

  async function check(): Promise<TextPruefungResult> {
    setChecks((count) => count + 1);
    return processTextPruefung(items, {
      consumeAiQuota: async () => ({ allowed: true, remaining: 49, dailyLimit: 50 }),
      improveAll: fakeKi,
    });
  }

  async function apply(_documentId: unknown, input: unknown): Promise<TextUebernahmeResult> {
    const aenderungen = parseTextUebernahme(input);
    if (!aenderungen) return { error: "textsInvalid" };
    const next = items.map((entry) => {
      const aenderung = aenderungen.find((a) => a.itemId === entry.id);
      return aenderung
        ? { ...entry, descriptionDe: aenderung.descriptionDe ?? entry.descriptionDe,
            additionalDescriptionDe: aenderung.additionalDescriptionDe ?? entry.additionalDescriptionDe }
        : entry;
    });
    const totals = calculateDocumentTotals(next.map((entry) => ({
      netAmount: entry.totalAmount, taxAmount: entry.taxAmount, grossAmount: entry.grossAmount, taxRate: entry.taxRate,
    })));
    return { items: next, totals };
  }

  return (
    <section className="text-check-harness" data-check-calls={checks}>
      <div className="text-check-harness-bar">
        <TextCheck documentId={DOCUMENT_ID} items={items} dir={dir} disabled={false}
          onApplied={(result) => setItems(result.items)} checkAction={check} applyAction={apply} />
      </div>
      <ol className="text-check-harness-items">
        {items.map((entry) => (
          <li key={entry.id} data-testid={`item-${entry.position}`} dir="ltr" lang="de">
            <span>{entry.descriptionDe}</span>
            {entry.additionalDescriptionDe && <small>{entry.additionalDescriptionDe}</small>}
          </li>
        ))}
      </ol>
    </section>
  );
}
