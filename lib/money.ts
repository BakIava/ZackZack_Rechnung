/** Geld wird immer als ganzzahlige Cents gespeichert. */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}
