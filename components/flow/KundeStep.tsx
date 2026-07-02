"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Plus,
  ReceiptText,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { CustomerListItem } from "@/lib/customers/types";
import { NewCustomerModal } from "@/components/customers/NewCustomerModal";
import "./KundeStep.css";

type DocType = "rechnung" | "angebot";

interface KundeStepProps {
  dir: "ltr" | "rtl";
  customers: CustomerListItem[];
  initialCustomerId?: string | null;
  initialDocType?: DocType;
}

const STROKE = 1.75;
const STROKE_BOLD = 2.4;

export function KundeStep({ dir, customers, initialCustomerId = null, initialDocType = "rechnung" }: KundeStepProps) {
  const t = useTranslations("Create");
  const router = useRouter();
  const [docType, setDocType] = useState<DocType>(initialDocType);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(initialCustomerId);
  const [created, setCreated] = useState<CustomerListItem[]>([]);
  const [showNew, setShowNew] = useState(false);

  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const BackChevron = dir === "rtl" ? ChevronRight : ChevronLeft;

  const allCustomers: CustomerListItem[] = [...created, ...customers];
  const needle = query.trim().toLowerCase();
  const filtered = allCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(needle) ||
      (c.city ?? "").toLowerCase().includes(needle),
  );
  const selectedCustomer = allCustomers.find((c) => c.id === selected) ?? null;
  const docLabel = docType === "rechnung" ? t("rechnung") : t("angebot");

  function handleCreated(customer: CustomerListItem) {
    setCreated((prev) => [customer, ...prev]);
    setSelected(customer.id);
    setQuery("");
    setShowNew(false);
  }

  function handleWeiter() {
    if (!selected) return;
    router.push(`/create/2?customer_id=${encodeURIComponent(selected)}&document_type=${docType}`);
  }

  return (
    <main className="dmain">
      <div className="dscroll" inert={showNew}>
        <div className="dflow-head">
          <button
            type="button"
            className="dflow-back"
            aria-label={t("back")}
            onClick={() => router.push("/documents")}
          >
            <BackChevron size={20} strokeWidth={STROKE} aria-hidden />
          </button>
          <div>
            <div className="dflow-title">{t("createTitle", { type: docLabel })}</div>
            <div className="dflow-sub">{t("chooseCustomer")}</div>
          </div>
          <div className="dsteps2">
            <div className="dstep2 dstep2--active">
              <span className="dstep2-dot">1</span>
              <span className="dstep2-lbl">{t("step1")}</span>
            </div>
            <span className="dstep2-line" aria-hidden />
            <div className="dstep2">
              <span className="dstep2-dot">2</span>
              <span className="dstep2-lbl">{t("step2")}</span>
            </div>
            <span className="dstep2-line" aria-hidden />
            <div className="dstep2">
              <span className="dstep2-dot">3</span>
              <span className="dstep2-lbl">{t("step3")}</span>
            </div>
          </div>
        </div>

        <div className="dflow-bar">
          <div className="dseg2" role="group" aria-label={t("docType")}>
            <button
              type="button"
              className="seg--gold"
              data-on={docType === "rechnung" ? "1" : "0"}
              aria-pressed={docType === "rechnung"}
              onClick={() => setDocType("rechnung")}
            >
              <ReceiptText size={20} strokeWidth={STROKE} aria-hidden />
              {t("rechnung")}
            </button>
            <button
              type="button"
              className="seg--gold"
              data-on={docType === "angebot" ? "1" : "0"}
              aria-pressed={docType === "angebot"}
              onClick={() => setDocType("angebot")}
            >
              <FileText size={20} strokeWidth={STROKE} aria-hidden />
              {t("angebot")}
            </button>
          </div>
        </div>

        <div className="dsearch2">
          <Search size={20} strokeWidth={STROKE} color="var(--muted)" aria-hidden />
          <input
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchCustomer")}
            aria-label={t("searchCustomer")}
          />
          {query && (
            <button
              type="button"
              className="dsearch2-clear"
              aria-label={t("clearSearch")}
              onClick={() => setQuery("")}
            >
              <X size={18} strokeWidth={STROKE} aria-hidden />
            </button>
          )}
        </div>

        <div className="dgrid">
          {!query && (
            <button
              type="button"
              className="dcust dcust--new"
              onClick={() => setShowNew(true)}
            >
              <span className="dcust-av">
                <Plus size={22} strokeWidth={STROKE_BOLD} color="#fff" aria-hidden />
              </span>
              <span className="dcust-body">
                <span className="dcust-name">{t("newCustomer")}</span>
                <span className="dcust-addr">{t("newCustomerSub")}</span>
              </span>
              <Chevron size={20} strokeWidth={STROKE} color="var(--primary)" aria-hidden />
            </button>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="dcust"
              data-sel={selected === c.id ? "1" : "0"}
              aria-pressed={selected === c.id}
              onClick={() => setSelected(c.id)}
            >
              <span className="dcust-av">{c.initials}</span>
              <span className="dcust-body">
                <span className="dcust-name">
                  {c.name}
                  {c.isNew && (
                    <span className="dcust-badge">
                      <Check size={11} strokeWidth={STROKE_BOLD} aria-hidden />
                      {t("ncCreated")}
                    </span>
                  )}
                </span>
                <span className="dcust-addr">
                  <MapPin size={13} strokeWidth={STROKE} aria-hidden />
                  {c.street}
                  {c.city ? `, ${c.city}` : ""}
                </span>
              </span>
              {selected === c.id && (
                <span className="dcust-check">
                  <Check size={16} strokeWidth={STROKE_BOLD} color="#fff" aria-hidden />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {showNew && (
        <NewCustomerModal
          dir={dir}
          onClose={() => setShowNew(false)}
          onCreate={handleCreated}
        />
      )}

      <div className="dflow-foot" inert={showNew}>
        <div className="dflow-foot-sel">
          {selectedCustomer ? (
            <>
              <Check size={16} strokeWidth={STROKE_BOLD} color="var(--ok)" aria-hidden />
              <span>
                <b>{selectedCustomer.name}</b> {t("selected")}
              </span>
            </>
          ) : (
            <span>{t("chooseCustomer")}</span>
          )}
        </div>
        <button
          type="button"
          className="dbtn"
          disabled={!selectedCustomer}
          onClick={handleWeiter}
        >
          {t("next")}
          <Chevron size={20} strokeWidth={STROKE_BOLD} aria-hidden />
        </button>
      </div>
    </main>
  );
}
