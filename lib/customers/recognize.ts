import type { CustomerType } from "@/types/database";

/**
 * Aus Freitext erkannte Kundenfelder – exakt in der Form, die der
 * „Neuer Kunde"-Dialog braucht (customerType, firstname/lastname/companyName,
 * street + houseNo getrennt, zip/city, phone/email).
 */
export interface RecognizedCustomer {
  customerType: CustomerType;
  companyName: string;
  firstname: string;
  lastname: string;
  street: string;
  houseNo: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
}

/** Felder, die einzeln als „von der KI erkannt" markiert werden können. */
export type RecognizedField =
  | "type"
  | "companyName"
  | "firstname"
  | "lastname"
  | "street"
  | "houseNo"
  | "zip"
  | "city"
  | "phone"
  | "email";

export interface RecognitionResult {
  /** true, sobald ein belastbares Identmerkmal (Adresse oder Kontakt) erkannt wurde. */
  ok: boolean;
  fields: RecognizedCustomer;
  /** Pro Feld, ob es erkannt wurde → steuert die „KI"-Badges im Formular. */
  found: Partial<Record<RecognizedField, boolean>>;
  /** Felder, deren Schreibweise an die amtliche Form angepasst wurde. */
  corrected: Partial<Record<"street" | "city", boolean>>;
  /** Anzahl erkannter Felder (ohne Kundenart) – für den Erfolgs-Banner. */
  count: number;
}

// ── Heuristische Muster (Platzhalter für echte KI-Erkennung) ────────────────
const COMPANY_KW =
  /\b(gmbh|mbh|ug|ag|kg|gbr|ohg|e\.?\s?k|co\.?\s?kg|&\s?co|caf[eé]|restaurant|b[äa]ckerei|betrieb|bau|hotel|gaststätte|gaststaette|firma|kanzlei|praxis|autohaus|apotheke|metzgerei|friseur|salon|studio|werkstatt|handel|logistik|spedition|immobilien|dienst)\b/i;
const PRIVATE_KW = /\b(familie|fam\.?|herr|hr\.?|frau|fr\.?)\b/i;
const STREET_KW =
  /(stra(ß|ss)e|str\.?|weg|platz|allee|gasse|ring|damm|ufer|steig|chaussee)\b/i;

// Amtliche Ortskorrekturen – Platzhalter für echtes Geocoding (Mapbox).
const CITY_FIX: Record<string, string> = {
  offenbach: "Offenbach am Main",
  frankfurt: "Frankfurt am Main",
  ffm: "Frankfurt am Main",
  hechtsheim: "Mainz-Hechtsheim",
  hecshtheim: "Mainz-Hechtsheim",
  friedberg: "Friedberg (Hessen)",
  homburg: "Bad Homburg",
  "bad homburg": "Bad Homburg",
};

const CONNECTORS = /^(am|an|der|die|im|ob|vor|bei|und)$/i;

function cap(w: string): string {
  return w ? w.charAt(0).toLocaleUpperCase("de") + w.slice(1) : w;
}

function titleWords(s: string): string {
  return s
    .split(/(\s+|-)/)
    .map((p) => {
      if (/^[\s-]+$/.test(p)) return p;
      return CONNECTORS.test(p) ? p.toLowerCase() : cap(p);
    })
    .join("");
}

function normStreet(str: string): string {
  let s = str.trim().replace(/\s+/g, " ");
  s = s.replace(/(\d+)\s+([a-zA-Z])\b/g, "$1$2"); // "11 a" → "11a"
  s = s
    .split(" ")
    .map((w) => {
      if (/^str\.?$/i.test(w)) return "Straße";
      return w.replace(/strasse$/i, "straße").replace(/str\.?$/i, "straße");
    })
    .join(" ");
  return titleWords(s).trim();
}

function normCity(str: string): string {
  const key = str.trim().replace(/\s+/g, " ").toLowerCase();
  if (CITY_FIX[key]) return CITY_FIX[key];
  return titleWords(key);
}

