/**
 * Welche Position in Schritt 2 aufgeklappt ist – höchstens eine. Alle anderen
 * erscheinen als kompakte Zeile, damit auch lange Positionslisten übersichtlich
 * bleiben. Beim Öffnen der Seite ist keine aufgeklappt.
 */

/**
 * Nach einer Änderung der Positionsliste: eine neu hinzugekommene Position wird
 * aufgeklappt; ist die offene gelöscht worden, ist keine mehr offen; sonst
 * (Bearbeiten, Umsortieren) bleibt die offene offen.
 */
export function expandedAfterChange(
  previousIds: readonly string[],
  nextIds: readonly string[],
  expandedId: string | null,
): string | null {
  const known = new Set(previousIds);
  const added = nextIds.filter((id) => !known.has(id));
  if (added.length > 0) return added[added.length - 1];
  return expandedId !== null && nextIds.includes(expandedId) ? expandedId : null;
}

/** Antippen einer Zeile öffnet sie (und schließt die vorige); erneutes Antippen schließt. */
export function toggleExpanded(expandedId: string | null, id: string): string | null {
  return expandedId === id ? null : id;
}
