import { describe, it, expect } from "vitest";
import {
  cleanOptionalText,
  cleanText,
  parseIntField,
  parseYesNo,
  parseMoney,
  parseOracleDate,
} from "./clean";

describe("cleanOptionalText", () => {
  it("trims surrounding whitespace", () => {
    expect(cleanOptionalText("  Homeowner   ")).toBe("Homeowner");
  });

  it("treats the literal string 'null' as missing", () => {
    expect(cleanOptionalText("null")).toBeNull();
    expect(cleanOptionalText("  NULL  ")).toBeNull();
  });

  it("treats empty as missing", () => {
    expect(cleanOptionalText("   ")).toBeNull();
  });
});

describe("cleanText", () => {
  it("trims required text", () => {
    expect(cleanText("NON-FOOD                  ")).toBe("NON-FOOD");
  });
});

describe("parseIntField", () => {
  it("parses whitespace-padded integers", () => {
    expect(parseIntField("1600            ")).toBe(1600);
  });

  it("parses zero-padded integers", () => {
    expect(parseIntField("0159")).toBe(159);
    expect(parseIntField("00072499")).toBe(72499);
  });

  it("throws on non-integers", () => {
    expect(() => parseIntField("abc")).toThrow();
  });
});

describe("parseYesNo", () => {
  it("maps Y/N (case-insensitive) to boolean", () => {
    expect(parseYesNo("Y")).toBe(true);
    expect(parseYesNo(" n ")).toBe(false);
  });

  it("throws on anything else", () => {
    expect(() => parseYesNo("maybe")).toThrow();
  });
});

describe("parseMoney", () => {
  it("parses values without a leading zero", () => {
    expect(parseMoney(".59")).toBeCloseTo(0.59);
  });

  it("parses padded values", () => {
    expect(parseMoney("       3.49")).toBeCloseTo(3.49);
  });
});

describe("parseOracleDate", () => {
  it("parses DD-MON-YY into the correct UTC date", () => {
    const d = parseOracleDate("17-AUG-18");
    expect(d.getUTCFullYear()).toBe(2018);
    expect(d.getUTCMonth()).toBe(7); // August is month index 7
    expect(d.getUTCDate()).toBe(17);
  });

  it("throws on malformed dates", () => {
    expect(() => parseOracleDate("2018-08-17")).toThrow();
  });
});
