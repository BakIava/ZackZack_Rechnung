"use client";

import { useState, useCallback, useRef, useTransition, type ReactNode, type HTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Pencil, Trash2 } from "lucide-react";
import type { CompanySettings } from "@/types/company";
import {
  saveFirmaInhaber,
  saveAdresse,
  saveSteuer,
  saveKontakt,
  saveBankverbindung,
  removeLogo,
  uploadLogo,
} from "@/lib/settings/actions";
import { COMPANY_LOGO_ACCEPT } from "@/lib/company-logo/constants";
import { deriveCompanyMonogram } from "@/lib/initials";
import "./settings-firma.css";
const STROKE = 1.75;

interface SaveBarProps {
  onSave: () => Promise<{ error?: string } | void>;
}

function SaveBar({ onSave }: SaveBarProps) {
  const t = useTranslations("Settings");
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await onSave();
      if (result?.error) {
        setError(t.has(result.error) ? t(result.error) : t("saveError"));
        return;
      }
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="set-card-f" style={{ flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {saved && (
          <span className="set-saved">
            <Check size={16} strokeWidth={2.5} aria-hidden />
            {t("saved")}
          </span>
        )}
        <button className="set-save" onClick={handleSave} disabled={pending}>
          <Check size={17} strokeWidth={2.5} aria-hidden />
          {pending ? t("saving") : t("save")}
        </button>
      </div>
      {error && <span className="set-error">{error}</span>}
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

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
  optional?: boolean;
}

function SelectField({ label, value, onChange, options, optional }: SelectFieldProps) {
  const t = useTranslations("Settings");
  return (
    <div className="set-f-row">
      <label className="set-f-lbl">
        {label}
        {optional && <span className="set-opt">{t("optional")}</span>}
      </label>
      <select className="set-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([optValue, optLabel]) => (
          <option key={optValue} value={optValue}>{optLabel}</option>
        ))}
      </select>
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

interface SettingsFirmaProps {
  company: CompanySettings;
}

export function SettingsFirma({ company }: SettingsFirmaProps) {
  const t = useTranslations("Settings");

  const [firmaInhaber, setFirmaInhaber] = useState({
    name: company.name,
    // Select-Feld: Fallback auf den Onboarding-Default statt leerem Wert.
    legal_form: company.legal_form ?? "einzel",
    director: company.director ?? "",
    registergericht: company.registergericht ?? "",
    handelsregister_nr: company.handelsregister_nr ?? "",
  });
  const [adresse, setAdresse] = useState({
    street: company.street ?? "",
    street_no: company.street_no ?? "",
    postcode: company.postcode ?? "",
    city: company.city ?? "",
  });
  const [steuer, setSteuer] = useState({
    steuernummer: company.steuernummer ?? "",
    ust_id: company.ust_id ?? "",
  });
  const [kontakt, setKontakt] = useState({
    phone: company.phone ?? "",
    mobile: company.mobile ?? "",
    fax: company.fax ?? "",
    email: company.email ?? "",
  });
  const [bank, setBank] = useState({
    bank_name: company.bank_name ?? "",
    iban: company.iban ?? "",
    bic: company.bic ?? "",
    account_holder: company.account_holder ?? "",
  });

  const upInhaber = useCallback((k: keyof typeof firmaInhaber) => (v: string) =>
    setFirmaInhaber((s) => ({ ...s, [k]: v })), []);
  const upAdresse = useCallback((k: keyof typeof adresse) => (v: string) =>
    setAdresse((s) => ({ ...s, [k]: v })), []);
  const upSteuer = useCallback((k: keyof typeof steuer) => (v: string) =>
    setSteuer((s) => ({ ...s, [k]: v })), []);
  const upKontakt = useCallback((k: keyof typeof kontakt) => (v: string) =>
    setKontakt((s) => ({ ...s, [k]: v })), []);
  const upBank = useCallback((k: keyof typeof bank) => (v: string) =>
    setBank((s) => ({ ...s, [k]: v })), []);

  const rf = [["einzel", "Einzel­unternehmen"], ["ek", "e.K."], ["gbr", "GbR"], ["gmbh", "GmbH"], ["ug", "UG"]] as [string, string][];

  return (
    <>
      <Card title={t("cFirma")} foot={<SaveBar onSave={() => saveFirmaInhaber(firmaInhaber)} />}>
        <Field label={t("lFirma")} value={firmaInhaber.name} onChange={upInhaber("name")} />
        <Field label={t("lInhaber")} value={firmaInhaber.director} onChange={upInhaber("director")} />
        <SelectField label={t("lRechtsform")} value={firmaInhaber.legal_form} onChange={upInhaber("legal_form")} options={rf} />
        <Field label={t("lRegistergericht")} value={firmaInhaber.registergericht} onChange={upInhaber("registergericht")} optional />
        <Field label={t("lHandelsregisterNr")} value={firmaInhaber.handelsregister_nr} onChange={upInhaber("handelsregister_nr")} optional />
      </Card>

      <Card title={t("cAdresse")} foot={<SaveBar onSave={() => saveAdresse(adresse)} />}>
        <div className="set-f-row-two set-f-row-two-street">
          <Field label={t("lStrasse")} value={adresse.street} onChange={upAdresse("street")} />
          <Field label={t("lHausnr")} value={adresse.street_no} onChange={upAdresse("street_no")} />
        </div>
        <div className="set-f-row-two">
          <Field label={t("lPlz")} value={adresse.postcode} onChange={upAdresse("postcode")} inputMode="numeric" />
          <Field label={t("lOrt")} value={adresse.city} onChange={upAdresse("city")} />
        </div>
      </Card>

      <Card title={t("cSteuer")} foot={<SaveBar onSave={() => saveSteuer(steuer)} />}>
        <Field label={t("lSteuerNr")} value={steuer.steuernummer} onChange={upSteuer("steuernummer")} />
        <Field label={t("lUstId")} value={steuer.ust_id} onChange={upSteuer("ust_id")} placeholder={t("phUstId")} optional />
      </Card>

      <Card title={t("cKontakt")} foot={<SaveBar onSave={() => saveKontakt(kontakt)} />}>
        <Field label={t("lTel")} value={kontakt.phone} onChange={upKontakt("phone")} type="tel" optional />
        <Field label={t("lMobil")} value={kontakt.mobile} onChange={upKontakt("mobile")} type="tel" optional />
        <Field label={t("lFax")} value={kontakt.fax} onChange={upKontakt("fax")} optional />
        <Field label={t("lMail")} value={kontakt.email} onChange={upKontakt("email")} type="email" optional />
      </Card>

      <LogoCard logoUrl={company.logo_url} companyName={company.name} />

      <Card title={t("cBank")} foot={<SaveBar onSave={() => saveBankverbindung(bank)} />}>
        <Field label={t("lKontoinhaber")} value={bank.account_holder} onChange={upBank("account_holder")} />
        <Field label={t("lIban")} value={bank.iban} onChange={upBank("iban")} />
        <Field label={t("lBic")} value={bank.bic} onChange={upBank("bic")} />
        <Field label={t("lBankName")} value={bank.bank_name} onChange={upBank("bank_name")} optional />
      </Card>
    </>
  );
}

interface LogoCardProps {
  logoUrl: string | null;
  companyName: string;
}

function LogoCard({ logoUrl: initialLogoUrl, companyName }: LogoCardProps) {
  const t = useTranslations("Settings");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handlePick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setStatus(null);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadLogo(formData);
      if (result.error) {
        setError(t.has(result.error) ? t(result.error) : t("saveError"));
        return;
      }
      if (result.logoUrl) {
        setLogoUrl(result.logoUrl);
        setFailedLogoUrl(null);
        setStatus(t("logoUpdated"));
      }
      if (result.warning) setError(t(result.warning));
    });
  }

  function handleRemove() {
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const result = await removeLogo();
      if (result.error) {
        setError(t.has(result.error) ? t(result.error) : t("saveError"));
        return;
      }
      if (result.removed) {
        setLogoUrl(null);
        setStatus(t("logoRemoved"));
      }
      if (result.warning) setError(t(result.warning));
    });
  }

  return (
    <Card title={t("cLogo")}>
      <div className="set-logo-row">
        {logoUrl && failedLogoUrl !== logoUrl ? (
          <div className="set-logo-prev">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="" onError={() => setFailedLogoUrl(logoUrl)} />
          </div>
        ) : (
          <div className="set-logo-prev set-logo-monogram">
            {deriveCompanyMonogram(companyName)}
          </div>
        )}
        <div className="set-logo-info">
          <div className="set-logo-actions">
            <button className="set-ghost" onClick={handlePick} disabled={pending}>
              <Pencil size={17} strokeWidth={STROKE} aria-hidden />
              {pending ? t("saving") : logoUrl ? t("replace") : t("logoAdd")}
            </button>
            {logoUrl && (
              <button className="set-ghost set-ghost--danger" onClick={handleRemove} disabled={pending}>
                <Trash2 size={17} strokeWidth={STROKE} aria-hidden />
                {t("remove")}
              </button>
            )}
          </div>
          <div className="set-logo-hint">{t("logoHint")}</div>
          {status && <div className="set-logo-status" role="status">{status}</div>}
          {error && <div className="set-error">{error}</div>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={COMPANY_LOGO_ACCEPT}
          className="set-file-input"
          onChange={handleFileChange}
        />
      </div>
    </Card>
  );
}
