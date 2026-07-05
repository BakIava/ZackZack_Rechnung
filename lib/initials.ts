/** Leitet Initialen aus einem Namen ab: bei mehreren Wörtern Vor- und
 *  Nachname-Initiale, sonst die ersten zwei Zeichen — immer in Großbuchstaben.
 *  (Gemeinsame Quelle für Kunden-Avatare; identisch zu den bisherigen lokalen
 *  Implementierungen in customer-detail und NewCustomerModal.) */
export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
