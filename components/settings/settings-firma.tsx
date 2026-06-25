"use client";

import { useState, useCallback, type ReactNode, type HTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil } from "lucide-react";
import { COMPANY } from "@/lib/demo/dashboard-data";

const STROKE = 1.75;

function SaveBar() {
  const t = useTranslations("Settings");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="set-card-f">
      {saved && (
        <span className="set-saved">
          <Check size={16} strokeWidth={2.5} aria-hidden />
          {t("saved")}
        </span>
      )}
      <button className="set-save" onClick={handleSave}>
        <Check size={17} strokeWidth={2.5} aria-hidden />
        {t("save")}
      </button>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  optional?: boolean;
  type?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}

function Field({ label, value, onChange, placeholder, optional, type, inputMode }: FieldProps) {
  const t = useTranslations("Settings");
  return (
    <div className="set-f-row">
      <label className="set-f-lbl">
        {label}
        {optional && <span className="set-opt">{t("optional")}</span>}
      </label>
      <input
        className="set-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type ?? "text"}
        inputMode={inputMode}
      />
    </div>
  );
}

interface CardProps {
  title: string;
  desc?: string;
  headRight?: ReactNode;
  foot?: ReactNode;
  children: ReactNode;
}

function Card({ title, desc, headRight, foot, children }: CardProps) {
  return (
    <section className="set-card">
      <div className="set-card-h">
        <div className="set-card-htop">
          <div>
            <div className="set-card-t">{title}</div>
            {desc && <div className="set-card-s">{desc}</div>}
          </div>
          {headRight}
        </div>
      </div>
      <div className="set-card-b">{children}</div>
      {foot}
    </section>
  );
}

export function SettingsFirma() {
  const t = useTranslations("Settings");

  const [firma, setFirma] = useState({
    name: COMPANY.name,
    owner: COMPANY.owner,
    street: "Hauptstraße 12",
    plz: "55411",
    ort: "Bingen am Rhein",
    steuerNr: "08/152/12345",
    ustId: "",
    tel: "06721 123456",
    email: "info@yilmaz-maler.de",
    bankOwner: COMPANY.owner,
    iban: "DE89 3704 0044 0532 0130 00",
    bic: "COBADEFFXXX",
  });

  const up = useCallback((k: keyof typeof firma) => (v: string) =>
    setFirma((s) => ({ ...s, [k]: v })), []);

  return (
    <>
      <Card title={t("cFirma")} foot={<SaveBar />}>
        <Field label={t("lFirma")}   value={firma.name}   onChange={up("name")} />
        <Field label={t("lInhaber")} value={firma.owner}  onChange={up("owner")} />
        <Field label={t("lStrasse")} value={firma.street} onChange={up("street")} />
        <div className="set-f-row-two">
          <Field label={t("lPlz")} value={firma.plz} onChange={up("plz")} inputMode="numeric" />
          <Field label={t("lOrt")} value={firma.ort} onChange={up("ort")} />
        </div>
      </Card>

      <Card title={t("cSteuer")} foot={<SaveBar />}>
        <Field label={t("lSteuerNr")} value={firma.steuerNr} onChange={up("steuerNr")} />
        <Field label={t("lUstId")} value={firma.ustId} onChange={up("ustId")} placeholder={t("phUstId")} optional />
      </Card>

      <Card title={t("cKontakt")} foot={<SaveBar />}>
        <Field label={t("lTel")}  value={firma.tel}   onChange={up("tel")}   type="tel" />
        <Field label={t("lMail")} value={firma.email} onChange={up("email")} type="email" />
      </Card>

      <Card title={t("cLogo")}>
        <div className="set-logo-row">
          <div className="set-logo-prev">{COMPANY.initials}</div>
          <div className="set-logo-info">
            <button className="set-ghost">
              <Pencil size={17} strokeWidth={STROKE} aria-hidden />
              {t("replace")}
            </button>
            <div className="set-logo-hint">{t("logoHint")}</div>
          </div>
        </div>
      </Card>

      <Card title={t("cBank")} foot={<SaveBar />}>
        <Field label={t("lKontoinhaber")} value={firma.bankOwner} onChange={up("bankOwner")} />
        <Field label={t("lIban")}         value={firma.iban}      onChange={up("iban")} />
        <Field label={t("lBic")}          value={firma.bic}       onChange={up("bic")} />
      </Card>
    </>
  );
}
