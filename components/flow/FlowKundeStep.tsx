"use client";

import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Plus,
  ReceiptText,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { updateDocumentType, saveStep1, cancelDraft } from "@/lib/flow/actions";
import { NewCustomerInline } from "./NewCustomerInline";
import type { FlowCustomer, FlowDocType } from "@/lib/flow/types";
import "./FlowKundeStep.css";

interface FlowKundeStepProps {
  dir: "ltr" | "rtl";
  locale: string;
  documentId: string;
  initialDocType: FlowDocType;
  initialCustomerId: string | null;
  customers: FlowCustomer[];
}

const STROKE = 1.75;
const STROKE_BOLD = 2.4;

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const raw =
    parts.length > 1
      ? (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")
      : name.slice(0, 2);
  return raw.toUpperCase();
}

function buildAddress(c: FlowCustomer): string {
  const parts: string[] = [];
  if (c.street) parts.push(c.streetNo ? `${c.street} ${c.streetNo}` : c.street);
  if (c.postcode || c.city) parts.push([c.postcode, c.city].filter(Boolean).join(" "));
  return parts.join(", ");
}

export function FlowKundeStep({
  dir,
  locale,
  documentId,
  initialDocType,
  initialCustomerId,
  customers: initialCustomers,
}: FlowKundeStepProps) {
  const t = useTranslations("Create");
  const [isPending, startTransition] = useTransition();
  const [docType, setDocType] = useState<FlowDocType>(initialDocType);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(initialCustomerId);
  const [newCustomers, setNewCustomers] = useState<FlowCustomer[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const BackChevron = dir === "rtl" ? ChevronRight : ChevronLeft;

  const allCustomers: FlowCustomer[] = [...newCustomers, ...initialCustomers];
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? allCustomers.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          (c.city ?? "").toLowerCase().includes(needle),
      )
    : allCustomers;

  const selectedCustomer = allCustomers.find((c) => c.id === selected) ?? null;
  const docLabel = docType === "invoice" ? t("rechnung") : t("angebot");

  function handleDocType(next: FlowDocType) {
    setDocType(next);
    startTransition(async () => {
      await updateDocumentType(documentId, next);
    });
  }

  function handleNext() {
    if (!selected || isPending) return;
    setSaveError(null);
    startTransition(async () => {
      const result = await saveStep1(documentId, selected, locale);
      if (result?.error) {
        setSaveError(result.error);
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelDraft(documentId, locale);
    });
  }

  function handleCustomerCreated(customer: FlowCustomer) {
    setNewCustomers((prev) => [customer, ...prev]);
    setSelected(customer.id);
    setQuery("");
    setShowNewForm(false);
  }

  return (
    <div className="fk-main">
      <div className="fk-scroll">
        {/* Kopfzeile */}
        <div className="fk-head">
          <button
            type="button"
            className="fk-back"
            aria-label={t("back")}
            disabled={isPending}
            onClick={handleCancel}
          >
            <BackChevron size={20} strokeWidth={STROKE} aria-hidden />
          </button>
          <div>
            <div className="fk-title">{t("createTitle", { type: docLabel })}</div>
            <div className="fk-sub">{t("chooseCustomer")}</div>
          </div>
        </div>

        {showNewForm ? (
          <div className="fk-new-wrap">
            <NewCustomerInline
              onClose={() => setShowNewForm(false)}
              onCreated={handleCustomerCreated}
            />
          </div>
        ) : (
          <>
            {/* Dokumenttyp-Schalter */}
            <div className="fk-doctype" role="group" aria-label={t("docType")}>
              <button
                type="button"
                className="fk-seg-btn"
                data-on={docType === "invoice" ? "1" : "0"}
                aria-pressed={docType === "invoice"}
                onClick={() => handleDocType("invoice")}
              >
                <ReceiptText size={20} strokeWidth={STROKE} aria-hidden />
                {t("rechnung")}
              </button>
              <button
                type="button"
                className="fk-seg-btn"
                data-on={docType === "quote" ? "1" : "0"}
                aria-pressed={docType === "quote"}
                onClick={() => handleDocType("quote")}
              >
                <FileText size={20} strokeWidth={STROKE} aria-hidden />
                {t("angebot")}
              </button>
            </div>

            {/* Suchfeld */}
            <div className="fk-search">
              <Search size={20} strokeWidth={STROKE} color="var(--muted-foreground)" aria-hidden />
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
                  className="fk-clear"
                  aria-label={t("clearSearch")}
                  onClick={() => setQuery("")}
                >
                  <X size={18} strokeWidth={STROKE} aria-hidden />
                </button>
              )}
            </div>

            {/* Kundenliste */}
            <div className="fk-grid">
              {!query && (
                <button
                  type="button"
                  className="fk-cust fk-cust--new"
                  onClick={() => setShowNewForm(true)}
                >
                  <span className="fk-av">
                    <Plus size={22} strokeWidth={STROKE_BOLD} color="#fff" aria-hidden />
                  </span>
                  <span className="fk-body">
                    <span className="fk-name">{t("newCustomer")}</span>
                    <span className="fk-addr">{t("newCustomerSub")}</span>
                  </span>
                  <Chevron size={20} strokeWidth={STROKE} color="var(--primary, #0f2a3f)" aria-hidden />
                </button>
              )}

              {filtered.map((c) => {
                const isNew = newCustomers.some((n) => n.id === c.id);
                const addr = buildAddress(c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="fk-cust"
                    data-sel={selected === c.id ? "1" : "0"}
                    aria-pressed={selected === c.id}
                    onClick={() => setSelected(c.id)}
                  >
                    <span className="fk-av">
                      {c.name.includes("GmbH") ||
                      c.name.includes("AG") ||
                      c.name.includes("KG") ||
                      c.name.includes("OHG") ? (
                        <Building2 size={20} strokeWidth={STROKE} aria-hidden />
                      ) : (
                        deriveInitials(c.name)
                      )}
                    </span>
                    <span className="fk-body">
                      <span className="fk-name">
                        {c.name}
                        {isNew && (
                          <span className="fk-badge">
                            <Check size={10} strokeWidth={STROKE_BOLD} aria-hidden />
                            {t("ncCreated")}
                          </span>
                        )}
                      </span>
                      {addr && (
                        <span className="fk-addr">
                          <MapPin size={13} strokeWidth={STROKE} aria-hidden />
                          {addr}
                        </span>
                      )}
                    </span>
                    {selected === c.id && (
                      <span className="fk-check">
                        <Check size={15} strokeWidth={STROKE_BOLD} color="#fff" aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {saveError && (
          <p className="fk-save-error" role="alert">
            {saveError}
          </p>
        )}
      </div>

      {/* Sticky Footer */}
      {!showNewForm && (
        <div className="fk-foot">
          <div className="fk-foot-sel">
            {selectedCustomer ? (
              <>
                <Check size={16} strokeWidth={STROKE_BOLD} color="var(--ok, #16a34a)" aria-hidden />
                <span>
                  <b>{selectedCustomer.name}</b> {t("selected")}
                </span>
              </>
            ) : (
              <span>{t("chooseCustomer")}</span>
            )}
          </div>
          <button
            type="button"
            className="fk-next"
            disabled={!selectedCustomer || isPending}
            onClick={handleNext}
          >
            {t("next")}
            <Chevron size={20} strokeWidth={STROKE_BOLD} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
