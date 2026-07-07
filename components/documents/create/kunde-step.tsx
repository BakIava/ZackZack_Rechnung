"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { getCustomerForEdit } from "@/lib/customers/actions";
import type { CustomerListItem, FlowCustomer } from "@/types/customer";
import {
  deleteDraftIfEmpty,
  updateDraftCustomer,
  updateDraftDocumentType,
} from "@/lib/documents/draft-actions";
import { NewCustomerModal } from "@/components/customers/new-customer-modal";
import { FlowSteps } from "./flow-steps";
import "./kunde-step.css";
import type { DocType } from "@/types/document";

interface KundeStepProps {
  dir: "ltr" | "rtl";
  customers: CustomerListItem[];
  documentId: string;
  initialCustomerId?: string | null;
  initialDocType?: DocType;
}

const STROKE = 1.75;
const STROKE_BOLD = 2.4;

export function KundeStep({
  dir,
  customers,
  documentId,
  initialCustomerId = null,
  initialDocType = "invoice",
}: KundeStepProps) {
  const t = useTranslations("Create");
  const router = useRouter();
  const searchParams = useSearchParams();
  // Hinweis anzeigen, wenn der Nutzer aus Schritt 3 („Beim Kunden ergänzen")
  // kommt – damit er den „Kunde bearbeiten"-Button unten findet.
  const [showFixHint, setShowFixHint] = useState(
    () => searchParams.get("fix") === "customer",
  );
  const [docType, setDocType] = useState<DocType>(initialDocType);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(initialCustomerId);
  const [created, setCreated] = useState<CustomerListItem[]>([]);
  // Lokale Überschreibungen bearbeiteter Kunden (id → aktualisierte Listendaten),
  // damit die Liste die Änderung sofort zeigt, ohne die Server-Daten neu zu laden.
  const [edits, setEdits] = useState<Record<string, CustomerListItem>>({});
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<FlowCustomer | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const BackChevron = dir === "rtl" ? ChevronRight : ChevronLeft;

  const allCustomers: CustomerListItem[] = [...created, ...customers].map(
    (c) => edits[c.id] ?? c,
  );
  const needle = query.trim().toLowerCase();
  const filtered = allCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(needle) ||
      (c.city ?? "").toLowerCase().includes(needle),
  );
  const selectedCustomer = allCustomers.find((c) => c.id === selected) ?? null;
  const docLabel = docType === "invoice" ? t("invoice") : t("offer");

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
    if (selected === customer.id) void updateDraftCustomer(documentId, customer.id);
  }

  function handleDocType(next: DocType) {
    setDocType(next);
    // Dokumenttyp direkt in den Draft schreiben (optimistisch, fire-and-forget).
    void updateDraftDocumentType(documentId, next);
  }

  async function handleWeiter() {
    if (saving) return;
    // Schritt 1 ist überspringbar: ohne Kundenwahl direkt zu den Positionen.
    // Ein Kunde ist erst ab > 250 € Pflicht (geprüft in Schritt 3).
    if (!selected) {
      router.push(`/create/${documentId}/2`);
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
    router.push(`/create/${documentId}/2`);
  }

  function handleBack() {
    // Nur leere Drafts löschen (fire-and-forget — kein Ladeindikator nötig).
    void deleteDraftIfEmpty(documentId);
    router.push("/documents");
  }

  return (
    <main className="dmain">
      <div className="dscroll" inert={showNew || editing !== null}>
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
            <div className="dflow-title">{t("createTitle", { type: docLabel })}</div>
            <div className="dflow-sub">{t("chooseCustomer")}</div>
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
              onClick={() => handleDocType("invoice")}
            >
              <ReceiptText size={20} strokeWidth={STROKE} aria-hidden />
              {t("invoice")}
            </button>
            <button
              type="button"
              className="seg--gold"
              data-on={docType === "quote" ? "1" : "0"}
              aria-pressed={docType === "quote"}
              onClick={() => handleDocType("quote")}
            >
              <FileText size={20} strokeWidth={STROKE} aria-hidden />
              {t("offer")}
            </button>
          </div>
        </div>

        <div className="dsearch2">
          <Search size={20} strokeWidth={STROKE} color="var(--muted)" aria-hidden />
          <input
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchCustomer")}
            aria-label={t("searchCustomer")}
          />
          {query && (
            <button
              type="button"
              className="dsearch2-clear"
              aria-label={t("clearSearch")}
              onClick={() => setQuery("")}
            >
              <X size={18} strokeWidth={STROKE} aria-hidden />
            </button>
          )}
        </div>

        <div className="dgrid">
          {!query && (
            <button
              type="button"
              className="dcust dcust--new"
              onClick={() => setShowNew(true)}
            >
              <span className="dcust-av">
                <Plus size={22} strokeWidth={STROKE_BOLD} color="#fff" aria-hidden />
              </span>
              <span className="dcust-body">
                <span className="dcust-name">{t("newCustomer")}</span>
                <span className="dcust-addr">{t("newCustomerSub")}</span>
              </span>
              <Chevron size={20} strokeWidth={STROKE} color="var(--primary)" aria-hidden />
            </button>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="dcust"
              data-sel={selected === c.id ? "1" : "0"}
              aria-pressed={selected === c.id}
              onClick={() => setSelected(c.id)}
            >
              <span className="dcust-av">{c.initials}</span>
              <span className="dcust-body">
                <span className="dcust-name">
                  {c.name}
                  {c.isNew && (
                    <span className="dcust-badge">
                      <Check size={11} strokeWidth={STROKE_BOLD} aria-hidden />
                      {t("ncCreated")}
                    </span>
                  )}
                </span>
                <span className="dcust-addr">
                  <MapPin size={13} strokeWidth={STROKE} aria-hidden />
                  {c.street}
                  {c.city ? `, ${c.city}` : ""}
                </span>
              </span>
              {selected === c.id && (
                <span className="dcust-check">
                  <Check size={16} strokeWidth={STROKE_BOLD} color="#fff" aria-hidden />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

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

      {showFixHint && !showNew && editing === null && (
        <div className="dflow-hint" role="status">
          <span className="dflow-hint-txt">
            {selectedCustomer ? t("fixCustomerHintEdit") : t("fixCustomerHintSelect")}
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

      <div className="dflow-foot" inert={showNew || editing !== null}>
        <div className="dflow-foot-sel">
          {saveError ? (
            <span className="dflow-error">{saveError}</span>
          ) : selectedCustomer ? (
            <>
              <Check size={16} strokeWidth={STROKE_BOLD} color="var(--ok)" aria-hidden />
              <span>
                <b>{selectedCustomer.name}</b> {t("selected")}
              </span>
              <button
                type="button"
                className={`dflow-edit${showFixHint ? " dflow-edit--pulse" : ""}`}
                onClick={() => handleEditClick(selectedCustomer.id)}
                disabled={editLoadingId !== null}
              >
                {editLoadingId === selectedCustomer.id ? (
                  <Loader2 size={15} strokeWidth={STROKE_BOLD} className="dbtn-spin" aria-hidden />
                ) : (
                  <Pencil size={15} strokeWidth={STROKE} aria-hidden />
                )}
                {t("editCustomer")}
              </button>
            </>
          ) : (
            <span>{t("customerOptionalHint")}</span>
          )}
        </div>
        <button
          type="button"
          className="dbtn"
          disabled={saving}
          onClick={handleWeiter}
        >
          {saving ? (
            <Loader2 size={20} strokeWidth={STROKE_BOLD} className="dbtn-spin" aria-hidden />
          ) : (
            <Chevron size={20} strokeWidth={STROKE_BOLD} aria-hidden />
          )}
          {t("next")}
        </button>
      </div>
    </main>
  );
}
