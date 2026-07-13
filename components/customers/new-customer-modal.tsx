"use client";

import {
  AlertTriangle,
  Building2,
  Check,
  Loader2,
  MapPin,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui";
import { createCustomer, updateCustomer } from "@/lib/customers/actions";
import { runCustomerIntake } from "@/lib/customers/intake-actions";
import { mapIntakeResult, type IntakeField, type MappedIntake } from "@/lib/customers/intake-fields";
import { deriveInitials } from "@/lib/initials";
import type {
  CustomerInput,
  CustomerListItem,
  FlowCustomer,
} from "@/types/customer";
import type { CustomerIntakeResult } from "@/types/customer-intake";
import type { CustomerType } from "@/types/database";
import { CustomerAiIntro } from "./customer-ai-intro";
import { CustomerAiLoading } from "./customer-ai-loading";
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

type Phase = "intro" | "loading" | "form";
// Woher stammen die Formularwerte → steuert Banner + „KI"-Spark im Kopf.
type Source = "ai-ok" | "ai-fail" | "ai-limit" | "manual" | "edit";

export function NewCustomerModal({
  dir,
  onClose,
  onCreate,
  editCustomer = null,
  onSaved,
}: NewCustomerModalProps) {
  const t = useTranslations("Create");
  const isEdit = editCustomer !== null;

  // Neue Kunden starten mit der KI-Freitext-Eingabe; Bearbeiten springt direkt
  // ins vorbefüllte Formular.
  const [phase, setPhase] = useState<Phase>(isEdit ? "form" : "intro");
  const [source, setSource] = useState<Source>(isEdit ? "edit" : "manual");
  const [text, setText] = useState("");
  const intakeRef = useRef<Promise<CustomerIntakeResult> | null>(null);

  const [type, setType] = useState<CustomerType>(
    editCustomer?.customer_type ?? "private",
  );
  const [companyName, setCompanyName] = useState(editCustomer?.company_name ?? "");
  const [firstname, setFirstname] = useState(editCustomer?.firstname ?? "");
  const [lastname, setLastname] = useState(editCustomer?.lastname ?? "");
  const [street, setStreet] = useState(editCustomer?.street ?? "");
  const [houseNo, setHouseNo] = useState(editCustomer?.streetNo ?? "");
  const [zip, setZip] = useState(editCustomer?.postcode ?? "");
  const [city, setCity] = useState(editCustomer?.city ?? "");
  const [phone, setPhone] = useState(editCustomer?.phone ?? "");
  const [email, setEmail] = useState(editCustomer?.email ?? "");
  const [note, setNote] = useState(editCustomer?.notes ?? "");
  const [found, setFound] = useState<MappedIntake["found"]>({});
  const [corrected, setCorrected] = useState<MappedIntake["corrected"]>({});
  const [count, setCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
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

  const showSpark =
    phase === "loading" ||
    source === "ai-ok" ||
    source === "ai-fail" ||
    source === "ai-limit";

  function applyIntake(m: MappedIntake) {
    setType(m.values.customerType);
    setCompanyName(m.values.companyName);
    setFirstname(m.values.firstname);
    setLastname(m.values.lastname);
    setStreet(m.values.street);
    setHouseNo(m.values.houseNo);
    setZip(m.values.zip);
    setCity(m.values.city);
    setPhone(m.values.phone);
    setEmail(m.values.email);
    setCount(m.count);
    if (m.recognized) {
      setFound(m.found);
      setCorrected(m.corrected);
      setSource("ai-ok");
    } else {
      // Nichts Belastbares erkannt → keine KI-Markierungen, manuell weitermachen.
      setFound({});
      setCorrected({});
      setSource("ai-fail");
    }
  }

  function startFill() {
    // Server-Action: Claude-Extraktion + Mapbox-Geocoding. Läuft parallel zur
    // Lade-Animation und wird in handleRecognized abgewartet.
    intakeRef.current = runCustomerIntake(text);
    setPhase("loading");
  }

  async function handleRecognized() {
    const result = await intakeRef.current;
    if (
      result?.status === "manual" &&
      result.reason === "daily_limit_reached"
    ) {
      setFound({});
      setCorrected({});
      setDailyLimit(result.dailyLimit);
      setSource("ai-limit");
      setPhase("form");
      return;
    }
    if (result) applyIntake(mapIntakeResult(result));
    setPhase("form");
  }

  function goManual() {
    setFound({});
    setCorrected({});
    setSource("manual");
    setPhase("form");
  }

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

  // Feld-Label mit optionalem „optional"-Zusatz und „KI"-Badge (wenn erkannt).
  function fieldLabel(field: IntakeField | null, label: string, optional = false): ReactNode {
    const badge = field ? Boolean(found[field]) : false;
    return (
      <span className={`f-lbl${badge ? " ai-flabel" : ""}`}>
        {label}
        {optional && <span className="nc-opt">{t("ncOptional")}</span>}
        {badge && (
          <span className="ai-badge">
            <Sparkles size={10} strokeWidth={2.8} aria-hidden />
            {t("ncAiBadge")}
          </span>
        )}
      </span>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      dir={dir}
      size="lg"
      busy={saving}
      className="dmodal--ai"
      ariaLabel={isEdit ? t("editCustomer") : t("ncTitle")}
    >
      <div className="dmodal-head">
        <span className="dmodal-title">
          {showSpark && (
            <span className="ai-title-spark">
              <Sparkles size={15} strokeWidth={2.6} aria-hidden />
            </span>
          )}
          {isEdit ? t("editCustomer") : t("ncTitle")}
        </span>
        <button type="button" className="sheet-x" aria-label={t("ncClose")} onClick={onClose}>
          <X size={18} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>

      {phase === "intro" && (
        <CustomerAiIntro value={text} onChange={setText} onFill={startFill} onManual={goManual} />
      )}

      {phase === "loading" && <CustomerAiLoading onDone={handleRecognized} />}

      {phase === "form" && (
        <>
          {isEdit && <div className="dmodal-sub">{t("editCustomerSub")}</div>}

          <div className="dmodal-body">
            {source === "ai-ok" && (
              <div className="ai-banner ai-banner--ok">
                <span className="ai-banner-ic">
                  <Check size={16} strokeWidth={3} aria-hidden />
                </span>
                <span className="ai-banner-tx">{t("ncAiOkBanner", { count })}</span>
                <button
                  type="button"
                  className="ai-changelink"
                  onClick={() => setPhase("intro")}
                >
                  {t("ncAiChangeInput")}
                </button>
              </div>
            )}
            {source === "ai-fail" && (
              <div className="ai-banner ai-banner--warn">
                <span className="ai-banner-ic">
                  <AlertTriangle size={16} strokeWidth={2.6} aria-hidden />
                </span>
                <span className="ai-banner-tx">{t("ncAiFailBanner")}</span>
                <button
                  type="button"
                  className="ai-changelink"
                  onClick={() => setPhase("intro")}
                >
                  {t("ncAiChangeInput")}
                </button>
              </div>
            )}
            {source === "ai-limit" && dailyLimit !== null && (
              <div className="ai-banner ai-banner--warn">
                <span className="ai-banner-ic">
                  <AlertTriangle size={16} strokeWidth={2.6} aria-hidden />
                </span>
                <span className="ai-banner-tx">
                  {t("ncAiDailyLimitBanner", { limit: dailyLimit })}
                </span>
              </div>
            )}
            {source === "manual" && (
              <div className="ai-banner ai-banner--muted">
                <span className="ai-banner-tx">{t("ncAiManualBanner")}</span>
                <button
                  type="button"
                  className="ai-changelink"
                  onClick={() => setPhase("intro")}
                >
                  <Sparkles size={13} strokeWidth={2.6} aria-hidden />
                  {t("ncAiFill")}
                </button>
              </div>
            )}

            <div className="f-grid">
              <div className="f-row">
                {fieldLabel("type", t("ncType"))}
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
                  {fieldLabel("companyName", t("ncBusinessName"))}
                  <input
                    className={`f-input${found.companyName ? " ai-filled" : ""}`}
                    autoComplete="name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t("ncBusinessPh")}
                  />
                </label>
              )}

              <label className="f-row">
                {fieldLabel("firstname", t("ncFirstname"))}
                <input
                  className={`f-input${found.firstname ? " ai-filled" : ""}`}
                  autoComplete="given-name"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  placeholder={t("ncFirstnamePh")}
                />
              </label>

              <label className="f-row">
                {fieldLabel("lastname", t("ncLastname"))}
                <input
                  className={`f-input${found.lastname ? " ai-filled" : ""}`}
                  autoComplete="family-name"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder={t("ncLastnamePh")}
                />
              </label>

              <div className="f-row two">
                <label className="f-row">
                  {fieldLabel("street", t("ncStreet"))}
                  <input
                    className={`f-input${corrected.street ? " ai-corr" : found.street ? " ai-filled" : ""}`}
                    autoComplete="address-line1"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder={t("ncStreetPh")}
                  />
                  {corrected.street && (
                    <span className="ai-corr-note">
                      <MapPin size={12} strokeWidth={2.6} aria-hidden />
                      {t("ncAiCorrected")}
                    </span>
                  )}
                </label>
                <label className="f-row nc-zip">
                  {fieldLabel("houseNo", t("ncHouseNo"))}
                  <input
                    className={`f-input${found.houseNo ? " ai-filled" : ""}`}
                    autoComplete="address-line2"
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                    placeholder={t("ncHouseNoPh")}
                  />
                </label>
              </div>

              <div className="f-row two">
                <label className="f-row nc-zip">
                  {fieldLabel("zip", t("ncZip"))}
                  <input
                    className={`f-input${found.zip ? " ai-filled" : ""}`}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder={t("ncZipPh")}
                  />
                </label>
                <label className="f-row">
                  {fieldLabel("city", t("ncCity"))}
                  <input
                    className={`f-input${corrected.city ? " ai-corr" : found.city ? " ai-filled" : ""}`}
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t("ncCityPh")}
                  />
                  {corrected.city && (
                    <span className="ai-corr-note">
                      <MapPin size={12} strokeWidth={2.6} aria-hidden />
                      {t("ncAiCorrected")}
                    </span>
                  )}
                </label>
              </div>

              <div className="f-row two">
                <label className="f-row">
                  {fieldLabel("phone", t("ncPhone"), true)}
                  <input
                    className={`f-input${found.phone ? " ai-filled" : ""}`}
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("ncPhonePh")}
                  />
                </label>
                <label className="f-row">
                  {fieldLabel("email", t("ncEmail"), true)}
                  <input
                    className={`f-input${found.email ? " ai-filled" : ""}`}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("ncEmailPh")}
                  />
                </label>
              </div>

              <label className="f-row">
                {fieldLabel(null, t("ncNote"), true)}
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
        </>
      )}
    </Modal>
  );
}
