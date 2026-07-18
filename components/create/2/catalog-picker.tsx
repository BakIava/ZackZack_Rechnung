"use client";

import { useState } from "react";
import { Brush, ClipboardList, FileText, Languages, Pencil, Plus, Search, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { anzeigeName } from "@/lib/katalog/anzeige";
import type { KatalogEintrag } from "@/types/service";
import type { FreeItemInput, FremdItemInput } from "@/types/document";
import { formatMoney } from "@/lib/format";
import { FreeForm, FremdForm } from "./position-forms";
import "./catalog-picker.css";

const STROKE = 1.75;

type Tab = "katalog" | "frei" | "fremd";

interface CatalogPickerProps {
  locale: Locale;
  services: KatalogEintrag[];
  onAddCatalog: (serviceId: string) => void;
  onAddFree: (input: FreeItemInput) => void;
  onAddFremd: (input: FremdItemInput) => void;
}

/** Gemeinsamer Picker: Aus Katalog · Freie Position · Fremdleistung. */
export function CatalogPicker({
  locale,
  services,
  onAddCatalog,
  onAddFree,
  onAddFremd,
}: CatalogPickerProps) {
  const t = useTranslations("Step2");
  const [tab, setTab] = useState<Tab>("katalog");
  const [query, setQuery] = useState("");

  const tabs: { id: Tab; icon: typeof ClipboardList; label: string }[] = [
    { id: "katalog", icon: ClipboardList, label: t("fromCatalog") },
    { id: "frei", icon: Pencil, label: t("freePosition") },
    { id: "fremd", icon: Truck, label: t("subcontract") },
  ];

  const q = query.toLowerCase();
  const items = services.filter(
    (c) => anzeigeName(c, locale).toLowerCase().includes(q) || c.de.toLowerCase().includes(q),
  );

  return (
    <>
      <div className="picker-tabs" role="tablist">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            className="sheet-tab"
            data-on={tab === id ? "1" : "0"}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            <Icon size={18} strokeWidth={STROKE} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="cat-hint">
        <span className="cat-hint-ic">
          <Languages size={18} strokeWidth={STROKE} aria-hidden />
        </span>
        <span className="cat-hint-t">{t("translateHint")}</span>
      </div>

      {tab === "katalog" && (
        <>
          <div className="cat-search">
            <Search size={20} strokeWidth={STROKE} aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchCatalog")}
              aria-label={t("searchCatalog")}
            />
          </div>
          <div className="catlist">
            {items.map((c) => (
              <button
                key={c.id}
                type="button"
                className="cat-item"
                onClick={() => onAddCatalog(c.id)}
              >
                <span className="cat-item-ic">
                  <Brush size={21} strokeWidth={STROKE} aria-hidden />
                </span>
                <span className="cat-item-body">
                  <span className="cat-user">{anzeigeName(c, locale)}</span>
                  <span className="cat-doc">
                    <span className="cat-doc-lbl">{t("onDocument")}</span>
                    <FileText size={13} strokeWidth={STROKE} aria-hidden />
                    <b>{c.de}</b>
                  </span>
                </span>
                <span className="picker-price">
                  {formatMoney(c.preisCents)}
                  <span className="picker-price-unit">/{c.einheit}</span>
                </span>
                <span className="cat-add">
                  <Plus size={18} strokeWidth={2.4} color="#fff" aria-hidden />
                </span>
              </button>
            ))}
            {items.length === 0 && (
              <div className="empty">{query ? t("noCatalogResults") : t("catalogEmpty")}</div>
            )}
          </div>
        </>
      )}

      {tab === "frei" && <FreeForm onAdd={onAddFree} />}
      {tab === "fremd" && <FremdForm onAdd={onAddFremd} />}
    </>
  );
}
