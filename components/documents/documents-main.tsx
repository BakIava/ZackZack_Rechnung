"use client";

import {
  AlertTriangle,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  User,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  DOCUMENTS,
  docTotalEur,
  isOverdue,
  type Document,
} from "@/lib/demo/documents-data";
import { formatDateDE, formatMoney } from "@/lib/format";
import "./documents-main.css";

interface DocumentsMainProps {
  dir: "ltr" | "rtl";
}

type TypeFilter = "all" | "rechnung" | "angebot";
type StatusFilter = "all" | "offen" | "bezahlt" | "versendet" | "entwurf";

const STROKE = 1.75;

const STATUS_DOT: Record<string, string> = {
  offen: "var(--warn)",
  bezahlt: "var(--ok)",
  versendet: "var(--info)",
  entwurf: "var(--draft)",
};

function fmtMoney(eur: number): string {
  return formatMoney(Math.round(eur * 100));
}

/** Detail-Panel — zeigt das gewählte Dokument oder einen Leer-Zustand. */
function DocDetail({ doc, dir, t }: { doc: Document | null; dir: "ltr" | "rtl"; t: ReturnType<typeof useTranslations<"Documents">> }) {
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  if (!doc) {
    return (
      <div className="hempty-detail">
        <div className="hempty-detail-ic">
          <ReceiptText size={28} strokeWidth={STROKE} />
        </div>
        <div className="hempty-detail-t">{t("selectHint")}</div>
        <div className="hempty-detail-s">{t("selectHintSub")}</div>
      </div>
    );
  }

  const total = docTotalEur(doc);
  const over = isOverdue(doc);

  type BannerCls = "ok" | "warn" | "over" | "info" | "draft";
  interface Banner {
    cls: BannerCls;
    Icon: typeof Check;
    title: string;
    sub: string;
  }

  let banner: Banner;
  if (doc.status === "bezahlt") {
    banner = { cls: "ok", Icon: Check, title: t("bPaidT"), sub: formatDateDE(doc.paidOn!) };
  } else if (over) {
    banner = { cls: "over", Icon: AlertTriangle, title: t("bOverT"), sub: formatDateDE(doc.due!) };
  } else if (doc.status === "offen") {
    banner = { cls: "warn", Icon: ReceiptText, title: t("bOpenT"), sub: formatDateDE(doc.due!) };
  } else if (doc.status === "versendet") {
    banner = { cls: "info", Icon: Mail, title: t("bSentT"), sub: formatDateDE(doc.valid!) };
  } else {
    banner = { cls: "draft", Icon: Pencil, title: t("bDraftT"), sub: t("bDraftS") };
  }

  const statusLabel = {
    bezahlt: t("sBezahlt"),
    offen: t("sOffen"),
    versendet: t("sVersendet"),
    entwurf: t("sEntwurf"),
  }[doc.status];

  const pillDotColor =
    doc.status === "bezahlt" ? "#7be0ae" : over ? "#f2b8ae" : STATUS_DOT[doc.status];

  return (
    <div className="hdetail">
      <div className="hdetail-hdr">
        <div className="hdetail-toprow">
          <span className="hdetail-kind">
            {doc.type === "rechnung" ? (
              <ReceiptText size={15} strokeWidth={STROKE} />
            ) : (
              <FileText size={15} strokeWidth={STROKE} />
            )}
            {doc.type === "rechnung" ? t("rechnung") : t("angebot")}
          </span>
          <span className="hpill-light">
            <i style={{ background: pillDotColor }} />
            {over ? t("overdue") : statusLabel}
          </span>
        </div>
        <div className="hdetail-num">{doc.id}</div>
        <div className="hdetail-cust">
          <User size={14} strokeWidth={STROKE} />
          <b>{doc.customer}</b>
        </div>
      </div>

      <div className="hdetail-body">
        {/* Status-Banner */}
        <div className={`hbanner ${banner.cls}`}>
          <span className="hbanner-ic">
            <banner.Icon size={18} strokeWidth={2.5} />
          </span>
          <div>
            <div className="hbanner-t">{banner.title}</div>
            <div className="hbanner-s">{banner.sub}</div>
          </div>
        </div>

        {/* Metadaten */}
        <div className="hmeta">
          <div className="hmeta-cell">
            <div className="hmeta-k">{t("mDate")}</div>
            <div className="hmeta-v">{formatDateDE(doc.date)}</div>
          </div>
          {doc.type === "rechnung" ? (
            doc.status === "bezahlt" ? (
              <div className="hmeta-cell">
                <div className="hmeta-k">{t("mPaid")}</div>
                <div className="hmeta-v">{formatDateDE(doc.paidOn!)}</div>
              </div>
            ) : (
              <div className="hmeta-cell">
                <div className="hmeta-k">{t("mDue")}</div>
                <div className={`hmeta-v${over ? " warn" : ""}`}>{formatDateDE(doc.due!)}</div>
              </div>
            )
          ) : (
            <div className="hmeta-cell">
              <div className="hmeta-k">{t("mValid")}</div>
              <div className="hmeta-v">{formatDateDE(doc.valid!)}</div>
            </div>
          )}
        </div>

        {/* Positionen */}
        <div>
          <div className="hblock-lbl">{t("positions")}</div>
          <div className="hpos">
            {doc.positions.map((p, i) => (
              <div className="hpos-row" key={i}>
                <div style={{ minWidth: 0 }}>
                  <div className="hpos-desc">{p.label}</div>
                  <div className="hpos-qty">
                    {p.qty} {p.unit} · {fmtMoney(p.priceEur)}
                  </div>
                </div>
                <div className="hpos-sum">{fmtMoney(p.qty * p.priceEur)}</div>
              </div>
            ))}
            <div className="hpos-total">
              <span className="hpos-total-l">
                {t("total")}{" "}
                <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 11 }}>
                  {t("mNet")}
                </span>
              </span>
              <span className="hpos-total-v">{fmtMoney(total)}</span>
            </div>
          </div>
        </div>

        {/* Primäre kontextabhängige Aktion */}
        {doc.type === "rechnung" && doc.status === "offen" && (
          <button className={`hbtn-primary ${over ? "accent" : "ok"}`}>
            <Check size={19} strokeWidth={2.5} />
            {t("aMarkPaid")}
          </button>
        )}
        {doc.type === "angebot" && doc.status === "versendet" && (
          <Link className="hbtn-primary accent" href="/create/1">
            <ReceiptText size={19} strokeWidth={STROKE} />
            {t("aConvert")}
          </Link>
        )}
        {doc.status === "entwurf" && (
          <Link className="hbtn-primary navy" href="/create/3">
            <Chevron size={19} strokeWidth={STROKE} />
            {t("aFinish")}
          </Link>
        )}

        {/* Teilen */}
        <div className="hshare">
          <button className="hshare-btn wa">
            <span className="hshare-ic">
              <MessageCircle size={20} strokeWidth={STROKE} />
            </span>
            {t("shareWa")}
          </button>
          <button className="hshare-btn mail">
            <span className="hshare-ic">
              <Mail size={20} strokeWidth={STROKE} />
            </span>
            {t("shareMail")}
          </button>
          <Link className="hshare-btn pdf" href="/create/3">
            <span className="hshare-ic">
              <Download size={20} strokeWidth={STROKE} />
            </span>
            {t("sharePdf")}
          </Link>
        </div>

        {/* Sekundäre Aktionen */}
        <div className="hsecondary">
          {doc.type === "rechnung" && doc.status === "offen" && !over && (
            <button className="hbtn-ghost">
              <Bell size={17} strokeWidth={STROKE} />
              {t("aRemind")}
            </button>
          )}
          {(doc.status === "bezahlt" || doc.status === "versendet" || over) && (
            <button className="hbtn-ghost">
              <Copy size={17} strokeWidth={STROKE} />
              {t("aDuplicate")}
            </button>
          )}
          {doc.status === "entwurf" && (
            <button className="hbtn-ghost">
              <Pencil size={17} strokeWidth={STROKE} />
              {t("aEdit")}
            </button>
          )}
          <Link className="hbtn-ghost" href="/create/3">
            <Download size={17} strokeWidth={STROKE} />
            {t("aOpenPdf")}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Hauptbereich der Dokumente-Seite: Topbar, Kennzahlen, Filter, Liste + Detail. */
