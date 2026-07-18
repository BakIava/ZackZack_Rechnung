"use client";

import { useRef, type ChangeEvent } from "react";
import { SetupIcon } from "./setup-icon";
import type { Translations } from "./translations";
import { COMPANY_LOGO_ACCEPT } from "@/lib/company-logo/constants";
import "./setup-logo-field.css";

interface SetupLogoFieldProps {
  t: Translations;
  file: File | null;
  previewUrl: string | null;
  statusLabel: string;
  errorMessage: string | null;
  isMobile: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

export function SetupLogoField({
  t,
  file,
  previewUrl,
  statusLabel,
  errorMessage,
  isMobile,
  onSelect,
  onRemove,
}: SetupLogoFieldProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (selected) onSelect(selected);
  }

  if (!file || !previewUrl) {
    return (
      <div className="ob-form">
        <div className="ob-upload">
          <button
            type="button"
            className="ob-upload-main"
            onClick={() => galleryInputRef.current?.click()}
          >
            <span className="ob-upload-ic">
              <SetupIcon name="image" size={26} />
            </span>
            <span className="ob-upload-t">{t.uploadT}</span>
            <span className="ob-upload-s">{t.uploadS}</span>
          </button>
          <div className="ob-upload-ways">
            {isMobile && (
              <button
                type="button"
                className="ob-upload-way"
                onClick={() => cameraInputRef.current?.click()}
              >
                <SetupIcon name="camera" size={17} />
                {t.wayCam}
              </button>
            )}
            <button
              type="button"
              className="ob-upload-way"
              onClick={() => galleryInputRef.current?.click()}
            >
              <SetupIcon name="image" size={17} />
              {t.wayGallery}
            </button>
          </div>
        </div>
        <input
          ref={galleryInputRef}
          className="ob-logo-input"
          type="file"
          accept={COMPANY_LOGO_ACCEPT}
          onChange={handleChange}
        />
        {isMobile && (
          <input
            ref={cameraInputRef}
            className="ob-logo-input"
            type="file"
            accept="image/png,image/jpeg"
            capture="environment"
            onChange={handleChange}
          />
        )}
        {errorMessage && (
          <div className="ob-logo-error" role="alert">{errorMessage}</div>
        )}
        <LogoNote t={t} />
      </div>
    );
  }

  return (
    <div className="ob-form">
      <div className="ob-logo-pre">
        <div className="ob-logo-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" />
        </div>
        <div className="ob-logo-meta">
          <div className="ob-logo-name">{file.name}</div>
          <div className="ob-logo-sub">
            <SetupIcon name="check" size={13} weight="bold" />
            {statusLabel}
          </div>
        </div>
        <div className="ob-logo-actions">
          <button
            type="button"
            className="ob-logo-btn"
            title={t.change}
            aria-label={t.change}
            onClick={() => galleryInputRef.current?.click()}
          >
            <SetupIcon name="pencil" size={16} />
          </button>
          <button
            type="button"
            className="ob-logo-btn del"
            title={t.remove}
            aria-label={t.remove}
            onClick={onRemove}
          >
            <SetupIcon name="trash" size={16} />
          </button>
        </div>
      </div>
      <input
        ref={galleryInputRef}
        className="ob-logo-input"
        type="file"
        accept={COMPANY_LOGO_ACCEPT}
        onChange={handleChange}
      />
      {errorMessage && (
        <div className="ob-logo-error" role="alert">{errorMessage}</div>
      )}
      <LogoNote t={t} />
    </div>
  );
}

interface LogoNoteProps {
  t: Translations;
}

function LogoNote({ t }: LogoNoteProps) {
  return (
    <div className="ob-note">
      <div className="ob-note-ic">
        <SetupIcon name="info" size={18} />
      </div>
      <div className="ob-note-tx">{t.logoNote}</div>
    </div>
  );
}
