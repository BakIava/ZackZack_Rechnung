"use client";

import {
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { PositionPickerModal } from "./position-picker-modal";
import { Link, useRouter } from "@/i18n/navigation";
import type { KatalogEintrag } from "@/types/service";
import type { DocumentPreview, DraftItem, DraftItemBatchChange } from "@/types/document";
import { changeSelectedDraftItems, type BulkItemsResult } from "@/lib/documents/item-bulk-actions";
import { shouldShowTaxDetails } from "@/lib/documents/tax";
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import { getPreviewPflichtChecks } from "@/lib/documents/finalize-validation";
import { CatalogPicker } from "./catalog-picker";
import { FlowSteps } from "../flow-steps";
import { DeleteDraftButton } from "@/components/documents/delete-draft-button";
import { NumberPad } from "./number-pad";
import { PositionAddEnd } from "./position-add-end";
import { PositionList } from "./position-list";
import { PositionSelectionBar } from "./position-selection-bar";
import { PositionSelectionDialog } from "./position-selection-dialog";
import { usePositionSelection } from "./use-position-selection";
import { TextCheck } from "./text-check";
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
  /** Firma – trennt den Browser-Speicher des Nachweis-Reiters. */
  cacheScope: string;
  /** Entwurf ohne Nummer und ohne Verknüpfung – zeigt „Löschen". */
  deletable?: boolean;
  bulkItemsAction?: (documentId: string, ids: string[], change: DraftItemBatchChange) => Promise<BulkItemsResult>;
}

/** Desktop-Hauptbereich von Schritt 2: Positionen aus dem Draft, live in der DB. */
export function Step2Main({
  dir,
  locale,
  documentId,
  cacheScope,
  initialPreview,
  initialItems,
  logo,
  services,
  deletable = false,
  bulkItemsAction = changeSelectedDraftItems,
}: Step2MainProps) {
  const t = useTranslations("Step2");
  const router = useRouter();
  const state = useStep2Items({ documentId, initialPreview, initialItems });
  const {
    items,
    preview,
    savedPreview,
    pending,
    nachweisPending,
    error,
    modalOpen,
    modalTab,
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
    addNachweis,
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
    applyItemsResult,
  } = state;

  const selection = usePositionSelection(items, async (ids, change) => {
    const result = await bulkItemsAction(documentId, ids, change);
    if ("items" in result) applyItemsResult(result);
    return result;
  });
  const saving = pending || selection.pending;

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
          {deletable && (
            <DeleteDraftButton documentId={documentId} dir={dir} variant="label"
              onDeleted={() => router.replace("/documents")} />
          )}
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

              {(items.length > 0 || selection.ids !== null) && (
                <PositionSelectionBar
                  active={selection.ids !== null}
                  count={selection.selected.length}
                  pending={saving}
                  outcomeUnknown={selection.outcomeUnknown}
                  showOutcomeError={selection.outcomeUnknown && selection.dialog === null}
                  onStart={selection.start}
                  onEnd={selection.end}
                  onDelete={() => selection.openDialog("delete")}
                  onVat={() => selection.openDialog("vat")}
                  onReorder={items.length > 1 ? reorder.open : undefined}
                  extraActions={<TextCheck documentId={documentId} items={items} dir={dir}
                    disabled={saving} onApplied={applyItemsResult} />}
                />
              )}

              {/* Auch leer eingebunden: sonst startet die Liste beim ersten
                  Eintrag neu und erkennt ihn nicht als „neu hinzugefügt". */}
              <PositionList
                items={visibleItems}
                disabled={saving}
                selection={selection.ids ? { ids: selection.ids, toggle: selection.toggle } : undefined}
                companyVat={preview.defaultTaxRate}
                onOpenPad={openPad}
                onEditDesc={editDesc}
                onEditAdditionalDescription={editAdditionalDescription}
                onEditUnit={editUnit}
                onEditVat={editVat}
                onDelete={remove}
                onMoveTo={items.length > 1 ? reorder.openPicker : null}
              />
              {!selection.ids && (
                <PositionAddEnd
                  empty={items.length === 0}
                  onAdd={() => openModal("frei")}
                  onAddNachweis={() => openModal("nachweis")}
                />
              )}
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
              pending={saving}
              onNext={() => router.push(`/create/${documentId}/3`)}
            />
          </section>

          <aside className="d2-document" data-testid="step2-document-column">
            <Step2PreviewPanel
              preview={preview}
              logo={logo}
              loading={saving}
            />
          </aside>
        </div>
      </div>

      {selection.dialog && (
        <PositionSelectionDialog
          kind={selection.dialog}
          items={selection.selected}
          defaultRate={preview.defaultTaxRate}
          dir={dir}
          pending={selection.pending}
          error={selection.error}
          onClose={selection.closeDialog}
          onSubmit={(change) => void selection.submit(change)}
        />
      )}

      {modalOpen && (
        <PositionPickerModal dir={dir} pending={nachweisPending} onClose={closeModal}>
          <CatalogPicker
            documentId={documentId}
            nachweisCacheScope={cacheScope}
            initialTab={modalTab}
            locale={locale}
            services={services}
            onAddCatalog={addCatalog}
            onAddFree={addFree}
            onAddFremd={addFremd}
            onAddNachweis={addNachweis}
            onPreviewChange={updateTemporaryItem}
          />
        </PositionPickerModal>
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
