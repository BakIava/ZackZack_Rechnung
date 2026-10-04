"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DocumentPdfPreview } from "@/components/create/3/document-pdf-preview";
import { buildPdfViewModel } from "@/lib/pdf/pdf-view-model";
import { buildDocumentRenderData } from "@/lib/pdf/render-data";
import {
  createPackage02Document,
  PACKAGE_02_VARIANTS,
  type Package02Variant,
} from "./sample-documents";
import "./package-02-renderer.css";

export function Package02Renderer() {
  const t = useTranslations("CanonicalRendererHarness");
  const [variant, setVariant] = useState<Package02Variant>("invoice-ku");
  const preview = useMemo(() => createPackage02Document(variant), [variant]);
  const vm = useMemo(
    () => buildPdfViewModel(buildDocumentRenderData(preview, null)),
    [preview],
  );

  return (
    <main className="package-02-renderer" data-testid="package-02-harness">
      <header className="package-02-renderer__head">
        <p>{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
      </header>

      <nav className="package-02-renderer__variants" aria-label={t("variants")}>
        {PACKAGE_02_VARIANTS.map((entry) => (
          <button
            key={entry}
            type="button"
            data-testid={`variant-${entry}`}
            aria-pressed={variant === entry}
            onClick={() => setVariant(entry)}
          >
            {t(entry)}
          </button>
        ))}
      </nav>

      <section
        className="package-02-renderer__evidence"
        data-testid="render-model-evidence"
        data-document-language="de"
        data-document-direction="ltr"
        dir="ltr"
        lang="de"
      >
        <h2 data-testid="model-title">{vm.title}</h2>
        <p data-testid="model-recipient">{vm.recipientName}</p>
        <p data-testid="model-service-timing">
          {vm.serviceTimingLabel} {vm.serviceTimingValue}
        </p>
        <p data-testid="model-valid-until">{vm.validUntilValue}</p>
        <p data-testid="model-tax-lines">
          {vm.taxLines.map((line) => `${line.label}: ${line.amountText}`).join(" · ")}
        </p>
        {vm.showKleinunternehmerHinweis && (
          <p data-testid="model-ku-note">{vm.kleinunternehmerHinweis}</p>
        )}
        <div data-testid="model-rows">
          {vm.rows.map((row) => (
            <p
              key={row.position}
              data-testid="model-row"
              data-description={row.descriptionDe}
            >
              {row.position} · {row.descriptionDe} · {row.mengeText} · {row.unitPriceText}
              {row.taxRateText ? ` · ${row.taxRateText}` : ""} · {row.totalText}
            </p>
          ))}
        </div>
      </section>

      <DocumentPdfPreview
        preview={preview}
        logo={null}
        testId="canonical-pdf-preview"
      />
    </main>
  );
}
