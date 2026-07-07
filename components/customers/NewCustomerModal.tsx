"use client";

import { Building2, Check, Loader2, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createCustomer, updateCustomer } from "@/lib/customers/actions";
import { deriveInitials } from "@/lib/initials";
import type { CustomerListItem, FlowCustomer } from "@/types/customer";
import "./NewCustomerModal.css";

type CustomerType = "private" | "company";

interface NewCustomerModalProps {
  dir: "ltr" | "rtl";
  onClose: () => void;
  /** Wird nach dem Anlegen aufgerufen (Create-Modus). */
  onCreate?: (customer: CustomerListItem) => void;
  /** Vorhandener Kunde → Edit-Modus (Prefill + updateCustomer). */
  editCustomer?: FlowCustomer | null;
  /** Wird nach dem Speichern einer Bearbeitung aufgerufen (Edit-Modus). */
  onSaved?: (customer: CustomerListItem) => void;
}

const STROKE = 1.75;

export function NewCustomerModal({
  dir,
  onClose,
  onCreate,
  editCustomer = null,
  onSaved,
}: NewCustomerModalProps) {
  const t = useTranslations("Create");
  const isEdit = editCustomer !== null;
  const [type, setType] = useState<CustomerType>("private");
  const [name, setName] = useState(editCustomer?.name ?? "");
  const [contact, setContact] = useState("");
  const [street, setStreet] = useState(editCustomer?.street ?? "");
  const [houseNo, setHouseNo] = useState(editCustomer?.streetNo ?? "");
  const [zip, setZip] = useState(editCustomer?.postcode ?? "");
  const [city, setCity] = useState(editCustomer?.city ?? "");
  const [phone, setPhone] = useState(editCustomer?.phone ?? "");
  const [email, setEmail] = useState(editCustomer?.email ?? "");
  const [note, setNote] = useState(editCustomer?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isCompany = type === "company";
  // Bewusst tolerant: nur der Name ist Pflicht. Die Anschrift kann später ergänzt
  // werden (Entwurf, Adresse noch nicht bekannt). Fehlt sie bei einer Rechnung
  // über 250 €, weist der Pflichtangaben-Check in Schritt 3 darauf hin.
  const ok = name.trim().length > 0;

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

    const input = {
      name: nm,
      street: trimmedStreet || undefined,
      streetNo: trimmedHouseNo || undefined,
      postcode: zip.trim() || undefined,
      city: trimmedCity || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: note.trim() || undefined,
    };

    setSaving(true);
    setSaveError(null);

    const listItem: CustomerListItem = {
      id: editCustomer?.id ?? "",
      name: nm,
      city: trimmedCity || null,
      street: [trimmedStreet, trimmedHouseNo].filter(Boolean).join(" ") || null,
      initials: deriveInitials(nm),
    };

    if (isEdit && editCustomer) {
      const res = await updateCustomer(editCustomer.id, input);
      setSaving(false);
      if (res.error) {
        setSaveError(t("ncError"));
        return;
      }
      onSaved?.(listItem);
      return;
    }

    const res = await createCustomer(input);
    setSaving(false);
    if (res.error || !res.id) {
      setSaveError(t("ncError"));
      return;
    }
    onCreate?.({ ...listItem, id: res.id, isNew: true });
  }

  return (
    <div
      className="dmodal-wrap"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? t("editCustomer") : t("ncTitle")}
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
          <span className="dmodal-title">{isEdit ? t("editCustomer") : t("ncTitle")}</span>
          <button
            type="button"
            className="sheet-x"
            aria-label={t("ncClose")}
            onClick={onClose}
          >
            <X size={18} strokeWidth={STROKE} aria-hidden />
          </button>
        </div>
        <div className="dmodal-sub">{isEdit ? t("editCustomerSub") : t("ncSub")}</div>

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
                <span className="f-lbl">{t("ncStreet")}</span>
                <input
                  className="f-input"
                  autoComplete="address-line1"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder={t("ncStreetPh")}
                />
              </label>
              <label className="f-row nc-zip">
                <span className="f-lbl">{t("ncHouseNo")}</span>
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
            {saving ? t("ncSaving") : isEdit ? t("editCustomerSave") : t("ncCreate")}
          </button>
        </div>
      </div>
    </div>
  );
}
