"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Building2, Check, MapPin, Plus, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { CustomerListItem, CustomerRow } from "@/lib/customers/types";
import { NewCustomerModal } from "./NewCustomerModal";
import { CustomerDetail, CustomerDetailEmpty, isFirma, deriveInitials, sortedDocs, formatDateShort } from "./customer-detail";

interface CustomersMasterDetailProps {
  dir: "ltr" | "rtl";
  initialCustomers: CustomerRow[];
}

type SortKey = "az" | "recent";
const STROKE = 1.75;

export function CustomersMasterDetail({ dir, initialCustomers }: CustomersMasterDetailProps) {
  const t = useTranslations("Customers");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("az");
  const [showNew, setShowNew] = useState(false);
  const [selId, setSelId] = useState<string | null>(initialCustomers[0]?.id ?? null);
  const pendingSelId = useRef<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  // Sync selected ID when prop refreshes (e.g. after router.refresh())
  useEffect(() => {
    if (pendingSelId.current) {
      const exists = initialCustomers.find((c) => c.id === pendingSelId.current);
      if (exists) {
        setSelId(pendingSelId.current);
        pendingSelId.current = null;
      }
    } else if (selId && !initialCustomers.find((c) => c.id === selId)) {
      // Selected customer was deleted — fall back to first
      setSelId(initialCustomers[0]?.id ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomers]);

  const list = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = initialCustomers.filter((c) =>
      (c.name + " " + (c.city ?? "")).toLowerCase().includes(q),
    );
    if (sort === "recent") {
      return [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [initialCustomers, query, sort]);

  const selected = initialCustomers.find((c) => c.id === selId) ?? null;

  const sortOptions: [SortKey, string][] = [
    ["az", t("sortAZ")],
    ["recent", t("sortRecent")],
  ];

  function handleCreate(customer: CustomerListItem) {
    pendingSelId.current = customer.id;
    setNewIds((prev) => new Set(prev).add(customer.id));
    setShowNew(false);
    setQuery("");
    router.refresh();
  }

  function handleMutated(newSelId?: string) {
    if (newSelId !== undefined) {
      setSelId(newSelId);
    } else {
      // Deleted — will fall back to first in useEffect after refresh
    }
    router.refresh();
  }

  return (
    <main className="dmain">
      <div className="cdm" inert={showNew}>
        {/* Master */}
        <div className="cdm-master">
          <div className="cdm-mhead">
            <div className="cdm-mtitle">
              <div className="cdm-mtitle-t">
                {t("customers")}
                <span className="c">{initialCustomers.length}</span>
              </div>
              <button type="button" className="cdm-new" onClick={() => setShowNew(true)}>
                <Plus size={16} strokeWidth={2.4} color="#fff" aria-hidden />
                {t("newCust")}
              </button>
            </div>
            <div className="cdm-search">
              <Search size={18} strokeWidth={STROKE} aria-hidden />
              <input
                type="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
              />
              {query && (
                <button
                  type="button"
                  className="cdm-clear"
                  onClick={() => setQuery("")}
                  aria-label={t("clearSearch")}
                >
                  <X size={17} strokeWidth={STROKE} aria-hidden />
                </button>
              )}
            </div>
            <div className="cdm-sort">
              {sortOptions.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="sortchip"
                  data-on={sort === key ? "1" : "0"}
                  onClick={() => setSort(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="cdm-mscroll">
            <div className="cdm-mlist">
              {list.length === 0 && query && (
                <div className="cdm-nodocs" style={{ padding: "24px 14px" }}>
                  {t("noResults")}
                </div>
              )}
              {list.length === 0 && !query && (
                <div className="cdm-nodocs" style={{ padding: "24px 14px", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontWeight: 650, color: "var(--ink)" }}>{t("noCustomers")}</span>
                  <span>{t("noCustomersSub")}</span>
                </div>
              )}
              {list.map((c) => (
                <MasterRow
                  key={c.id}
                  customer={c}
                  selected={c.id === selId}
                  isNew={newIds.has(c.id)}
                  onSelect={() => setSelId(c.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Detail */}
        {selected ? (
          <CustomerDetail customer={selected} onMutated={handleMutated} />
        ) : (
          <CustomerDetailEmpty />
        )}
      </div>

      {showNew && (
        <NewCustomerModal dir={dir} onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}
    </main>
  );
}

interface MasterRowProps {
  customer: CustomerRow;
  selected: boolean;
  isNew: boolean;
  onSelect: () => void;
}

function MasterRow({ customer, selected, isNew, onSelect }: MasterRowProps) {
  const t = useTranslations("Customers");
  const firma = isFirma(customer.name);
  const initials = deriveInitials(customer.name);
  const docs = sortedDocs(customer.documents);
  const lastDoc = docs[0];
  const docLabel = lastDoc
    ? `${lastDoc.document_type === "invoice" ? t("invoice") : t("offer")} ${formatDateShort(lastDoc.issue_date)}`
    : "";

  return (
    <button
      type="button"
      className="cdmrow"
      data-sel={selected ? "1" : "0"}
      onClick={onSelect}
    >
      <span className={"cdm-av" + (firma ? " cdm-av--firma" : "")}>
        {firma ? <Building2 size={20} strokeWidth={STROKE} aria-hidden /> : initials}
      </span>
      <span className="cdm-body">
        <span className="cdm-name">
          {customer.name}
          {isNew && (
            <span className="cdm-badge">
              <Check size={11} strokeWidth={2.4} aria-hidden />
              {t("created")}
            </span>
          )}
        </span>
        <span className="cdm-sub">
          <MapPin size={12} strokeWidth={STROKE} aria-hidden />
          {customer.city ?? "—"}
          {docLabel && ` · ${docLabel}`}
        </span>
      </span>
    </button>
  );
}
