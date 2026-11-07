"use client";

import { Sparkles } from "lucide-react";
import { useId } from "react";
import "./ai-intake-input.css";

interface AiIntakeInputProps {
  lead: string;
  placeholder: string;
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
}

/** Phase ① des KI-Erfassungsdialogs: Freitext, aus dem die KI die Felder erkennt. */
export function AiIntakeInput({ lead, placeholder, value, maxLength, onChange }: AiIntakeInputProps) {
  const id = useId();
  return (
    <div className="ai-intake-input">
      <span className="ai-intake-input-hero">
        <Sparkles size={26} strokeWidth={2.4} aria-hidden />
      </span>
      <label htmlFor={id} className="ai-intake-input-lead">{lead}</label>
      <textarea
        id={id}
        className="ai-intake-input-text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        maxLength={maxLength}
        autoFocus
        dir="auto"
      />
    </div>
  );
}
