"use client";

import "./setup-primitives.css";
import React, { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { SetupIcon } from "./setup-icon";
import { type Translations, type Lang, LANG_LABEL } from "./translations";

// ── LangLink ──────────────────────────────────────────────────────────────────

interface LangLinkProps {
  lang: Lang;
}

export function LangLink({ lang }: LangLinkProps) {
  return (
    <div className="ob-lang-link-container">
      <Link href={`/language?return=/setup`} className="ob-lang-link">
        <SetupIcon name="globe" size={15} />
        {LANG_LABEL[lang]}
      </Link>
    </div>
  );
}

// ── Privacy ───────────────────────────────────────────────────────────────────

interface PrivacyProps {
  t: Translations;
  flow?: boolean;
}

export function Privacy({ t, flow }: PrivacyProps) {
  return (
    <div className={"ob-privacy" + (flow ? " ob-privacy--flow" : "")}>
      <div className="ob-privacy-ic"><SetupIcon name="lock" size={17} /></div>
      <div className="ob-privacy-tx">
        {t.privacyA} <b>{t.privacyB}</b>
      </div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  req?: boolean;
  badge?: ReactNode;
  hint?: ReactNode;
  error?: string;
  todo?: string;
  children: ReactNode;
}

export function Field({ label, req, badge, hint, error, todo, children }: FieldProps) {
  return (
    <div className="ob-field">
      <label className="ob-field-lbl">
        {label}
        {req && <span className="req">*</span>}
        {badge}
      </label>
      {children}
      {error ? (
        <div className="ob-err"><SetupIcon name="alert" size={14} />{error}</div>
      ) : todo ? (
        <div className="ob-hint ob-hint--todo"><SetupIcon name="alert" size={13} />{todo}</div>
      ) : hint ? (
        <div className="ob-hint">{hint}</div>
      ) : null}
    </div>
  );
}

// ── TextInput ─────────────────────────────────────────────────────────────────

interface TextInputProps {
  value?: string;
  placeholder?: string;
  valid?: boolean;
  error?: boolean;
  mono?: boolean;
  dir?: "ltr" | "rtl";
  name?: string;
  onChange?: (val: string) => void;
}

export function TextInput({ value, placeholder, valid, error, mono, dir, name, onChange }: TextInputProps) {
  const isControlled = onChange !== undefined;
  const cls = "ob-inp-wrap" + (valid ? " is-valid" : error ? " is-error" : "");
  return (
    <div className={cls}>
      <input
        className={"ob-inp" + (mono ? " ob-inp--mono" : "")}
        {...(isControlled
          ? { value: value ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) }
          : { defaultValue: value })}
        placeholder={placeholder}
        dir={dir}
        name={name}
      />
      {valid && (
        <span className="ob-inp-aff ob-inp-aff--ok">
          <SetupIcon name="check" size={14} weight="bold" />
        </span>
      )}
      {error && (
        <span className="ob-inp-aff ob-inp-aff--err">
          <SetupIcon name="x" size={13} />
        </span>
      )}
    </div>
  );
}

// ── Seg3 ──────────────────────────────────────────────────────────────────────

interface Seg3Props {
  options: [string, string][];
  value: string | null;
  onChange?: (val: string) => void;
  wrap?: boolean;
}

export function Seg3({ options, value, onChange, wrap }: Seg3Props) {
  const [sel, setSel] = useState<string | null>(value);
  const handleClick = (id: string) => {
    setSel(id);
    onChange?.(id);
  };
  return (
    <div className={"ob-seg3" + (wrap ? " ob-seg3--wrap" : "")}>
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          data-active={sel === id ? "true" : "false"}
          onClick={() => handleClick(id)}
          dangerouslySetInnerHTML={{ __html: label }}
        />
      ))}
    </div>
  );
}

// ── Toggle19 ──────────────────────────────────────────────────────────────────

interface Toggle19Props {
  t: Translations;
  checked?: boolean;
  onChange?: (val: boolean) => void;
}

export function Toggle19({ t, checked, onChange }: Toggle19Props) {
  const [localOn, setLocalOn] = useState(true);
  const isControlled = onChange !== undefined;
  const on = isControlled ? (checked ?? true) : localOn;
  const toggle = () => {
    if (isControlled) onChange(!on);
    else setLocalOn((v: boolean) => !v);
  };
  return (
    <button
      type="button"
      className="ob-toggle"
      data-active={on ? "true" : "false"}
      onClick={toggle}
    >
      <div className="ob-toggle-ic">
        <SetupIcon name="shieldCheck" size={22} />
      </div>
      <div className="ob-toggle-tx">
        <div className="ob-toggle-t">{t.ku_t}</div>
        <div className="ob-toggle-s">{t.ku_s}</div>
      </div>
      <div className="ob-sw"><i /></div>
    </button>
  );
}

// ── LoadingOverlay (Status-Design) ──────────────────────────────────────────────

interface LoadingOverlayProps {
  t: Translations;
  fileName: string;
}

export function LoadingOverlay({ t, fileName }: LoadingOverlayProps) {
  return (
    <div className="ob-ov" role="status" aria-live="polite">
      <div className="ob-ov-box">
        <div className="ob-ov-ring">
          <span className="ob-ov-spin" />
          <Image
            src="/assets/zackzack-mark.png"
            alt=""
            width={34}
            height={34}
            className="ob-ov-mark"
          />
        </div>
        <div className="ob-ov-t">{t.scanT}</div>
        <div className="ob-ov-s">{t.scanS}</div>
        <div className="ob-scan-file"><SetupIcon name="file" size={15} />{fileName || t.scanFile}</div>
      </div>
    </div>
  );
}

// ── DesktopBar ────────────────────────────────────────────────────────────────

interface DesktopBarProps {
  t: Translations;
}

export function DesktopBar({ t }: DesktopBarProps) {
  return (
    <div className="ob-d-bar">
      <div className="ob-d-brand">
        <Image src="/assets/zackzack-logo.png" alt="ZACK ZACK RECHNUNG" width={120} height={26} style={{ height: 26, width: "auto" }} />
      </div>
      <div className="ob-d-help"><SetupIcon name="info" size={17} />{t.dHelp}</div>
    </div>
  );
}

// ── UpProgress ────────────────────────────────────────────────────────────────

interface UpProgressProps {
  t: Translations;
  upIndex: number;
}

export function UpProgress({ t, upIndex }: UpProgressProps) {
  const names = [t.upStep1, t.upStep2, t.upStep3];
  return (
    <div className="ob-d-steps">
      {names.map((nm, i) => {
        const n = i + 1;
        const isDone = n < upIndex;
        const state = isDone ? "done" : n === upIndex ? "now" : "off";
        return (
          <span key={i} style={{ display: "contents" }}>
            <div className="ob-d-step" data-state={state}>
              <div className="ob-d-step-dot">
                {isDone ? <SetupIcon name="check" size={15} weight="bold" /> : n}
              </div>
              <div className="ob-d-step-lbl">{nm}</div>
            </div>
            {i < 2 && <div className="ob-d-step-line" data-state={isDone ? "done" : "off"} />}
          </span>
        );
      })}
    </div>
  );
}
