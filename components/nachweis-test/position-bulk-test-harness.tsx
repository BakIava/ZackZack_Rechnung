"use client";

import { useRef, useState } from "react";
import { Step2Frame } from "@/components/create/2/step2-frame";
import { Step2Main } from "@/components/create/2/step2-main";
import { SidebarPanel } from "@/components/layout/sidebar-panel";
import { isRtlLocale, type Locale } from "@/i18n/routing";
import { withPersistedDocumentItems } from "@/lib/documents/document-preview-state";
import type { BulkItemsResult } from "@/lib/documents/item-bulk-actions";
import { calculateDocumentTotals, calculateLineAmounts } from "@/lib/documents/tax";
import type { DocumentPreview, DraftItem, DraftItemBatchChange, TaxRate } from "@/types/document";

const documentId = "10000000-0000-0000-0000-000000000001";
const defaultTaxRate = 19;

function item(position: number, descriptionDe: string, amount: number, unitPrice: number, taxRate: TaxRate, override: boolean): DraftItem {
  const { netAmount, taxAmount, grossAmount } = calculateLineAmounts(unitPrice, amount, taxRate);
  return {
    id: `30000000-0000-0000-0000-00000000000${position}`, position, descriptionDe, amount, unitPrice,
    unit: "Stk.", taxRate, taxRateOverridden: override,
    totalAmount: netAmount, taxAmount, grossAmount,
    serviceId: null, purchasePrice: null, surcharge: null, surchargeType: null,
  };
}

const initialItems = [
  item(1, "Türen einstellen", 2, 5000, 7, true),
  item(2, "Anfahrt", 1, 3500, 19, false),
  item(3, "Beschläge", 1, 4000, 0, true),
];

function totals(items: DraftItem[]) {
  return calculateDocumentTotals(items.map((entry) => ({
    netAmount: entry.totalAmount, taxRate: entry.taxRate,
    taxAmount: entry.taxAmount, grossAmount: entry.grossAmount,
  })));
}

const preview: DocumentPreview = {
  id: documentId, docType: "invoice", status: "draft", defaultTaxRate, isKleinunternehmer: false,
  documentNumber: null, issueDate: "2026-11-23", serviceDate: null, servicePeriodStart: null,
  servicePeriodEnd: null, servicePeriodIsMonth: false, validUntil: null, customer: null,
  convertedInvoiceId: null, basedOnQuoteId: null,
  company: {
    name: "Beispielwerkstatt", legalForm: null, street: "Musterweg", streetNo: "1",
    postcode: "10000", city: "Musterstadt", phone: null, mobile: null, fax: null, email: null, website: null,
    director: null, steuernummer: null, ustId: null, bankName: null, iban: null,
    bic: null, accountHolder: null, logoUrl: null, paymentDays: 14,
  },
  template: { id: "standard", version: 1 },
  items: [], taxGroups: [], totalAmount: 0, netAmount: 0, taxAmount: 0,
};
const initialPreview = withPersistedDocumentItems(preview, initialItems, totals(initialItems));

interface PositionBulkTestHarnessProps {
  locale: Locale;
  failOnce: boolean;
}

export function PositionBulkTestHarness({ locale, failOnce }: PositionBulkTestHarnessProps) {
  const items = useRef(initialItems);
  const [attempts, setAttempts] = useState(0);
  const calls = useRef(0);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  async function bulkFixture(_id: string, selected: string[], operation: DraftItemBatchChange): Promise<BulkItemsResult> {
    const attempt = ++calls.current;
    setAttempts(attempt);
    await new Promise((resolve) => setTimeout(resolve, 175));
    if (failOnce && attempt === 1) return { error: "selectionChanged" };

    const ids = new Set(selected);
    items.current = operation.kind === "delete"
      ? items.current.filter(({ id }) => !ids.has(id)).map((entry, index) => ({ ...entry, position: index + 1 }))
      : items.current.map((entry) => {
        if (!ids.has(entry.id)) return entry;
        const taxRate = operation.taxRate ?? defaultTaxRate;
        const { taxAmount, grossAmount } = calculateLineAmounts(entry.unitPrice, entry.amount, taxRate);
        return { ...entry, taxRate, taxAmount, grossAmount, taxRateOverridden: operation.taxRate !== null };
      });
    return { items: items.current, totals: totals(items.current) };
  }

  return (
    <Step2Frame dir={dir} sidebar={
      <SidebarPanel companyName="Beispielwerkstatt" ownerName="" initials="BW"
        customerCount={0} catalogCount={0} initialCollapsed persist={false} />
    }>
      <Step2Main dir={dir} locale={locale} documentId={documentId} cacheScope="test"
        initialPreview={initialPreview} initialItems={initialItems} logo={null} services={[]}
        bulkItemsAction={bulkFixture} />
      <output hidden data-testid="position-bulk-attempts" data-count={attempts} />
    </Step2Frame>
  );
}
