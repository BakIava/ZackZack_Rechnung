"use client";

import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
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
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import { getPreviewPflichtChecks } from "@/lib/documents/finalize-validation";
import { CatalogPicker } from "./catalog-picker";
import { FlowSteps } from "../flow-steps";
import { NumberPad } from "./number-pad";
import { PositionAddEnd } from "./position-add-end";
import { PositionList } from "./position-list";
import { PositionPickerDialog } from "./position-picker";
import { ReorderSheet } from "./reorder-sheet";
import { Step2PreviewPanel } from "./step2-preview-panel";
import { Step2SummaryBar } from "./step2-summary-bar";
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
    reorder,
  } = state;

  const Backward = dir === "rtl" ? ChevronRight : ChevronLeft;
  const docLabel = t(preview.docType);
  const showTaxDetails = shouldShowTaxDetails(preview.isKleinunternehmer, items);
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

        <div className="d2-wrap" data-testid="step2-workspace">
          <section className="d2-positions" data-testid="step2-positions-column">
            <div className="d2-positions-body">
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

              {items.length > 1 && (
                <button type="button" className="d2-reorder-open" disabled={pending} onClick={reorder.open}>
                  <ArrowUpDown size={18} strokeWidth={STROKE} aria-hidden />
                  {t("reorderOpen")}
                </button>
              )}

              {/* Auch leer eingebunden: sonst startet die Liste beim ersten
                  Eintrag neu und erkennt ihn nicht als „neu hinzugefügt". */}
              <PositionList
                items={visibleItems}
                disabled={pending}
                companyVat={preview.defaultTaxRate}
                onOpenPad={openPad}
                onEditDesc={editDesc}
                onEditAdditionalDescription={editAdditionalDescription}
                onEditUnit={editUnit}
                onEditVat={editVat}
                onDelete={remove}
                onMoveTo={items.length > 1 ? reorder.openPicker : null}
              />
              <PositionAddEnd empty={items.length === 0} onAdd={openModal} />
            </div>
            <Step2SummaryBar
              dir={dir}
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

      {reorder.isOpen && (
        <ReorderSheet dir={dir} items={items} onSave={reorder.save} onClose={reorder.close} />
      )}
      {reorder.pickerItem && (
        <PositionPickerDialog dir={dir} items={items} item={reorder.pickerItem}
          onPick={reorder.moveTo} onClose={reorder.closePicker} />
      )}

      {pad && (
        <NumberPad
          field={pad.field}
          unit={pad.unit}
          name={pad.name}
          initial={pad.initial}
          signed={pad.field === "price" || pad.field === "sale"}
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
