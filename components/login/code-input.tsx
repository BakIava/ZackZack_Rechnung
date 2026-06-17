"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

interface CodeInputProps {
  value: string[];
  error: boolean;
  onChange: (next: string[]) => void;
  onComplete?: (joined: string) => void;
}

/**
 * 6-stellige Code-Eingabe — bewusst generisch gehalten, damit dasselbe Feld
 * später unverändert für SMS-Codes dient. Richtung bleibt immer LTR (Ziffern).
 */
export function CodeInput({ value, error, onChange, onComplete }: CodeInputProps) {
  const t = useTranslations("Login");
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const set = (i: number, v: string) => {
    const next = value.slice();
    next[i] = v;
    onChange(next);
    return next;
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      set(i, "");
      return;
    }
    const digit = raw[raw.length - 1];
    const next = set(i, digit);
    if (i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) onComplete?.(next.join(""));
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      e.preventDefault();
      set(i - 1, "");
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const digits = (e.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, 6)
      .split("");
    if (!digits.length) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    digits.forEach((d, k) => (next[k] = d));
    onChange(next);
    refs.current[Math.min(digits.length, 5)]?.focus();
    if (digits.length === 6) onComplete?.(next.join(""));
  };

  return (
    <div
      className={"lg-otp" + (error ? " is-error shake" : "")}
      onPaste={handlePaste}
      onAnimationEnd={(e) => e.currentTarget.classList.remove("shake")}
    >
      {value.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="lg-cell"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          data-filled={d ? "1" : "0"}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={t("digitAria", { n: i + 1 })}
        />
      ))}
    </div>
  );
}
