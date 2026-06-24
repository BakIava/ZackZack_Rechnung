"use client";

import { useMemo, useState } from "react";
import {
  Brush,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { sampleKatalog } from "@/lib/katalog/sample";
import { anzeigeName, type KatalogEintrag } from "@/lib/katalog/types";
import type { Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/format";
import { ServiceModal } from "./service-modal";
import "./catalog-master-detail.css";

interface CatalogMasterDetailProps {
  dir: "ltr" | "rtl";
}

const STROKE = 1.75;
const UNITS = ["m²", "Std.", "Stk.", "lfm", "Pauschal", "kg", "Liter"];

export function CatalogMasterDetail({ dir }: CatalogMasterDetailProps) {
  const t = useTranslations("Catalog");
  const locale = useLocale() as Locale;
  const isRtl = dir === "rtl";

  const [items, setItems] = useState<KatalogEintrag[]>(sampleKatalog);
  const [query, setQuery] = useState("");
  const [selId, setSelId] = useState<string | null>(sampleKatalog[0]?.id ?? null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<KatalogEintrag | null>(null);
  const [showDel, setShowDel] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((s) =>
      !q
      || s.de.toLowerCase().includes(q)
      || Object.values(s.uebersetzungen).some((v) => v.toLowerCase().includes(q)),
    );
  }, [items, query]);

  const selected = items.find((s) => s.id === selId) ?? null;


  function handleSave(updated: KatalogEintrag) {
    setItems((prev) =>
      editItem
        ? prev.map((s) => (s.id === updated.id ? updated : s))
        : [updated, ...prev],
    );
    setSelId(updated.id);
    setShowModal(false);
    setEditItem(null);
  }

  function handleDelete() {
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
              onClick={() => { setEditItem(null); setShowModal(true); }}
            >
              <Plus size={19} strokeWidth={2.4} color="#fff" aria-hidden />
              {t("newBtn")}
            </button>
          </div>
        </div>

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
                    const sub = locale !== "de" ? s.de : s.uebersetzungen.tr;
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
                          {sub && <span className="cat-row-sub">{sub}</span>}
                        </span>
                        <span className="cat-row-right">
                          <span className="cat-row-price">{formatMoney(s.preisCents)}</span>
                          <span className="cat-row-unit">/ {s.einheit}</span>
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
              onEdit={() => { setEditItem(selected); setShowModal(true); }}
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
          onClose={() => { setShowModal(false); setEditItem(null); }}
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
  const n = svc.verwendungen;
  const suffix = n === 1 ? t("usedInSuffix1") : t("usedInSuffix");
  const usedLabel = t("usedIn", { n, suffix });

  return (
    <div className="cat-detail">
      <div className="cat-detail-hdr">
        <div className="cat-detail-cat">{svc.kategorie}</div>
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
            {(["de", "tr", "ar"] as Locale[]).map((lang) => (
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
            ))}
          </div>
        </div>

        {/* Preis */}
        <div className="cat-price">
          <div>
            <div className="cat-block-lbl" style={{ marginBottom: 6 }}>{t("priceLbl")}</div>
            <div className="cat-price-val">{formatMoney(svc.preisCents)}</div>
            <div className="cat-price-per">/ {svc.einheit}</div>
          </div>
          <div className="cat-price-unit">{svc.einheit}</div>
        </div>

        {/* Verwendungen */}
        <div className="cat-usage">
          <div className="cat-usage-ic">
            <Check size={17} strokeWidth={2.4} color="#fff" aria-hidden />
          </div>
          <div className="cat-usage-t">{usedLabel}</div>
        </div>

        {/* Aktionen */}
        <div className="cat-actions">
          <button type="button" className="cat-btn-edit" onClick={onEdit}>
            <Pencil size={17} strokeWidth={STROKE} aria-hidden />
            {t("edit")}
          </button>
          <button type="button" className="cat-btn-del" onClick={onDelete} aria-label={t("del")}>
            <Trash2 size={18} strokeWidth={STROKE} aria-hidden />
          </button>
        </div>

        <button type="button" className="cat-btn-invoice">
          <ReceiptText size={19} strokeWidth={STROKE} color="#fff" aria-hidden />
          {t("useInInvoice")}
        </button>
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
