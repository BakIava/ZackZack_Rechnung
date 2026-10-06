"use client";

import { useState } from "react";
import { MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui";
import { runServiceLocationIntake } from "@/lib/documents/service-location-intake-actions";
import type { ServiceLocationInput } from "@/types/service-location";
import { ServiceLocationIntro } from "./service-location-intro";
import { ServiceLocationLoading } from "./service-location-loading";
import { ServiceLocationForm } from "./service-location-form";
import "./service-location-modal.css";

interface ServiceLocationModalProps {
  dir: "ltr" | "rtl";
  initialValue: ServiceLocationInput | null;
  saving: boolean;
  error: string | null;
  onApply: (value: ServiceLocationInput) => void;
  onClose: () => void;
}

export function ServiceLocationModal({
  dir, initialValue, saving, error, onApply, onClose,
}: ServiceLocationModalProps) {
  const t = useTranslations("ServiceLocation");
  const [phase, setPhase] = useState<"intro" | "loading" | "form">(initialValue ? "form" : "intro");
  const [notice, setNotice] = useState<"ai-ok" | "ai-fail" | "ai-limit" | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [value, setValue] = useState<ServiceLocationInput>(initialValue ?? {
    name: "", street: "", houseNumber: "", postcode: "", city: "", addressExtra: "", sourceText: "",
  });

  async function fillFromText() {
    if (!value.sourceText.trim()) return;
    setPhase("loading");
    try {
      const result = await runServiceLocationIntake(value.sourceText);
      if (result.status === "extracted") {
        setValue((previous) => ({
          ...previous,
          name: result.location.name ?? previous.name,
          street: result.location.street ?? previous.street,
          houseNumber: result.location.houseNumber ?? previous.houseNumber,
          postcode: result.location.postcode ?? previous.postcode,
          city: result.location.city ?? previous.city,
          addressExtra: result.location.addressExtra ?? previous.addressExtra,
        }));
        setNotice("ai-ok");
      } else if (result.reason === "daily_limit_reached") {
        setDailyLimit(result.dailyLimit);
        setNotice("ai-limit");
      } else {
        setNotice("ai-fail");
      }
    } catch {
      setNotice("ai-fail");
    }
    setPhase("form");
  }

  return (
    <Modal open dir={dir} onClose={onClose} busy={phase === "loading" || saving}
      labelledBy="location-modal-title" size="lg" className="location-modal">
      <div className="location-modal__header">
        <h2 id="location-modal-title"><MapPin size={20} aria-hidden />{t(initialValue ? "edit" : "new")}</h2>
        <button type="button" onClick={onClose} disabled={phase === "loading" || saving} aria-label={t("close")}>
          <X size={20} aria-hidden />
        </button>
      </div>
      {phase === "intro" ? (
        <ServiceLocationIntro value={value.sourceText}
          onChange={(sourceText) => setValue({ ...value, sourceText })}
          onFill={fillFromText} onManual={() => { setNotice(null); setPhase("form"); }} />
      ) : phase === "loading" ? (
        <ServiceLocationLoading />
      ) : (
        <ServiceLocationForm value={value} notice={notice} dailyLimit={dailyLimit}
          saving={saving} error={error}
          onChange={setValue} onApply={onApply} onClose={onClose}
          onRetry={() => { setNotice(null); setPhase("intro"); }} />
      )}
    </Modal>
  );
}
