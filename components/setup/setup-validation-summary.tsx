import { SetupIcon } from "./setup-icon";
import type { Translations } from "./translations";
import "./setup-validation-summary.css";

interface SetupValidationSummaryProps {
  t: Translations;
  errorCount: number;
  submitErrorMessage: string | null;
}

export function SetupValidationSummary({
  t,
  errorCount,
  submitErrorMessage,
}: SetupValidationSummaryProps) {
  const fieldMessage = errorCount === 1
    ? t.missingOne
    : t.missingMany.replace("{count}", String(errorCount));
  const message = submitErrorMessage ?? (errorCount > 0 ? fieldMessage : null);

  if (!message) return null;

  return (
    <div className="ob-validation-summary" role="alert">
      <span className="ob-validation-summary-icon">
        <SetupIcon name="alert" size={17} weight="bold" />
      </span>
      <span>{message}</span>
    </div>
  );
}
