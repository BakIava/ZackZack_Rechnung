import { getCustomerName } from "@/lib/customers/utils";
import { istFinalisierbar, pruefeDokumentPflicht } from "@/lib/legal/dokument-pflicht";
import type { DocumentPreview } from "@/types/document";

/** Eine einzige serverseitige Pflichtprüfung für jeden Finalisierungsaufruf. */
export function canFinalizePreview(preview: DocumentPreview): boolean {
  return istFinalisierbar(
    pruefeDokumentPflicht({
      docType: preview.docType,
      companyName: preview.company.name,
      companyStreet: preview.company.street,
      companyPostcode: preview.company.postcode,
      companyCity: preview.company.city,
      companySteuernummer: preview.company.steuernummer,
      companyUstId: preview.company.ustId,
      issueDate: preview.issueDate,
      validUntil: preview.validUntil,
      itemCount: preview.items.length,
      totalAmountCents: preview.totalAmount,
      customerName: getCustomerName(preview.customer),
      customerStreet: preview.customer?.street ?? null,
      customerStreetNo: preview.customer?.streetNo ?? null,
      customerPostcode: preview.customer?.postcode ?? null,
      customerCity: preview.customer?.city ?? null,
    }),
  );
}
