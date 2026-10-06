"use client";

import { ChevronLeft, ChevronRight, FileText, ReceiptText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, useRouterWithoutTransition } from "@/i18n/navigation";
import { getCustomerForEdit } from "@/lib/customers/actions";
import type { CustomerListItem, FlowCustomer } from "@/types/customer";
import {
  deleteDraftIfEmpty,
  updateDraftCustomer,
  updateDraftDocumentType,
  updateDraftServiceLocation,
  updateDraftValidUntil,
} from "@/lib/documents/draft-actions";
import { NewCustomerModal } from "@/components/customers/new-customer-modal";
import { FlowSteps } from "../flow-steps";
import type { DocType } from "@/types/document";
import type { ServiceLocationInput } from "@/types/service-location";
import { addOneCalendarMonth } from "@/lib/documents/document-dates";
import { QuoteValidityField } from "./quote-validity-field";
import { ServiceTimingField } from "./service-timing-field";
import { CustomerPicker } from "./customer-picker";
import { CustomerStepFooter } from "./customer-step-footer";
import { ServiceLocationField } from "./service-location-field";
import { ServiceLocationModal } from "./service-location-modal";
import "./kunde-step.css";

interface KundeStepProps {
  dir: "ltr" | "rtl";
  customers: CustomerListItem[];
  documentId: string;
  initialCustomerId?: string | null;
  initialDocType?: DocType;
  issueDate: string;
  initialValidUntil: string | null;
  initialServiceDate: string | null;
  initialServicePeriodStart: string | null;
  initialServicePeriodEnd: string | null;
  initialServiceLocation: ServiceLocationInput | null;
  documentTypeLocked: boolean;
}

const STROKE = 1.75;

