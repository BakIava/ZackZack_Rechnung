"use client";

import Image from "next/image";
import { SetupIcon } from "./SetupIcon";
import { type Translations, type Lang } from "./translations";
import { LangLink, Privacy, ScanDoc, DesktopBar, UpProgress } from "./SetupPrimitives";
import { UploadOpts } from "./SetupStepFields";

interface UploadProps {
  t: Translations;
  lang: Lang;
  dir: "ltr" | "rtl";
  isMobile: boolean;
  phase: "upload" | "scanning";
  onScan: () => void;
  onBack: () => void;
  onManual: () => void;
}

export function SetupUpload({ t, lang, dir, isMobile, phase, onScan, onBack, onManual }: UploadProps) {
  if (isMobile) {
    if (phase === "scanning") {
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
          <div className="ob-scan">
            <ScanDoc />
            <div className="ob-scan-t">{t.scanT}</div>
            <div className="ob-scan-s">{t.scanS}</div>
            <div className="ob-scan-file"><SetupIcon name="file" size={15} />{t.scanFile}</div>
            <div className="ob-scan-dots"><i /><i /><i /></div>
            <LangLink lang={lang} />
          </div>
        </div>
      );
    }

    return (
      <div className="ob-root" dir={dir}>
        <div className="ob-top">
          <button className="ob-back" onClick={onBack}>
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
        <div className="ob-body">
          <div className="ob-intro">
            <div className="ob-intro-ic"><SetupIcon name="scan" size={26} /></div>
            <div className="ob-intro-tx">
              <div className="ob-intro-t">{t.upTitle}</div>
              <div className="ob-intro-s">{t.upIntro}</div>
            </div>
          </div>
          <UploadOpts t={t} onChoose={onScan} />
          <Privacy t={t} flow />
          <LangLink lang={lang} />
        </div>
      </div>
    );
  }

  // Desktop upload
  if (phase === "scanning") {
    return (
      <div className="ob-d" dir={dir}>
        <DesktopBar t={t} />
        <div className="ob-d-scroll">
          <div className="ob-d-wrap">
            <div className="ob-d-head">
              <div className="ob-d-kicker">{t.tileUploadT}</div>
              <div className="ob-d-title">{t.scanT}</div>
            </div>
            <UpProgress t={t} upIndex={2} />
            <div className="ob-d-card">
              <div className="ob-scan" style={{ padding: "26px 20px 30px" }}>
                <ScanDoc />
                <div className="ob-scan-s">{t.scanS}</div>
                <div className="ob-scan-file"><SetupIcon name="file" size={15} />{t.scanFile}</div>
                <div className="ob-scan-dots"><i /><i /><i /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-d" dir={dir}>
      <DesktopBar t={t} />
      <div className="ob-d-scroll">
        <div className="ob-d-wrap">
          <div className="ob-d-head">
            <div className="ob-d-kicker">{t.tileUploadT}</div>
            <div className="ob-d-title">{t.upTitle}</div>
            <div className="ob-d-sub">{t.upIntro}</div>
          </div>
          <UpProgress t={t} upIndex={1} />
          <div className="ob-d-card">
            <UploadOpts t={t} onChoose={onScan} />
            <Privacy t={t} flow />
          </div>
          <div className="ob-d-wfoot">
            <button className="ob-d-back" onClick={onBack}>
              <SetupIcon name="chevronLeft" size={19} />{t.back}
            </button>
            <div className="ob-d-wfoot-r">
              <button className="ob-d-skip" onClick={onManual}>{t.tileManualT}</button>
            </div>
          </div>
          <LangLink lang={lang} />
        </div>
      </div>
    </div>
  );
}
