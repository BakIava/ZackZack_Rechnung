"use client";

import "./setup-upload.css";
import Image from "next/image";
import { useRef, type ChangeEvent } from "react";
import { SetupIcon } from "./setup-icon";
import { type Translations, type Lang } from "./translations";
import { LangLink, Privacy, ScanDoc, DesktopBar, UpProgress } from "./setup-primitives";
import { UploadOpts, type SetupUploadSource } from "./setup-other-fields";

interface UploadProps {
  t: Translations;
  lang: Lang;
  dir: "ltr" | "rtl";
  isMobile: boolean;
  phase: "upload" | "scanning";
  onFileSelect: (file: File) => void;
  onBack: () => void;
  onManual: () => void;
  fileName: string;
  errorMessage: string | null;
}

export function SetupUpload({
  t,
  lang,
  dir,
  isMobile,
  phase,
  onFileSelect,
  onBack,
  onManual,
  fileName,
  errorMessage,
}: UploadProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  const handleChoose = (source: SetupUploadSource) => {
    if (source === "camera") cameraInput.current?.click();
    if (source === "gallery") galleryInput.current?.click();
    if (source === "pdf") pdfInput.current?.click();
  };
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) onFileSelect(file);
  };
  const fileInputs = (
    <div className="ob-file-inputs" aria-hidden="true">
      <input
        ref={cameraInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFile}
        tabIndex={-1}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        tabIndex={-1}
      />
      <input
        ref={pdfInput}
        type="file"
        accept="application/pdf"
        onChange={handleFile}
        tabIndex={-1}
      />
    </div>
  );

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
                <Image src="/assets/zackzack-mark.png" alt="" width={24} height={18} className="ob-brand-mark" />
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
            <div className="ob-scan-file"><SetupIcon name="file" size={15} />{fileName || t.scanFile}</div>
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
              <Image src="/assets/zackzack-mark.png" alt="" width={24} height={18} className="ob-brand-mark" />
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
          {errorMessage && (
            <div className="ob-upload-error" role="alert">
              <SetupIcon name="alert" size={18} />
              <span>{errorMessage}</span>
            </div>
          )}
          <UploadOpts t={t} onChoose={handleChoose} />
          {fileInputs}
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
              <div className="ob-scan ob-scan--desktop">
                <ScanDoc />
                <div className="ob-scan-s">{t.scanS}</div>
                <div className="ob-scan-file"><SetupIcon name="file" size={15} />{fileName || t.scanFile}</div>
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
            {errorMessage && (
              <div className="ob-upload-error" role="alert">
                <SetupIcon name="alert" size={18} />
                <span>{errorMessage}</span>
              </div>
            )}
            <UploadOpts t={t} onChoose={handleChoose} />
            {fileInputs}
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
