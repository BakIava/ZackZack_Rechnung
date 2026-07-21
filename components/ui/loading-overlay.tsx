import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import "./loading-overlay.css";

interface LoadingOverlayProps {
  /** Sichtbarkeit; steuert Ein-/Ausblend-Animation. */
  open: boolean;
  /** Text unter dem Ring; Default „Einen Moment …" aus i18n. */
  label?: ReactNode;
  /** Zusätzliche Klasse auf der Overlay-Wurzel. */
  className?: string;
}

/**
 * Kurzes Lade-Overlay für Screenwechsel: abgedunkelter, unscharfer Hintergrund
 * mit der Marke im drehenden Ring. Deckt den nächsten positionierten Vorfahren
 * ab (`position: absolute; inset: 0`) — die aufrufende Fläche muss also
 * `position: relative` sein. Für ein Vollbild-Overlay eine Klasse mit
 * `position: fixed` über `className` ergänzen.
 *
 * Tokens (--bg, --primary, --surface …) stammen aus den zz-*-Scopes.
 */
export function LoadingOverlay({ open, label, className }: LoadingOverlayProps) {
  const t = useTranslations("Loading");

  return (
    <div
      className={`zz-ov${className ? ` ${className}` : ""}`}
      data-show={open ? "1" : "0"}
      role="status"
      aria-live="polite"
      aria-hidden={!open}
    >
      <div className="zz-ov-box">
        <div className="zz-ov-ring">
          <span className="zz-ov-spin" aria-hidden />
          {/* Konsistent mit den Login-Screens: Marken-Asset über next/image;
              die Anzeige-Maße (34×34) setzt die CSS-Klasse. */}
          <Image
            className="zz-ov-mark"
            src="/assets/zackzack-mark.png"
            alt=""
            width={548}
            height={412}
          />
        </div>
        <div className="zz-ov-tx">{label ?? t("overlayLabel")}</div>
      </div>
    </div>
  );
}
