import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import de from "@/messages/de.json";
import ar from "@/messages/ar.json";
import type { DocumentItem, DraftItem } from "@/types/document";
import { PositionCard } from "@/components/create/2/position-card";
import { PositionEditor } from "@/components/create/2/position-sheets";
import { PositionsList } from "@/components/documents/positions-list";

const draftItem: DraftItem = {
  id: "item-1",
  serviceId: null,
  position: 1,
  descriptionDe: "Innenanstrich",
  additionalDescriptionDe: null,
  amount: 1,
  unit: "m²",
  unitPrice: 10_000,
  totalAmount: 10_000,
  taxRate: 0,
  taxRateOverridden: false,
  taxAmount: 0,
  grossAmount: 10_000,
  purchasePrice: null,
  surcharge: null,
  surchargeType: null,
};
const noop = () => {};

function renderCard(item: DraftItem): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={de}>
      <PositionCard
        item={item}
        index={0}
        disabled={false}
        vat={null}
        companyVat={0}
        onOpenPad={noop}
        onEditDesc={noop}
        onEditAdditionalDescription={noop}
        onEditUnit={noop}
        onEditVat={noop}
        onDelete={noop}
      />
    </NextIntlClientProvider>,
  );
}

function renderPositions(items: DocumentItem[]): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={de}>
      <PositionsList items={items} totalAmount={10_000} />
    </NextIntlClientProvider>,
  );
}

describe("Positionsbeschreibung in Schritt 2", () => {
  it("zeigt die Hinzufügen-Aktion ohne zusätzliche Textzeile", () => {
    const html = renderCard(draftItem);

    expect(html).toContain("Beschreibung hinzufügen");
    expect(html).not.toContain("d2card-additional-description");
  });

  it("zeigt gespeicherten Text unter dem Namen für eine Fremdleistung", () => {
    const html = renderCard({
      ...draftItem,
      additionalDescriptionDe: "Erste Zeile\nZweite Zeile\nDritte Zeile",
      purchasePrice: 8_000,
      surcharge: 2_000,
      surchargeType: "fixed",
    });

    expect(html).toContain("Beschreibung bearbeiten");
    expect(html).toContain("d2card-additional-description");
    expect(html).toContain("d2card-additional-description\" dir=\"ltr\" lang=\"de\"");
    expect(html).toContain("Erste Zeile\nZweite Zeile\nDritte Zeile");
  });

  it("öffnet einen separaten vollständigen Textarea-Editor mit arabischem Hinweis", () => {
    const fullText = "Zeile 1\nZeile 2\nZeile 3";
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="ar" messages={ar}>
        <div dir="rtl">
          <PositionEditor
            editor={{
              item: { ...draftItem, additionalDescriptionDe: fullText },
              field: "additionalDescription",
              vat: null,
            }}
            companyVat={0}
            onClose={noop}
            onPreviewDesc={noop}
            onPreviewAdditionalDescription={noop}
            onPreviewUnit={noop}
            onPreviewVat={noop}
            onCommitDesc={noop}
            onCommitAdditionalDescription={noop}
            onCommitUnit={noop}
            onCommitVat={noop}
          />
        </div>
      </NextIntlClientProvider>,
    );

    expect(html).toContain("يرجى الكتابة بالألمانية");
    expect(html).toContain("<textarea");
    expect(html).toContain("dir=\"ltr\"");
    expect(html).toContain("lang=\"de\"");
    expect(html).toContain(fullText);
    expect(html).not.toContain("maxlength");
  });
});

describe("Positionsliste in der Dokumentdetailansicht", () => {
  const item: DocumentItem = {
    position: draftItem.position,
    descriptionDe: draftItem.descriptionDe,
    additionalDescriptionDe: null,
    amount: draftItem.amount,
    unit: draftItem.unit,
    unitPrice: draftItem.unitPrice,
    totalAmount: draftItem.totalAmount,
    taxRate: draftItem.taxRate,
    taxAmount: draftItem.taxAmount,
    grossAmount: draftItem.grossAmount,
  };

  it("lässt Zeilen ohne Beschreibung kompakt", () => {
    expect(renderPositions([item])).not.toContain("hpos-additional-description");
  });

  it("zeigt mehrzeiligen Text unter dem Positionsnamen", () => {
    const html = renderPositions([{ ...item, additionalDescriptionDe: "Vorbereitung\nAnstrich" }]);

    expect(html).toContain("hpos-additional-description");
    expect(html).toContain("hpos-additional-description\" dir=\"ltr\" lang=\"de\"");
    expect(html).toContain("Innenanstrich</div>");
    expect(html).toContain("Vorbereitung\nAnstrich");
  });
});
