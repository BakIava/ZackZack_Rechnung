/**
 * Zuordnung Vorlagenversion → React-PDF-Layout und einziger Render-Einstieg für
 * Browser-Vorschau und Server-PDF. Es gibt pro Version genau eine
 * Implementierung — keine getrennten Vorschau-/PDF-Layouts.
 */

import type { ComponentType, ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { DocumentRenderData } from "@/lib/pdf/render-data";
import type { DocumentTemplateRef } from "@/types/document";
import { StandardTemplate } from "./standard/standard-template";
import { ErhanExcelTemplate } from "./erhan-excel/erhan-excel-template";
import { ThsClassicTemplate } from "./ths-classic/ths-classic-template";
import { assertRenderableTemplate, DocumentTemplateError } from "./template-catalog";
import type { DocumentTemplateProps } from "./template-types";

type TemplateKey = `${DocumentTemplateRef["id"]}@${number}`;

/** Muss exakt DOCUMENT_TEMPLATE_VERSIONS entsprechen (Test: template-registry.test.ts). */
export const DOCUMENT_TEMPLATE_COMPONENTS: Readonly<
  Partial<Record<TemplateKey, ComponentType<DocumentTemplateProps>>>
> = {
  "standard@1": StandardTemplate,
  "ths-classic@1": ThsClassicTemplate,
  "erhan-excel@1": ErhanExcelTemplate,
};

export interface RenderDocumentTemplateInput {
  template: DocumentTemplateRef;
  data: DocumentRenderData;
}

/** Layout einer Vorlagenversion; wirft DocumentTemplateError statt still zurückzufallen. */
export function resolveDocumentTemplate(template: {
  id: string;
  version: number;
}): ComponentType<DocumentTemplateProps> {
  const ref = assertRenderableTemplate(template);
  const component = DOCUMENT_TEMPLATE_COMPONENTS[`${ref.id}@${ref.version}`];
  if (!component) {
    throw new DocumentTemplateError("template_not_implemented", `${ref.id}@${ref.version}`);
  }
  return component;
}

/**
 * Baut das React-PDF-Dokument einer Vorlage. Unbekannte oder noch nicht
 * implementierte Vorlagen werfen sofort — es entsteht nie ein PDF in einer
 * anderen als der gewählten Vorlage und damit auch kein falsches Archiv.
 */
export function renderDocumentTemplate({
  template,
  data,
}: RenderDocumentTemplateInput): ReactElement<DocumentProps> {
  const Template = resolveDocumentTemplate(template);
  return <Template data={data} />;
}
