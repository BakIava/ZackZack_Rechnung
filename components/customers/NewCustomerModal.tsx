"use client";

import { Building2, Check, Loader2, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createCustomer } from "@/lib/customers/actions";
import type { CustomerListItem } from "@/lib/customers/types";
import "./NewCustomerModal.css";

type CustomerType = "private" | "company";

interface NewCustomerModalProps {
  dir: "ltr" | "rtl";
  onClose: () => void;
  onCreate: (customer: CustomerListItem) => void;
}

const STROKE = 1.75;

function deriveInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const raw =
    parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : name.slice(0, 2);
  return raw.toUpperCase();
}

export function NewCustomerModal({ dir, onClose, onCreate }: NewCustomerModalProps) {
  const t = useTranslations("Create");
  const [type, setType] = useState<CustomerType>("private");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [street, setStreet] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isCompany = type === "company";
  // Rechtssichere Anschrift (§14 Abs. 4 Nr. 1 UStG): ein gespeicherter Kunde ist
  // für Rechnungen über 250 € nutzbar, daher Name + vollständige Anschrift Pflicht.
  // Für Kleinbeträge bis 250 € wird gar kein Kunde benötigt (Schritt 1 überspringbar).
  const ok =
    name.trim().length > 0 &&
    street.trim().length > 0 &&
    houseNo.trim().length > 0 &&
    zip.trim().length > 0 &&
    city.trim().length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!ok || saving) return;
    const nm = name.trim();
    const trimmedCity = city.trim();
    const trimmedStreet = street.trim();
    const trimmedHouseNo = houseNo.trim();

    setSaving(true);
    setSaveError(null);

    const res = await createCustomer({
      name: nm,
      street: trimmedStreet || undefined,
      streetNo: trimmedHouseNo || undefined,
      postcode: zip.trim() || undefined,
      city: trimmedCity || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: note.trim() || undefined,
    });

    setSaving(false);

    if (res.error || !res.id) {
      setSaveError(t("ncError"));
      return;
    }

    onCreate({
      id: res.id,
      name: nm,
      city: trimmedCity || null,
      street: [trimmedStreet, trimmedHouseNo].filter(Boolean).join(" ") || null,
      initials: deriveInitials(nm),
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
                {isCompany ? t("ncCompanyName") : t("ncName")} *
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

            <div className="f-row two">
              <label className="f-row">
                <span className="f-lbl">{t("ncStreet")} *</span>
                <input
                  className="f-input"
                  autoComplete="address-line1"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder={t("ncStreetPh")}
                />
              </label>
              <label className="f-row nc-zip">
                <span className="f-lbl">{t("ncHouseNo")} *</span>
                <input
                  className="f-input"
                  autoComplete="address-line2"
                  value={houseNo}
                  onChange={(e) => setHouseNo(e.target.value)}
                  placeholder={t("ncHouseNoPh")}
                />
              </label>
            </div>

            <div className="f-row two">
              <label className="f-row nc-zip">
                <span className="f-lbl">{t("ncZip")} *</span>
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
                <span className="f-lbl">{t("ncCity")} *</span>
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
          {saveError && <span className="nc-error">{saveError}</span>}
          <button type="button" className="nc-cancel" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="nc-create"
            disabled={!ok || saving}
            onClick={submit}
          >
            {saving ? (
              <Loader2 size={20} strokeWidth={2.4} className="nc-spin" aria-hidden />
            ) : (
              <Check size={20} strokeWidth={2.4} aria-hidden />
            )}
            {saving ? t("ncSaving") : t("ncCreate")}
          </button>
        </div>
      </div>
    </div>
  );
}
