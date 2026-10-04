"use client";

import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  ReceiptText,
  TriangleAlert,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { Modal } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import type { KatalogEintrag } from "@/types/service";
import type { DocumentPreview, DraftItem } from "@/types/document";
import { shouldShowTaxDetails } from "@/lib/documents/tax";
import { getCustomerName } from "@/lib/customers/utils";
import { deriveInitials } from "@/lib/initials";
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import { getPreviewPflichtChecks } from "@/lib/documents/finalize-validation";
import { CatalogPicker } from "./catalog-picker";
import { FlowSteps } from "../flow-steps";
import { NumberPad } from "./number-pad";
import { PositionCard } from "./position-card";
import { Step2PreviewPanel } from "./step2-preview-panel";
import { Step2SummaryPanel } from "./step2-summary-panel";
import { useStep2Items } from "./use-step2-items";
import "./step2-main.css";
import { PositionEditor } from "./position-sheets";

const STROKE = 1.75;

interface Step2MainProps {
  dir: "ltr" | "rtl";
  locale: Locale;
  documentId: string;
  initialPreview: DocumentPreview;
  initialItems: DraftItem[];
  logo: PdfLogo | null;
  services: KatalogEintrag[];
}

/** Desktop-Hauptbereich von Schritt 2: Positionen aus dem Draft, live in der DB. */
export function Step2Main({
  dir,
  locale,
  documentId,
  initialPreview,
  initialItems,
  logo,
  services,
}: Step2MainProps) {
  const t = useTranslations("Step2");
  const router = useRouter();
  const state = useStep2Items({ documentId, initialPreview, initialItems });
  const {
    items,
    preview,
    savedPreview,
    pending,
    error,
    modalOpen,
    pad,
    activeEditor,
    openModal,
    closeModal,
    updateTemporaryItem,
    closePad,
    closeEditor,
    addCatalog,
    addFree,
    addFremd,
    remove,
    editDesc,
    editAdditionalDescription,
    editUnit,
    editVat,
    openPad,
    previewPad,
    previewDesc,
    previewAdditionalDescription,
    previewUnit,
    previewVat,
    commitPad,
    commitDesc,
    commitAdditionalDescription,
    commitUnit,
    commitVat,
  } = state;

  const Forward = dir === "rtl" ? ChevronLeft : ChevronRight;
  const Backward = dir === "rtl" ? ChevronRight : ChevronLeft;
  const docLabel = t(preview.docType);
  const showTaxDetails = shouldShowTaxDetails(preview.isKleinunternehmer, items);
  const customerName = getCustomerName(preview.customer);
  const customerInitials = deriveInitials(preview.customer);
  const visibleItems = items.map((item) => ({
    ...item,
    additionalDescriptionDe: preview.items.find(
      (entry) => entry.position === item.position,
    )?.additionalDescriptionDe ?? null,
  }));
  const hasRecipientIssue = getPreviewPflichtChecks(preview).some(
    (check) =>
      !check.ok && (check.feld === "customerName" || check.feld === "customerAddress"),
  );

  return (
    <main className="dmain step2-main">
      <div className="dscroll step2-main__scroll">
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
            {preview.docType === "invoice" ? (
              <ReceiptText size={15} strokeWidth={STROKE} aria-hidden />
            ) : (
              <FileText size={15} strokeWidth={STROKE} aria-hidden />
            )}
            {docLabel}
          </span>
          {customerName && (
            <span className="p2-chip">
              <span className="p2-av">{customerInitials}</span>
              {customerName}
            </span>
          )}
        </div>

        <div className="d2-wrap" data-testid="step2-workspace">
          <section className="d2-positions" data-testid="step2-positions-column">
            <button type="button" className="d2-add" onClick={openModal}>
              <span className="d2-add-ic">
                <Plus size={26} strokeWidth={2.4} color="#fff" aria-hidden />
              </span>
              <span className="d2-add-txt">
                <span className="d2-add-t">{t("addPosition")}</span>
                <span className="d2-add-s">{t("fromCatalog")} · {t("freePosition")} · {t("subcontract")}</span>
              </span>
              <Forward size={22} strokeWidth={STROKE} aria-hidden />
            </button>

            {hasRecipientIssue && (
              <div className="d2-recipient-hint" role="status" data-testid="step2-recipient-hint">
                <TriangleAlert size={20} strokeWidth={STROKE} aria-hidden />
                <span>
                  <b>{t("recipientHintTitle")}</b>
                  {t(preview.docType === "quote" ? "recipientHintQuote" : "recipientHintInvoice")}
                </span>
              </div>
            )}

            {error && <div className="d2-error">{error}</div>}

            {items.length === 0 ? (
              <div className="empty empty--boxed">
                <div className="empty-t">{t("emptyPos")}</div>
                {t("emptyPosHint")}
              </div>
            ) : (
              <div className="d2cards">
                {visibleItems.map((item, i) => (
                  <PositionCard
                    key={item.id}
                    item={item}
                    index={i}
                    disabled={pending}
                    vat={item.taxRateOverridden ? item.taxRate : null}
                    companyVat={preview.defaultTaxRate}
                    onOpenPad={openPad}
                    onEditDesc={editDesc}
                    onEditAdditionalDescription={editAdditionalDescription}
                    onEditUnit={editUnit}
                    onEditVat={editVat}
                    onDelete={remove}
                  />
                ))}
              </div>
            )}
            <Step2SummaryPanel
              dir={dir}
              documentId={documentId}
              itemCount={items.length}
              totals={{
                netAmount: savedPreview.netAmount,
                taxAmount: savedPreview.taxAmount,
                grossAmount: savedPreview.totalAmount,
                taxGroups: savedPreview.taxGroups,
              }}
              showTaxDetails={showTaxDetails}
              pending={pending}
              onNext={() => router.push(`/create/${documentId}/3`)}
            />
          </section>

          <aside className="d2-document" data-testid="step2-document-column">
            <Step2PreviewPanel
              preview={preview}
              logo={logo}
              savedItemCount={items.length}
              loading={pending}
            />
          </aside>
        </div>
      </div>

      {modalOpen && (
        <Modal
          open
          onClose={closeModal}
          dir={dir}
          size="lg"
          className="zz-modal--positions"
          ariaLabel={t("addPosition")}
        >
          <div className="dmodal-head">
            <span className="dmodal-title">{t("addPosition")}</span>
            <button type="button" className="sheet-x" onClick={closeModal} aria-label={t("close")}>
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
              onPreviewChange={updateTemporaryItem}
            />
          </div>
        </Modal>
      )}

      {pad && (
        <NumberPad
          field={pad.field}
          unit={pad.unit}
          name={pad.name}
          initial={pad.initial}
          onPreview={previewPad}
          onCommit={commitPad}
          onClose={closePad}
        />
      )}

      <PositionEditor
        editor={activeEditor}
        companyVat={preview.defaultTaxRate}
        onClose={closeEditor}
        onPreviewDesc={previewDesc}
        onPreviewAdditionalDescription={previewAdditionalDescription}
        onPreviewUnit={previewUnit}
        onPreviewVat={previewVat}
        onCommitDesc={commitDesc}
        onCommitAdditionalDescription={commitAdditionalDescription}
        onCommitUnit={commitUnit}
        onCommitVat={commitVat}
      />
    </main>
  );
}
