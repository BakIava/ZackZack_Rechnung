import { Mail, RefreshCw, AlertTriangle, Check, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { CodeInput } from "./code-input";

interface CodeScreenProps {
  email: string;
  code: string[];
  codeErr: boolean;
  okNote: boolean;
  help: boolean;
  resendLeft: number;
  demoCode: string;
  onCodeChange: (next: string[]) => void;
  onComplete: (joined: string) => void;
  onVerify: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
  onShowHelp: () => void;
  onCloseHelp: () => void;
}

/** Schritt 2 (Herzstück): 6-stelligen Code eintippen und anmelden. */
export function CodeScreen(props: CodeScreenProps) {
  const t = useTranslations("Login");
  const { email, code, codeErr, okNote, help, resendLeft, demoCode } = props;
  const filled = code.every((d) => d !== "");
  const helpRows = [
    { Icon: Mail, label: t("help1") },
    { Icon: Pencil, label: t("help2") },
    { Icon: RefreshCw, label: t("help3") },
  ];

  return (
    <div className="lg-card lg-fade">
      <div className="lg-icon-badge">
        <RefreshCw size={28} aria-hidden />
      </div>
      <h1 className="lg-title">{t("titleCode")}</h1>
      <p className="lg-sub">
        {t("subCode")} <b dir="ltr">{email}</b>
      </p>

      <CodeInput value={code} error={codeErr} onChange={props.onCodeChange} onComplete={props.onComplete} />

      {codeErr ? (
        <div className="lg-note lg-note--err">
          <span className="lg-note-ic">
            <AlertTriangle size={14} aria-hidden />
          </span>
          {t("wrongCode")}
        </div>
      ) : okNote ? (
        <div className="lg-note lg-note--ok">
          <span className="lg-note-ic">
            <Check size={14} aria-hidden />
          </span>
          {t("newCodeSent")}
        </div>
      ) : (
        <div className="lg-note lg-note--muted">{t("enterHint")}</div>
      )}

      <button type="button" className="lg-btn" disabled={!filled} onClick={props.onVerify}>
        <Check size={22} aria-hidden />
        {t("login")}
      </button>

      <div className="lg-actions">
        <button type="button" className="lg-link" disabled={resendLeft > 0} onClick={props.onResend}>
          <RefreshCw size={18} aria-hidden />
          {resendLeft > 0 ? t("resendIn", { s: resendLeft }) : t("resend")}
        </button>
        <button type="button" className="lg-link lg-link--muted" onClick={props.onChangeEmail}>
          <Mail size={18} aria-hidden />
          {t("changeEmail")}
        </button>
      </div>

      {help ? (
        <div className="lg-help lg-fade">
          {helpRows.map(({ Icon, label }) => (
            <div className="lg-help-row" key={label}>
              <div className="lg-help-ic">
                <Icon size={17} aria-hidden />
              </div>
              <div className="lg-help-tx">{label}</div>
            </div>
          ))}
          <div className="lg-help-row lg-help-foot">
            <button type="button" className="lg-link" onClick={props.onChangeEmail}>
              <Mail size={18} aria-hidden />
              {t("useOther")}
            </button>
            <button type="button" className="lg-link lg-link--muted" onClick={props.onCloseHelp}>
              {t("closeHelp")}
            </button>
          </div>
        </div>
      ) : (
        <div className="lg-reassure">
          <button type="button" className="lg-link" onClick={props.onShowHelp}>
            {t("noEmailQ")}
          </button>
        </div>
      )}

      <div className="lg-demo">
        <span className="lg-demo-lbl">{t("demoLabel")}</span>
        <b>{demoCode}</b>
      </div>
    </div>
  );
}
