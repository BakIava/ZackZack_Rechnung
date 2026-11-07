"use client";

import { useState } from "react";
import { expandedAfterChange, toggleExpanded } from "@/lib/documents/position-expansion";

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Höchstens eine aufgeklappte Position. Folgt der Positionsliste: neue Position
 * auf, gelöschte offene zu, Bearbeiten/Umsortieren lässt sie offen. Beim Öffnen
 * der Seite ist keine aufgeklappt.
 */
export function usePositionExpansion(itemIds: readonly string[]) {
  const [state, setState] = useState<{ ids: readonly string[]; expandedId: string | null }>(
    () => ({ ids: itemIds, expandedId: null }),
  );

  // Abgeleiteter Zustand: auf eine geänderte Liste schon beim Rendern reagieren,
  // damit eine neue Position ohne Zwischenbild aufgeklappt erscheint.
  let current = state;
  if (!sameOrder(state.ids, itemIds)) {
    current = { ids: itemIds, expandedId: expandedAfterChange(state.ids, itemIds, state.expandedId) };
    setState(current);
  }

  return {
    expandedId: current.expandedId,
    toggle: (id: string) =>
      setState((previous) => ({ ...previous, expandedId: toggleExpanded(previous.expandedId, id) })),
    collapse: () => setState((previous) => ({ ...previous, expandedId: null })),
  };
}
