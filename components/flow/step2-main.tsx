"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileText, Lock, Plus, ReceiptText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { Link, useRouter } from "@/i18n/navigation";
import { SAMPLE_CUSTOMER, defaultPositions } from "@/lib/demo/flow-data";
import { summeCents, type Position } from "@/lib/flow/positionen";
import { formatMoney } from "@/lib/format";
import type { DocType } from "@/lib/demo/dashboard-data";
import { CatalogPicker } from "./catalog-picker";
import { PositionRow } from "./position-row";

const STROKE = 1.75;

interface Step2MainProps {
  dir: "ltr" | "rtl";
  locale: Locale;
  docType?: DocType;
}

/** Desktop-Hauptbereich von Schritt 2: Tabelle + Zusammenfassung + Katalog-Modal. */
export function Step2Main({ dir, locale, docType = "rechnung" }: Step2MainProps) {
  const t = useTranslations("Step2");
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>(defaultPositions);
  const [modalOpen, setModalOpen] = useState(false);

  const Forward = dir === "rtl" ? ChevronLeft : ChevronRight;
  const Backward = dir === "rtl" ? ChevronRight : ChevronLeft;
  const total = summeCents(positions);
  const docLabel = docType === "rechnung" ? t("rechnung") : t("angebot");

  const changeQty = (id: string, delta: number) =>
    setPositions((ps) => ps.map((p) => (p.id === id && p.kind === "normal" ? { ...p, qty: Math.max(1, p.qty + delta) } : p)));
  const remove = (id: string) => setPositions((ps) => ps.filter((p) => p.id !== id));
  const move = (index: number, delta: number) =>
    setPositions((ps) => {
      const target = index + delta;
      if (target < 0 || target >= ps.length) return ps;
      const next = ps.slice();
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  const add = (position: Position) => {
    setPositions((ps) => [...ps, position]);
    setModalOpen(false);
  };

  return (
    <main className="dmain">
      <div className="dscroll">
        <div className="dflow-head">
          <Link href="/create/1" className="dflow-back" aria-label={t("back")}>
            <Backward size={20} strokeWidth={STROKE} aria-hidden />
          </Link>
          <div className="dflow-headings">
            <div className="dflow-title">{t("createTitle", { type: docLabel })}</div>
            <div className="dflow-sub">{t("stepItems")}</div>
          </div>
          <div className="dsteps2">
            <div className="dstep2">
              <span className="dstep2-dot dstep2-dot--done">
                <Check size={15} strokeWidth={2.4} aria-hidden />
              </span>
              <span className="dstep2-lbl">{t("stepCustomer")}</span>
            </div>
            <span className="dstep2-line dstep2-line--done" />
            <div className="dstep2 dstep2--active">
              <span className="dstep2-dot">2</span>
              <span className="dstep2-lbl">{t("stepItems")}</span>
            </div>
            <span className="dstep2-line" />
            <div className="dstep2">
              <span className="dstep2-dot">3</span>
              <span className="dstep2-lbl">{t("stepPreview")}</span>
            </div>
          </div>
        </div>

        <div className="d2-ctx">
          <span className="p2-chip p2-chip--mode">
            {docType === "rechnung" ? (
              <ReceiptText size={15} strokeWidth={STROKE} aria-hidden />
            ) : (
              <FileText size={15} strokeWidth={STROKE} aria-hidden />
            )}
            {docLabel}
          </span>
          <span className="p2-chip">
            <span className="p2-av">{SAMPLE_CUSTOMER.initials}</span>
            {SAMPLE_CUSTOMER.name}
          </span>
        </div>

        <div className="d2-wrap">
          <div>
            <button type="button" className="d2-add" onClick={() => setModalOpen(true)}>
              <span className="d2-add-ic">
                <Plus size={26} strokeWidth={2.4} color="#fff" aria-hidden />
              </span>
              <span className="d2-add-txt">
                <span className="d2-add-t">{t("addPosition")}</span>
                <span className="d2-add-s">{t("fromCatalog")} · {t("freePosition")} · {t("subcontract")}</span>
              </span>
              <Forward size={22} strokeWidth={STROKE} aria-hidden />
            </button>

            {positions.length === 0 ? (
              <div className="empty empty--boxed">
                <div className="empty-t">{t("emptyPos")}</div>
                {t("emptyPosHint")}
              </div>
            ) : (
              <div className="d2table">
                <div className="d2thead">
                  <span className="d2th" />
                  <span className="d2th">{t("colService")}</span>
                  <span className="d2th">{t("quantity")}</span>
                  <span className="d2th">{t("unitPrice")}</span>
                  <span className="d2th d2th--num">{t("lineSum")}</span>
                  <span className="d2th" />
                </div>
                {positions.map((p, i) => (
                  <PositionRow
                    key={p.id}
                    position={p}
                    locale={locale}
                    index={i}
                    count={positions.length}
                    onQty={changeQty}
                    onDelete={remove}
                    onMove={move}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="d2-sumpanel">
            <div className="d2-sum-t">{t("summary")}</div>
            <div className="d2-sum-lines">
              <div className="d2-sum-line"><span>{t("positionsWord")}</span><b>{positions.length}</b></div>
              <div className="d2-sum-line"><span>{t("total")} ({t("net")})</span><b>{formatMoney(total)}</b></div>
            </div>
            <div className="d2-sum-div" />
            <div className="d2-sum-total"><span className="d2-sum-total-l">{t("total")}</span><span className="d2-sum-total-v">{formatMoney(total)}</span></div>
            <div className="d2-sum-ku">
              <Lock size={14} strokeWidth={STROKE} aria-hidden />
              {t("kuNote")}
            </div>
            <button type="button" className="d2-sum-btn" disabled={positions.length === 0} onClick={() => router.push("/create/3")}>
              {t("next")}
              <Forward size={20} strokeWidth={2.4} aria-hidden />
            </button>
            <Link href="/create/1" className="d2-back">{t("back")}</Link>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="dmodal-wrap">
          <div className="dmodal-bd" onClick={() => setModalOpen(false)} />
          <div className="dmodal" role="dialog" aria-modal="true" aria-label={t("addPosition")}>
            <div className="dmodal-head">
              <span className="dmodal-title">{t("addPosition")}</span>
              <button type="button" className="sheet-x" onClick={() => setModalOpen(false)} aria-label={t("close")}>
                <X size={18} strokeWidth={STROKE} aria-hidden />
              </button>
            </div>
            <div className="dmodal-body">
              <CatalogPicker locale={locale} onAdd={add} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
