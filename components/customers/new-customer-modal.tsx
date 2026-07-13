"use client";

import { Building2, Check, Loader2, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Modal } from "@/components/ui";
import { createCustomer, updateCustomer } from "@/lib/customers/actions";
import { deriveInitials } from "@/lib/initials";
import type {
  CustomerInput,
  CustomerListItem,
  FlowCustomer,
} from "@/types/customer";
import type { CustomerType } from "@/types/database";
import "./new-customer-modal.css";

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
  const [type, setType] = useState<CustomerType>(
    editCustomer?.customer_type ?? "private",
  );
  const [companyName, setCompanyName] = useState(
    editCustomer?.company_name ?? "",
  );
  const [firstname, setFirstname] = useState(editCustomer?.firstname ?? "");
  const [lastname, setLastname] = useState(editCustomer?.lastname ?? "");
  const [street, setStreet] = useState(editCustomer?.street ?? "");
  const [houseNo, setHouseNo] = useState(editCustomer?.streetNo ?? "");
  const [zip, setZip] = useState(editCustomer?.postcode ?? "");
  const [city, setCity] = useState(editCustomer?.city ?? "");
  const [phone, setPhone] = useState(editCustomer?.phone ?? "");
  const [email, setEmail] = useState(editCustomer?.email ?? "");
  const [note, setNote] = useState(editCustomer?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isCompany = type === "business";
  // Bewusst tolerant: nur der Name ist Pflicht. Die Anschrift kann später ergänzt
  // werden (Entwurf, Adresse noch nicht bekannt). Fehlt sie bei einer Rechnung
  // über 250 €, weist der Pflichtangaben-Check in Schritt 3 darauf hin.
  const ok = (() => {
    if (isCompany) return companyName.trim().length > 0;
    return firstname.trim().length > 0 && lastname.trim().length > 0;
  })();

  async function submit() {
    if (!ok || saving) return;
    const trimmedCity = city.trim();
    const trimmedStreet = street.trim();
    const trimmedHouseNo = houseNo.trim();

    const input: CustomerInput = {
      customerType: type,
      firstname: firstname.trim() || null,
      lastname: lastname.trim() || null,
      companyName: companyName.trim() || null,
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
      firstname: firstname.trim() || null,
      lastname: lastname.trim() || null,
      companyName: companyName.trim() || null,
      city: trimmedCity || null,
      street: [trimmedStreet, trimmedHouseNo].filter(Boolean).join(" ") || null,
      initials: deriveInitials({
        customerType: type,
        company_name: companyName,
        firstname: firstname,
        lastname: lastname,
      }),
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
    <Modal
      open
      onClose={onClose}
      dir={dir}
      size="lg"
      busy={saving}
      ariaLabel={isEdit ? t("editCustomer") : t("ncTitle")}
    >
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
                onClick={() => setType("business")}
              >
                <Building2 size={18} strokeWidth={STROKE} aria-hidden />
                {t("ncBusiness")}
              </button>
            </div>
          </div>

          {isCompany && (
            <label className="f-row">
              <span className="f-lbl">{t("ncBusinessName")}</span>
              <input
                className="f-input"
                autoComplete="name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("ncBusinessPh")}
              />
            </label>
          )}

          <label className="f-row">
            <span className="f-lbl">{t("ncFirstname")}</span>
            <input
              className="f-input"
              autoComplete={"firstname"}
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              placeholder={t("ncFirstnamePh")}
            />
          </label>

          <label className="f-row">
            <span className="f-lbl">{t("ncLastname")}</span>
            <input
              className="f-input"
              autoComplete={"lastname"}
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              placeholder={t("ncLastnamePh")}
            />
          </label>

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
    </Modal>
  );
}
