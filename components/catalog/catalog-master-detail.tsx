"use client";

import { useMemo, useState } from "react";
import {
  Brush,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { anzeigeName } from "@/lib/katalog/anzeige";
import type { KatalogEintrag } from "@/types/service";
import { katalogToServiceInput } from "@/lib/services/mappers";
import { createService, updateService, deleteService } from "@/lib/services/actions";
import type { Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/format";
import { ServiceModal } from "./service-modal";
import "./catalog-master-detail.css";

interface CatalogMasterDetailProps {
  dir: "ltr" | "rtl";
  initialItems: KatalogEintrag[];
}

const STROKE = 1.75;
const UNITS = ["m²", "Std.", "Stk.", "lfm", "Pauschal", "kg", "Liter"];

export function CatalogMasterDetail({ dir, initialItems }: CatalogMasterDetailProps) {
  const t = useTranslations("Catalog");
  const locale = useLocale() as Locale;
  const isRtl = dir === "rtl";

  const [items, setItems] = useState<KatalogEintrag[]>(initialItems);
  const [query, setQuery] = useState("");
  const [selId, setSelId] = useState<string | null>(initialItems[0]?.id ?? null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<KatalogEintrag | null>(null);
  const [showDel, setShowDel] = useState(false);
  const [mutError, setMutError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (s) =>
        !q ||
        s.de.toLowerCase().includes(q) ||
        Object.values(s.uebersetzungen).some((v) => v.toLowerCase().includes(q)),
    );
  }, [items, query]);

  const selected = items.find((s) => s.id === selId) ?? null;

  async function handleSave(entry: KatalogEintrag) {
    setMutError(null);
    const isNew = !editItem;
    const input = katalogToServiceInput(entry);

    if (isNew) {
      const result = await createService(input);
      if (result.error) {
        setMutError(result.error);
        return;
      }
      const savedEntry = { ...entry, id: result.id! };
      setItems((prev) => [savedEntry, ...prev]);
      setSelId(savedEntry.id);
    } else {
      const result = await updateService(entry.id, input);
      if (result.error) {
        setMutError(result.error);
        return;
      }
      setItems((prev) => prev.map((s) => (s.id === entry.id ? entry : s)));
      setSelId(entry.id);
    }

    setShowModal(false);
    setEditItem(null);
  }

  async function handleDelete() {
    if (!selId) return;
    setMutError(null);
    const result = await deleteService(selId);
    if (result.error) {
      setMutError(result.error);
      setShowDel(false);
      return;
    }
    setItems((prev) => prev.filter((s) => s.id !== selId));
    setSelId(null);
    setShowDel(false);
  }

  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <main className="dmain">
      <div className="cat-wrap" inert={showModal || showDel ? true : undefined}>
        {/* ── Topbar ── */}
        <div className="dtopbar">
          <div>
            <div className="greet-sub">{t("subtitle")}</div>
            <div className="greet-main">{t("title")}</div>
          </div>
          <div className="dtools">
            <div className="dsearch">
              <Search size={18} strokeWidth={STROKE} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
              />
              {query && (
                <button
                  type="button"
                  className="dsearch-clear"
                  onClick={() => setQuery("")}
                  aria-label="Suche löschen"
                >
                  <X size={16} strokeWidth={STROKE} aria-hidden />
                </button>
              )}
            </div>
            <button
              type="button"
              className="dbtn"
              onClick={() => {
                setEditItem(null);
                setShowModal(true);
              }}
            >
              <Plus size={19} strokeWidth={2.4} color="#fff" aria-hidden />
              {t("newBtn")}
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {mutError && (
          <div className="cat-error-banner">
            <span>{t("saveError")}</span>
            <button
              type="button"
              className="cat-error-dismiss"
              onClick={() => setMutError(null)}
              aria-label={t("cancel")}
            >
              <X size={15} strokeWidth={STROKE} aria-hidden />
            </button>
          </div>
        )}

        {/* ── Master + Detail ── */}
        <div className="cat-body">
          {/* Master */}
          <div className="cat-master">
            <div className="cat-master-head">
              <span className="cat-list-lbl">{t("listHead")}</span>
              <span className="cat-list-count">
                {filtered.length} / {items.length}
              </span>
            </div>

            <div className="cat-master-scroll">
              {filtered.length === 0 ? (
                <div className="cat-empty-list">
                  <div className="cat-empty-list-t">{t("noResults")}</div>
                  <div className="cat-empty-list-s">{t("noResultsSub")}</div>
                </div>
              ) : (
                <div className="cat-list">
                  {filtered.map((s) => {
                    const name = anzeigeName(s, locale);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className="cat-row"
                        data-sel={selId === s.id ? "1" : "0"}
                        onClick={() => setSelId(s.id)}
                      >
                        <span className="cat-row-ic">
                          <Brush size={20} strokeWidth={STROKE} aria-hidden />
                        </span>
                        <span className="cat-row-body">
                          <span className="cat-row-name">{name}</span>
                          <span className="cat-row-sub">
                            <span className="cat-row-sub-lbl">{t("onDoc")}:</span> {s.de}
                          </span>
                        </span>
                        <span className="cat-row-right">
                          <span className="cat-row-price">
                            {s.preisCents > 0 ? formatMoney(s.preisCents) : "—"}
                          </span>
                          {s.einheit && <span className="cat-row-unit">/ {s.einheit}</span>}
                        </span>
                        <span className="cat-row-chev">
                          <ChevronIcon size={17} strokeWidth={STROKE} aria-hidden />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="cat-detail-scroll">
            <ServiceDetail
              svc={selected}
              locale={locale}
              t={t}
              onEdit={() => {
                setEditItem(selected);
                setShowModal(true);
              }}
              onDelete={() => setShowDel(true)}
            />
          </div>
        </div>
      </div>

      {showModal && (
        <ServiceModal
          dir={dir}
          item={editItem}
          units={UNITS}
          onClose={() => {
            setShowModal(false);
            setEditItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {showDel && selected && (
        <DeleteConfirm
          name={selected.de}
          t={t}
          onClose={() => setShowDel(false)}
          onConfirm={handleDelete}
        />
      )}
    </main>
  );
}

interface ServiceDetailProps {
  svc: KatalogEintrag | null;
  locale: Locale;
  t: ReturnType<typeof useTranslations<"Catalog">>;
  onEdit: () => void;
  onDelete: () => void;
}

function ServiceDetail({ svc, locale, t, onEdit, onDelete }: ServiceDetailProps) {
  const STROKE = 1.75;

  if (!svc) {
    return (
      <div className="cat-empty-detail">
        <div className="cat-empty-detail-ic">
          <ClipboardList size={28} strokeWidth={STROKE} aria-hidden />
        </div>
        <div className="cat-empty-detail-t">{t("selectHint")}</div>
        <div className="cat-empty-detail-s">{t("selectHintSub")}</div>
      </div>
    );
  }

  const name = anzeigeName(svc, locale);

  return (
    <div className="cat-detail">
      <div className="cat-detail-hdr">
        <div className="cat-detail-name">{name}</div>
        {locale !== "de" && (
          <div className="cat-detail-de">
            <ClipboardList size={13} strokeWidth={STROKE} aria-hidden />
            {t("onDoc")}: <b>{svc.de}</b>
          </div>
        )}
      </div>

      <div className="cat-detail-body">
        {/* Übersetzungen */}
        <div>
          <div className="cat-block-lbl">{t("translations")}</div>
          <div className="cat-trans">
            {(locale === "de" ? (["de"] as Locale[]) : (["de", locale] as Locale[])).map(
              (lang) => (
                <div
                  key={lang}
                  className={"cat-trans-pill" + (locale === lang ? " is-cur" : "")}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                >
                  <div className="cat-trans-lang">{lang.toUpperCase()}</div>
                  {svc.uebersetzungen[lang] ? (
                    <div className="cat-trans-text">{svc.uebersetzungen[lang]}</div>
                  ) : (
                    <div className="cat-trans-empty">—</div>
                  )}
                </div>
              ),
            )}
          </div>
        </div>

        {/* Preis */}
        <div className="cat-price">
          <div>
            <div className="cat-block-lbl" style={{ marginBottom: 6 }}>
              {t("priceLbl")}
            </div>
            <div className="cat-price-val">
              {svc.preisCents > 0 ? formatMoney(svc.preisCents) : "—"}
            </div>
            {svc.einheit && <div className="cat-price-per">/ {svc.einheit}</div>}
          </div>
          {svc.einheit && <div className="cat-price-unit">{svc.einheit}</div>}
        </div>

        {/* Aktionen */}
        <div className="cat-actions">
          <button type="button" className="cat-btn-edit" onClick={onEdit}>
            <Pencil size={17} strokeWidth={STROKE} aria-hidden />
            {t("edit")}
          </button>
          <button
            type="button"
            className="cat-btn-del"
            onClick={onDelete}
            aria-label={t("del")}
          >
            <Trash2 size={18} strokeWidth={STROKE} aria-hidden />
          </button>
        </div>

      </div>
    </div>
  );
}

interface DeleteConfirmProps {
  name: string;
  t: ReturnType<typeof useTranslations<"Catalog">>;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteConfirm({ name, t, onClose, onConfirm }: DeleteConfirmProps) {
  const STROKE = 1.75;
  return (
    <div className="cat-del-wrap">
      <div className="cat-del-bd" onClick={onClose} />
      <div className="cat-del-box">
        <div className="cat-del-ic">
          <Trash2 size={24} strokeWidth={STROKE} aria-hidden />
        </div>
        <div className="cat-del-t">{t("delTitle")}</div>
        <div className="cat-del-s">
          <b>{name}</b> — {t("delSub")}
        </div>
        <div className="cat-del-note">{t("delDocNote")}</div>
        <div className="cat-del-act">
          <button type="button" className="nc-cancel" style={{ flex: 1 }} onClick={onClose}>
            {t("cancel")}
          </button>
          <button type="button" className="cat-del-confirm" onClick={onConfirm}>
            <Trash2 size={17} strokeWidth={STROKE} aria-hidden />
            {t("del")}
          </button>
        </div>
      </div>
    </div>
  );
}
