import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./loading-button.css";

export type LoadingButtonState = "idle" | "pending" | "success";
export type LoadingButtonVariant = "primary" | "accent" | "ghost";

interface LoadingButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Farb-/Flächenvariante im Marken-Look. */
  variant?: LoadingButtonVariant;
  /** Aktueller Ablaufzustand; steuert Inhalt, Farbe und Klickbarkeit. */
  state?: LoadingButtonState;
  /** Beschriftung im Ruhezustand (kann ein Icon o. Ä. enthalten). */
  children: ReactNode;
  /** Beschriftung, während die Aktion läuft (neben dem Spinner). */
  pendingLabel: ReactNode;
  /** Beschriftung nach Erfolg (neben dem Häkchen). */
  successLabel: ReactNode;
}

/**
 * Button mit eingebautem Ablauf **Bereit → Lädt → Erledigt**. Der Zustand wird
 * von außen gesteuert (`state`), sodass die aufrufende Aktion den Fortschritt
 * bestimmt. Während `pending`/`success` ignoriert der Button Klicks und meldet
 * sich per `aria-busy`. Der Erfolgs-Inhalt wird bei jedem Wechsel frisch
 * montiert, wodurch die Häkchen-Zeichenanimation erneut anläuft.
 *
 * RTL-fest (nur logische Properties). Tokens (--primary, --ok …) stammen aus
 * den zz-*-Scopes der App-Screens und greifen per Vererbung.
 */
export function LoadingButton({
  variant = "primary",
  state = "idle",
  children,
  pendingLabel,
  successLabel,
  className,
  disabled,
  onClick,
  ...props
}: LoadingButtonProps) {
  const busy = state !== "idle";

  return (
    <button
      type="button"
      className={`zz-lbtn zz-lbtn--${variant}${className ? ` ${className}` : ""}`}
      data-state={state}
      aria-busy={state === "pending"}
      aria-disabled={busy || disabled ? true : undefined}
      disabled={disabled}
      onClick={busy ? undefined : onClick}
      {...props}
    >
      {state === "idle" && <span className="zz-lbtn-c">{children}</span>}

      {state === "pending" && (
        <span className="zz-lbtn-c">
          <span className="zz-lbtn-spin" aria-hidden />
          {pendingLabel}
        </span>
      )}

      {state === "success" && (
        <span className="zz-lbtn-c">
          <span className="zz-lbtn-check" aria-hidden>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="zz-lbtn-check-path" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {successLabel}
        </span>
      )}
    </button>
  );
}
