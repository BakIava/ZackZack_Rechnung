"use client";

import { useState, useTransition } from "react";
import { Building2, Phone, Mail, ArrowRight, ArrowLeft, AlertTriangle, CheckCircle2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { requestAccess } from "@/lib/auth/actions";
import "./register-screen.css";

interface RegisterScreenProps {
  onBack: () => void;
}

/**
 * Registrierung (noch in Vorbereitung): erfasst Firmenname / Telefon / E-Mail
 * und sendet eine Zugriffsanfrage. Reines Vorab-Formular ohne Self-Service-Konto.
 */
export function RegisterScreen({ onBack }: RegisterScreenProps) {
  const t = useTranslations("Login");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setErrMsg("");
    startTransition(async () => {
      const result = await requestAccess({ companyName, phone, email });
      if (result.error) {
        setErrMsg(result.errorKey === "badEmail" ? t("emailBad") : t("registerMissing"));
        return;
      }
      setSent(true);
    });
  };

  if (sent) {
    return (
      <div className="lg-card lg-fade">
        <div className="reg-sent">
          <div className="lg-check">
            <CheckCircle2 size={48} aria-hidden />
          </div>
          <h1 className="lg-title">{t("registerSentTitle")}</h1>
          <p className="lg-sub reg-sent-text">{t("registerSentText")}</p>
          <button type="button" className="lg-btn" onClick={onBack}>
            <ArrowLeft size={22} aria-hidden />
            {t("registerBack")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lg-card lg-fade">
      <div className="lg-icon-badge">
        <UserPlus size={28} aria-hidden />
      </div>
      <h1 className="lg-title">{t("registerTitle")}</h1>
      <p className="lg-sub">{t("registerSub")}</p>

      <div className="reg-note">
        <AlertTriangle size={16} aria-hidden />
        <span>{t("registerNote")}</span>
      </div>

      <label className="lg-field-lbl" htmlFor="reg-company">
        {t("registerCompanyLabel")}
      </label>
      <div className="lg-input">
        <Building2 size={22} aria-hidden />
        <input
          id="reg-company"
          type="text"
          value={companyName}
          placeholder={t("registerCompanyPlaceholder")}
          onChange={(e) => setCompanyName(e.target.value)}
        />
      </div>

      <label className="lg-field-lbl reg-field-gap" htmlFor="reg-phone">
        {t("registerPhoneLabel")}
      </label>
      <div className="lg-input">
        <Phone size={22} aria-hidden />
        <input
          id="reg-phone"
          type="tel"
          inputMode="tel"
          dir="ltr"
          value={phone}
          placeholder={t("registerPhonePlaceholder")}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <label className="lg-field-lbl reg-field-gap" htmlFor="reg-email">
        {t("emailLabel")}
      </label>
      <div className="lg-input">
        <Mail size={22} aria-hidden />
        <input
          id="reg-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          value={email}
          placeholder={t("emailPlaceholder")}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>

      {errMsg && (
        <div className="lg-note lg-note--err">
          <span className="lg-note-ic">
            <AlertTriangle size={14} aria-hidden />
          </span>
          {errMsg}
        </div>
      )}

      <button type="button" className="lg-btn" disabled={isPending} onClick={submit}>
        {t("registerSubmit")}
        <ArrowRight size={22} aria-hidden />
      </button>

      <button type="button" className="reg-back" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden />
        {t("registerBack")}
      </button>
    </div>
  );
}
