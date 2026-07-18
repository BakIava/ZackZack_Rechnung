import { Mail, KeyRound, ShieldCheck, ArrowRight, ChevronRight, AlertTriangle } from "lucide-react";
import { Fragment } from "react";
import { useTranslations } from "next-intl";
import "./email-screen.css";

interface EmailScreenProps {
  email: string;
  emailErr: boolean;
  serverErrMsg?: string;
  loading?: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
}

/** Schritt 1: E-Mail-Adresse erfassen, Code anfordern. */
export function EmailScreen({ email, emailErr, serverErrMsg, loading, onEmailChange, onSubmit }: EmailScreenProps) {
  const t = useTranslations("Login");
  const mini = [
    { Icon: Mail, label: t("mini1") },
    { Icon: KeyRound, label: t("mini2") },
    { Icon: ShieldCheck, label: t("mini3") },
  ];

  return (
    <div className="lg-card lg-fade">
      <div className="lg-icon-badge">
        <Mail size={28} aria-hidden />
      </div>
      <h1 className="lg-title">{t("titleEmail")}</h1>
      <p className="lg-sub">{t("subEmail")}</p>

      <label className="lg-field-lbl" htmlFor="lg-email">
        {t("emailLabel")}
      </label>
      <div className={"lg-input" + (emailErr ? " is-error" : "")}>
        <Mail size={22} aria-hidden />
        <input
          id="lg-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          value={email}
          placeholder={t("emailPlaceholder")}
          onChange={(e) => onEmailChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        />
      </div>
      {emailErr && (
        <div className="lg-note lg-note--err">
          <span className="lg-note-ic">
            <AlertTriangle size={14} aria-hidden />
          </span>
          {serverErrMsg || t("emailBad")}
        </div>
      )}

      <button type="button" className="lg-btn" disabled={loading} onClick={onSubmit}>
        {t("sendCode")}
        <ArrowRight size={22} aria-hidden />
      </button>

      <div className="lg-mini">
        {mini.map(({ Icon, label }, i) => (
          <Fragment key={label}>
            <div className="lg-mini-step">
              <div className="lg-mini-ic">
                <Icon size={18} aria-hidden />
              </div>
              <div className="lg-mini-tx">{label}</div>
            </div>
            {i < mini.length - 1 && (
              <ChevronRight size={16} className="lg-mini-arrow" aria-hidden />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
