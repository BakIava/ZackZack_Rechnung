"use client";

import { useEffect, useState, useTransition } from "react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { BrandPanel, type LoginScreen } from "./brand-panel";
import { EmailScreen } from "./email-screen";
import { CodeScreen } from "./code-screen";
import { SuccessScreen } from "./success-screen";
import { sendLoginCode, verifyLoginCode } from "@/lib/auth/actions";
import "./login-flow.css";

interface LoginFlowProps {
  dir: "ltr" | "rtl";
  locale: string;
}

const EMPTY_CODE = ["", "", "", "", "", ""];
const RESEND_SECONDS = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Passwortloser Login: E-Mail → 6-stelliger Code → angemeldet (DE/TR/AR, RTL). */
export function LoginFlow({ dir, locale }: LoginFlowProps) {
  const t = useTranslations("Login");
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
  const [isPending, startTransition] = useTransition();

  // Resend-Countdown
  useEffect(() => {
    if (resendLeft <= 0) return;
    const id = setTimeout(() => setResendLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendLeft]);

  const goCode = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailErr(true);
      setEmailErrMsg(t("emailBad"));
      return;
    }
    setEmailErr(false);
    startTransition(async () => {
      const result = await sendLoginCode(email.trim());
      if (result.error) {
        setEmailErr(true);
        setEmailErrMsg(
          result.errorKey === "rateLimitExceeded"
            ? t("rateLimitExceeded")
            : t("emailBad"),
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
    startTransition(async () => {
      const result = await verifyLoginCode(email.trim(), joined, locale);
      if (result?.error) {
        setCodeErr(true);
        setCodeErrMsg(
          result.errorKey === "codeExpiredOrInvalid"
            ? t("codeExpiredOrInvalid")
            : t("wrongCode"),
        );
        setCode(EMPTY_CODE);
      }
    });
  };

  const resend = () => {
    if (resendLeft > 0) return;
    startTransition(async () => {
      const result = await sendLoginCode(email.trim());
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
      </div>
    </div>
  );
}
