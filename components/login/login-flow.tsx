"use client";

import { useEffect, useState, useTransition } from "react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { useRouter } from "@/i18n/navigation";
import { BrandPanel, type LoginScreen } from "./brand-panel";
import { EmailScreen } from "./email-screen";
import { CodeScreen } from "./code-screen";
import { SuccessScreen } from "./success-screen";
import { WelcomeScreen } from "./welcome-screen";
import { LockScreen } from "./lock-screen";
import { RegisterScreen } from "./register-screen";
import { sendLoginCode, verifyLoginCode, signOut } from "@/lib/auth/actions";
import { unlockSession } from "@/lib/auth/session-lock-actions";
import "./login-flow.css";

type AuthPhase = "welcome" | "locked" | "login" | "register";

interface LockUser {
  owner: string;
  company: string;
  initials: string;
}

interface LoginFlowProps {
  dir: "ltr" | "rtl";
  locale: string;
  initialPhase: "welcome" | "locked";
  lockUser: LockUser | null;
  /** Ziel nach dem Entsperren: „/dashboard" oder „/setup" (locale-relativ). */
  unlockPath: string;
}

const EMPTY_CODE = ["", "", "", "", "", ""];
const RESEND_SECONDS = 60;
/** Dauer der Übergangsanimation Willkommen → Login (siehe welcome-screen.css). */
const LEAVE_MS = 640;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Auth-Ablauf: Willkommen (Anmeldung/Registrierung) bzw. Entsperren bei gültiger
 * Session, dahinter der passwortlose Login (E-Mail → 6-stelliger Code) sowie das
 * Registrierungs-Vorabformular. DE/TR/AR, RTL.
 */
export function LoginFlow({ dir, locale, initialPhase, lockUser, unlockPath }: LoginFlowProps) {
  const t = useTranslations("Login");
  const router = useRouter();
  const [phase, setPhase] = useState<AuthPhase>(initialPhase);
  const [leaving, setLeaving] = useState(false);
  const [, startTransition] = useTransition();

  const [screen, setScreen] = useState<LoginScreen>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [codeErr, setCodeErr] = useState(false);
  const [codeErrMsg, setCodeErrMsg] = useState("");
  const [emailErr, setEmailErr] = useState(false);
  const [emailErrMsg, setEmailErrMsg] = useState("");
  const [okNote, setOkNote] = useState(false);
  const [help, setHelp] = useState(false);
  const [resendLeft, setResendLeft] = useState(0);
  const [isPending, startAuthTransition] = useTransition();

  // Resend-Countdown
  useEffect(() => {
    if (resendLeft <= 0) return;
    const id = setTimeout(() => setResendLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendLeft]);

  // ── Phasenwechsel ────────────────────────────────────────────────────────
  const startLogin = () => {
    setLeaving(true);
    setTimeout(() => {
      setPhase("login");
      setLeaving(false);
    }, LEAVE_MS);
  };
  const goWelcome = () => {
    setLeaving(false);
    setScreen("email");
    setPhase("welcome");
  };
  const unlock = () => {
    setLeaving(true);
    startTransition(async () => {
      await unlockSession();
      setTimeout(() => router.push(unlockPath), 380);
    });
  };
  const switchAccount = () => {
    startTransition(async () => {
      await signOut();
      goWelcome();
    });
  };

  // ── Login-Aktionen ───────────────────────────────────────────────────────
  const goCode = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailErr(true);
      setEmailErrMsg(t("emailBad"));
      return;
    }
    setEmailErr(false);
    startAuthTransition(async () => {
      const result = await sendLoginCode(email.trim(), locale);
      if (result.error) {
        setEmailErr(true);
        setEmailErrMsg(
          result.errorKey === "rateLimitExceeded" ? t("rateLimitExceeded") : t("emailBad"),
        );
        return;
      }
      setHelp(false);
      setCode(EMPTY_CODE);
      setCodeErr(false);
      setResendLeft(RESEND_SECONDS);
      setScreen("code");
    });
  };

  const verify = (joined: string) => {
    if (joined.length < 6) return;
    startAuthTransition(async () => {
      const result = await verifyLoginCode(email.trim(), joined, locale);
      if (result?.error) {
        setCodeErr(true);
        setCodeErrMsg(
          result.errorKey === "codeExpiredOrInvalid" ? t("codeExpiredOrInvalid") : t("wrongCode"),
        );
        setCode(EMPTY_CODE);
      }
    });
  };

  const resend = () => {
    if (resendLeft > 0) return;
    startAuthTransition(async () => {
      const result = await sendLoginCode(email.trim(), locale);
      if (result.error) return;
      setOkNote(true);
      setCodeErr(false);
      setCode(EMPTY_CODE);
      setResendLeft(RESEND_SECONDS);
    });
  };

  const changeEmail = () => {
    setScreen("email");
    setHelp(false);
  };

  // Login-/Registrierungs-Panel (geteilte Split-Ansicht mit Marken-Panel).
  const showShell = phase === "login" || phase === "register" || (phase === "welcome" && leaving);
  const shell = showShell && (
    <div className="lg-root" dir={dir}>
      <BrandPanel screen={phase === "register" ? "email" : screen} />

      <div className="lg-form">
        <div className="lg-form-head">
          <NextLink href="/language" className="lg-back" aria-label={t("changeLanguage")}>
            <Globe size={18} aria-hidden />
            <span className="lg-back-langs">
              <b>Sprache</b>
              <i>·</i>
              <b>Dil</b>
              <i>·</i>
              <b lang="ar" dir="rtl">
                اللغة
              </b>
            </span>
          </NextLink>
        </div>

        {phase === "register" ? (
          <RegisterScreen onBack={goWelcome} />
        ) : (
          <>
            {screen === "email" && (
              <EmailScreen
                email={email}
                emailErr={emailErr}
                serverErrMsg={emailErrMsg}
                loading={isPending}
                onEmailChange={(v) => {
                  setEmail(v);
                  setEmailErr(false);
                }}
                onSubmit={goCode}
              />
            )}

            {screen === "code" && (
              <CodeScreen
                email={email}
                code={code}
                codeErr={codeErr}
                serverErrMsg={codeErrMsg}
                okNote={okNote}
                help={help}
                resendLeft={resendLeft}
                demoCode=""
                loading={isPending}
                onCodeChange={(next) => {
                  setCode(next);
                  if (codeErr) setCodeErr(false);
                  if (okNote) setOkNote(false);
                }}
                onComplete={verify}
                onVerify={() => verify(code.join(""))}
                onResend={resend}
                onChangeEmail={changeEmail}
                onShowHelp={() => setHelp(true)}
                onCloseHelp={() => setHelp(false)}
              />
            )}

            {screen === "success" && <SuccessScreen name="" />}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="auth" data-phase={phase} dir={dir}>
      {shell}

      {phase === "welcome" && (
        <WelcomeScreen
          locale={locale}
          leaving={leaving}
          onSignIn={startLogin}
          onRegister={() => setPhase("register")}
        />
      )}

      {phase === "locked" && lockUser && (
        <LockScreen
          owner={lockUser.owner}
          company={lockUser.company}
          initials={lockUser.initials}
          leaving={leaving}
          onUnlock={unlock}
          onSwitch={switchAccount}
        />
      )}
    </div>
  );
}
