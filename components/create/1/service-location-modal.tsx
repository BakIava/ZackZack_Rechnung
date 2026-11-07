"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { AiIntakeModal } from "@/components/shared/ai-intake/ai-intake-modal";
import {
  SERVICE_LOCATION_MAX_INPUT_LENGTH,
  serviceLocationIntakeOutcome,
} from "@/lib/documents/service-location-intake";
import { runServiceLocationIntake } from "@/lib/documents/service-location-intake-actions";
import type { AiIntakeOutcome } from "@/types/ai-intake";
import type { ServiceLocationInput } from "@/types/service-location";
import { ServiceLocationFields } from "./service-location-fields";

interface ServiceLocationModalProps {
  dir: "ltr" | "rtl";
  initialValue: ServiceLocationInput | null;
  saving: boolean;
  error: string | null;
  onApply: (value: ServiceLocationInput) => void;
  onClose: () => void;
}

const EMPTY_LOCATION: ServiceLocationInput = {
  name: "", street: "", houseNumber: "", postcode: "", city: "", addressExtra: "", sourceText: "",
};

/** „Neuer Einsatzort" / „Einsatzort bearbeiten" auf Basis des gemeinsamen KI-Erfassungsdialogs. */
export function ServiceLocationModal({
  dir, initialValue, saving, error, onApply, onClose,
}: ServiceLocationModalProps) {
  const t = useTranslations("ServiceLocation");
  const [value, setValue] = useState<ServiceLocationInput>(initialValue ?? EMPTY_LOCATION);
  // Eine Bezeichnung oder Adresse genügt.
  const canApply = Boolean(value.name.trim() || value.street.trim() || value.city.trim());

  async function extract(text: string): Promise<AiIntakeOutcome> {
    const result = await runServiceLocationIntake(text);
    setValue((previous) => {
      if (result.status !== "extracted") return { ...previous, sourceText: text };
      const found = result.location;
      return {
        name: found.name ?? previous.name,
        street: found.street ?? previous.street,
        houseNumber: found.houseNumber ?? previous.houseNumber,
        postcode: found.postcode ?? previous.postcode,
        city: found.city ?? previous.city,
        addressExtra: found.addressExtra ?? previous.addressExtra,
        sourceText: text,
      };
    });
    return serviceLocationIntakeOutcome(result);
  }

  function apply() {
    onApply({
      name: value.name.trim(),
      street: value.street.trim(),
      houseNumber: value.houseNumber.trim(),
      postcode: value.postcode.trim(),
      city: value.city.trim(),
      addressExtra: value.addressExtra.trim(),
      sourceText: value.sourceText.trim(),
    });
  }

  return (
    <AiIntakeModal
      dir={dir}
      icon={MapPin}
      title={t(initialValue ? "edit" : "new")}
      startInForm={initialValue !== null}
      texts={{
        lead: t("intro"),
        placeholder: t("introPlaceholder"),
        loadingSubtitle: t("loadingSub"),
        loadingSteps: [t("stepName"), t("stepAddress")],
        manualHint: t("manualHint"),
      }}
      maxInputLength={SERVICE_LOCATION_MAX_INPUT_LENGTH}
      onExtract={extract}
      canSubmit={canApply}
      saving={saving}
      error={error}
      submitLabel={t("apply")}
      onSubmit={apply}
      onClose={onClose}
    >
      <ServiceLocationFields value={value} onChange={setValue} />
    </AiIntakeModal>
  );
}
