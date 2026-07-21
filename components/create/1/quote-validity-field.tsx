import { CalendarDays, Loader2 } from "lucide-react";
import "./quote-validity-field.css";

interface QuoteValidityFieldProps {
  label: string;
  hint: string;
  errorText: string | null;
  issueDate: string;
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
}

export function QuoteValidityField({
  label,
  hint,
  errorText,
  issueDate,
  value,
  saving,
  onChange,
}: QuoteValidityFieldProps) {
  return (
    <div className="quote-validity">
      <span className="quote-validity-icon">
        <CalendarDays size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <label className="quote-validity-body">
        <span className="quote-validity-label">{label}</span>
        <span className="quote-validity-hint">{errorText ?? hint}</span>
      </label>
      <span className="quote-validity-control">
        <input
          type="date"
          value={value}
          min={issueDate}
          aria-label={label}
          aria-invalid={Boolean(errorText)}
          onChange={(event) => onChange(event.target.value)}
        />
        {saving && <Loader2 size={16} className="quote-validity-spinner" aria-hidden />}
      </span>
    </div>
  );
}
