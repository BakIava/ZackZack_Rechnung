import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import "./skeleton.css";

interface SkeletonProps {
  /** Breite als CSS-Länge (z. B. "58%" oder "72px"). */
  width?: string;
  /** Höhe als CSS-Länge. */
  height?: string;
  /** Eckenradius als CSS-Länge (Default 6px). */
  radius?: string;
  /** Zusätzliche Klasse, z. B. für feste Maße eines Avatar-Platzhalters. */
  className?: string;
}

/**
 * Einzelner Shimmer-Platzhalter. Über das `style`-Attribut werden
 * ausschließlich Daten-Werte als CSS-Variablen gereicht (wie bei StepHeader);
 * die Darstellung lebt in der CSS-Datei.
 */
export function Skeleton({ width, height, radius, className }: SkeletonProps) {
  const style = {
    ...(width ? { "--sk-w": width } : {}),
    ...(height ? { "--sk-h": height } : {}),
    ...(radius ? { "--sk-r": radius } : {}),
  } as CSSProperties;

  return (
    <span
      className={`zz-sk${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden
    />
  );
}

/**
 * Platzhalter-Zeile in denselben Maßen wie eine echte Dokument-/Kundenkarte
 * (Avatar + zwei Textzeilen + Betrag/Chip), damit beim Laden nichts springt.
 */
export function SkeletonCard() {
  return (
    <div className="zz-sk-row">
      <Skeleton className="zz-sk-av" />
      <div className="zz-sk-tx">
        <Skeleton height="13px" width="58%" />
        <Skeleton height="11px" width="38%" />
      </div>
      <div className="zz-sk-end">
        <Skeleton height="13px" width="72px" />
        <Skeleton height="18px" width="60px" radius="999px" />
      </div>
    </div>
  );
}

interface SkeletonListProps {
  /** Anzahl der Platzhalter-Zeilen (Default 3). */
  count?: number;
  /** Überschrift der Karte; Default „Lädt …" aus i18n. */
  caption?: ReactNode;
  className?: string;
}

/**
 * Liste aus {@link SkeletonCard}-Zeilen mit Karten-Rahmen und Überschrift.
 * `role="status"` + `aria-busy` melden Screenreadern den Ladevorgang.
 */
export function SkeletonList({ count = 3, caption, className }: SkeletonListProps) {
  const t = useTranslations("Loading");
  const rows = Array.from({ length: Math.max(count, 0) });

  return (
    <div
      className={`zz-sk-panel${className ? ` ${className}` : ""}`}
      role="status"
      aria-busy="true"
      aria-label={t("loadingLabel")}
    >
      <div className="zz-sk-cap">{caption ?? t("loadingLabel")}</div>
      {rows.map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
