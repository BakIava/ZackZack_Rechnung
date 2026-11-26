"use client";

import {
  Check,
  FileText,
  Plus,
  ReceiptText,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { NavigationForm } from "@/components/shared/navigation-form";
import { getDocumentItems } from "@/lib/repositories/document-items.client";
import { markDocumentAsPaid } from "@/lib/documents/actions";
import { startNewDocument } from "@/lib/documents/draft-actions";
import type { DocumentListItem, DocumentItem } from "@/types/document";
import { formatMoney } from "@/lib/format";
import { DocDetail } from "./doc-detail";
import { DocDetailPanel } from "./doc-detail-panel";
import { DocumentListRow } from "./document-list-row";
import "./documents-main.css";

interface DocumentsMainProps {
  dir: "ltr" | "rtl";
  documents: DocumentListItem[];
  paymentDays: number;
  companyName: string;
  /** Über /documents/[document_id] direkt geöffnetes Dokument; null → nichts vorausgewählt. */
  initialSelectedId?: string | null;
}

type TypeFilter = "all" | "invoice" | "quote";
type StatusFilter = "all" | "offen" | "bezahlt" | "versendet" | "entwurf";

const STROKE = 1.75;

const STATUS_DOT_CLASS: Record<string, string> = {
  offen: "warn",
  bezahlt: "ok",
  versendet: "info",
  entwurf: "draft",
};

function matchesStatusFilter(doc: DocumentListItem, f: StatusFilter): boolean {
  if (f === "offen") return doc.type === "invoice" && doc.paidAt === null && (doc.status === "finalized" || doc.status === "sent");
  if (f === "bezahlt") return doc.type === "invoice" && doc.paidAt !== null;
  if (f === "versendet") return doc.type === "invoice" && doc.status === "sent";
  if (f === "entwurf") return doc.status === "draft";
  return true;
}

export function DocumentsMain({
  dir,
  documents,
  paymentDays,
  companyName,
  initialSelectedId = null,
}: DocumentsMainProps) {
  const t = useTranslations("Documents");
  const statusT = useTranslations("DocumentStatus");
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [typeF, setTypeF] = useState<TypeFilter>("all");
  const [statusF, setStatusF] = useState<StatusFilter>("all");
  const [sel, setSel] = useState<string | null>(initialSelectedId);
  const [detailItems, setDetailItems] = useState<DocumentItem[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    if (!sel) {
      setDetailItems(null);
      return;
    }
    setDetailLoading(true);
    setDetailItems(null);
    getDocumentItems(sel).then((items) => {
      setDetailItems(items);
      setDetailLoading(false);
    });
  }, [sel]);

  function openDocument(doc: DocumentListItem) {
    if (doc.status === "draft") router.push(`/create/${doc.id}/2`);
    else setSel(doc.id);
  }

  async function handleMarkPaid() {
    if (!sel || markingPaid) return;
    setMarkingPaid(true);
    const result = await markDocumentAsPaid(sel);
    setMarkingPaid(false);
    if (!result.error) {
      router.refresh();
    }
  }

  // ── Stat cards (computed from loaded data, no extra DB calls) ───────────────
  const openDocs = documents.filter(
    (d) => d.type === "invoice"
      && d.paidAt === null
      && (d.status === "finalized" || d.status === "sent"),
  );
  const openSum = openDocs.reduce((s, d) => s + d.totalAmount, 0);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const paidDocs = documents.filter(
    (d) => d.type === "invoice"
      && d.paidAt !== null
      && new Date(d.paidAt) > ninetyDaysAgo,
  );
  const paidSum = paidDocs.reduce((s, d) => s + d.totalAmount, 0);

  const thisYear = new Date().getFullYear();
  const yearCount = documents.filter(
    (d) => new Date(d.issueDate).getFullYear() === thisYear,
  ).length;

  // ── Filter badge counts ──────────────────────────────────────────────────────
  const counts = {
    offen: openDocs.length,
    bezahlt: documents.filter((d) => d.type === "invoice" && d.paidAt !== null).length,
    versendet: documents.filter((d) => d.type === "invoice" && d.status === "sent").length,
    entwurf: documents.filter((d) => d.status === "draft").length,
  };

  // ── Filtered list ────────────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();
  const filtered = documents.filter(
    (d) =>
      (typeF === "all" ||
        (typeF === "invoice" ? d.type === "invoice" : d.type === "quote")) &&
      matchesStatusFilter(d, statusF) &&
      (!q ||
        d.documentNumber.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q)),
  );

  const selDoc = sel ? (documents.find((d) => d.id === sel) ?? null) : null;  

  const typeFilters: { id: TypeFilter; label: string }[] = [
    { id: "all", label: t("fAll") },
    { id: "invoice", label: t("fInvoice") },
    { id: "quote", label: t("fQuote") },
  ];

  const statusFilters: { id: Exclude<StatusFilter, "all">; label: string }[] = [
    { id: "offen", label: statusT("open") },
    { id: "bezahlt", label: statusT("paid") },
    { id: "versendet", label: statusT("sent") },
    { id: "entwurf", label: statusT("draft") },
  ];

  return (
    <main className="dmain">
      <div className="dtopbar">
        <div>
          <div className="greet-sub">{t("subtitle")}</div>
          <div className="greet-main">{t("title")}</div>
        </div>
        <div className="dtools">
          <div className="dsearch">
            <Search size={18} strokeWidth={STROKE} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
            />
            {query && (
              <button className="documents-search-clear" onClick={() => setQuery("")}>
                <X size={16} strokeWidth={STROKE} />
              </button>
            )}
          </div>
          <NavigationForm action={startNewDocument} className="contents">
            <button type="submit" className="documents-new-button">
              <Plus size={19} strokeWidth={2.5} />
              {t("newBtn")}
            </button>
          </NavigationForm>
        </div>
      </div>

      <div className="dscroll">
        {/* Kennzahlen */}
        <div className="hstat-row">
          <div className="hstat">
            <div className="hstat-top">
              <span className="hstat-ic hstat-ic--warn">
                <ReceiptText size={19} strokeWidth={STROKE} />
              </span>
              <span className="hstat-lbl">{t("statOpen")}</span>
            </div>
            <div className="hstat-val">{formatMoney(openSum)}</div>
            <div className="hstat-sub">
              {openDocs.length === 1
                ? t("statOpenSub", { count: 1 })
                : t("statOpenSubPlural", { count: openDocs.length })}
            </div>
          </div>
          <div className="hstat">
            <div className="hstat-top">
              <span className="hstat-ic hstat-ic--ok">
                <Check size={19} strokeWidth={2.5} />
              </span>
              <span className="hstat-lbl">{t("statPaid")}</span>
            </div>
            <div className="hstat-val">{formatMoney(paidSum)}</div>
            <div className="hstat-sub">
              {paidDocs.length === 1
                ? t("statPaidSub", { count: 1 })
                : t("statPaidSubPlural", { count: paidDocs.length })}
            </div>
          </div>
          <div className="hstat">
            <div className="hstat-top">
              <span className="hstat-ic hstat-ic--primary">
                <FileText size={19} strokeWidth={STROKE} />
              </span>
              <span className="hstat-lbl">{t("statCount")}</span>
            </div>
            <div className="hstat-val">{yearCount}</div>
            <div className="hstat-sub">{t("statCountSub")}</div>
          </div>
        </div>

        {/* Filter */}
        <div className="hfilter">
          {typeFilters.map((f) => (
            <button
              key={f.id}
              className="hfbtn"
              data-on={typeF === f.id ? "1" : "0"}
              onClick={() => setTypeF(f.id)}
            >
              {f.label}
            </button>
          ))}
          <span className="hfilter-div" />
          {statusFilters.map((f) => (
            <button
              key={f.id}
              className="hfbtn"
              data-on={statusF === f.id ? "1" : "0"}
              onClick={() => setStatusF(statusF === f.id ? "all" : f.id)}
            >
              <span className={`hfbtn-dot hfbtn-dot--${STATUS_DOT_CLASS[f.id]}`} />
              {f.label}
              <span className="hfbtn-n">{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {/* Hauptgrid: Liste + Detail */}
        <div className="hdocs-grid">
          <div>
            <div className="hlist-head">
              <span className="hlist-t">{t("listHead")}</span>
              <span className="hlist-count">
                {filtered.length} / {documents.length}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="hempty-list">
                <div className="hempty-list-t">{t("noResults")}</div>
                <div className="hempty-list-s">{t("noResultsSub")}</div>
              </div>
            ) : (
              <div className="hlist">
                {filtered.map((d) => (
                  <DocumentListRow
                    key={d.id}
                    doc={d}
                    selected={sel === d.id}
                    dir={dir}
                    onOpen={openDocument}
                    onDeleted={() => router.refresh()}
                  />
                ))}
              </div>
            )}
          </div>

          <DocDetailPanel open={selDoc !== null} onClose={() => setSel(null)}>
            <DocDetail
              doc={selDoc}
              items={detailItems}
              itemsLoading={detailLoading}
              paymentDays={paymentDays}
              companyName={companyName}
              markingPaid={markingPaid}
              onMarkPaid={handleMarkPaid}
              dir={dir}
            />
          </DocDetailPanel>
        </div>
      </div>
    </main>
  );
}
