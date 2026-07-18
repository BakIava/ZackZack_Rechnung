import { Fragment } from "react";
import { Mail, KeyRound, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import "./brand-panel.css";

export type LoginScreen = "email" | "code" | "success";

interface BrandPanelProps {
  screen: LoginScreen;
}

/** Marken-Panel (links / RTL: rechts) mit 3-Schritt-Illustration. */
export function BrandPanel({ screen }: BrandPanelProps) {
  const t = useTranslations("Login");
  const activeIdx = screen === "email" ? 0 : screen === "code" ? 1 : 2;
  const steps = [
    { Icon: Mail, label: t("mini1") },
    { Icon: KeyRound, label: t("mini2") },
    { Icon: ShieldCheck, label: t("mini3") },
  ];

  return (
    <div className="lg-brand">
      <div className="lg-brand-head">
        <Image
          className="zz-mark"
          src="/assets/zackzack-mark.png"
          alt="ZACK ZACK RECHNUNG"
          width={548}
          height={412}
          priority
        />
        <div className="zz-word">
          <b>ZACK ZACK</b>
          <span>RECHNUNG</span>
        </div>
      </div>

      <div className="lg-brand-mid">
        <h1 className="lg-brand-h">{t("brandHeadline")}</h1>
        <p className="lg-brand-p">{t("brandText")}</p>
        <div className="lg-steps">
          {steps.map(({ Icon, label }, i) => (
            <Fragment key={label}>
              <div className={"lg-step" + (i === activeIdx ? " lg-step--now" : "")}>
                <div className="lg-step-ic">
                  <Icon size={22} aria-hidden />
                </div>
                <div className="lg-step-tx">{label}</div>
              </div>
              {i < steps.length - 1 && <div className="lg-step-conn" />}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="lg-brand-foot">
        <ShieldCheck size={16} aria-hidden />
        {t("secure")}
      </div>
    </div>
  );
}
