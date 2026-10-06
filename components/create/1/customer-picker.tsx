"use client";

import { Check, ChevronLeft, ChevronRight, MapPin, Plus, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CustomerListItem } from "@/types/customer";
import "./customer-picker.css";

const STROKE = 1.75;
const STROKE_BOLD = 2.4;

interface CustomerPickerProps {
  dir: "ltr" | "rtl";
  query: string;
  filtered: CustomerListItem[];
  selected: string | null;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function CustomerPicker({ dir, query, filtered, selected, onQueryChange, onSelect, onNew }: CustomerPickerProps) {
  const t = useTranslations("Create");
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
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
              onClick={onNew}
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
              data-sel={selected === c.id ? "1" : "0"}
              aria-pressed={selected === c.id}
              onClick={() => onSelect(c.id)}
            >
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
              {selected === c.id && (
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
