/** Vorläufige UI-Eingabe je Dokument; noch kein Datenbank- oder PDF-Modell. */
export interface ServiceLocationInput {
  name: string;
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  addressExtra: string;
  sourceText: string;
}

/** Dokumentbezogener Snapshot ohne den ursprünglichen KI-Freitext. */
export type DocumentServiceLocation = Omit<ServiceLocationInput, "sourceText">;

/** Defensiv geprüfte KI-Antwort; nicht erkannte Angaben bleiben null. */
export type ServiceLocationExtraction = {
  [K in Exclude<keyof ServiceLocationInput, "sourceText">]: string | null;
};

export type ServiceLocationIntakeResult =
  | { status: "extracted"; location: ServiceLocationExtraction }
  | {
      status: "manual";
      reason: "not_authenticated" | "invalid_input" | "quota_unavailable"
        | "extraction_failed" | "no_usable_data";
    }
  | { status: "manual"; reason: "daily_limit_reached"; dailyLimit: number };
