/** Anzeigeformatierung — Beträge & Daten erscheinen immer deutsch (de-DE). */

const moneyFormat = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

/** Formatiert einen Betrag in ganzzahligen Cents als deutschen Euro-Betrag. */
export function formatMoney(cents: number): string {
  return moneyFormat.format(cents / 100);
}

/** Formatiert ein ISO-Datum als TT.MM.JJJJ (de-DE). */
export function formatDateDE(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
