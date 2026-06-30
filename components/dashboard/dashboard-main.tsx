import {
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  ReceiptText,
  Search,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { DashboardDoc, DocStatus } from "@/lib/demo/dashboard-data";
import { formatDateDE, formatMoney } from "@/lib/format";
import type { DashboardData } from "@/lib/dashboard/fetch";

interface DashboardMainProps {
  dir: "ltr" | "rtl";
  data: DashboardData;
}

const STROKE = 1.75;

const STATUS_KEY: Record<DocStatus, string> = {
  bezahlt: "statusBezahlt",
  offen: "statusOffen",
  versendet: "statusVersendet",
  entwurf: "statusEntwurf",
};

/** Hauptbereich des Dashboards: Topbar, Hero-CTA, Überblick, letzte Dokumente. */
export async function DashboardMain({ dir, data }: DashboardMainProps) {
  const t = await getTranslations("Dashboard");
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const firstName = data.ownerName.split(/\s+/)[0] || data.companyName.split(/\s+/)[0];
  const isEmpty = data.docs.length === 0;

  return (
    <main className="dmain">
      <div className="dtopbar">
        <div>
          <div className="greet-sub">{t("greetSub")}</div>
          <div className="greet-main">
            {t("greetMorning")}, {firstName}
          </div>
        </div>
        <div className="dtools">
          <div className="dsearch">
            <Search size={18} strokeWidth={STROKE} aria-hidden />
            <input placeholder={t("searchGlobal")} aria-label={t("searchGlobal")} />
          </div>
          <button type="button" className="iconbtn" aria-label={t("openAmount")}>
            <Bell size={20} strokeWidth={STROKE} aria-hidden />
            <span className="dot" />
          </button>
        </div>
      </div>

      <div className="dscroll">
        <div className="dhero">
          <Link href="/create/1" className="dcta">
            <span className="dcta-ic">
              <Plus size={30} strokeWidth={2.4} color="#fff" aria-hidden />
            </span>
            <span>
              <span className="dcta-main">{t("newDoc")}</span>
              <span className="dcta-sub">{t("newDocSub")}</span>
            </span>
            <span className="dcta-chev">
              <Chevron size={26} strokeWidth={STROKE} aria-hidden />
            </span>
          </Link>

          <div className={`dhighlight${isEmpty ? " is-empty" : ""}`}>
            <div className="dhl-top">
              <span className={`dhl-ic${isEmpty ? " muted" : ""}`}>
                <ReceiptText size={19} strokeWidth={STROKE} aria-hidden />
              </span>
              <span className="dhl-lbl">{t("openAmount")}</span>
            </div>
            <div className="dhl-val">{formatMoney(isEmpty ? 0 : data.openSumCents)}</div>
            <div className="dhl-meta">
              {isEmpty ? (
                t("hlEmptySub")
              ) : (
                <>{data.openCount} {t("docsOpen")} · <b>{formatMoney(data.paidSumCents)}</b> {t("paidMonth")}</>
              )}
            </div>
          </div>
        </div>

        <div className="dsec-head">
          <span className="dsec-t">{t("recent")}</span>
          {!isEmpty && (
            <Link href="/documents" className="dsec-a">
              {t("seeAll")}
              <Chevron size={15} strokeWidth={STROKE} aria-hidden />
            </Link>
          )}
        </div>

        {isEmpty ? (
          <EmptyGhost
            ghostTitle={t("ghostTitle")}
            ghostSub={t("ghostSub")}
            newDocLabel={t("newDoc")}
            dir={dir}
          />
        ) : (
          <div className="dtable">
            <div className="dtr dthead">
              <span className="dth">{t("colType")}</span>
              <span className="dth">{t("navCustomers")}</span>
              <span className="dth">{t("colService")}</span>
              <span className="dth">{t("colDate")}</span>
              <span className="dth num">{t("colAmount")}</span>
              <span className="dth num">{t("colStatus")}</span>
            </div>
            {data.docs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                typeLabel={t(doc.type)}
                statusLabel={t(STATUS_KEY[doc.status])}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

interface EmptyGhostProps {
  ghostTitle: string;
  ghostSub: string;
  newDocLabel: string;
  dir: "ltr" | "rtl";
}

const GHOST_ROWS = [
  { w1: "58%", w2: "40%" },
  { w1: "46%", w2: "52%" },
  { w1: "63%", w2: "34%" },
  { w1: "50%", w2: "44%" },
];

function EmptyGhost({ ghostTitle, ghostSub, newDocLabel, dir }: EmptyGhostProps) {
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <div className="le-card le-ghost">
      <div className="le-ghost-rows" aria-hidden="true">
        <div className="le-grow le-grow--head">
          {[60, 46, 52, 40, 46, 46].map((w, i) => (
            <span key={i} className="le-bar le-bar--head" style={{ width: `${w}%` }} />
          ))}
        </div>
        {GHOST_ROWS.map((r, i) => (
          <div className="le-grow" key={i}>
            <span className="le-gcell">
              <span className="le-gic" />
              <span className="le-bar" style={{ width: 38 }} />
            </span>
            <span className="le-bar" style={{ width: r.w1 }} />
            <span className="le-bar" style={{ width: r.w2 }} />
            <span className="le-bar" style={{ width: "70%" }} />
            <span className="le-bar le-bar--end" style={{ width: 64 }} />
            <span className="le-epill" />
          </div>
        ))}
      </div>
      <div className="le-ghost-over">
        <div className="le-ghost-card">
          <div className="le-emblem">
            <i className="e-back" />
            <i className="e-mid" />
            <i className="e-front">
              <ReceiptText size={26} strokeWidth={STROKE} aria-hidden />
            </i>
          </div>
          <div className="le-h">{ghostTitle}</div>
          <div className="le-sub">{ghostSub}</div>
          <Link href="/create/1" className="le-btn le-btn--navy">
            <Plus size={19} strokeWidth={2.4} aria-hidden />
            {newDocLabel}
            <Chevron size={18} strokeWidth={STROKE} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface DocRowProps {
  doc: DashboardDoc;
  typeLabel: string;
  statusLabel: string;
}

function DocRow({ doc, typeLabel, statusLabel }: DocRowProps) {
  const TypeIcon = doc.type === "rechnung" ? ReceiptText : FileText;
  return (
    <div className="dtr drow">
      <span className="dtd-doc">
        <span className={`dtd-ic dtd-ic--${doc.type}`}>
          <TypeIcon size={19} strokeWidth={STROKE} aria-hidden />
        </span>
        <span className="dtype-chip">{typeLabel}</span>
      </span>
      <span className="dtd-cust">{doc.customer}</span>
      <span className="dtd-serv">{doc.service}</span>
      <span className="dtd-date">{formatDateDE(doc.date)}</span>
      <span className="dtd-amount num">{formatMoney(doc.amount)}</span>
      <span className="dtd-status num">
        <span className={`pill pill--${doc.status}`}>
          <i />
          {statusLabel}
        </span>
      </span>
    </div>
  );
}
