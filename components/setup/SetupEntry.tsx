"use client";

import "./SetupEntry.css";
import Image from "next/image";
import { SetupIcon } from "./SetupIcon";
import { type Translations, type Lang } from "./translations";
import { LangLink, Privacy, DesktopBar } from "./SetupPrimitives";
import { EntryTiles } from "./SetupStepFields";

interface EntryProps {
  t: Translations;
  lang: Lang;
  dir: "ltr" | "rtl";
  isMobile: boolean;
  onUpload: () => void;
  onManual: () => void;
}

export function SetupEntry({ t, lang, dir, isMobile, onUpload, onManual }: EntryProps) {
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
        <div className="ob-entry">
          <div className="ob-entry-head">
            <div className="ob-entry-title">{t.entryTitle}</div>
            <div className="ob-entry-sub">{t.entrySub}</div>
          </div>
          <EntryTiles t={t} onUpload={onUpload} onManual={onManual} />
          <Privacy t={t} />
          <LangLink lang={lang} />
        </div>
      </div>
    );
  }

  return (
    <div className="ob-d" dir={dir}>
      <DesktopBar t={t} />
      <div className="ob-d-scroll" style={{ display: "flex", flexDirection: "column" }}>
        <div className="ob-entry-d">
          <div className="ob-d-head">
            <div className="ob-d-title">{t.entryTitle}</div>
            <div className="ob-d-sub">{t.entrySub}</div>
          </div>
          <EntryTiles t={t} row onUpload={onUpload} onManual={onManual} />
          <Privacy t={t} flow />
          <LangLink lang={lang} />
        </div>
      </div>
    </div>
  );
}
