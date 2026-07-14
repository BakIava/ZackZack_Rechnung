"use client";

import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react";
import "./modal.css";

export type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  /** Steuert Sichtbarkeit. Bei `false` wird nichts gerendert. */
  open: boolean;
  /** Wird bei Escape oder Klick auf den Backdrop aufgerufen. */
  onClose: () => void;
  /** Leserichtung der Bedienoberfläche. */
  dir: "ltr" | "rtl";
  /** Barrierefreier Name, wenn keine sichtbare Überschrift referenziert wird. */
  ariaLabel?: string;
  /** id einer sichtbaren Überschrift (bevorzugt gegenüber `ariaLabel`). */
  labelledBy?: string;
  /** Breiten-Preset der Karte. */
  size?: ModalSize;
  /** Blockiert Escape + Backdrop-Klick (z. B. während eine Aktion läuft). */
  busy?: boolean;
  /** Klick auf den Backdrop schließt das Modal (Default: true). */
  closeOnBackdrop?: boolean;
  /** Element, das beim Öffnen fokussiert wird (sonst: erstes fokussierbares). */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Zusätzliche Klasse auf der Karte. */
  className?: string;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusableIn(card: HTMLElement): HTMLElement[] {
  return Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
}

/**
 * Wiederverwendbare Modal-Hülle: Backdrop, zentrierte Karte, Ein-/Ausblend-
 * Animation, Escape-/Backdrop-Schließen, Fokus-Falle + Fokus-Rückgabe an das
 * auslösende Element. `role="dialog"` + `aria-modal`. RTL über `dir`.
 *
 * Bewusst ohne Portal in den DOM eingehängt, damit die auf den zz-*-Scopes
 * definierten Design-Tokens (--bg, --line …) per Vererbung greifen. Inhalt
 * (Kopf/Body/Footer) liefert die aufrufende Komponente.
 */
export function Modal({
  open,
  onClose,
  dir,
  ariaLabel,
  labelledBy,
  size = "md",
  busy = false,
  closeOnBackdrop = true,
  initialFocus,
  className,
  children,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const requestClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  // Escape schließt; Tab bleibt in der Karte gefangen.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const items = focusableIn(card);
      if (items.length === 0) {
        e.preventDefault();
        card.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !card.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !card.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, requestClose]);

  // Fokus beim Öffnen setzen, beim Schließen an den Auslöser zurückgeben.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;
      // Ein `autoFocus` im Inhalt hat bereits gegriffen → nicht überschreiben.
      if (card.contains(document.activeElement)) return;
      const target = initialFocus?.current ?? focusableIn(card)[0] ?? card;
      target.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      previous?.focus?.();
    };
  }, [open, initialFocus]);

  if (!open) return null;

  return (
    <div className="zz-modal-wrap" dir={dir}>
      <div
        className="zz-modal-bd"
        aria-hidden="true"
        data-static={closeOnBackdrop ? undefined : ""}
        onClick={closeOnBackdrop ? requestClose : undefined}
      />
      <div
        ref={cardRef}
        className={`zz-modal zz-modal--${size}${className ? ` ${className}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
