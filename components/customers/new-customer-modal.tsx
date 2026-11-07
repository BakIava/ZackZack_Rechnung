"use client";

import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AiIntakeModal } from "@/components/shared/ai-intake/ai-intake-modal";
import { createCustomer, updateCustomer } from "@/lib/customers/actions";
import { CUSTOMER_INTAKE_MAX_LENGTH } from "@/lib/customers/customer-intake";
import { runCustomerIntake } from "@/lib/customers/intake-actions";
import { customerIntakeOutcome, mapIntakeResult } from "@/lib/customers/intake-fields";
import { deriveInitials } from "@/lib/initials";
import type { AiIntakeOutcome } from "@/types/ai-intake";
import type {
  CustomerInput,
  CustomerListItem,
  FlowCustomer,
} from "@/types/customer";
import { CustomerFormFields, type CustomerFormValues } from "./customer-form-fields";

interface NewCustomerModalProps {
  dir: "ltr" | "rtl";
  onClose: () => void;
  /** Wird nach dem Anlegen aufgerufen (Create-Modus). */
  onCreate?: (customer: CustomerListItem) => void;
  /** Vorhandener Kunde → Edit-Modus (Prefill + updateCustomer). */
  editCustomer?: FlowCustomer | null;
  /** Wird nach dem Speichern einer Bearbeitung aufgerufen (Edit-Modus). */
  onSaved?: (customer: CustomerListItem) => void;
}

function initialValues(customer: FlowCustomer | null): CustomerFormValues {
  return {
    customerType: customer?.customer_type ?? "private",
    companyName: customer?.company_name ?? "",
    firstname: customer?.firstname ?? "",
    lastname: customer?.lastname ?? "",
    street: customer?.street ?? "",
    houseNo: customer?.streetNo ?? "",
    zip: customer?.postcode ?? "",
    city: customer?.city ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    note: customer?.notes ?? "",
  };
}

// Bewusst tolerant: nur der Name ist Pflicht. Die Anschrift kann später ergänzt
// werden (Entwurf, Adresse noch nicht bekannt). Fehlt sie bei einer Rechnung
// über 250 €, weist der Pflichtangaben-Check in Schritt 3 darauf hin.
function isComplete(values: CustomerFormValues): boolean {
  if (values.customerType === null) return false;
  if (values.customerType === "business") return values.companyName.trim().length > 0;
  return values.firstname.trim().length > 0 && values.lastname.trim().length > 0;
}

/** „Neuer Kunde" / „Kunde bearbeiten" auf Basis des gemeinsamen KI-Erfassungsdialogs. */
export function NewCustomerModal({
  dir,
  onClose,
  onCreate,
  editCustomer = null,
  onSaved,
}: NewCustomerModalProps) {
  const t = useTranslations("Create");
  const isEdit = editCustomer !== null;
  const [values, setValues] = useState<CustomerFormValues>(() => initialValues(editCustomer));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function extract(text: string): Promise<AiIntakeOutcome> {
    const result = await runCustomerIntake(text);
    const outcome = customerIntakeOutcome(result);
    if (outcome.kind !== "limit") {
      const recognized = mapIntakeResult(result).values;
      setValues((previous) => ({ ...recognized, note: previous.note }));
    }
    return outcome;
  }

  async function submit() {
    const { customerType: type } = values;
    if (!isComplete(values) || saving || type === null) return;
    const trimmedCity = values.city.trim();
    const trimmedStreet = values.street.trim();
    const trimmedHouseNo = values.houseNo.trim();

    const input: CustomerInput = {
      customerType: type,
      firstname: values.firstname.trim() || null,
      lastname: values.lastname.trim() || null,
      companyName: values.companyName.trim() || null,
      street: trimmedStreet || undefined,
      streetNo: trimmedHouseNo || undefined,
      postcode: values.zip.trim() || undefined,
      city: trimmedCity || undefined,
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
      notes: values.note.trim() || undefined,
    };

    setSaving(true);
    setSaveError(null);

    const listItem: CustomerListItem = {
      id: editCustomer?.id ?? "",
      firstname: input.firstname,
      lastname: input.lastname,
      companyName: input.companyName,
      city: trimmedCity || null,
      street: [trimmedStreet, trimmedHouseNo].filter(Boolean).join(" ") || null,
      initials: deriveInitials({
        customerType: type,
        company_name: values.companyName,
        firstname: values.firstname,
        lastname: values.lastname,
      }),
    };

    if (isEdit && editCustomer) {
      const res = await updateCustomer(editCustomer.id, input);
      setSaving(false);
      if (res.error) {
        setSaveError(t("ncError"));
        return;
      }
      onSaved?.(listItem);
      return;
    }

    const res = await createCustomer(input);
    setSaving(false);
    if (res.error || !res.id) {
      setSaveError(t("ncError"));
      return;
    }
    onCreate?.({ ...listItem, id: res.id, isNew: true });
  }

  return (
    <AiIntakeModal
      dir={dir}
      icon={User}
      title={isEdit ? t("editCustomer") : t("ncTitle")}
      subtitle={isEdit ? t("editCustomerSub") : undefined}
      startInForm={isEdit}
      texts={{
        lead: t("ncAiLead"),
        placeholder: t("ncAiPlaceholder"),
        loadingSubtitle: t("ncAiLoadSub"),
        loadingSteps: [t("ncAiStepName"), t("ncAiStepAddress"), t("ncAiStepContact")],
        manualHint: t("ncAiManualBanner"),
      }}
      maxInputLength={CUSTOMER_INTAKE_MAX_LENGTH}
      onExtract={extract}
      canSubmit={isComplete(values)}
      saving={saving}
      error={saveError}
      submitLabel={isEdit ? t("editCustomerSave") : t("ncCreate")}
      savingLabel={t("ncSaving")}
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <CustomerFormFields
        values={values}
        onChange={(patch) => setValues((previous) => ({ ...previous, ...patch }))}
      />
    </AiIntakeModal>
  );
}