export function KundeStep({
  dir,
  customers,
  documentId,
  initialCustomerId = null,
  initialDocType = "invoice",
  issueDate,
  initialValidUntil,
  initialServiceDate,
  initialServicePeriodStart,
  initialServicePeriodEnd,
  initialServiceLocation,
  documentTypeLocked,
}: KundeStepProps) {
  const t = useTranslations("Create");
  const router = useRouter();
  const stepRouter = useRouterWithoutTransition();
  const searchParams = useSearchParams();
  // Hinweis anzeigen, wenn der Nutzer aus Schritt 3 („Beim Kunden ergänzen")
  // kommt – damit er den „Kunde bearbeiten"-Button unten findet.
  const [showFixHint, setShowFixHint] = useState(
    () => searchParams.get("fix") === "customer",
  );
  const [docType, setDocType] = useState<DocType>(initialDocType);
  const [validUntil, setValidUntil] = useState(
    initialValidUntil ?? (issueDate ? addOneCalendarMonth(issueDate) : ""),
  );
  const [validitySaving, setValiditySaving] = useState(false);
  const [validityError, setValidityError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(initialCustomerId);
  const [created, setCreated] = useState<CustomerListItem[]>([]);
  // Lokale Überschreibungen bearbeiteter Kunden (id → aktualisierte Listendaten),
  // damit die Liste die Änderung sofort zeigt, ohne die Server-Daten neu zu laden.
  const [edits, setEdits] = useState<Record<string, CustomerListItem>>({});
  const [showNew, setShowNew] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [location, setLocation] = useState<ServiceLocationInput | null>(initialServiceLocation);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FlowCustomer | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const modalOpen = showNew || editing !== null || showLocation;
  const BackChevron = dir === "rtl" ? ChevronRight : ChevronLeft;

  const allCustomers: CustomerListItem[] = [...created, ...customers].map(
    (c) => edits[c.id] ?? c,
  );
  const needle = query.trim().toLowerCase();
  const filtered = allCustomers.filter(
    (c) =>
      c.firstname?.toLowerCase().includes(needle) ||
      c.lastname?.toLowerCase().includes(needle) ||
      c.companyName?.toLowerCase().includes(needle) ||
      (c.city ?? "").toLowerCase().includes(needle),
  );
  const selectedCustomer = allCustomers.find((c) => c.id === selected) ?? null;
  const docLabel = docType === "invoice" ? t("invoice") : t("quote");
  function handleCreated(customer: CustomerListItem) {
    setCreated((prev) => [customer, ...prev]);
    setSelected(customer.id);
    setQuery("");
    setShowNew(false);
  }

  async function handleEditClick(id: string) {
    if (editLoadingId) return;
    setShowFixHint(false);
    setEditLoadingId(id);
    const full = await getCustomerForEdit(id);
    setEditLoadingId(null);
    if (full) setEditing(full);
  }

  function handleEdited(customer: CustomerListItem) {
    setEdits((prev) => ({ ...prev, [customer.id]: customer }));
    setEditing(null);
    // Ist der bearbeitete Kunde der gewählte, den eingefrorenen Snapshot direkt
    // aktualisieren (fire-and-forget), damit die Vorschau die neue Anschrift zeigt.
    if (selected === customer.id)
      void updateDraftCustomer(documentId, customer.id);
  }

  async function handleDocType(next: DocType) {
    if (documentTypeLocked) return;
    setDocType(next);
    // Dokumenttyp direkt in den Draft schreiben; beim Angebot werden
    // rechnungsspezifische Leistungsangaben serverseitig entfernt.
    await updateDraftDocumentType(documentId, next);
    router.refresh();
  }

  async function handleValidUntil(next: string) {
    setValidUntil(next);
    setValidityError(null);
    if (!next) {
      setValidityError(t("validUntilRequired"));
      return;
    }
    setValiditySaving(true);
    const result = await updateDraftValidUntil(documentId, next);
    setValiditySaving(false);
    if (result.error) setValidityError(t("validUntilInvalid"));
  }

  async function handleWeiter() {
    if (saving || locationSaving) return;
    // Schritt 1 ist überspringbar: ohne Kundenwahl direkt zu den Positionen.
    // Ein Kunde ist erst ab > 250 € Pflicht (geprüft in Schritt 3).
    if (!selected) {
      stepRouter.push(`/create/${documentId}/2`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const res = await updateDraftCustomer(documentId, selected);
    if (res.error) {
      setSaving(false);
      setSaveError(t("draftError"));
      return;
    }
    stepRouter.push(`/create/${documentId}/2`);
  }

  async function handleLocationApply(next: ServiceLocationInput) {
    if (locationSaving) return;
    setLocationSaving(true);
    setLocationError(null);
    try {
      const result = await updateDraftServiceLocation(documentId, next);
      if (result.error) {
        setLocationError(t("draftError"));
        return;
      }
      setLocation(next);
      setShowLocation(false);
    } catch {
      setLocationError(t("draftError"));
    } finally {
      setLocationSaving(false);
    }
  }

  async function handleLocationRemove() {
    if (locationSaving) return;
    setLocationSaving(true);
    setLocationError(null);
    try {
      const result = await updateDraftServiceLocation(documentId, null);
      if (result.error) {
        setLocationError(t("draftError"));
        return;
      }
      setLocation(null);
    } catch {
      setLocationError(t("draftError"));
    } finally {
      setLocationSaving(false);
    }
  }

  function handleBack() {
    // Nur leere Drafts löschen (fire-and-forget — kein Ladeindikator nötig).
    void deleteDraftIfEmpty(documentId);
    router.push("/documents");
  }

  return (
    <main className="dmain">
      <div className="dscroll" inert={modalOpen}>
        <div className="dflow-head">
          <button
            type="button"
            className="dflow-back"
            aria-label={t("back")}
            onClick={handleBack}
          >
            <BackChevron size={20} strokeWidth={STROKE} aria-hidden />
          </button>
          <div>
            <div className="dflow-title">
              {t("createTitle", { type: docLabel })}
            </div>
            <div className="dflow-sub">{t("chooseCustomerAndLocation")}</div>
          </div>
          <FlowSteps current={1} />
        </div>

        <div className="dflow-bar">
          <div className="dseg2" role="group" aria-label={t("docType")}>
            <button
              type="button"
              className="seg--gold"
              data-on={docType === "invoice" ? "1" : "0"}
              aria-pressed={docType === "invoice"}
              disabled={documentTypeLocked}
              onClick={() => void handleDocType("invoice")}
            >
              <ReceiptText size={20} strokeWidth={STROKE} aria-hidden />
              {t("invoice")}
            </button>
            <button
              type="button"
              className="seg--gold"
              data-on={docType === "quote" ? "1" : "0"}
              aria-pressed={docType === "quote"}
              disabled={documentTypeLocked}
              onClick={() => void handleDocType("quote")}
            >
              <FileText size={20} strokeWidth={STROKE} aria-hidden />
              {t("quote")}
            </button>
          </div>
        </div>

        {docType === "quote" && (
          <QuoteValidityField
            label={t("validUntil")}
            hint={documentTypeLocked ? t("documentTypeLocked") : t("validUntilHint")}
            errorText={validityError}
            issueDate={issueDate}
            value={validUntil}
            saving={validitySaving}
            onChange={handleValidUntil}
          />
        )}

        {docType === "invoice" && (
          <ServiceTimingField
            key={`${documentId}-${docType}`}
            documentId={documentId}
            initialServiceDate={initialServiceDate}
            initialPeriodStart={initialServicePeriodStart}
            initialPeriodEnd={initialServicePeriodEnd}
          />
        )}

        <CustomerPicker dir={dir} query={query} filtered={filtered} selected={selected}
          onQueryChange={setQuery} onSelect={setSelected} onNew={() => setShowNew(true)} />
        <ServiceLocationField location={location} onEdit={() => setShowLocation(true)}
          onRemove={() => void handleLocationRemove()} />
        {locationError && !showLocation && (
          <p className="dflow-location-error" role="alert">{locationError}</p>
        )}
      </div>

      {showLocation && (
        <ServiceLocationModal dir={dir} initialValue={location} saving={locationSaving}
          error={locationError} onClose={() => setShowLocation(false)}
          onApply={(next) => void handleLocationApply(next)} />
      )}

      {showNew && (
        <NewCustomerModal
          dir={dir}
          onClose={() => setShowNew(false)}
          onCreate={handleCreated}
        />
      )}

      {editing && (
        <NewCustomerModal
          dir={dir}
          editCustomer={editing}
          onClose={() => setEditing(null)}
          onSaved={handleEdited}
        />
      )}

      {showFixHint && !modalOpen && (
        <div className="dflow-hint" role="status">
          <span className="dflow-hint-txt">
            {selectedCustomer
              ? t("fixCustomerHintEdit")
              : t("fixCustomerHintSelect")}
          </span>
          <button
            type="button"
            className="dflow-hint-x"
            aria-label={t("ncClose")}
            onClick={() => setShowFixHint(false)}
          >
            <X size={16} strokeWidth={STROKE} aria-hidden />
          </button>
        </div>
      )}

      <CustomerStepFooter dir={dir} inert={modalOpen} selectedCustomer={selectedCustomer}
        saveError={saveError} saving={saving || locationSaving} editLoadingId={editLoadingId}
        showFixHint={showFixHint} onEdit={handleEditClick} onNext={handleWeiter} />
    </main>
  );
}
