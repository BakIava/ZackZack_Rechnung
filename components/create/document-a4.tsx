import { ShieldCheck } from "lucide-react";
import { formatDateDE, formatMoney } from "@/lib/format";
import { DOKUMENT_DE, zahlungszielText } from "@/lib/documents/document-de";
import type { DocumentPreview } from "@/types/document";

interface DocumentA4Props {
  preview: DocumentPreview;
  /** Optionale Zusatzklasse für die Mini-/Zoom-Darstellung. */
  className?: string;
}

const STROKE = 1.75;

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const raw = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return raw.toUpperCase();
}

function joinTrim(parts: (string | null | undefined)[], sep: string): string {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean).join(sep);
}

/**
 * A4-Belegvorschau mit echten Daten — IMMER Deutsch und LTR, reine Kundensicht.
 * Hard-Regeln: kein Einkaufspreis / keine Marge, Dokumentsprache bleibt Deutsch
 * unabhängig von der Bediensprache. Empfänger stammt aus dem eingefrorenen
 * customer_snapshot (nie Live-Join). Beschriftungen kommen aus DOKUMENT_DE.
 */
export function DocumentA4({ preview, className }: DocumentA4Props) {
  const { company: co, customer: rc, docType, isKleinunternehmer } = preview;
  const isRechnung = docType === "invoice";
  const total = preview.items.reduce((sum, p) => sum + p.totalAmount, 0);

  const coStreet = joinTrim([co.street, co.streetNo], " ");
  const coCity = joinTrim([co.postcode, co.city], " ");
  const coSenderLine = joinTrim([co.name, coStreet, coCity], " · ");
  const rcStreet = rc ? joinTrim([rc.street, rc.streetNo], " ") : "";
  const rcCity = rc ? joinTrim([rc.postcode, rc.city], " ") : "";

  const numberLabel = isRechnung ? DOKUMENT_DE.rechnungNr : DOKUMENT_DE.angebotNr;
  const titleWort = isRechnung ? DOKUMENT_DE.rechnung : DOKUMENT_DE.angebot;
  const sumLabel = isRechnung ? DOKUMENT_DE.rechnungsbetrag : DOKUMENT_DE.angebotssumme;
  const empfLabel = isRechnung ? DOKUMENT_DE.empfaengerRechnung : DOKUMENT_DE.empfaengerAngebot;
  const steuerLabel = co.steuernummer ? DOKUMENT_DE.steuerNr : DOKUMENT_DE.ustId;
  const steuerWert = co.steuernummer ?? co.ustId ?? "—";

  return (
    <div className={`a4-paper${className ? ` ${className}` : ""}`} dir="ltr" lang="de">
      <div className="a4">
        <div className="a4-top">
          <div>
            <div className="a4-co-name">{co.name}</div>
            <div className="a4-co-addr">
              {joinTrim([coStreet, coCity], " · ")}
              {(co.phone || co.email) && (
                <>
                  <br />
                  {joinTrim(
                    [co.phone ? `Tel. ${co.phone}` : null, co.email],
                    " · ",
                  )}
                </>
              )}
            </div>
          </div>
          <div className="a4-logo">
            {co.logoUrl ? (
              // Firmenlogo (Supabase-Storage-URL), reine Vorschau – next/image
              // bräuchte hier zusätzliche Remote-Domain-Konfiguration.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="a4-logo-img" src={co.logoUrl} alt="" />
            ) : (
              initialsOf(co.name)
            )}
          </div>
        </div>

        <div className="a4-mid">
          <div className="a4-to">
            <div className="a4-sender">{coSenderLine}</div>
            <div className="a4-lbl">{empfLabel}</div>
            <div className="a4-to-name">{rc?.name ?? "—"}</div>
            {rc && (
              <div className="a4-to-addr">
                {rcStreet}
                {rcStreet && rcCity && <br />}
                {rcCity}
              </div>
            )}
          </div>
          <div className="a4-meta">
            <div className="a4-meta-row">
              <span className="k">{numberLabel}</span>
              <span className={`v${preview.documentNumber ? "" : " a4-num--draft"}`}>
                {preview.documentNumber ?? DOKUMENT_DE.entwurfPlatzhalter}
              </span>
            </div>
            <div className="a4-meta-row">
              <span className="k">{DOKUMENT_DE.datum}</span>
              <span className="v">
                {preview.issueDate ? formatDateDE(preview.issueDate) : "—"}
              </span>
            </div>
            {preview.serviceDate && (
              <div className="a4-meta-row">
                <span className="k">{DOKUMENT_DE.leistungsdatum}</span>
                <span className="v">{formatDateDE(preview.serviceDate)}</span>
              </div>
            )}
            <div className="a4-meta-row">
              <span className="k">{steuerLabel}</span>
              <span className="v">{steuerWert}</span>
            </div>
          </div>
        </div>

        <div className="a4-h1">
          {titleWort}
          {preview.documentNumber ? ` ${preview.documentNumber}` : ""}
        </div>

        <table className="a4-table">
          <thead>
            <tr>
              <th className="a4-pos">{DOKUMENT_DE.pos}</th>
              <th>{DOKUMENT_DE.bezeichnung}</th>
              <th className="num">{DOKUMENT_DE.menge}</th>
              <th className="num">{DOKUMENT_DE.einzelpreis}</th>
              <th className="num">{DOKUMENT_DE.gesamtSpalte}</th>
            </tr>
          </thead>
          <tbody>
            {preview.items.map((p) => (
              <tr key={p.position}>
                <td className="a4-pos">{p.position}</td>
                <td className="a4-td-desc">{p.descriptionDe}</td>
                <td className="num">
                  {p.amount} {p.unit}
                </td>
                <td className="num">{formatMoney(p.unitPrice)}</td>
                <td className="num">{formatMoney(p.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="a4-sumwrap">
          <div className="a4-sumbox">
            <div className="a4-sumline">
              <span>{DOKUMENT_DE.gesamtNetto}</span>
              <span className="v">{formatMoney(total)}</span>
            </div>
            <div className="a4-grand">
              <span className="l">{sumLabel}</span>
              <span className="v">{formatMoney(total)}</span>
            </div>
          </div>
        </div>

        {isKleinunternehmer && (
          <div className="a4-vat">
            <ShieldCheck size={16} strokeWidth={STROKE} aria-hidden />
            <span>{DOKUMENT_DE.kleinunternehmerHinweis}</span>
          </div>
        )}

        {isRechnung && preview.issueDate && (
          <div className="a4-pay">
            {zahlungszielText(preview.issueDate, co.paymentDays)}
            {joinTrim([co.bankName, co.iban ? `IBAN ${co.iban}` : null], " · ") && (
              <>
                <br />
                {joinTrim([co.bankName, co.iban ? `IBAN ${co.iban}` : null], " · ")}
              </>
            )}
          </div>
        )}

        <div className="a4-thanks">{DOKUMENT_DE.danke}</div>

        <div className="a4-foot">
          <div>
            <b>{co.name}</b>
            {joinTrim([co.director ? `${co.director}, ${DOKUMENT_DE.inhaber}` : null], "")}
            {co.director && <br />}
            {joinTrim([coStreet, coCity], ", ")}
          </div>
          <div>
            <b>{DOKUMENT_DE.kontakt}</b>
            {co.phone ? `Tel. ${co.phone}` : ""}
            {co.phone && co.email && <br />}
            {co.email}
          </div>
          <div>
            <b>{DOKUMENT_DE.bankUndSteuer}</b>
            {co.bankName ?? ""}
            {co.bankName && <br />}
            {steuerLabel} {steuerWert}
          </div>
        </div>
      </div>
    </div>
  );
}
