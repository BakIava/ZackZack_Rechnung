"use client";

import "./SetupWelcome.css";
import Image from "next/image";
import { SetupIcon } from "./SetupIcon";
import { type Translations, type Lang } from "./translations";
import { LangLink, DesktopBar } from "./SetupPrimitives";

interface WelcomeProps {
  t: Translations;
  lang: Lang;
  dir: "ltr" | "rtl";
  isMobile: boolean;
  onNext: () => void;
}

const WELCOME_ICONS = ["building", "idcard", "bank", "brush"] as const;

export function SetupWelcome({ t, lang, dir, isMobile, onNext }: WelcomeProps) {
  const items = WELCOME_ICONS.map((ic, i) => ({ ic, lbl: t.progNames[i] }));

  if (isMobile) {
    return (
      <div className="ob-root" dir={dir}>
        <div className="ob-top">
          <button className="ob-back" disabled>
            <SetupIcon name="chevronLeft" size={20} />
          </button>
          <div className="ob-top-mid">
            <div className="ob-top-brand">
              <Image src="/assets/zackzack-mark.png" alt="" width={18} height={18} style={{ height: 18, width: "auto" }} />
              {t.setup}
            </div>
            <div className="ob-top-sub">{t.setupSub}</div>
          </div>
          <div className="ob-top-spacer" />
        </div>
        <div className="ob-welcome">
          <div className="ob-welcome-logo">
            <Image src="/assets/zackzack-logo.png" alt="ZACK ZACK RECHNUNG" width={160} height={34} style={{ height: 34, width: "auto" }} />
          </div>
          <div className="ob-welcome-title">{t.setup}</div>
          <div className="ob-welcome-sub">{t.dSub}</div>
          <div className="ob-welcome-pills">
            {items.map((item) => (
              <span key={item.ic} className="ob-welcome-pill">
                <SetupIcon name={item.ic} size={15} />
                {item.lbl}
              </span>
            ))}
          </div>
          <button type="button" className="ob-next ob-next--welcome" onClick={onNext}>
            {t.loslegen}<SetupIcon name="arrowRight" size={20} weight="bold" />
          </button>
          <LangLink lang={lang} />
        </div>
      </div>
    );
  }

  return (
    <div className="ob-d" dir={dir}>
      <DesktopBar t={t} />
      <div className="ob-d-scroll" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="ob-d-welcome">
          <Image src="/assets/zackzack-logo.png" alt="ZACK ZACK RECHNUNG" width={180} height={128} style={{ height: 128, width: "auto", marginBottom: 32 }} />
          <div className="ob-d-title" style={{ marginBottom: 12 }}>{t.setup}</div>
          <div className="ob-d-sub" style={{ marginBottom: 28 }}>{t.dSub}</div>
          <div className="ob-welcome-pills ob-welcome-pills--d">
            {items.map((item) => (
              <span key={item.ic} className="ob-welcome-pill">
                <SetupIcon name={item.ic} size={15} />
                {item.lbl}
              </span>
            ))}
          </div>
          <button className="ob-d-btn ob-d-btn--lg" onClick={onNext}>
            {t.loslegen}<SetupIcon name="arrowRight" size={20} weight="bold" />
          </button>
          <LangLink lang={lang} />
        </div>
      </div>
    </div>
  );
}
