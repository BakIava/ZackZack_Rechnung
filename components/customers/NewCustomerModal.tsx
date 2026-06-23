"use client";

import { Building2, Check, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { NewCustomerInput } from "@/lib/demo/customers-data";
import "./NewCustomerModal.css";

type CustomerType = "private" | "company";

interface NewCustomerModalProps {
  dir: "ltr" | "rtl";
  onClose: () => void;
  onCreate: (customer: NewCustomerInput) => void;
}

const STROKE = 1.75;

/** Initialen aus dem Namen: erster + letzter Wortanfang, sonst die ersten zwei Zeichen. */
function deriveInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const raw =
    parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : name.slice(0, 2);
  return raw.toUpperCase();
}

/** Wiederverwendbares „Neuer Kunde“-Modal. Legt einen Kunden mit wenigen
 *  Feldern an und gibt ihn per `onCreate` zurück – genutzt im Flow (Schritt 1)
 *  und im Kunden-Bereich. UI folgt der Bediensprache (inkl. RTL); Eigennamen
 *  bleiben deutsch, da sie so auf dem Dokument erscheinen. */
export function NewCustomerModal({ dir, onClose, onCreate }: NewCustomerModalProps) {
  const t = useTranslations("Create");
  const [type, setType] = useState<CustomerType>("private");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const isCompany = type === "company";
  const ok = name.trim().length > 0 && city.trim().length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    if (!ok) return;
    const nm = name.trim();
    const trimmedZip = zip.trim();
    const trimmedCity = city.trim();
    onCreate({
      id: `new-${Date.now()}`,
      name: nm,
      firma: isCompany,
      initials: deriveInitials(nm),
      street: street.trim() || "—",
      // Demodaten halten PLZ + Ort gemeinsam im Feld `city` (z. B. „60385 Frankfurt“).
      city: [trimmedZip, trimmedCity].filter(Boolean).join(" "),
      // Einzelfelder für Detailansichten (Adresse/Kontakt).
      zip: trimmedZip,
      cityName: trimmedCity,
      contact: contact.trim(),
      phone: phone.trim(),
      email: email.trim(),
      note: note.trim(),
      isNew: true,
    });
  }

  return (
    <div
      className="dmodal-wrap"
      role="dialog"
      aria-modal="true"
      aria-label={t("ncTitle")}
      dir={dir}
    >
      <button
        type="button"
        className="dmodal-bd"
        aria-label={t("ncClose")}
        onClick={onClose}
      />
      <div className="dmodal">
        <div className="dmodal-head">
          <span className="dmodal-title">{t("ncTitle")}</span>
          <button
            type="button"
            className="sheet-x"
            aria-label={t("ncClose")}
            onClick={onClose}
          >
            <X size={18} strokeWidth={STROKE} aria-hidden />
          </button>
        </div>
        <div className="dmodal-sub">{t("ncSub")}</div>

        <div className="dmodal-body">
          <div className="f-grid">
            <div className="f-row">
              <span className="f-lbl">{t("ncType")}</span>
              <div className="nc-seg" role="group" aria-label={t("ncType")}>
                <button
                  type="button"
                  data-on={isCompany ? "0" : "1"}
                  aria-pressed={!isCompany}
                  onClick={() => setType("private")}
                >
                  <User size={18} strokeWidth={STROKE} aria-hidden />
                  {t("ncPrivate")}
                </button>
                <button
                  type="button"
                  data-on={isCompany ? "1" : "0"}
                  aria-pressed={isCompany}
                  onClick={() => setType("company")}
                >
                  <Building2 size={18} strokeWidth={STROKE} aria-hidden />
                  {t("ncCompany")}
                </button>
              </div>
            </div>

            <label className="f-row">
              <span className="f-lbl">
                {isCompany ? t("ncCompanyName") : t("ncName")}
              </span>
              <input
                className="f-input"
                autoComplete={isCompany ? "organization" : "name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isCompany ? t("ncCompanyPh") : t("ncNamePh")}
                autoFocus
              />
            </label>

            {isCompany && (
              <label className="f-row">
                <span className="f-lbl">
                  {t("ncContact")}
                  <span className="nc-opt">{t("ncOptional")}</span>
                </span>
                <input
                  className="f-input"
                  autoComplete="name"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={t("ncContactPh")}
                />
              </label>
            )}

            <label className="f-row">
              <span className="f-lbl">{t("ncStreet")}</span>
              <input
                className="f-input"
                autoComplete="street-address"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder={t("ncStreetPh")}
              />
            </label>

            <div className="f-row two">
              <label className="f-row nc-zip">
                <span className="f-lbl">{t("ncZip")}</span>
                <input
                  className="f-input"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder={t("ncZipPh")}
                />
              </label>
              <label className="f-row">
                <span className="f-lbl">{t("ncCity")}</span>
                <input
                  className="f-input"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("ncCityPh")}
                />
              </label>
            </div>

            <div className="f-row two">
              <label className="f-row">
                <span className="f-lbl">
                  {t("ncPhone")}
                  <span className="nc-opt">{t("ncOptional")}</span>
                </span>
                <input
                  className="f-input"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("ncPhonePh")}
                />
              </label>
              <label className="f-row">
                <span className="f-lbl">
                  {t("ncEmail")}
                  <span className="nc-opt">{t("ncOptional")}</span>
                </span>
                <input
                  className="f-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("ncEmailPh")}
                />
              </label>
            </div>

            <label className="f-row">
              <span className="f-lbl">
                {t("ncNote")}
                <span className="nc-opt">{t("ncOptional")}</span>
              </span>
              <textarea
                className="f-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("ncNotePh")}
                rows={2}
              />
            </label>
          </div>
        </div>

        <div className="dmodal-foot">
          <button type="button" className="nc-cancel" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="nc-create"
            disabled={!ok}
            onClick={submit}
          >
            <Check size={20} strokeWidth={2.4} aria-hidden />
            {t("ncCreate")}
          </button>
        </div>
      </div>
    </div>
  );
}
