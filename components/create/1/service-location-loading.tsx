"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import "./service-location-loading.css";

export function ServiceLocationLoading() {
  const t = useTranslations("ServiceLocation");
  return (
    <div className="location-loading" role="status" aria-live="polite">
      <span className="location-loading__icon"><Sparkles size={28} aria-hidden /></span>
      <p>{t("aiLoading")}</p>
    </div>
  );
}
