/**
 * Reihenfolge der Dokumentpositionen – rein, ohne Datenzugriff. Positionen
 * sind lückenlos 1..n durchnummeriert; Vorschau und PDF drucken diese Nummer.
 */

/** Verschiebt das Element von Index `from` an Index `to` (0-basiert); sonst unverändert. */
export function moveToIndex<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return next;
  }
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Ein Schritt nach oben bzw. unten; am Rand bleibt die Liste unverändert. */
export function moveByOne<T>(list: readonly T[], index: number, direction: "up" | "down"): T[] {
  return moveToIndex(list, index, direction === "up" ? index - 1 : index + 1);
}

/** Enthält `orderedIds` genau die Positionen von `currentIds` – ohne Lücke und ohne Doppelte? */
export function isSameItemSet(
  currentIds: readonly string[],
  orderedIds: readonly string[],
): boolean {
  if (currentIds.length !== orderedIds.length) return false;
  const ordered = new Set(orderedIds);
  return ordered.size === orderedIds.length && currentIds.every((id) => ordered.has(id));
}

export interface PositionRow {
  id: string;
  position: number;
}

/**
 * Schreibplan für eine neue Reihenfolge: nur Zeilen, deren Nummer sich ändert.
 * `temporary` liegt oberhalb aller bisherigen und künftigen Nummern, damit beim
 * Umschreiben nie zwei Positionen dieselbe Nummer tragen.
 */
export function planReorder(
  current: readonly PositionRow[],
  orderedIds: readonly string[],
): Array<{ id: string; temporary: number; position: number }> {
  const before = new Map(current.map((row) => [row.id, row.position]));
  const highest = Math.max(orderedIds.length, ...current.map((row) => row.position));
  return orderedIds
    .map((id, index) => ({ id, position: index + 1 }))
    .filter((row) => before.get(row.id) !== row.position)
    .map((row, index) => ({ ...row, temporary: highest + index + 1 }));
}
