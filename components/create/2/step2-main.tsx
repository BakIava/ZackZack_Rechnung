"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, FileText, Lock, Plus, ReceiptText, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { Link, useRouter } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { eurosToCents } from "@/lib/money";
import type { KatalogEintrag } from "@/types/service";
import type {
  DraftContext,
  DraftItem,
  FreeItemInput,
  FremdItemInput,
} from "@/types/document";
import type { ItemsResult } from "@/lib/documents/item-actions";
import {
  addCatalogItem,
  addFreeItem,
  addFremdItem,
  deleteItem,
  updateItem,
} from "@/lib/documents/item-actions";
import { fixedSurchargeForSale, markupPercent } from "@/lib/documents/margin";
import { CatalogPicker } from "./catalog-picker";
import { FlowSteps } from "../flow-steps";
import { NumberPad, type PadField } from "./number-pad";
import { PositionCard } from "./position-card";

const STROKE = 1.75;

interface Step2MainProps {
  dir: "ltr" | "rtl";
  locale: Locale;
  documentId: string;
  context: DraftContext;
  initialItems: DraftItem[];
  services: KatalogEintrag[];
}

/** Desktop-Hauptbereich von Schritt 2: Positionen aus dem Draft, live in der DB. */
export function Step2Main({
  dir,
  locale,
  documentId,
  context,
  initialItems,
  services,
}: Step2MainProps) {
  const t = useTranslations("Step2");
  const router = useRouter();
  const [items, setItems] = useState<DraftItem[]>(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [pad, setPad] = useState<{
    itemId: string;
    field: PadField;
    unit: string;
    name: string;
    initial: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const Forward = dir === "rtl" ? ChevronLeft : ChevronRight;
  const Backward = dir === "rtl" ? ChevronRight : ChevronLeft;
  const total = items.reduce((sum, i) => sum + i.totalAmount, 0);
  const docLabel = t(context.docType);

  function run(action: () => Promise<ItemsResult>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if ("error" in res) {
        setError(t("itemError"));
        return;
      }
      setItems(res.items);
    });
  }

  const addCatalog = (serviceId: string) => {
    setModalOpen(false);
    run(() => addCatalogItem(documentId, serviceId));
  };
  const addFree = (input: FreeItemInput) => {
    setModalOpen(false);
    run(() => addFreeItem(documentId, input));
  };
  const addFremd = (input: FremdItemInput) => {
    setModalOpen(false);
    run(() => addFremdItem(documentId, input));
  };
  const remove = (id: string) => run(() => deleteItem(id));

  const openPad = (item: DraftItem, field: PadField) => {
    let initial: string;
    if (field === "qty") {
      initial = String(item.amount).replace(".", ",");
    } else if (field === "markup") {
      // Aufschlag exakt aus dem gespeicherten Prozentwert lesen, sonst rückrechnen.
      const m =
        item.surchargeType === "percent" && item.surcharge != null
          ? item.surcharge / 100
          : markupPercent(item.purchasePrice ?? 0, item.unitPrice);
      initial = String(m).replace(".", ",");
    } else {
      // „purchase" liest den Einkauf, alle übrigen Preisfelder den Verkaufspreis.
      const cents = field === "purchase" ? item.purchasePrice ?? 0 : item.unitPrice;
      initial = String(cents / 100).replace(".", ",");
    }
    setPad({ itemId: item.id, field, unit: item.unit, name: item.descriptionDe, initial });
  };
  const commitPad = (value: number) => {
    if (!pad) return;
    const { itemId, field } = pad;
    setPad(null);
    if (field === "qty") {
      const amount = Math.max(0, Math.round(value * 100) / 100) || 1;
      run(() => updateItem(itemId, { amount }));
      return;
    }
    if (field === "price") {
      run(() => updateItem(itemId, { unitPrice: eurosToCents(value) }));
      return;
    }
    // Fremdleistung: Verkaufspreis, Einkauf oder Aufschlag anpassen. Der
    // Verkaufspreis bleibt maßgeblich (fester Aufschlag = Verkauf − Einkauf);
    // beim Aufschlag ergibt sich der Verkaufspreis prozentual neu.
    const item = items.find((i) => i.id === itemId);
    if (!item || item.purchasePrice == null) return;
    if (field === "markup") {
      const surcharge = Math.round(value * 100); // Prozent → Basispunkte
      run(() => updateItem(itemId, { surcharge, surchargeType: "percent" }));
    } else if (field === "purchase") {
      const purchasePrice = eurosToCents(value);
      run(() =>
        updateItem(itemId, {
          purchasePrice,
          surcharge: fixedSurchargeForSale(purchasePrice, item.unitPrice),
          surchargeType: "fixed",
        }),
      );
    } else {
      const salePrice = eurosToCents(value);
      run(() =>
        updateItem(itemId, {
          surcharge: fixedSurchargeForSale(item.purchasePrice ?? 0, salePrice),
          surchargeType: "fixed",
        }),
      );
    }
  };

  return (
    <main className="dmain">
      <div className="dscroll">
        <div className="dflow-head">
          <Link href={`/create/${documentId}/1`} className="dflow-back" aria-label={t("back")}>
            <Backward size={20} strokeWidth={STROKE} aria-hidden />
          </Link>
          <div className="dflow-headings">
            <div className="dflow-title">{t("createTitle", { type: docLabel })}</div>
            <div className="dflow-sub">{t("stepItems")}</div>
          </div>
          <FlowSteps current={2} />
        </div>

        <div className="d2-ctx">
          <span className="p2-chip p2-chip--mode">
            {context.docType === "invoice" ? (
              <ReceiptText size={15} strokeWidth={STROKE} aria-hidden />
            ) : (
              <FileText size={15} strokeWidth={STROKE} aria-hidden />
            )}
            {docLabel}
          </span>
          {context.customerName && (
            <span className="p2-chip">
              <span className="p2-av">{context.customerInitials}</span>
              {context.customerName}
            </span>
          )}
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

            {error && <div className="d2-error">{error}</div>}

            {items.length === 0 ? (
              <div className="empty empty--boxed">
                <div className="empty-t">{t("emptyPos")}</div>
                {t("emptyPosHint")}
              </div>
            ) : (
              <div className="d2cards">
                {items.map((item, i) => (
                  <PositionCard
                    key={item.id}
                    item={item}
                    index={i}
                    disabled={pending}
                    onOpenPad={openPad}
                    onDelete={remove}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="d2-sumpanel">
            <div className="d2-sum-t">{t("summary")}</div>
            <div className="d2-sum-lines">
              <div className="d2-sum-line"><span>{t("positionsWord")}</span><b>{items.length}</b></div>
              <div className="d2-sum-line"><span>{t("total")} ({t("net")})</span><b>{formatMoney(total)}</b></div>
            </div>
            <div className="d2-sum-div" />
            <div className="d2-sum-total"><span className="d2-sum-total-l">{t("total")}</span><span className="d2-sum-total-v">{formatMoney(total)}</span></div>
            {context.isKleinunternehmer && (
              <div className="d2-sum-ku">
                <Lock size={14} strokeWidth={STROKE} aria-hidden />
                {t("kuNote")}
              </div>
            )}
            <button
              type="button"
              className="d2-sum-btn"
              disabled={items.length === 0 || pending}
              onClick={() => router.push(`/create/${documentId}/3`)}
            >
              {t("next")}
              <Forward size={20} strokeWidth={2.4} aria-hidden />
            </button>
            <Link href={`/create/${documentId}/1`} className="d2-back">{t("back")}</Link>
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
              <CatalogPicker
                locale={locale}
                services={services}
                onAddCatalog={addCatalog}
                onAddFree={addFree}
                onAddFremd={addFremd}
              />
            </div>
          </div>
        </div>
      )}

      {pad && (
        <NumberPad
          field={pad.field}
          unit={pad.unit}
          name={pad.name}
          initial={pad.initial}
          onCommit={commitPad}
          onClose={() => setPad(null)}
        />
      )}
    </main>
  );
}
