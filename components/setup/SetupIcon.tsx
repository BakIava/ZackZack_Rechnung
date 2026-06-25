"use client";

interface SetupIconProps {
  name: string;
  size?: number;
  weight?: "line" | "bold";
  color?: string;
  className?: string;
}

const PATHS: Record<string, React.ReactNode> = {
  plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  check: <polyline points="5 12.5 10 17.5 19 7" />,
  chevronLeft: <polyline points="15 5 8 12 15 19" />,
  chevronRight: <polyline points="9 5 16 12 9 19" />,
  arrowRight: <><line x1="4" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" /></>,
  x: <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>,
  alert: <><path d="M12 4.3 21 19.5H3z" /><line x1="12" y1="10" x2="12" y2="14" /><line x1="12" y1="16.7" x2="12.01" y2="16.7" /></>,
  info: <><circle cx="12" cy="12" r="8.4" /><line x1="12" y1="11" x2="12" y2="16.2" /><line x1="12" y1="7.9" x2="12.01" y2="7.9" /></>,
  building: <><path d="M5 20.5V5.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15" /><path d="M15 10h3.5a1 1 0 0 1 1 1v9.5" /><line x1="3.5" y1="20.5" x2="20.5" y2="20.5" /><line x1="8" y1="8" x2="11.5" y2="8" /><line x1="8" y1="12" x2="11.5" y2="12" /></>,
  idcard: <><rect x="3" y="5.5" width="18" height="13" rx="2.2" /><circle cx="8.3" cy="11" r="2" /><path d="M5.3 16c.3-1.5 1.6-2.4 3-2.4s2.7.9 3 2.4" /><line x1="14.2" y1="10" x2="18" y2="10" /><line x1="14.2" y1="13.5" x2="17" y2="13.5" /></>,
  bank: <><path d="M4 9.5 12 4l8 5.5" /><line x1="4" y1="20" x2="20" y2="20" /><line x1="6" y1="11" x2="6" y2="18" /><line x1="10" y1="11" x2="10" y2="18" /><line x1="14" y1="11" x2="14" y2="18" /><line x1="18" y1="11" x2="18" y2="18" /></>,
  brush: <><path d="M14.5 3.5 20.5 9.5 11 19a3 3 0 0 1-4.2 0l-1.8-1.8a3 3 0 0 1 0-4.2z" /><path d="M5 17.5 3 21l3.5-2" /><line x1="12.5" y1="5.5" x2="18.5" y2="11.5" /></>,
  shieldCheck: <><path d="M12 3.4 19 6v5.6c0 4.4-3 7.4-7 8.9-4-1.5-7-4.5-7-8.9V6z" /><polyline points="9 11.8 11.2 14 15.5 9.6" /></>,
  camera: <><path d="M3 8.6A1.6 1.6 0 0 1 4.6 7H7l1.2-2.2h7.6L17 7h2.4A1.6 1.6 0 0 1 21 8.6v8.8A1.6 1.6 0 0 1 19.4 19H4.6A1.6 1.6 0 0 1 3 17.4z" /><circle cx="12" cy="13" r="3.4" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.2" /><circle cx="8.6" cy="9.6" r="1.8" /><path d="M4.5 18l5-4.6 3 2.7 3.4-3.1 4 3.6" /></>,
  file: <><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" /><path d="M14 3.5V8h4" /></>,
  scan: <><path d="M4 8V6a2 2 0 0 1 2-2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M20 16v2a2 2 0 0 1-2 2h-2" /><path d="M8 20H6a2 2 0 0 1-2-2v-2" /><line x1="4" y1="12" x2="20" y2="12" /></>,
  pencil: <><path d="M14 5.5 18.5 10" /><path d="M4 20l1.2-4.2L15 6a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3L8.2 18.8 4 20z" /></>,
  trash: <><line x1="4.5" y1="6.8" x2="19.5" y2="6.8" /><path d="M9 6.8V5.4a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 17 5.4v1.4" transform="translate(-2 0)" /><path d="M6.5 6.8 7.6 19.6a1.6 1.6 0 0 0 1.6 1.4h5.6a1.6 1.6 0 0 0 1.6-1.4L17.5 6.8" /><line x1="10.3" y1="10.5" x2="10.6" y2="17" /><line x1="13.7" y1="10.5" x2="13.4" y2="17" /></>,
  lock: <><rect x="5" y="11" width="14" height="9.5" rx="2.2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  sparkle: <><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" /></>,
};

export function SetupIcon({ name, size = 24, weight = "line", color = "currentColor", className }: SetupIconProps) {
  const sw = weight === "bold" ? 2.4 : 1.8;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
