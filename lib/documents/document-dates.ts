const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(isoDate: string): { year: number; month: number; day: number } {
  const match = ISO_DATE_RE.exec(isoDate);
  if (!match) throw new RangeError("invalid_iso_date");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new RangeError("invalid_iso_date");
  }
  return { year, month, day };
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Ein Kalendermonat mit Klemmung ans Monatsende (31.01. -> 28./29.02.). */
export function addOneCalendarMonth(isoDate: string): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const targetYear = month === 12 ? year + 1 : year;
  const targetMonth = month === 12 ? 1 : month + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return formatIsoDate(targetYear, targetMonth, Math.min(day, lastDay));
}

/** Heutiges Datum im deutschen Produkt-Zeitraum, unabhaengig vom Server-UTC. */
export function todayInGermany(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function isPastDate(isoDate: string, today = todayInGermany()): boolean {
  parseIsoDate(isoDate);
  parseIsoDate(today);
  return isoDate < today;
}

export function isValidQuoteDateRange(issueDate: string | null, validUntil: string | null): boolean {
  if (!issueDate || !validUntil) return false;
  try {
    parseIsoDate(issueDate);
    parseIsoDate(validUntil);
    return validUntil >= issueDate;
  } catch {
    return false;
  }
}
