import { ShieldCheck, Lock } from "lucide-react";
import {
  DOC_DE,
  invoiceTotalCents,
  lineTotalCents,
  type InvoicePreview,
} from "@/lib/demo/create-data";
import { formatMoney } from "@/lib/format";

interface InvoiceA4Props {
  invoice: InvoicePreview;
  /** Optionale Skalierung für die Mini-Vorschau (z. B. "scale(.515)"). */
  className?: string;
}

const STROKE = 1.75;

/** A4-Belegvorschau — IMMER Deutsch und LTR, reine Kundensicht.
 *  Hard-Regel: kein Einkaufspreis / keine Marge, Dokumentsprache bleibt Deutsch
 *  unabhängig von der Bediensprache. Labels stammen daher aus DOC_DE, nicht i18n. */
export function InvoiceA4({ invoice, className }: InvoiceA4Props) {
  const { issuer: is, recipient: rc } = invoice;
  const total = invoiceTotalCents(invoice);

  return (
    <div className={`a4-paper${className ? ` ${className}` : ""}`} dir="ltr" lang="de">
      <div className="a4">
        <div className="a4-top">
          <div>
            <div className="a4-co-name">{is.name}</div>
            <div className="a4-co-trade">{DOC_DE.trade}</div>
            <div className="a4-co-addr">
              {is.street} · {is.city}
              <br />
              Tel. {is.phone} · {is.email}
            </div>
          </div>
          <div className="a4-logo">{is.initials}</div>
        </div>

        <div className="a4-mid">
          <div className="a4-to">
            <div className="a4-sender">
              {is.name} · {is.street} · {is.city}
            </div>
            <div className="a4-lbl">{DOC_DE.to}</div>
            <div className="a4-to-name">{rc.name}</div>
            <div className="a4-to-addr">
              {rc.street}
              <br />
              {rc.city}
            </div>
          </div>
          <div className="a4-meta">
            <div className="a4-meta-row">
              <span className="k">{DOC_DE.no}</span>
              <span className="v">{invoice.number}</span>
            </div>
            <div className="a4-meta-row">
              <span className="k">{DOC_DE.date}</span>
              <span className="v">{invoice.date}</span>
            </div>
            <div className="a4-meta-row">
              <span className="k">{DOC_DE.taxNo}</span>
              <span className="v">{is.taxNo}</span>
            </div>
            {invoice.reserved && (
              <div className="a4-resv-wrap">
                <span className="a4-resv">
                  <Lock size={11} strokeWidth={STROKE} aria-hidden />
                  {DOC_DE.reserved}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="a4-h1">
          {DOC_DE.invoice} {invoice.number}
        </div>

        <table className="a4-table">
          <thead>
            <tr>
              <th className="a4-pos">{DOC_DE.pos}</th>
              <th>{DOC_DE.desc}</th>
              <th className="num">{DOC_DE.qty}</th>
              <th className="num">{DOC_DE.unitPrice}</th>
              <th className="num">{DOC_DE.lineSum}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.positions.map((p, i) => (
              <tr key={p.id}>
                <td className="a4-pos">{i + 1}</td>
                <td className="a4-td-desc">{p.label}</td>
                <td className="num">
                  {p.qty} {p.unit}
                </td>
                <td className="num">{formatMoney(p.priceCents)}</td>
                <td className="num">{formatMoney(lineTotalCents(p))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="a4-sumwrap">
          <div className="a4-sumbox">
            <div className="a4-sumline">
              <span>{DOC_DE.netSum}</span>
              <span className="v">{formatMoney(total)}</span>
            </div>
            <div className="a4-grand">
              <span className="l">{DOC_DE.total}</span>
              <span className="v">{formatMoney(total)}</span>
            </div>
          </div>
        </div>

        <div className="a4-vat">
          <ShieldCheck size={16} strokeWidth={STROKE} aria-hidden />
          <span>{DOC_DE.vatNote}</span>
        </div>
        <div className="a4-pay">
          {DOC_DE.payNote}
          <br />
          {is.bank} · IBAN {is.iban}
        </div>
        <div className="a4-thanks">{DOC_DE.thanks}</div>

        <div className="a4-foot">
          <div>
            <b>{is.name}</b>
            {is.owner}, {DOC_DE.owner}
            <br />
            {is.street}, {is.city}
          </div>
          <div>
            <b>{DOC_DE.footContact}</b>
            Tel. {is.phone}
            <br />
            {is.email}
          </div>
          <div>
            <b>{DOC_DE.footBankTax}</b>
            {is.bank}
            <br />
            Steuer-Nr. {is.taxNo}
          </div>
        </div>
      </div>
    </div>
  );
}
