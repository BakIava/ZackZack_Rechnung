import { Building2, User } from "lucide-react";
import type { CustomerType } from "@/types/database";
import "./customer-type-selector.css";

const STROKE = 1.75;

interface CustomerTypeSelectorProps {
  value: CustomerType | null;
  privateLabel: string;
  businessLabel: string;
  ariaLabel: string;
  onChange: (value: CustomerType) => void;
}

export function CustomerTypeSelector({
  value,
  privateLabel,
  businessLabel,
  ariaLabel,
  onChange,
}: CustomerTypeSelectorProps) {
  return (
    <div
      className="customer-type-selector"
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        data-on={value === "private" ? "1" : "0"}
        aria-pressed={value === "private"}
        onClick={() => onChange("private")}
      >
        <User size={18} strokeWidth={STROKE} aria-hidden />
        {privateLabel}
      </button>
      <button
        type="button"
        data-on={value === "business" ? "1" : "0"}
        aria-pressed={value === "business"}
        onClick={() => onChange("business")}
      >
        <Building2 size={18} strokeWidth={STROKE} aria-hidden />
        {businessLabel}
      </button>
    </div>
  );
}
