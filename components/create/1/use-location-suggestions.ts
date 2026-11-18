"use client";

import { useEffect, useState } from "react";
import { getServiceLocationSuggestions } from "@/lib/documents/service-location-suggestion-actions";
import type { DocumentServiceLocation } from "@/types/service-location";

interface SuggestionState {
  customerId: string | null;
  locations: DocumentServiceLocation[];
}

/** Lädt beim Wechsel des Kunden dessen letzte Einsatzorte; ohne Kunde keine Vorschläge. */
export function useLocationSuggestions(
  documentId: string,
  customerId: string | null,
): DocumentServiceLocation[] {
  const [state, setState] = useState<SuggestionState>({ customerId: null, locations: [] });

  useEffect(() => {
    if (!customerId) return;
    let active = true;
    getServiceLocationSuggestions(documentId, customerId)
      .then((locations) => active && setState({ customerId, locations }))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [documentId, customerId]);

  // Vorschläge eines vorher gewählten Kunden nie anzeigen.
  return state.customerId === customerId ? state.locations : [];
}
