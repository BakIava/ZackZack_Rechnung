"use client";

import {
  Building2,
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
import { CUSTOMERS } from "@/lib/demo/dashboard-data";
import type { NewCustomerInput } from "@/lib/demo/customers-data";
import { NewCustomerModal } from "@/components/customers/NewCustomerModal";
import "./KundeStep.css";

type DocType = "rechnung" | "angebot";

interface KundeStepProps {
  dir: "ltr" | "rtl";
}

const STROKE = 1.75;
const STROKE_BOLD = 2.4;

/** Schritt 1 des geführten Flows: Dokumenttyp wählen und Kunde auswählen.
 *  Bedienoberfläche folgt der Sprache (inkl. RTL); Eigennamen bleiben deutsch,
 *  da sie so auf dem Dokument erscheinen. */
export function KundeStep({ dir }: KundeStepProps) {
  const t = useTranslations("Create");
  const router = useRouter();
  const [docType, setDocType] = useState<DocType>("rechnung");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [created, setCreated] = useState<NewCustomerInput[]>([]);
  const [showNew, setShowNew] = useState(false);

  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const BackChevron = dir === "rtl" ? ChevronRight : ChevronLeft;

  // Neu angelegte Kunden stehen oben, gefolgt vom Demostamm.
  const allCustomers: NewCustomerInput[] = [...created, ...CUSTOMERS];
  const needle = query.trim().toLowerCase();
  const filtered = allCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(needle) ||
      c.city.toLowerCase().includes(needle),
  );
  const selectedCustomer = allCustomers.find((c) => c.id === selected) ?? null;
  const docLabel = docType === "rechnung" ? t("rechnung") : t("angebot");

  return (
    <main className="dmain">
      <div className="dscroll">
        <div className="dflow-head">
          <button
            type="button"
            className="dflow-back"
            aria-label={t("back")}
            onClick={() => router.push("/dashboard")}
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
              <span className="dcust-av">
                {c.firma ? (
                  <Building2 size={20} strokeWidth={STROKE} aria-hidden />
                ) : (
                  c.initials
                )}
              </span>
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
          onCreate={(c) => {
            setCreated((prev) => [c, ...prev]);
            setSelected(c.id);
            setQuery("");
            setShowNew(false);
          }}
        />
      )}

      <div className="dflow-foot">
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
          onClick={() => router.push("/create/2")}
        >
          {t("next")}
          <Chevron size={20} strokeWidth={STROKE_BOLD} aria-hidden />
        </button>
      </div>
    </main>
  );
}
