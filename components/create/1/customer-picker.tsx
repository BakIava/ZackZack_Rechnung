"use client";

import { Check, ChevronLeft, ChevronRight, MapPin, Plus, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { CustomerListItem } from "@/types/customer";
import "./customer-picker.css";

const STROKE = 1.75;
const STROKE_BOLD = 2.4;

interface CustomerPickerProps {
  dir: "ltr" | "rtl";
  query: string;
  filtered: CustomerListItem[];
  selectedCustomer: CustomerListItem | null;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}

/**
 * Kundenwahl in Schritt 1. Nach der Auswahl klappt die Liste auf eine Karte
 * des gewählten Kunden zusammen, damit der Einsatzort direkt darunter sichtbar ist.
 */
export function CustomerPicker({ dir, query, filtered, selectedCustomer, onQueryChange, onSelect, onNew }: CustomerPickerProps) {
  const t = useTranslations("Create");
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const [changing, setChanging] = useState(false);
  const selectedId = selectedCustomer?.id ?? null;

  function handleSelect(id: string) {
    onSelect(id);
    onQueryChange("");
    setChanging(false);
  }

  function handleNew() {
    setChanging(false);
    onNew();
  }

  if (selectedCustomer && !changing) {
    return (
      <button
        type="button"
        className="dcust customer-picker-chosen"
        data-sel="1"
        onClick={() => setChanging(true)}
      >
        <CustomerCardContent customer={selectedCustomer} />
        <span className="customer-picker-change">
          {t("changeCustomer")}
          <Chevron size={18} strokeWidth={STROKE} aria-hidden />
        </span>
      </button>
    );
  }

  return (
    <>
        <div className="dsearch2">
          <Search
            size={20}
            strokeWidth={STROKE}
            color="var(--muted)"
            aria-hidden
          />
          <input
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("searchCustomer")}
            aria-label={t("searchCustomer")}
          />
          {query && (
            <button
              type="button"
              className="dsearch2-clear"
              aria-label={t("clearSearch")}
              onClick={() => onQueryChange("")}
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
              onClick={handleNew}
            >
              <span className="dcust-av">
                <Plus
                  size={22}
                  strokeWidth={STROKE_BOLD}
                  color="#fff"
                  aria-hidden
                />
              </span>
              <span className="dcust-body">
                <span className="dcust-name">{t("newCustomer")}</span>
                <span className="dcust-addr">{t("newCustomerSub")}</span>
              </span>
              <Chevron
                size={20}
                strokeWidth={STROKE}
                color="var(--primary)"
                aria-hidden
              />
            </button>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="dcust"
              data-sel={selectedId === c.id ? "1" : "0"}
              aria-pressed={selectedId === c.id}
              onClick={() => handleSelect(c.id)}
            >
              <CustomerCardContent customer={c} />
              {selectedId === c.id && (
                <span className="dcust-check">
                  <Check
                    size={16}
                    strokeWidth={STROKE_BOLD}
                    color="#fff"
                    aria-hidden
                  />
                </span>
              )}
            </button>
          ))}
        </div>
    </>
  );
}

interface CustomerCardContentProps {
  customer: CustomerListItem;
}

/** Avatar, Name und Adresse – gemeinsam für Rasterkachel und eingeklappte Karte. */
function CustomerCardContent({ customer: c }: CustomerCardContentProps) {
  const t = useTranslations("Create");
  return (
    <>
      <span className="dcust-av">{c.initials}</span>
      <span className="dcust-body">
        <span className="dcust-name">
          {c.companyName ? c.companyName + " " : ""}
          {c.firstname && c.lastname ? c.firstname + " " + c.lastname : ""}
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
    </>
  );
}
