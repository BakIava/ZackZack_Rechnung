import { Check, Pencil, ShieldCheck, TriangleAlert, X } from "lucide-react";

export interface CheckRow {
  id: string;
  label: string;
  ok: boolean;
}

interface CheckListProps {
  rows: CheckRow[];
  labels: {
    title: string;
    allGood: string;
    some: string;
    correct: string;
  };
  onFix?: (id: string) => void;
}

const STROKE = 1.75;

/** Pflichtangaben-Check (Ampel) — speist sich aus der Legal-Prüfung.
 *  Grün = exportierbar; rote Punkte blockieren den PDF-Export. */
export function CheckList({ rows, labels, onFix }: CheckListProps) {
  const allOk = rows.every((r) => r.ok);
  const badCount = rows.filter((r) => !r.ok).length;

  return (
    <>
      <div className="check-head">
        <span className={`check-badge ${allOk ? "ok" : "bad"}`}>
          {allOk ? (
            <ShieldCheck size={20} strokeWidth={STROKE} aria-hidden />
          ) : (
            <TriangleAlert size={20} strokeWidth={STROKE} aria-hidden />
          )}
        </span>
        <div>
          <div className="check-head-t">{labels.title}</div>
          <div className={`check-head-s ${allOk ? "ok" : "bad"}`}>
            {allOk ? labels.allGood : `${badCount} × ${labels.some}`}
          </div>
        </div>
      </div>
      <div className="check-list">
        {rows.map((row) => (
          <div key={row.id} className={`check-row${row.ok ? "" : " bad"}`}>
            <span className={`check-tick ${row.ok ? "ok" : "bad"}`}>
              {row.ok ? (
                <Check size={14} strokeWidth={2.5} color="#fff" aria-hidden />
              ) : (
                <X size={14} strokeWidth={2.5} color="#fff" aria-hidden />
              )}
            </span>
            <span className="check-lbl">{row.label}</span>
            {!row.ok && (
              <button
                type="button"
                className="check-fix"
                onClick={() => onFix?.(row.id)}
              >
                <Pencil size={13} strokeWidth={STROKE} aria-hidden />
                {labels.correct}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
