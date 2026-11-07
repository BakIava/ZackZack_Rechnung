/**
 * Kaufmännische Rundung auf ganze Zahlen: ,5 wird vom Nullpunkt weg gerundet
 * (2,5 → 3, −2,5 → −3) – genau wie Postgres `round(numeric)` in
 * finalize_document. `Math.round` rundet −2,5 dagegen auf −2; bei Abzügen
 * (negativen Positionen) wichen Vorschau und festgeschriebener Beleg sonst um
 * einen Cent ab.
 */
export function roundHalfAwayFromZero(value: number): number {
  const rounded = Math.sign(value) * Math.round(Math.abs(value));
  return rounded === 0 ? 0 : rounded; // kein −0
}

/** Geld wird immer als ganzzahlige Cents gespeichert. */
export function eurosToCents(euros: number): number {
  return roundHalfAwayFromZero(euros * 100);
}
