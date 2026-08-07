import { describe, expect, it } from "vitest";
import type { SignConventions } from "../types";
import { systemsMatch, validateR1CoordinateSystem, validateSignConventions } from "../coordinate";

describe("validateR1CoordinateSystem", () => {
  it("accepts valid systems", () => {
    for (const cs of ["GLOBAL_XY", "ALIGNMENT_TANGENT_NORMAL", "BRIDGE_LOCAL", "GIRDER_LOCAL", "VERTICAL_DATUM"]) {
      expect(validateR1CoordinateSystem(cs)).toEqual([]);
    }
  });

  it("rejects invalid systems", () => {
    const errors = validateR1CoordinateSystem("WGS84");
    expect(errors.length).toBeGreaterThan(0);
    expect(validateR1CoordinateSystem(undefined).length).toBeGreaterThan(0);
  });
});

describe("validateSignConventions", () => {
  const valid: SignConventions = {
    offset: "left_positive",
    rotation: "clockwise_positive",
    crossfall: "fall_to_right_positive",
    skew: "positive_when_turning_right",
    station: "forward_increasing",
    vertical: "up_positive",
  };

  it("accepts valid sign conventions", () => {
    expect(validateSignConventions(valid)).toEqual([]);
  });

  it("rejects each invalid convention (fail-closed)", () => {
    const invalid = (patch: Partial<SignConventions>): SignConventions => ({ ...valid, ...patch });
    expect(validateSignConventions(invalid({ offset: "left" as never })).length).toBeGreaterThan(0);
    expect(validateSignConventions(invalid({ rotation: "positive" as never })).length).toBeGreaterThan(0);
    expect(validateSignConventions(invalid({ crossfall: "positive" as never })).length).toBeGreaterThan(0);
    expect(validateSignConventions(invalid({ skew: "positive" as never })).length).toBeGreaterThan(0);
    expect(validateSignConventions(invalid({ station: "increasing" as never })).length).toBeGreaterThan(0);
    expect(validateSignConventions(invalid({ vertical: "positive" as never })).length).toBeGreaterThan(0);
  });

  it("aggregates multiple errors", () => {
    const errors = validateSignConventions({
      offset: "bad" as never,
      rotation: "bad" as never,
      crossfall: "fall_to_right_positive",
      skew: "positive_when_turning_right",
      station: "forward_increasing",
      vertical: "up_positive",
    });
    expect(errors.length).toBe(2);
  });
});

describe("systemsMatch", () => {
  it("matches only identical systems", () => {
    expect(systemsMatch("GLOBAL_XY", "GLOBAL_XY")).toBe(true);
    expect(systemsMatch("GLOBAL_XY", "BRIDGE_LOCAL")).toBe(false);
  });
});
