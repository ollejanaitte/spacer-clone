import { describe, expect, it } from "vitest";
import {
  REFERENCE_SOURCE_CLASSIFICATIONS,
  R1_UNITS,
  isR1Unit,
  isReferenceSourceClassification,
  isR1CoordinateSystem,
  isReviewStatus,
  isRoundingPolicy,
  unitGroupOf,
  PROPOSED_DEFAULT_ROUNDING_POLICY,
  R1_COORDINATE_SYSTEMS,
  REVIEW_STATUSES,
} from "../types";

describe("reference source classifications", () => {
  it("accepts every required classification", () => {
    expect(REFERENCE_SOURCE_CLASSIFICATIONS).toEqual([
      "EXTERNAL_REFERENCE",
      "INDEPENDENT_FORMULA",
      "LEGACY_GOLDEN",
      "SELF_REFERENTIAL",
      "INTERPOLATED_PLACEHOLDER",
      "MANUAL_TRANSCRIPTION",
      "UNKNOWN",
    ]);
  });

  it("validates valid classifications", () => {
    for (const c of REFERENCE_SOURCE_CLASSIFICATIONS) {
      expect(isReferenceSourceClassification(c)).toBe(true);
    }
  });

  it("rejects invalid classifications", () => {
    expect(isReferenceSourceClassification("SELF_REFERENTIAL")).toBe(true);
    expect(isReferenceSourceClassification("self_referential")).toBe(false);
    expect(isReferenceSourceClassification("ANALYTIC")).toBe(false);
    expect(isReferenceSourceClassification(42)).toBe(false);
    expect(isReferenceSourceClassification(undefined)).toBe(false);
  });
});

describe("units", () => {
  it("accepts every required unit", () => {
    expect(R1_UNITS).toEqual([
      "m",
      "mm",
      "degree",
      "radian",
      "percent",
      "permille",
      "station",
      "curvature_radius_m",
      "dxf_unit",
    ]);
  });

  it("validates valid units", () => {
    for (const u of R1_UNITS) expect(isR1Unit(u)).toBe(true);
  });

  it("rejects invalid units", () => {
    expect(isR1Unit("kilometer")).toBe(false);
    expect(isR1Unit("")).toBe(false);
    expect(isR1Unit(null)).toBe(false);
  });

  it("groups units by dimension", () => {
    expect(unitGroupOf("m")).toBe("length");
    expect(unitGroupOf("mm")).toBe("length");
    expect(unitGroupOf("degree")).toBe("angle");
    expect(unitGroupOf("radian")).toBe("angle");
    expect(unitGroupOf("percent")).toBe("ratio");
    expect(unitGroupOf("permille")).toBe("ratio");
    expect(unitGroupOf("station")).toBe("other");
    expect(unitGroupOf("curvature_radius_m")).toBe("other");
    expect(unitGroupOf("dxf_unit")).toBe("other");
  });
});

describe("coordinate systems", () => {
  it("accepts every required coordinate system", () => {
    expect(R1_COORDINATE_SYSTEMS).toEqual([
      "GLOBAL_XY",
      "ALIGNMENT_TANGENT_NORMAL",
      "BRIDGE_LOCAL",
      "GIRDER_LOCAL",
      "VERTICAL_DATUM",
    ]);
  });

  it("validates valid coordinate systems", () => {
    for (const cs of R1_COORDINATE_SYSTEMS) expect(isR1CoordinateSystem(cs)).toBe(true);
  });

  it("rejects invalid coordinate systems", () => {
    expect(isR1CoordinateSystem("GLOBAL")).toBe(false);
    expect(isR1CoordinateSystem("")).toBe(false);
  });
});

describe("review statuses", () => {
  it("accepts every required review status", () => {
    expect(REVIEW_STATUSES).toEqual(["UNRESOLVED", "UNREVIEWED", "REVIEWED", "REJECTED"]);
  });

  it("validates and rejects", () => {
    expect(isReviewStatus("REVIEWED")).toBe(true);
    expect(isReviewStatus("APPROVED")).toBe(false);
  });
});

describe("rounding policy", () => {
  it("has all six required fields", () => {
    expect(Object.keys(PROPOSED_DEFAULT_ROUNDING_POLICY).sort()).toEqual([
      "comparison_precision",
      "external_reference_tolerance",
      "internal_precision",
      "report_rounding",
      "serialization_precision",
      "ui_display_rounding",
    ]);
  });

  it("is a valid rounding policy", () => {
    expect(isRoundingPolicy(PROPOSED_DEFAULT_ROUNDING_POLICY)).toBe(true);
  });

  it("rejects invalid rounding policies", () => {
    expect(isRoundingPolicy(null)).toBe(false);
    expect(isRoundingPolicy({})).toBe(false);
    expect(isRoundingPolicy({ ...PROPOSED_DEFAULT_ROUNDING_POLICY, report_rounding: -1 })).toBe(false);
    expect(isRoundingPolicy({ ...PROPOSED_DEFAULT_ROUNDING_POLICY, report_rounding: Number.NaN })).toBe(false);
    expect(isRoundingPolicy({ ...PROPOSED_DEFAULT_ROUNDING_POLICY, report_rounding: "3" })).toBe(false);
  });
});
