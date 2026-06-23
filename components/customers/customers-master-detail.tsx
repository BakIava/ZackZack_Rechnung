"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  FileText,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Search,
  StickyNote,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  CUSTOMERS,
  customerFromFlow,
  lastDoc,
  recentKey,
  type Customer,
  type CustomerDoc,
  type CustomerDocStatus,
  type NewCustomerInput,
} from "@/lib/demo/customers-data";
import { NewCustomerModal } from "./NewCustomerModal";
import { formatDateDE, formatDateShort, formatMoney } from "@/lib/format";

interface CustomersMasterDetailProps {
  dir: "ltr" | "rtl";
}

type SortKey = "recent" | "az" | "open";
const STROKE = 1.75;

/** Desktop-Master-Detail für den Kunden-Bereich: Liste (links) + Detail (rechts).
 *  Suche, Sortierung und Auswahl laufen clientseitig; Beträge/Daten bleiben deutsch.
 *  „Neuer Kunde" nutzt das wiederverwendete Modal aus dem Flow (/create).
 *  RTL wird über logische CSS-Properties am `dir`-Wrapper der Shell gelöst. */
export function CustomersMasterDetail({ dir }: CustomersMasterDetailProps) {
  const t = useTranslations("Customers");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [created, setCreated] = useState<Customer[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [selId, setSelId] = useState(CUSTOMERS[0].id);

  // Neu angelegte Kunden stehen vorn, gefolgt vom Demostamm.
  const all = useMemo(() => [...created, ...CUSTOMERS], [created]);

  const list = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = all.filter((x) =>
      (x.name + " " + x.city).toLowerCase().includes(q),
    );
    if (sort === "az") return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "de"));
    if (sort === "open") {
      return [...filtered].sort(
        (a, b) => b.open - a.open || recentKey(b).localeCompare(recentKey(a)),
      );
    }
    return [...filtered].sort((a, b) => recentKey(b).localeCompare(recentKey(a)));
  }, [all, query, sort]);

  const selected = all.find((x) => x.id === selId) ?? all[0];

  function handleCreate(flow: NewCustomerInput) {
    const full = customerFromFlow(flow, created.length);
    setCreated((prev) => [full, ...prev]);
    setSelId(full.id);
    setQuery("");
    setShowNew(false);
  }

  const sortOptions: [SortKey, string][] = [
    ["recent", t("sortRecent")],
    ["az", t("sortAZ")],
    ["open", t("sortOpen")],
  ];

  return (
    <main className="dmain">
      <div className="cdm">
        {/* Master */}
        <div className="cdm-master">
          <div className="cdm-mhead">
            <div className="cdm-mtitle">
              <div className="cdm-mtitle-t">
                {t("customers")}
                <span className="c">{all.length}</span>
              </div>
              <button type="button" className="cdm-new" onClick={() => setShowNew(true)}>
                <Plus size={16} strokeWidth={2.4} color="#fff" aria-hidden />
                {t("newCust")}
              </button>
            </div>
            <div className="cdm-search">
              <Search size={18} strokeWidth={STROKE} aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
              />
              {query && (
                <button type="button" className="cdm-clear" onClick={() => setQuery("")} aria-label={t("clearSearch")}>
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
              {list.map((x) => (
                <MasterRow key={x.id} customer={x} selected={x.id === selId} onSelect={() => setSelId(x.id)} />
              ))}
            </div>
          </div>
        </div>

        {/* Detail */}
        <CustomerDetail customer={selected} />
      </div>

      {showNew && (
        <NewCustomerModal dir={dir} onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}
    </main>
  );
}

interface MasterRowProps {
  customer: Customer;
  selected: boolean;
  onSelect: () => void;
}

function MasterRow({ customer, selected, onSelect }: MasterRowProps) {
  const t = useTranslations("Customers");
  const ld = lastDoc(customer);
  const docLabel = ld ? `${ld.type === "rechnung" ? t("rechnung") : t("angebot")} ${formatDateShort(ld.date)}` : "";
  return (
    <button type="button" className="cdmrow" data-sel={selected ? "1" : "0"} onClick={onSelect}>
      <span className={"cdm-av" + (customer.firma ? " cdm-av--firma" : "")}>
        {customer.firma ? <Building2 size={20} strokeWidth={STROKE} aria-hidden /> : customer.initials}
      </span>
      <span className="cdm-body">
        <span className="cdm-name">
          {customer.name}
          {customer.isNew && (
            <span className="cdm-badge">
              <Check size={11} strokeWidth={2.4} aria-hidden />
              {t("created")}
            </span>
          )}
        </span>
        <span className="cdm-sub">
          <MapPin size={12} strokeWidth={STROKE} aria-hidden />
          {customer.ort}
          {docLabel && ` · ${docLabel}`}
        </span>
      </span>
      {customer.open > 0 && <span className="cdm-open">{formatMoney(customer.open)}</span>}
    </button>
  );
}

interface CustomerDetailProps {
  customer: Customer;
}

function CustomerDetail({ customer }: CustomerDetailProps) {
  const t = useTranslations("Customers");
  const k = customer;

  return (
    <div className="cdm-detail">
      <div className="cdm-dhead">
        <div className="cdm-dhead-top">
          <div className={"cdm-dav" + (k.firma ? " cdm-dav--firma" : "")}>
            {k.firma ? <Building2 size={28} strokeWidth={STROKE} color="#fff" aria-hidden /> : k.initials}
          </div>
          <div className="cdm-dtitle">
            <div className="cdm-dname">{k.name}</div>
            <div className="cdm-daddr">
              <MapPin size={15} strokeWidth={STROKE} aria-hidden />
              {k.street}, {k.zip} {k.city}
            </div>
          </div>
          <button type="button" className="cdm-dicon" aria-label={t("edit")}>
            <Pencil size={19} strokeWidth={STROKE} aria-hidden />
          </button>
        </div>
        <div className="cdm-dactions">
          <button type="button" className="cdm-dbtn">
            <ReceiptText size={19} strokeWidth={STROKE} color="#fff" aria-hidden />
            {t("newInvoiceFor")}
          </button>
          <button type="button" className="cdm-dbtn cdm-dbtn--ghost">
            <FileText size={18} strokeWidth={STROKE} aria-hidden />
            {t("newOfferFor")}
          </button>
        </div>
      </div>

      <div className="cdm-dscroll">
        <div className="cdm-fields">
          <Field icon={MapPin} label={t("address")} value={`${k.street}, ${k.zip} ${k.city}`} />
          <Field icon={IdCard} label={t("custNo")} value={k.kundennr} />
          {k.phone && <Field icon={Phone} label={t("phone")} value={k.phone} />}
          {k.email && <Field icon={Mail} label={t("email")} value={k.email} />}
          {k.note && (
            <div className="cdm-note">
              <span className="cdm-field-ic">
                <StickyNote size={18} strokeWidth={STROKE} aria-hidden />
              </span>
              <span className="cdm-field-body">
                <span className="cdm-note-lbl">{t("noteLbl")}</span>
                <span className="cdm-note-val">{k.note}</span>
              </span>
            </div>
          )}
        </div>

        <div className="cdm-sec">
          {t("docs")} · {k.docs.length}
        </div>
        <div className="cdm-table">
          <div className="cdm-tr cdm-thead">
            <span className="cdm-th">{t("colType")}</span>
            <span className="cdm-th">{t("colDate")}</span>
            <span className="cdm-th num">{t("colAmount")}</span>
            <span className="cdm-th num">{t("colStatus")}</span>
          </div>
          {k.docs.map((d) => (
            <DocRow key={d.id} doc={d} />
          ))}
          {k.docs.length === 0 && <div className="cdm-nodocs">{t("noDocs")}</div>}
        </div>
      </div>
    </div>
  );
}

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
  doc: CustomerDoc;
}

function DocRow({ doc }: DocRowProps) {
  const t = useTranslations("Customers");
  const TypeIcon = doc.type === "rechnung" ? ReceiptText : FileText;
  const typeLabel = doc.type === "rechnung" ? t("rechnung") : t("angebot");
  return (
    <div className="cdm-tr cdm-drow">
      <span className="cdm-tdoc">
        <span className={`cdm-tdoc-ic cdm-tdoc-ic--${doc.type}`}>
          <TypeIcon size={18} strokeWidth={STROKE} color={doc.type === "rechnung" ? "#fff" : "currentColor"} aria-hidden />
        </span>
        <span className="cdm-tdoc-body">
          <span className="cdm-tno">{doc.id}</span>
          <span className="cdm-ttype">{typeLabel}</span>
        </span>
      </span>
      <span className="cdm-tdate">{formatDateDE(doc.date)}</span>
      <span className="cdm-tamount num">{formatMoney(doc.amount)}</span>
      <span className="cdm-tstatus num">
        <StatusPill status={doc.status} />
      </span>
    </div>
  );
}

const STATUS_KEY: Record<CustomerDocStatus, string> = {
  bezahlt: "statusBezahlt",
  offen: "statusOffen",
  versendet: "statusVersendet",
  entwurf: "statusEntwurf",
  angebot: "statusAngebot",
  angenommen: "statusAngenommen",
};

interface StatusPillProps {
  status: CustomerDocStatus;
}

function StatusPill({ status }: StatusPillProps) {
  const t = useTranslations("Customers");
  return (
    <span className={`pill pill--${status}`}>
      <i />
      {t(STATUS_KEY[status])}
    </span>
  );
}
