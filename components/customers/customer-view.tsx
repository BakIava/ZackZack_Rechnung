"use client";

import { useState, useTransition } from "react";
import {
  Building2,
  FileText,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  StickyNote,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { deleteCustomer } from "@/lib/customers/actions";
import { startNewDocument } from "@/lib/documents/draft-actions";
import { formatDateDE, formatMoney } from "@/lib/format";
import { deriveInitials } from "@/lib/initials";
import type { CustomerRow, CustomerDocRow } from "@/types/customer";
import "./customer-view.css";

const STROKE = 1.75;

const FIRMA_RE = /\b(GmbH|KG|AG|OHG|GbR|e\.V\.|UG|SE|Inc|Ltd|LLC)\b/i;

export function isFirma(name: string): boolean {
  return FIRMA_RE.test(name);
}

function docStatusToKey(status: string): string {
  switch (status) {
    case "draft":
      return "statusEntwurf";
    case "finalized":
      return "statusOffen";
    case "sent":
      return "statusVersendet";
    case "paid":
      return "statusBezahlt";
    case "accepted":
      return "statusAngenommen";
    case "quote":
      return "statusAngebot";
    default:
      return "statusEntwurf";
  }
}

function docStatusToPill(status: string): string {
  switch (status) {
    case "finalized":
    case "sent":
      return "versendet";
    case "paid":
      return "bezahlt";
    case "accepted":
      return "angenommen";
    case "quote":
      return "angebot";
    default:
      return "entwurf";
  }
}

function streetDisplay(row: CustomerRow): string {
  return [row.street, row.street_no].filter(Boolean).join(" ") || "—";
}

function addressDisplay(row: CustomerRow): string {
  const street = streetDisplay(row);
  const cityPart = [row.postcode, row.city].filter(Boolean).join(" ");
  return [street, cityPart].filter((s) => s && s !== "—").join(", ") || "—";
}

export function sortedDocs(docs: CustomerDocRow[]): CustomerDocRow[] {
  return [...docs].sort((a, b) => b.issue_date.localeCompare(a.issue_date));
}

// ─── Empty state (no customers at all) ───────────────────────────────────────

export function CustomerDetailEmpty() {
  const t = useTranslations("Customers");
  return (
    <div className="cdm-detail">
      <div className="cdm-empty">
        <span className="cdm-empty-title">{t("selectHint")}</span>
        <span className="cdm-empty-sub">{t("selectHintSub")}</span>
      </div>
    </div>
  );
}

// ─── Read view ───────────────────────────────────────────────────────────────

interface CustomerViewProps {
  customer: CustomerRow;
  onEdit: () => void;
  onMutated: (newSelId?: string) => void;
}

export function CustomerView({ customer, onEdit, onMutated }: CustomerViewProps) {
  const t = useTranslations("Customers");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDelConfirm, setShowDelConfirm] = useState(false);
  const isCompany = customer.customer_type === "business";
  const initials = deriveInitials(customer);
  const addr = addressDisplay(customer);
  const docs = sortedDocs(customer.documents);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteCustomer(customer.id);
      if (res.error) {
        setShowDelConfirm(false);
        return;
      }
      router.refresh();
      onMutated(undefined);
    });
  }

  return (
    <>
      {showDelConfirm && (
        <div className="cdm-confirm-overlay">
          <button
            type="button"
            className="cdm-confirm-bd"
            aria-label={t("deleteNo")}
            onClick={() => setShowDelConfirm(false)}
          />
          <div className="cdm-confirm-box" role="alertdialog" aria-modal="true">
            <div className="cdm-confirm-icon">
              <Trash2 size={24} strokeWidth={STROKE} aria-hidden />
            </div>
            <div>
              <div className="cdm-confirm-title">{t("deleteCustomer")}</div>
              <div className="cdm-confirm-msg">{t("deleteConfirm")}</div>
            </div>
            <div className="cdm-confirm-btns">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowDelConfirm(false)}
              >
                {t("deleteNo")}
              </button>
              <button
                type="button"
                className="btn-destroy"
                disabled={isPending}
                onClick={handleDelete}
              >
                {isPending ? t("saving") : t("deleteYes")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="cdm-dhead">
        <div className="cdm-dhead-top">
          <div className={"cdm-dav" + (isCompany ? " cdm-dav--firma" : "")}>
            {isCompany ? (
              <Building2
                size={28}
                strokeWidth={STROKE}
                color="#fff"
                aria-hidden
              />
            ) : (
              initials
            )}
          </div>
          <div className="cdm-dtitle">
            <div className="cdm-dname">
              {isCompany
                ? customer.company_name
                : `${customer.firstname} ${customer.lastname}`}
            </div>
            <div className="cdm-daddr">
              <MapPin size={15} strokeWidth={STROKE} aria-hidden />
              {addr}
            </div>
          </div>
          <button
            type="button"
            className="cdm-del-header-btn"
            onClick={() => setShowDelConfirm(true)}
          >
            <Trash2 size={15} strokeWidth={STROKE} aria-hidden />
            {t("deleteCustomer")}
          </button>
          <button
            type="button"
            className="cdm-dicon"
            aria-label={t("edit")}
            onClick={onEdit}
          >
            <Pencil size={19} strokeWidth={STROKE} aria-hidden />
          </button>
        </div>
        <div className="cdm-dactions">
          <form action={startNewDocument} className="contents">
            <button type="submit" className="cdm-dbtn">
              <ReceiptText
                size={19}
                strokeWidth={STROKE}
                color="#fff"
                aria-hidden
              />
              {t("newInvoiceFor")}
            </button>
          </form>
          <form action={startNewDocument} className="contents">
            <button type="submit" className="cdm-dbtn cdm-dbtn--ghost">
              <FileText size={18} strokeWidth={STROKE} aria-hidden />
              {t("newQuoteFor")}
            </button>
          </form>
        </div>
      </div>

      <div className="cdm-dscroll">
        <div className="cdm-fields">
          <Field icon={MapPin} label={t("address")} value={addr} />
          <Field
            icon={IdCard}
            label={t("custNo")}
            value={`KD-${String(customer.customer_number).padStart(4, "0")}`}
          />
          {customer.phone && (
            <Field icon={Phone} label={t("phone")} value={customer.phone} />
          )}
          {customer.email && (
            <Field icon={Mail} label={t("email")} value={customer.email} />
          )}
          {customer.notes && (
            <div className="cdm-note">
              <span className="cdm-field-ic">
                <StickyNote size={18} strokeWidth={STROKE} aria-hidden />
              </span>
              <span className="cdm-field-body">
                <span className="cdm-note-lbl">{t("noteLbl")}</span>
                <span className="cdm-note-val">{customer.notes}</span>
              </span>
            </div>
          )}
        </div>

        <div className="cdm-sec">
          {t("docs")} · {docs.length}
        </div>
        <div className="cdm-table">
          <div className="cdm-tr cdm-thead">
            <span className="cdm-th">{t("colType")}</span>
            <span className="cdm-th">{t("colNumber")}</span>
            <span className="cdm-th">{t("colDate")}</span>
            <span className="cdm-th num">{t("colAmount")}</span>
            <span className="cdm-th num">{t("colStatus")}</span>
          </div>
          {docs.map((d) => (
            <DocRow key={d.id} doc={d} />
          ))}
          {docs.length === 0 && <div className="cdm-nodocs">{t("noDocs")}</div>}
        </div>
      </div>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface FieldProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function Field({ icon: Icon, label, value }: FieldProps) {
  return (
    <div className="cdm-field">
      <span className="cdm-field-ic">
        <Icon size={19} strokeWidth={STROKE} aria-hidden />
      </span>
      <span className="cdm-field-body">
        <span className="cdm-field-lbl">{label}</span>
        <span className="cdm-field-val">{value}</span>
      </span>
    </div>
  );
}

interface DocRowProps {
  doc: CustomerDocRow;
}

function DocRow({ doc }: DocRowProps) {
  const t = useTranslations("Customers");
  const TypeIcon = doc.document_type === "invoice" ? ReceiptText : FileText;
  const typeLabel = doc.document_type === "invoice" ? t("invoice") : t("quote");
  const statusKey = docStatusToKey(doc.status) as Parameters<typeof t>[0];
  const pillVariant = docStatusToPill(doc.status);
  const docId = doc.document_number ?? "-";

  return (
    <Link href={`/documents/${doc.id}`} className="cdm-tr cdm-drow">
      <span className="cdm-tdoc">
        <span className={`cdm-tdoc-ic cdm-tdoc-ic--${doc.document_type}`}>
          <TypeIcon size={19} strokeWidth={STROKE} aria-hidden />
        </span>
        <span className="cdm-tchip">{typeLabel}</span>
      </span>
      <span className="cdm-tno">{docId}</span>
      <span className="cdm-tdate">{formatDateDE(doc.issue_date)}</span>
      <span className="cdm-tamount num">{formatMoney(doc.total_amount)}</span>
      <span className="cdm-tstatus num">
        <span className={`pill pill--${pillVariant}`}>
          <i />
          {t(statusKey)}
        </span>
      </span>
    </Link>
  );
}