export function DocumentsMain({ dir }: DocumentsMainProps) {
  const t = useTranslations("Documents");
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const [query, setQuery] = useState("");
  const [typeF, setTypeF] = useState<TypeFilter>("all");
  const [statusF, setStatusF] = useState<StatusFilter>("all");
  const [sel, setSel] = useState<string>("R-2026-040");

  const docs = DOCUMENTS;

  // Kennzahlen
  const openDocs = docs.filter((d) => d.status === "offen" || d.status === "versendet");
  const openSum = openDocs.reduce((s, d) => s + docTotalEur(d), 0);
  const paidDocs = docs.filter((d) => d.status === "bezahlt");
  const paidSum = paidDocs.reduce((s, d) => s + docTotalEur(d), 0);

  const counts = {
    all: docs.length,
    offen: docs.filter((d) => d.status === "offen").length,
    bezahlt: docs.filter((d) => d.status === "bezahlt").length,
    versendet: docs.filter((d) => d.status === "versendet").length,
    entwurf: docs.filter((d) => d.status === "entwurf").length,
  };

  const q = query.trim().toLowerCase();
  const filtered = docs.filter(
    (d) =>
      (typeF === "all" || d.type === typeF) &&
      (statusF === "all" || d.status === statusF) &&
      (!q ||
        d.id.toLowerCase().includes(q) ||
        d.customer.toLowerCase().includes(q) ||
        d.service.toLowerCase().includes(q))
  );

  const selDoc = docs.find((d) => d.id === sel) ?? null;

  const typeFilters: { id: TypeFilter; label: string }[] = [
    { id: "all", label: t("fAll") },
    { id: "rechnung", label: t("fRechnung") },
    { id: "angebot", label: t("fAngebot") },
  ];

  const statusFilters: { id: Exclude<StatusFilter, "all">; label: string }[] = [
    { id: "offen", label: t("sOffen") },
    { id: "bezahlt", label: t("sBezahlt") },
    { id: "versendet", label: t("sVersendet") },
    { id: "entwurf", label: t("sEntwurf") },
  ];

  return (
    <main className="dmain">
      {/* TopBar */}
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
              <span
                style={{ cursor: "pointer", display: "flex", color: "var(--muted)" }}
                onClick={() => setQuery("")}
              >
                <X size={16} strokeWidth={STROKE} />
              </span>
            )}
          </div>
          <Link className="dbtn" href="/create/1">
            <Plus size={19} strokeWidth={2.5} />
            {t("newBtn")}
          </Link>
        </div>
      </div>

      <div className="dscroll">
        {/* Kennzahlen */}
        <div className="hstat-row">
          <div className="hstat">
            <div className="hstat-top">
              <span className="hstat-ic" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
                <ReceiptText size={19} strokeWidth={STROKE} />
              </span>
              <span className="hstat-lbl">{t("statOpen")}</span>
            </div>
            <div className="hstat-val">{fmtMoney(openSum)}</div>
            <div className="hstat-sub">
              {openDocs.length === 1 ? t("statOpenSub", { count: 1 }) : t("statOpenSubPlural", { count: openDocs.length })}
            </div>
          </div>
          <div className="hstat">
            <div className="hstat-top">
              <span className="hstat-ic" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>
                <Check size={19} strokeWidth={2.5} />
              </span>
              <span className="hstat-lbl">{t("statPaid")}</span>
            </div>
            <div className="hstat-val">{fmtMoney(paidSum)}</div>
            <div className="hstat-sub">
              {paidDocs.length === 1 ? t("statPaidSub", { count: 1 }) : t("statPaidSubPlural", { count: paidDocs.length })}
            </div>
          </div>
          <div className="hstat">
            <div className="hstat-top">
              <span
                className="hstat-ic"
                style={{
                  background: "color-mix(in srgb, var(--primary) 11%, var(--surface))",
                  color: "var(--primary)",
                }}
              >
                <FileText size={19} strokeWidth={STROKE} />
              </span>
              <span className="hstat-lbl">{t("statCount")}</span>
            </div>
            <div className="hstat-val">{docs.length}</div>
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
              <span className="hfbtn-dot" style={{ background: STATUS_DOT[f.id] }} />
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
              <span className="hlist-t" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>
                {filtered.length} / {docs.length}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="hempty-list">
                <div className="hempty-list-t">{t("noResults")}</div>
                <div className="hempty-list-s">{t("noResultsSub")}</div>
              </div>
            ) : (
              <div className="hlist">
                {filtered.map((d) => {
                  const over = isOverdue(d);
                  const total = docTotalEur(d);
                  const statusLabel = {
                    bezahlt: t("sBezahlt"),
                    offen: t("sOffen"),
                    versendet: t("sVersendet"),
                    entwurf: t("sEntwurf"),
                  }[d.status];

                  return (
                    <button
                      key={d.id}
                      className="hrow"
                      data-sel={sel === d.id ? "1" : "0"}
                      onClick={() => setSel(d.id)}
                    >
                      <span className={`hrow-ic hrow-ic--${d.type}`}>
                        {d.type === "rechnung" ? (
                          <ReceiptText size={21} strokeWidth={STROKE} />
                        ) : (
                          <FileText size={21} strokeWidth={STROKE} />
                        )}
                      </span>
                      <span className="hrow-body">
                        <span className="hrow-top">
                          <span className="hrow-num">{d.id}</span>
                          {over && (
                            <span className="hflag">
                              <AlertTriangle size={12} strokeWidth={2.5} />
                              {t("overdue")}
                            </span>
                          )}
                        </span>
                        <span className="hrow-name">{d.customer}</span>
                        <span className="hrow-meta">
                          {d.service} · {formatDateDE(d.date)}
                        </span>
                      </span>
                      <span className="hrow-right">
                        <span className="hrow-price">{fmtMoney(total)}</span>
                        <span className={`pill pill--${d.status}`}>
                          <i />
                          {statusLabel}
                        </span>
                      </span>
                      <span className="hrow-chev">
                        <Chevron size={18} strokeWidth={STROKE} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DocDetail doc={selDoc} dir={dir} t={t} />
        </div>
      </div>
    </main>
  );
}
