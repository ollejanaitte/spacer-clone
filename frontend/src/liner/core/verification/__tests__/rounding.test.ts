import { describe, expect, it } from "vitest";
import {
  PROPOSED_DEFAULT_ROUNDING_POLICY,
  type RoundingPolicy,
} from "../types";
import {
  applyPolicy,
  assertValidRoundingPolicy,
  roundForReport,
  roundForSerialization,
  roundForUiDisplay,
  roundToPrecision,
} from "../rounding";

const policy: RoundingPolicy = {
  internal_precision: 12,
  comparison_precision: 6,
  external_reference_tolerance: 6,
  report_rounding: 3,
  ui_display_rounding: 3,
  serialization_precision: 9,
};

describe("roundToPrecision", () => {
  it("rounds to a precision", () => {
    expect(roundToPrecision(1.23456, 2)).toBe(1.23);
  });

  it("handles precision zero", () => {
    expect(roundToPrecision(1.6, 0)).toBe(2);
  });

  it("normalizes negative zero", () => {
    expect(Object.is(roundToPrecision(-0.0001, 2), 0)).toBe(true);
  });

  it("passes through non-finite values", () => {
    expect(roundToPrecision(Number.NaN, 2)).toBeNaN();
    expect(roundToPrecision(Number.POSITIVE_INFINITY, 2)).toBe(Number.POSITIVE_INFINITY);
  });

  it("boundary values", () => {
    expect(roundToPrecision(1.25, 1)).toBe(1.3);
    expect(roundToPrecision(1.24, 1)).toBe(1.2);
  });
});

describe("policy-based rounding", () => {
  it("separates display and serialization precision", () => {
    const display = roundForUiDisplay(1.23456789, policy);
    const serialized = roundForSerialization(1.23456789, policy);
    expect(display).toBe(1.235);
    expect(serialized).toBe(1.23456789);
  });

  it("report rounding uses report_rounding", () => {
    expect(roundForReport(2.34567, policy)).toBe(2.346);
  });

  it("applyPolicy selects the field", () => {
    expect(applyPolicy(1.2345678, policy, "report_rounding")).toBe(1.235);
    expect(applyPolicy(1.2345678, policy, "serialization_precision")).toBe(1.2345678);
  });
});

describe("assertValidRoundingPolicy", () => {
  it("accepts the proposed default", () => {
    expect(() => assertValidRoundingPolicy(PROPOSED_DEFAULT_ROUNDING_POLICY)).not.toThrow();
  });

  it("rejects invalid policy", () => {
    expect(() => assertValidRoundingPolicy({ ...policy, report_rounding: -1 })).toThrow();
    expect(() => assertValidRoundingPolicy({ ...policy, report_rounding: Number.NaN })).toThrow();
  });
});
