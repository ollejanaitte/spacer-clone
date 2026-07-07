import { describe, it, expect } from "vitest";
import {
  formatStationNoPlus,
  parseStationNoPlus,
  parseStationInput,
  DEFAULT_STATION_FORMAT_OPTIONS,
} from "../stationFormat";

describe("formatStationNoPlus", () => {
  describe("default options (interval 100, precision 3)", () => {
    it("formats 0 as No.0+0.000", () => {
      expect(formatStationNoPlus(0)).toBe("No.0+0.000");
    });
    it("formats 2535 as No.25+35.000", () => {
      expect(formatStationNoPlus(2535)).toBe("No.25+35.000");
    });
    it("formats 2535.123 as No.25+35.123", () => {
      expect(formatStationNoPlus(2535.123)).toBe("No.25+35.123");
    });
    it("formats exact multiple of interval", () => {
      expect(formatStationNoPlus(2500)).toBe("No.25+0.000");
    });
    it("formats value < interval", () => {
      expect(formatStationNoPlus(35)).toBe("No.0+35.000");
    });
    it("handles negative value with - prefix", () => {
      expect(formatStationNoPlus(-2535)).toBe("-No.25+35.000");
    });
  });

  describe("interval variations", () => {
    it("interval 20", () => {
      expect(formatStationNoPlus(2535, { interval: 20 })).toBe("No.126+15.000");
    });
    it("interval 50", () => {
      expect(formatStationNoPlus(2535, { interval: 50 })).toBe("No.50+35.000");
    });
    it("interval 200", () => {
      expect(formatStationNoPlus(2535, { interval: 200 })).toBe("No.12+135.000");
    });
  });

  describe("precision variations", () => {
    it("precision 0 rounds remainder", () => {
      expect(formatStationNoPlus(2535.5, { precision: 0 })).toBe("No.25+36");
    });
    it("precision 1", () => {
      expect(formatStationNoPlus(2535.12, { precision: 1 })).toBe("No.25+35.1");
    });
    it("precision 6", () => {
      expect(formatStationNoPlus(2535.123456, { precision: 6 })).toBe("No.25+35.123456");
    });
  });

  describe("prefix variations", () => {
    it("custom prefix", () => {
      expect(formatStationNoPlus(2535, { prefix: "STA." })).toBe("STA.25+35.000");
    });
    it("empty prefix", () => {
      expect(formatStationNoPlus(2535, { prefix: "" })).toBe("25+35.000");
    });
  });

  describe("non-finite values", () => {
    it("NaN returns null", () => {
      expect(formatStationNoPlus(Number.NaN)).toBeNull();
    });
    it("Infinity returns null", () => {
      expect(formatStationNoPlus(Number.POSITIVE_INFINITY)).toBeNull();
    });
    it("-Infinity returns null", () => {
      expect(formatStationNoPlus(Number.NEGATIVE_INFINITY)).toBeNull();
    });
  });
});

