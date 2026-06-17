"use client";

import { useRouter } from "next/navigation";

const LOCALES = [
  { code: "de", label: "Deutsch" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
];

export default function LanguagePage() {
  const router = useRouter();

  function selectLocale(code: string) {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`;
    router.push(`/${code}/login`);
  }

  return (
    <div>
      <h1>Sprache wählen</h1>
      {LOCALES.map((l) => (
        <button key={l.code} type="button" onClick={() => selectLocale(l.code)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
