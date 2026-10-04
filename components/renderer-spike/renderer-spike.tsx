"use client";

import { useEffect, useMemo, useState } from "react";
import { PDFViewer, usePDF } from "@react-pdf/renderer";
import { useTranslations } from "next-intl";
import { DocumentPdf } from "@/lib/pdf/document-pdf";
import { formatMoney } from "@/lib/format";
import { deriveCompanyMonogram } from "@/lib/initials";
import { registerBrowserPdfFonts } from "@/lib/pdf/browser-fonts";
import {
  createMultiPageDocument,
  createSinglePageDocument,
  GLYPH_EVIDENCE,
} from "./sample-documents";
import "./renderer-spike.css";

registerBrowserPdfFonts();

async function countPdfPages(blob: Blob): Promise<number> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const source = new TextDecoder("latin1").decode(bytes);
  return source.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

interface RenderStatusProps {
  loading: boolean;
  error: string | null;
  pages: number | null;
  readyLabel: string;
  renderingLabel: string;
  errorLabel: string;
}

function RenderStatus({
  loading,
  error,
  pages,
  readyLabel,
  renderingLabel,
  errorLabel,
}: RenderStatusProps) {
  const text = error
    ? `${errorLabel}: ${error}`
    : loading || pages === null
      ? renderingLabel
      : `${readyLabel}: ${pages}`;
  return <output data-testid="multi-render-status">{text}</output>;
}

export function RendererSpike() {
  const t = useTranslations("RendererHarness");
  const [unitPrice, setUnitPrice] = useState(12_500);
  const [pages, setPages] = useState<number | null>(null);
  const single = useMemo(() => createSinglePageDocument(), []);
  const multi = useMemo(() => createMultiPageDocument(unitPrice), [unitPrice]);
  const singleDocument = useMemo(
    () => <DocumentPdf preview={single} logo={null} />,
    [single],
  );
  const multiDocument = useMemo(
    () => <DocumentPdf preview={multi} logo={null} />,
    [multi],
  );
  const [instance, updateInstance] = usePDF();

  useEffect(() => {
    setPages(null);
    updateInstance(multiDocument);
  }, [multiDocument, updateInstance]);

  useEffect(() => {
    let active = true;
    if (!instance.blob) return;
    countPdfPages(instance.blob).then((count) => {
      if (active) setPages(count);
    });
    return () => {
      active = false;
    };
  }, [instance.blob]);

  return (
    <main className="renderer-spike" data-testid="renderer-harness">
      <header className="renderer-spike__header">
        <div>
          <p className="renderer-spike__eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p>{t("note")}</p>
        </div>
      </header>

      <div className="renderer-spike__evidence">
        <span data-testid="glyph-evidence">{GLYPH_EVIDENCE}</span>
        <span data-testid="logo-fallback">
          {t("logoFallback")}: {deriveCompanyMonogram(single.company.name)}
        </span>
      </div>

      <section className="renderer-spike__panel">
        <h2>{t("single")}</h2>
        <PDFViewer
          className="renderer-spike__viewer"
          data-testid="single-pdf-viewer"
          showToolbar={false}
        >
          {singleDocument}
        </PDFViewer>
      </section>

      <section className="renderer-spike__panel">
        <div className="renderer-spike__panel-head">
          <div>
            <h2>{t("multi")}</h2>
            <RenderStatus
              loading={instance.loading}
              error={instance.error}
              pages={pages}
              readyLabel={t("ready")}
              renderingLabel={t("rendering")}
              errorLabel={t("error")}
            />
          </div>
          <button
            type="button"
            data-testid="update-price"
            onClick={() => setUnitPrice((current) => current + 1_000)}
          >
            {t("update")}
          </button>
        </div>
        <p data-testid="current-price">
          {t("price")}: {formatMoney(unitPrice)}
        </p>
        <iframe
          className="renderer-spike__viewer"
          data-testid="multi-pdf-viewer"
          src={instance.url ?? undefined}
          title={t("multi")}
        />
      </section>
    </main>
  );
}
