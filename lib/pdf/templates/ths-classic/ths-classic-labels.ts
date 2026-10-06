/**
 * Feste Beschriftungen der Vorlage `ths-classic` — IMMER Deutsch, unabhängig
 * von der Bediensprache. Wortlaut folgt der THS-Referenzrechnung; inhaltliche
 * Pflichttexte (§19-Hinweis, Zahlungsziel, Leistungsangabe) kommen aus den
 * Renderdaten.
 */
export const THS_LABELS = {
  firma: "Firma",
  einsatzort: "Einsatzort:",
  belegdatum: "Belegdatum:",
  gueltigBis: "Gültig bis:",
  sachbearbeiter: "Sachbearbeiter:",
  rechnungsnummer: "Rechnungsnummer:",
  angebotsnummer: "Angebotsnummer:",
  ansprechpartner: "Ansprechpartner:",
  tel: "Tel.:",
  lieferMontagetermin: "Liefer-/Montagetermin:",
  einleitungRechnung: "Gemäß Auftrag berechnen wir Ihnen wie folgt:",
  einleitungAngebot: "Gerne bieten wir Ihnen wie folgt an:",
  position: "Position",
  menge: "Menge",
  bezeichnung: "Bezeichnung",
  ust: "USt.",
  einzelpreis: "E-Preis - € -",
  gesamtpreis: "G-Preis - € -",
  summeNetto: "Summe Netto",
  mehrwertsteuer: "Mehrwertsteuer",
  summeBrutto: "Summe Brutto",
  zwischensumme: "Zwischensumme",
  zwischensummeNetto: "Zwischensumme (netto)",
  zahlungsbedingung: "Zahlungsbedingung:",
  gruss: "Mit freundlichen Grüßen",
  geschaeftsfuehrer: "Geschäftsführer:",
  sitz: "Sitz:",
  telefon: "Telefon:",
  mobil: "Mobil:",
  email: "E-Mail:",
  bankverbindung: "Bankverbindung:",
  iban: "IBAN:",
  bic: "BIC:",
  seite: "Seite",
  von: "von",
} as const;

/**
 * Leistungszeilen im Kopfband (rechte Hälfte) — fest aus dem THS-Briefkopf
 * übernommen; `ths-classic` ist die Vorlage dieses Betriebs. Wortlaut wie im
 * Original.
 */
export const THS_HEADER_SERVICES = [
  "Brandschutz- & Türtechnik",
  "Einbau und Reparatur von Fenstern",
  "Einbau und Reparatur von Jalousinen",
  "Unterstützung im Elektronikbereich",
] as const;
