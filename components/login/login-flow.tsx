"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { BrandPanel, type LoginScreen } from "./brand-panel";
import { EmailScreen } from "./email-screen";
import { CodeScreen } from "./code-screen";
import { SuccessScreen } from "./success-screen";
import "./login.css";

interface LoginFlowProps {
  dir: "ltr" | "rtl";
}

const DEMO_EMAIL = "mehmet@yilmaz-malerbetrieb.de";
const DEMO_CODE = "729104";
const DEMO_NAME = "Mehmet";
const EMPTY_CODE = ["", "", "", "", "", ""];
const RESEND_SECONDS = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Passwortloser Login: E-Mail → 6-stelliger Code → angemeldet (DE/TR/AR, RTL). */
export function LoginFlow({ dir }: LoginFlowProps) {
  const t = useTranslations("Login");
  const [screen, setScreen] = useState<LoginScreen>("email");
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [codeErr, setCodeErr] = useState(false);
  const [emailErr, setEmailErr] = useState(false);
  const [okNote, setOkNote] = useState(false);
  const [help, setHelp] = useState(false);
  const [resendLeft, setResendLeft] = useState(0);

  // Resend-Countdown
  useEffect(() => {
    if (resendLeft <= 0) return;
    const id = setTimeout(() => setResendLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendLeft]);

  const goCode = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailErr(true);
      return;
    }
    setEmailErr(false);
    setHelp(false);
    setCode(EMPTY_CODE);
    setCodeErr(false);
    setResendLeft(RESEND_SECONDS);
    setScreen("code");
  };

  const verify = (joined: string) => {
    if (joined === DEMO_CODE) {
      setCodeErr(false);
      setScreen("success");
    } else {
      setCodeErr(true);
    }
  };

  const resend = () => {
    if (resendLeft > 0) return;
    setOkNote(true);
    setCodeErr(false);
    setCode(EMPTY_CODE);
    setResendLeft(RESEND_SECONDS);
  };

  const changeEmail = () => {
    setScreen("email");
    setHelp(false);
  };

  return (
    <div className="lg-root" dir={dir}>
      <BrandPanel screen={screen} />

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

        {screen === "email" && (
          <EmailScreen
            email={email}
            emailErr={emailErr}
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
            okNote={okNote}
            help={help}
            resendLeft={resendLeft}
            demoCode={DEMO_CODE}
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

        {screen === "success" && <SuccessScreen name={DEMO_NAME} />}
      </div>
    </div>
  );
}
