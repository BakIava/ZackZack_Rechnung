"use client";

// Sprachauswahl — allererster App-Start, vor dem Login.
// Drei Bediensprachen: Deutsch / Türkçe / العربية. Tippen = sofortige Wahl,
// kurze Bestätigung (Häkchen), dann weiter zum Login.
//
// Hinweis: Bediensprache ≠ Dokumentsprache. Dokumente sind IMMER auf Deutsch.
// Dieser Screen liegt bewusst VOR der Locale-Wahl und zeigt alle drei Sprachen
// gleichzeitig in ihrer jeweils eigenen Sprache — die Texte sind daher
// mehrsprachiger Inhalt und kein über i18n austauschbarer UI-Text.

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import "./lang-select.css";

type LangCode = "de" | "tr" | "ar";

interface Tile {
  code: LangCode;
  name: string;
  hint: string;
  dir: "ltr" | "rtl";
}

const TILES: Tile[] = [
  { code: "de", name: "Deutsch", hint: "Rechnungen & Angebote erstellen", dir: "ltr" },
  { code: "tr", name: "Türkçe", hint: "Fatura & teklif oluştur", dir: "ltr" },
  { code: "ar", name: "العربية", hint: "إنشاء فواتير وعروض أسعار", dir: "rtl" },
];

const PROMPT: { dir: "ltr" | "rtl"; tx: string }[] = [
  { dir: "ltr", tx: "Sprache wählen" },
  { dir: "ltr", tx: "Dil seçin" },
  { dir: "rtl", tx: "اختر اللغة" },
];

const NOTE = {
  head: {
    de: "Dokumente immer auf Deutsch",
    tr: "Belgeler her zaman Almanca",
    ar: "المستندات دائماً بالألمانية",
  } as Record<LangCode, string>,
  lines: [
    { code: "de" as LangCode, dir: "ltr" as const, tx: "Rechnungen & Angebote sind immer auf Deutsch" },
    { code: "tr" as LangCode, dir: "ltr" as const, tx: "Belgeler her zaman Almancadır" },
    { code: "ar" as LangCode, dir: "rtl" as const, tx: "المستندات دائمًا باللغة الألمانية" },
  ],
};

interface FlagProps {
  code: LangCode;
}

function Flag({ code }: FlagProps) {
  if (code === "de") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect width="48" height="16" fill="#1A1A1A" />
        <rect y="16" width="48" height="16" fill="#D7141A" />
        <rect y="32" width="48" height="16" fill="#F4C500" />
      </svg>
    );
  }
  if (code === "tr") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect width="48" height="48" fill="#E30A17" />
        <circle cx="20" cy="24" r="10" fill="#fff" />
        <circle cx="23" cy="24" r="8" fill="#E30A17" />
        <polygon
          fill="#fff"
          points="34,19 35.23,22.30 38.76,22.45 36.0,24.65 36.94,28.05 34,26.1 31.06,28.05 32.0,24.65 29.25,22.45 32.77,22.30"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" fill="#1F6B4C" />
    </svg>
  );
}

interface IconProps {
  name: "globe" | "document" | "shieldCheck" | "check" | "chevronRight";
  size?: number;
  bold?: boolean;
}

function Icon({ name, size = 24, bold = false }: IconProps) {
  const sw = bold ? 2.4 : 1.75;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "globe" && (
        <>
          <circle cx="12" cy="12" r="8.2" />
          <path d="M3.8 12h16.4M12 3.8c2.3 2.2 3.4 5.1 3.4 8.2S14.3 18 12 20.2C9.7 18 8.6 15.1 8.6 12S9.7 6 12 3.8z" />
        </>
      )}
      {name === "document" && (
        <>
          <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
          <path d="M14 3.5V8h4" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="16.5" x2="13" y2="16.5" />
        </>
      )}
      {name === "shieldCheck" && (
        <>
          <path d="M12 3.4 19 6v5.6c0 4.4-3 7.4-7 8.9-4-1.5-7-4.5-7-8.9V6z" />
          <polyline points="9 11.8 11.2 14 15.5 9.6" />
        </>
      )}
      {name === "check" && <polyline points="5 12.5 10 17.5 19 7" />}
      {name === "chevronRight" && <polyline points="9 5 16 12 9 19" />}
    </svg>
  );
}

export default function LanguagePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<LangCode | null>(null);

  function pick(code: LangCode) {
    if (selected) return;
    setSelected(code);
    // Bediensprache merken und nach kurzer Bestätigung weiter.
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`;
    // Kam man von einer Seite (?return=/pfad), dorthin in der neuen Sprache
    // zurückkehren — sonst (erster App-Start) weiter zum Login.
    const ret = new URLSearchParams(window.location.search).get("return");
    const isSafe = ret != null && ret.startsWith("/") && !ret.startsWith("//");
    const dest = isSafe ? `/${code}${ret}` : `/${code}/login`;
    setTimeout(() => {
      router.push(dest);
    }, 320);
  }

  const dir = selected === "ar" ? "rtl" : "ltr";
  const noteHeadLang: LangCode = selected ?? "de";
  const noteHeadDir = NOTE.lines.find((l) => l.code === noteHeadLang)?.dir ?? "ltr";

  return (
    <div className="ls-root" dir={dir}>
      <div className="ls-body">
        {/* Markenkopf */}
        <div className="ls-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ls-mark" src="/assets/zackzack-logo.png" alt="ZACK ZACK RECHNUNG" />
          <div className="ls-prompt">
            <span className="ls-globe">
              <Icon name="globe" size={17} />
            </span>
            {PROMPT.map((p, i) => (
              <Fragment key={p.tx}>
                {i > 0 && <i className="ls-dot" />}
                <span className="ls-seg" dir={p.dir}>
                  {p.tx}
                </span>
              </Fragment>
            ))}
          </div>
        </div>

        {/* Kacheln */}
        <div className="ls-tiles" data-haspick={selected ? "1" : "0"}>
          {TILES.map((t) => (
            <button
              key={t.code}
              type="button"
              className="ls-tile"
              data-sel={selected === t.code ? "1" : "0"}
              dir={t.dir}
              onClick={() => pick(t.code)}
            >
              <span className="ls-flag">
                <Flag code={t.code} />
              </span>
              <span className="ls-tile-body">
                <span className="ls-tile-name">{t.name}</span>
                <span className="ls-tile-hint">{t.hint}</span>
              </span>
              <span className="ls-tile-aff">
                <span className="ls-aff-chevron">
                  <Icon name="chevronRight" size={18} />
                </span>
                <span className="ls-aff-check">
                  <Icon name="check" size={18} bold />
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Dokumentsprache-Hinweis */}
        <div className="ls-note">
          <span className="ls-note-ic">
            <Icon name="document" size={20} />
          </span>
          <div className="ls-note-body">
            <div className="ls-note-head" dir={noteHeadDir}>
              {NOTE.head[noteHeadLang]}
            </div>
            <div className="ls-note-lines">
              {NOTE.lines.map((l) => (
                <div key={l.code} className="ls-note-line" dir={l.dir}>
                  <span className={`ls-fd ls-fd--${l.code}`} />
                  <span>{l.tx}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ls-foot">
          <Icon name="shieldCheck" size={14} />
          <span dir={dir}>
            {dir === "rtl"
              ? "يمكن تغيير اللغة لاحقاً في الإعدادات"
              : "Später jederzeit in den Einstellungen änderbar"}
          </span>
        </div>
      </div>
    </div>
  );
}
