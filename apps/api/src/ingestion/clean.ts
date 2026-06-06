// Pure functions that clean the quirks in the 84.51/Kroger CSVs. Each one takes a
// raw string field and returns a typed, cleaned value. No I/O, no database — which
// makes them trivial to unit-test, and that's where the real risk lives.

/**
 * Optional text: trims whitespace, and treats empty or the literal string "null"
 * as a real missing value (returns null). Used for demographics.
 */
export function cleanOptionalText(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "null") return null;
  return trimmed;
}

/** Required text (e.g. department): trimmed, but kept as-is otherwise. */
export function cleanText(value: string): string {
  return value.trim();
}

/** Parses a (possibly whitespace- or zero-padded) integer, e.g. " 1600 " -> 1600. */
export function parseIntField(value: string): number {
  const trimmed = value.trim();
  const n = Number(trimmed);
  if (!Number.isInteger(n)) {
    throw new Error(`Expected an integer but got "${value}"`);
  }
  return n;
}

/** Maps a Y/N flag (case-insensitive, padded) to a boolean. */
export function parseYesNo(value: string): boolean {
  const v = value.trim().toUpperCase();
  if (v === "Y") return true;
  if (v === "N") return false;
  throw new Error(`Expected "Y" or "N" but got "${value}"`);
}

/** Parses a money string such as ".59" or " 3.49 " into a number. */
export function parseMoney(value: string): number {
  const n = Number(value.trim());
  if (Number.isNaN(n)) {
    throw new Error(`Expected a money value but got "${value}"`);
  }
  return n;
}

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

/**
 * Parses an Oracle-style date like "17-AUG-18" into a UTC Date.
 * The two-digit year is interpreted with a 1970 pivot (00–69 -> 2000s, 70–99 -> 1900s).
 */
export function parseOracleDate(value: string): Date {
  const v = value.trim().toUpperCase();
  const match = /^(\d{1,2})-([A-Z]{3})-(\d{2})$/.exec(v);
  if (!match) {
    throw new Error(`Expected a DD-MON-YY date but got "${value}"`);
  }

  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  if (month === undefined) {
    throw new Error(`Unknown month "${match[2]}" in date "${value}"`);
  }

  const yy = Number(match[3]);
  const year = yy < 70 ? 2000 + yy : 1900 + yy;

  return new Date(Date.UTC(year, month, day));
}
