import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import "./lock-screen.css";

interface LockScreenProps {
  owner: string;
  company: string;
  initials: string;
  leaving: boolean;
  onUnlock: () => void;
  onSwitch: () => void;
}

/** Sperrbildschirm bei noch gültiger Session — ein Klick entsperrt. */
export function LockScreen({ owner, company, initials, leaving, onUnlock, onSwitch }: LockScreenProps) {
  const t = useTranslations("Login");

  return (
    <div
      className={"auth-lock" + (leaving ? " is-leaving" : "")}
      role="button"
      tabIndex={0}
      onClick={onUnlock}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onUnlock();
        }
      }}
    >
      <div className="al-bg" />
      <div className="al-top">
        <Image
          className="zz-mark al-mark"
          src="/assets/zackzack-mark.png"
          alt="ZACK ZACK RECHNUNG"
          width={548}
          height={412}
          priority
        />
      </div>
      <div className="al-center">
        <div className="al-avatar">{initials}</div>
        {owner && <div className="al-name">{owner}</div>}
        {company && <div className="al-company">{company}</div>}
        <button
          type="button"
          className="al-unlock"
          onClick={(e) => {
            e.stopPropagation();
            onUnlock();
          }}
        >
          <KeyRound size={20} aria-hidden />
          {t("lockUnlock")}
        </button>
        <div className="al-hint">{t("lockHint")}</div>
      </div>
      <button
        type="button"
        className="al-switch"
        onClick={(e) => {
          e.stopPropagation();
          onSwitch();
        }}
      >
        {t("lockSwitch")}
      </button>
    </div>
  );
}
