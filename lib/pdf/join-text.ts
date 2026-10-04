/** Verbindet nicht-leere, getrimmte Teile mit `separator`; leere Teile entfallen. */
export function joinText(parts: (string | null | undefined)[], separator: string): string {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(separator);
}