describe("parseStationNoPlus", () => {
  it("parses No.25+35 to 2535", () => {
    expect(parseStationNoPlus("No.25+35")).toBe(2535);
  });
  it("parses No.25+35.123 to 2535.123", () => {
    expect(parseStationNoPlus("No.25+35.123")).toBeCloseTo(2535.123, 6);
  });
  it("parses without prefix", () => {
    expect(parseStationNoPlus("25+35")).toBe(2535);
  });
  it("parses lowercase prefix", () => {
    expect(parseStationNoPlus("no.25+35")).toBe(2535);
  });
  it("parses with spaces", () => {
    expect(parseStationNoPlus(" No. 25 + 35 ")).toBe(2535);
  });
  it("parses negative", () => {
    expect(parseStationNoPlus("-No.25+35")).toBe(-2535);
  });
  it("parses 0+0", () => {
    expect(parseStationNoPlus("No.0+0")).toBe(0);
  });

  describe("interval variations", () => {
    it("interval 20", () => {
      expect(parseStationNoPlus("No.126+15", { interval: 20 })).toBe(2535);
    });
    it("interval 50", () => {
      expect(parseStationNoPlus("No.50+35", { interval: 50 })).toBe(2535);
    });
    it("interval 200", () => {
      expect(parseStationNoPlus("No.12+135", { interval: 200 })).toBe(2535);
    });
  });

  describe("invalid inputs", () => {
    it("empty string returns null", () => {
      expect(parseStationNoPlus("")).toBeNull();
    });
    it("no plus sign returns null", () => {
      expect(parseStationNoPlus("No.25")).toBeNull();
    });
    it("missing no part returns null", () => {
      expect(parseStationNoPlus("+35")).toBeNull();
    });
    it("missing remainder returns null", () => {
      expect(parseStationNoPlus("No.25+")).toBeNull();
    });
    it("non-numeric no part returns null", () => {
      expect(parseStationNoPlus("No.abc+35")).toBeNull();
    });
    it("non-numeric remainder returns null", () => {
      expect(parseStationNoPlus("No.25+abc")).toBeNull();
    });
    it("non-string returns null", () => {
      expect(parseStationNoPlus(null as unknown as string)).toBeNull();
    });
  });
});

describe("parseStationInput", () => {
  describe("No.XX+YY format", () => {
    it("accepts No.25+35", () => {
      expect(parseStationInput("No.25+35")).toEqual({ ok: true, value: 2535 });
    });
    it("accepts 25+35 without prefix", () => {
      expect(parseStationInput("25+35")).toEqual({ ok: true, value: 2535 });
    });
    it("rejects invalid No format", () => {
      expect(parseStationInput("No.abc+35")).toEqual({
        ok: false,
        reason: "invalid_format",
      });
    });
  });

  describe("numeric fallback", () => {
    it("accepts plain number 2535", () => {
      expect(parseStationInput("2535")).toEqual({ ok: true, value: 2535 });
    });
    it("accepts decimal 2535.123", () => {
      expect(parseStationInput("2535.123")).toEqual({ ok: true, value: 2535.123 });
    });
    it("accepts negative -2535", () => {
      expect(parseStationInput("-2535")).toEqual({ ok: true, value: -2535 });
    });
    it("rejects alphabetic", () => {
      expect(parseStationInput("abc")).toEqual({
        ok: false,
        reason: "invalid_format",
      });
    });
  });

  describe("edge cases", () => {
    it("empty string returns empty reason", () => {
      expect(parseStationInput("")).toEqual({ ok: false, reason: "empty" });
    });
    it("whitespace only returns empty reason", () => {
      expect(parseStationInput("   ")).toEqual({ ok: false, reason: "empty" });
    });
    it("Infinity returns not_finite", () => {
      expect(parseStationInput("Infinity")).toEqual({
        ok: false,
        reason: "not_finite",
      });
    });
  });

  describe("round-trip", () => {
    it("format then parse returns same value (default)", () => {
      const original = 2535.123;
      const formatted = formatStationNoPlus(original);
      expect(formatted).not.toBeNull();
      const parsed = parseStationInput(formatted!);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.value).toBeCloseTo(original, 3);
      }
    });
    it("format then parse returns same value (interval 50)", () => {
      const original = 1234.5;
      const formatted = formatStationNoPlus(original, { interval: 50 });
      const parsed = parseStationInput(formatted!, { interval: 50 });
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.value).toBeCloseTo(original, 3);
      }
    });
  });
});

describe("DEFAULT_STATION_FORMAT_OPTIONS", () => {
  it("has interval 100", () => {
    expect(DEFAULT_STATION_FORMAT_OPTIONS.interval).toBe(100);
  });
  it("has precision 3", () => {
    expect(DEFAULT_STATION_FORMAT_OPTIONS.precision).toBe(3);
  });
  it("has prefix No.", () => {
    expect(DEFAULT_STATION_FORMAT_OPTIONS.prefix).toBe("No.");
  });
});
