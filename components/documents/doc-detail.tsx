"use client";

import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Loader2,
  Mail,
  Pencil,
  ReceiptText,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ShareTarget } from "@/components/create/use-share-document";
import type { DocumentListItem, DocumentItem } from "@/types/document";
import { formatDateDE, formatMoney } from "@/lib/format";
import { DocShareRow } from "./doc-share-row";
import { PositionsList } from "./positions-list";
import "./documents-main.css";

const STROKE = 1.75;

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getDisplayStatus(doc: DocumentListItem) {
  if (doc.paidAt) return "bezahlt" as const;
  if (doc.status === "sent") return "versendet" as const;
  if (doc.status === "finalized") return "offen" as const;
  return "entwurf" as const;
}

function getPillDotClass(doc: DocumentListItem): string {
  if (doc.paidAt) return "ok";
  if (doc.isOverdue) return "over";
  const s = getDisplayStatus(doc);
  return s === "offen" ? "warn" : s === "versendet" ? "info" : "draft";
}

interface DocDetailProps {
  doc: DocumentListItem | null;
  items: DocumentItem[] | null;
  itemsLoading: boolean;
  paymentDays: number;
  companyName: string;
  markingPaid: boolean;
  onMarkPaid: () => void;
  dir: "ltr" | "rtl";
}

export function DocDetail({
  doc,
  items,
  itemsLoading,
  paymentDays,
  companyName,
  markingPaid,
  onMarkPaid,
  dir,
}: DocDetailProps) {
  const t = useTranslations("Documents");
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

  const displayStatus = getDisplayStatus(doc);
  const dueDate = addDays(doc.issueDate, paymentDays);

  type BannerCls = "ok" | "warn" | "over" | "info" | "draft";
  interface Banner {
    cls: BannerCls;
    Icon: typeof Check;
    title: string;
    sub: string;
  }

  let banner: Banner;
  if (doc.paidAt) {
    banner = { cls: "ok", Icon: Check, title: t("bPaidT"), sub: formatDateDE(doc.paidAt) };
  } else if (doc.isOverdue) {
    banner = {
      cls: "over",
      Icon: AlertTriangle,
      title: t("bOverT"),
      sub: formatDateDE(dueDate),
    };
  } else if (doc.status === "sent") {
    banner = {
      cls: "info",
      Icon: Mail,
      title: t("bSentT"),
      sub: formatDateDE(doc.issueDate),
    };
  } else if (doc.status === "finalized") {
    banner = {
      cls: "warn",
      Icon: ReceiptText,
      title: t("bOpenT"),
      sub: formatDateDE(dueDate),
    };
  } else {
    banner = { cls: "draft", Icon: Pencil, title: t("bDraftT"), sub: t("bDraftS") };
  }

  const statusLabel = {
    bezahlt: t("sBezahlt"),
    offen: t("sOffen"),
    versendet: t("sVersendet"),
    entwurf: t("sEntwurf"),
  }[displayStatus];

  const canMarkPaid =
    doc.paidAt === null && (doc.status === "finalized" || doc.status === "sent");

  const shareTarget: ShareTarget = {
    documentId: doc.id,
    docType: doc.type,
    documentNumber: doc.documentNumber,
    companyName,
    customerEmail: doc.customerEmail,
    customerPhone: doc.customerPhone,
  };

  return (
    <div className="hdetail">
      <div className="hdetail-hdr">
        <div className="hdetail-toprow">
          <span className="hdetail-kind">
            {doc.type === "invoice" ? (
              <ReceiptText size={15} strokeWidth={STROKE} />
            ) : (
              <FileText size={15} strokeWidth={STROKE} />
            )}
            {doc.type === "invoice" ? t("invoice") : t("offer")}
          </span>
          <span className="hpill-light">
            {/* dot color is truly dynamic runtime value — no static class */}
            <i
              className={`hpill-dot hpill-dot--${getPillDotClass(doc)}`}
            />
            {doc.isOverdue ? t("overdue") : statusLabel}
          </span>
        </div>
        <div className="hdetail-num">{doc.documentNumber}</div>
        <div className="hdetail-cust">
          <User size={14} strokeWidth={STROKE} />
          <b>{doc.customerName}</b>
        </div>
      </div>

      <div className="hdetail-body">
        <div className={`hbanner ${banner.cls}`}>
          <span className="hbanner-ic">
            <banner.Icon size={18} strokeWidth={2.5} />
          </span>
          <div>
            <div className="hbanner-t">{banner.title}</div>
            <div className="hbanner-s">{banner.sub}</div>
          </div>
        </div>

        <div className="hmeta">
          <div className="hmeta-cell">
            <div className="hmeta-k">{t("mDate")}</div>
            <div className="hmeta-v">{formatDateDE(doc.issueDate)}</div>
          </div>
          {doc.type === "invoice" &&
            (doc.status === "paid" ? (
              <div className="hmeta-cell">
                <div className="hmeta-k">{t("mPaid")}</div>
                {doc.paidAt && <div className="hmeta-v">{formatDateDE(doc.paidAt)}</div>}
              </div>
            ) : (
              <div className="hmeta-cell">
                <div className="hmeta-k">{t("mDue")}</div>
                <div className={`hmeta-v${doc.isOverdue ? " warn" : ""}`}>
                  {formatDateDE(dueDate)}
                </div>
              </div>
            ))}
        </div>

        <div>
          <div className="hblock-lbl">{t("positions")}</div>
          {itemsLoading ? (
            <div className="hpos-loading">
              <Loader2 size={20} strokeWidth={STROKE} className="hpos-spinner" />
            </div>
          ) : items && items.length > 0 ? (
            <PositionsList key={doc.id} items={items} totalAmount={doc.totalAmount} />
          ) : (
            <div className="hpos">
              <div className="hpos-total">
                <span className="hpos-total-l">{t("total")}</span>
                <span className="hpos-total-v">{formatMoney(doc.totalAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {canMarkPaid && (
          <button
            className={`hbtn-primary ${doc.isOverdue ? "accent" : "ok"}`}
            onClick={onMarkPaid}
            disabled={markingPaid}
          >
            {markingPaid ? (
              <Loader2 size={19} strokeWidth={2.5} className="hpos-spinner" />
            ) : (
              <Check size={19} strokeWidth={2.5} />
            )}
            {markingPaid ? t("marking") : t("aMarkPaid")}
          </button>
        )}

        {doc.status === "draft" && (
          <Link className="hbtn-primary navy" href={`/create/${doc.id}/3`}>
            <Chevron size={19} strokeWidth={STROKE} />
            {t("aFinish")}
          </Link>
        )}

        <DocShareRow target={shareTarget} />

        <div className="hsecondary">
          {(displayStatus === "bezahlt" || displayStatus === "versendet" || doc.isOverdue) && (
            <button className="hbtn-ghost">
              <Copy size={17} strokeWidth={STROKE} />
              {t("aDuplicate")}
            </button>
          )}
          {doc.status === "draft" && (
            <button className="hbtn-ghost">
              <Pencil size={17} strokeWidth={STROKE} />
              {t("aEdit")}
            </button>
          )}
          <a
            className="hbtn-ghost"
            href={`/api/documents/${doc.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download size={17} strokeWidth={STROKE} />
            {t("aOpenPdf")}
          </a>
        </div>
      </div>
    </div>
  );
}