function normPhone(p: string): string {
  return p
    .replace(/[()/.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trennt „Berger Straße 147" → { street: "Berger Straße", houseNo: "147" }. */
function splitStreet(full: string): { street: string; houseNo: string } {
  const m = full.match(/^(.*?)[\s,]+(\d+\s*[a-zA-Z]?)\s*$/);
  if (m) return { street: m[1].trim(), houseNo: m[2].replace(/\s+/g, "") };
  return { street: full.trim(), houseNo: "" };
}

/**
 * Erkennt Kundendaten aus Freitext. **Platzhalter** für eine echte
 * KI-/Geocoding-Anbindung: Diesen Funktionskörper durch einen Aufruf einer
 * Server-Action ersetzen, die ein Sprachmodell + Mapbox anfragt. Der
 * Rückgabetyp {@link RecognitionResult} ist der stabile Contract, an dem der
 * Dialog hängt – die UI muss dafür nicht angefasst werden.
 */
export async function recognizeCustomerText(
  raw: string,
): Promise<RecognitionResult> {
  return parseCustomerText(raw);
}

export function parseCustomerText(raw: string): RecognitionResult {
  const text = (raw || "").trim();
  const fields: RecognizedCustomer = {
    customerType: "private",
    companyName: "",
    firstname: "",
    lastname: "",
    street: "",
    houseNo: "",
    zip: "",
    city: "",
    phone: "",
    email: "",
  };
  const found: RecognitionResult["found"] = {};
  const corrected: RecognitionResult["corrected"] = {};

  if (!text) return { ok: false, fields, found, corrected, count: 0 };

  const parts = text
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const consumed = new Array(parts.length).fill(false);
  let rawCity = "";
  let rawStreet = "";

  parts.forEach((tok, i) => {
    const em = tok.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    if (em && !found.email) {
      fields.email = em[0].toLowerCase();
      found.email = true;
      consumed[i] = true;
      return;
    }
    const digits = tok.replace(/\D/g, "");
    const ph = tok.match(/(?:\+49|0)[\d\s/().\-]{5,}\d/);
    if (ph && !found.phone && digits.length >= 7 && !/\d{5}\s+\D/.test(tok)) {
      fields.phone = normPhone(ph[0]);
      found.phone = true;
      consumed[i] = true;
      return;
    }
    // PLZ + Ort (beide Reihenfolgen)
    let zc = tok.match(/^(?:.*?\s)?(\d{5})\s+(.+)$/);
    if (!zc) {
      const alt = tok.match(/^(.+?)\s+(\d{5})$/);
      if (alt) zc = [tok, alt[2], alt[1]];
    }
    if (zc && !found.zip) {
      fields.zip = zc[1];
      found.zip = true;
      rawCity = zc[2].trim();
      consumed[i] = true;
      return;
    }
    if (/^\d{5}$/.test(tok) && !found.zip) {
      fields.zip = tok;
      found.zip = true;
      consumed[i] = true;
      return;
    }
    if (STREET_KW.test(tok) && /\d/.test(tok) && !found.street) {
      rawStreet = tok;
      consumed[i] = true;
    }
  });

  // Übrige Token → Name (erstes Token = Name, weitere = Ansprechpartner/Zusatz).
  const rest = parts.filter(
    (t, i) => !consumed[i] && /[A-Za-zÄÖÜäöüßçğışĞİŞ]/.test(t),
  );
  const rawName = rest.length ? rest[0].replace(/\s+/g, " ").trim() : "";
  const rawContact = rest.length > 1 ? rest.slice(1).join(", ").trim() : "";

  // Adresse normalisieren (Platzhalter für Mapbox).
  if (rawStreet) {
    const normalized = normStreet(rawStreet);
    if (normalized !== rawStreet.trim()) corrected.street = true;
    const { street, houseNo } = splitStreet(normalized);
    fields.street = street;
    found.street = true;
    if (houseNo) {
      fields.houseNo = houseNo;
      found.houseNo = true;
    }
  }
  if (rawCity) {
    const normalized = normCity(rawCity);
    if (normalized !== rawCity.trim()) corrected.city = true;
    fields.city = normalized;
    found.city = true;
  }

  // Kundenart aus dem Namen ableiten.
  if (COMPANY_KW.test(rawName)) fields.customerType = "business";
  else if (PRIVATE_KW.test(rawName)) fields.customerType = "private";

  if (rawName) {
    found.type = true;
    if (fields.customerType === "business") {
      fields.companyName = rawName;
      found.companyName = true;
      // Ein zusätzlicher Ansprechpartner landet in Vor-/Nachname.
      if (rawContact) {
        const [first, ...more] = rawContact.split(/\s+/).filter(Boolean);
        fields.firstname = first ?? "";
        fields.lastname = more.join(" ");
        if (fields.firstname) found.firstname = true;
        if (fields.lastname) found.lastname = true;
      }
    } else {
      const [first, ...more] = rawName.split(/\s+/).filter(Boolean);
      fields.firstname = first ?? "";
      fields.lastname = more.join(" ");
      if (fields.firstname) found.firstname = true;
      if (fields.lastname) found.lastname = true;
    }
  }

  const count = Object.keys(found).filter((k) => k !== "type").length;
  // „gültig" = mindestens ein belastbares Identmerkmal. Ein bloßer Name reicht
  // nicht → manuelle Eingabe (Name bleibt trotzdem vorbefüllt).
  const ok = Boolean(found.street || found.zip || found.phone || found.email);
  return { ok, fields, found, corrected, count };
}
