"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TextImprove } from "@/components/shared/text-improve";
import { isRtlLocale, type Locale } from "@/i18n/routing";
import type { TextImproveFeld, TextImproveResult } from "@/types/text-improve";
import "./text-improve-test-harness.css";

interface TextImproveTestHarnessProps {
  locale: Locale;
}

/** Gespielte Antworten statt Claude – je nach Eingabetext ein anderer Ausgang. */
async function fakeImprove(text: unknown, feld: unknown): Promise<TextImproveResult> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const eingabe = typeof text === "string" ? text.trim() : "";
  if (eingabe === "fliesen verlegn bad 12 m2") return { status: "vorschlag", text: "Fliesen verlegen im Bad, 12 m²" };
  if (feld === "zusatztext" && eingabe.startsWith("inkl")) {
    return { status: "vorschlag", text: "Inkl. Entsorgung des Altmaterials\nUntergrund vorher gereinigt" };
  }
  if (eingabe === "Fliesen verlegen") return { status: "unveraendert" };
  if (eingabe === "banyo fayans") return { status: "kein_deutsch" };
  if (eingabe === "limit") return { status: "limit", dailyLimit: 50 };
  return { status: "fehler" };
}

interface FeldProps {
  feld: TextImproveFeld;
  label: string;
}

function Feld({ feld, label }: FeldProps) {
  const [value, setValue] = useState("");
  const id = `text-improve-${feld}`;
  return (
    <div className="text-improve-harness-row">
      <label htmlFor={id}>{label}</label>
      {feld === "bezeichnung" ? (
        <input id={id} dir="ltr" lang="de" value={value} onChange={(event) => setValue(event.target.value)} />
      ) : (
        <textarea id={id} dir="ltr" lang="de" value={value} onChange={(event) => setValue(event.target.value)} />
      )}
      <TextImprove value={value} feld={feld} onAccept={setValue} action={fakeImprove} />
    </div>
  );
}

/** Nur für `next dev`: „Text verbessern“ ohne Anmeldung, Datenbank und KI. */
export function TextImproveTestHarness({ locale }: TextImproveTestHarnessProps) {
  const t = useTranslations("Step2");
  return (
    <div className="zz-create text-improve-harness" dir={isRtlLocale(locale) ? "rtl" : "ltr"}>
      <Feld feld="bezeichnung" label={t("labelLbl")} />
      <Feld feld="zusatztext" label={t("additionalDescriptionTitle")} />
    </div>
  );
}
