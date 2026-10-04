import { getCustomerName } from "@/lib/customers/utils";
import {
  istFinalisierbar,
  pruefeDokumentPflicht,
  type PflichtCheck,
} from "@/lib/legal/dokument-pflicht";
import type { DocumentPreview } from "@/types/document";

/** Gemeinsame dokumentbezogene Prüfliste für Schritt 2, Schritt 3 und Action. */
export function getPreviewPflichtChecks(preview: DocumentPreview): PflichtCheck[] {
  return pruefeDokumentPflicht({
    docType: preview.docType,
    issueDate: preview.issueDate,
    validUntil: preview.validUntil,
    itemCount: preview.items.length,
    totalAmountCents: preview.totalAmount,
    customerName: getCustomerName(preview.customer),
    customerStreet: preview.customer?.street ?? null,
    customerStreetNo: preview.customer?.streetNo ?? null,
    customerPostcode: preview.customer?.postcode ?? null,
    customerCity: preview.customer?.city ?? null,
  });
}

/** Eine einzige serverseitige Pflichtprüfung für jeden Finalisierungsaufruf. */
export function canFinalizePreview(preview: DocumentPreview): boolean {
  return istFinalisierbar(getPreviewPflichtChecks(preview));
}
