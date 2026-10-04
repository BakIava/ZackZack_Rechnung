import type { DocumentRenderData } from "@/lib/pdf/render-data";

/** Einzige Eingabe jeder Vorlage: fertig berechnete, normalisierte Renderdaten. */
export interface DocumentTemplateProps {
  data: DocumentRenderData;
}
