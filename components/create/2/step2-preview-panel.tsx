"use client";

import { useTranslations } from "next-intl";
import { DocumentPdfPreviewLoader } from "@/components/create/3/document-pdf-preview-loader";
import { getCustomerName } from "@/lib/customers/utils";
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import type { DocumentPreview } from "@/types/document";
import "./step2-preview-panel.css";

interface Step2PreviewPanelProps {
  preview: DocumentPreview;
  logo: PdfLogo | null;
  savedItemCount: number;
  loading: boolean;
}

export function Step2PreviewPanel({
  preview,
  logo,
  savedItemCount,
  loading,
}: Step2PreviewPanelProps) {
  const t = useTranslations("Step2");
  const recipient = getCustomerName(preview.customer);

  return (
    <section
      className="step2-preview-panel"
      data-testid="step2-document-preview"
      data-preview-position-count={preview.items.length}
      data-preview-position-sequence={preview.items.map((item) => item.position).join(",")}
      data-preview-descriptions={preview.items.map((item) => item.descriptionDe).join(" | ")}
      data-preview-amounts={preview.items.map((item) => item.amount).join(",")}
      data-preview-units={preview.items.map((item) => item.unit).join(" | ")}
      data-preview-unit-prices={preview.items.map((item) => item.unitPrice).join(",")}
      data-preview-line-totals={preview.items.map((item) => item.totalAmount).join(",")}
      data-preview-tax-rates={preview.items.map((item) => item.taxRate).join(",")}
      data-preview-tax-amounts={preview.items.map((item) => item.taxAmount).join(",")}
      data-preview-tax-group-rates={preview.taxGroups.map((group) => group.rate).join(",")}
      data-preview-tax-group-amounts={preview.taxGroups.map((group) => group.taxAmount).join(",")}
      data-preview-net-amount={preview.netAmount}
      data-preview-tax-amount={preview.taxAmount}
      data-preview-total-amount={preview.totalAmount}
    >
      <div className="step2-preview-panel__head">
        <h2>{t("documentPreview")}</h2>
        <span>{t("savedPositions", { count: savedItemCount })}</span>
      </div>
      <p className="step2-preview-panel__parties">
        <span data-testid="step2-preview-company">{preview.company.name}</span>
        <span aria-hidden>→</span>
        <span data-testid="step2-preview-recipient">{recipient}</span>
      </p>
      <DocumentPdfPreviewLoader
        preview={preview}
        logo={logo}
        testId="step2-pdf-preview"
        loading={loading}
      />
    </section>
  );
}
