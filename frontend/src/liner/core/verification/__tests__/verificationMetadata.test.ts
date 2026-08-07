import { describe, expect, it } from "vitest";
import {
  PROPOSED_DEFAULT_ROUNDING_POLICY,
  type ReferenceProvenance,
  type VerificationMetadata,
} from "../types";
import { validateRoundingPolicy, validateVerificationMetadata } from "../verificationMetadata";

const reviewed: ReferenceProvenance = {
  source_document: "SRC-004",
  source_page: "8",
  source_table: "T-1",
  review_status: "REVIEWED",
};

const base: VerificationMetadata = {
  id: "R1-AL-001",
  feature: "horizontal.straight",
  classification: "EXTERNAL_REFERENCE",
  provenance: reviewed,
  expected: 123.45,
  tolerance: { absolute: 1e-6 },
};

describe("validateVerificationMetadata", () => {
  it("accepts a valid authoritative metadata", () => {
    expect(validateVerificationMetadata(base)).toEqual([]);
  });

  it("rejects empty id / feature", () => {
    expect(validateVerificationMetadata({ ...base, id: "" }).join()).toContain("id");
    expect(validateVerificationMetadata({ ...base, feature: "" }).join()).toContain("feature");
  });

  it("rejects unknown classification (fail-closed)", () => {
    const bad = { ...base, classification: "ANALYTIC" as never };
    expect(validateVerificationMetadata(bad).join()).toContain("classification");
  });

  it("accepts UNKNOWN classification only as explicit value", () => {
    const unknown = { ...base, classification: "UNKNOWN" as const };
    expect(validateVerificationMetadata(unknown)).toEqual([]);
  });

  it("rejects non-finite expected", () => {
    expect(validateVerificationMetadata({ ...base, expected: Number.NaN }).join()).toContain("expected");
    expect(validateVerificationMetadata({ ...base, expected: Number.POSITIVE_INFINITY }).join()).toContain("expected");
  });

  it("accepts null expected as explicit unknown", () => {
    expect(validateVerificationMetadata({ ...base, expected: null })).toEqual([]);
  });

  it("rejects invalid tolerance", () => {
    expect(validateVerificationMetadata({ ...base, tolerance: { absolute: -1 } }).join()).toContain("tolerance");
    expect(validateVerificationMetadata({ ...base, tolerance: { absolute: Number.NaN } }).join()).toContain("tolerance");
  });

  it("rejects tolerance with no defined comparison rule (fail-closed)", () => {
    expect(validateVerificationMetadata({ ...base, tolerance: {} }).join()).toContain("tolerance");
  });

  it("accepts exact tolerance without absolute/relative", () => {
    expect(validateVerificationMetadata({ ...base, tolerance: { exact: true } })).toEqual([]);
  });

  it("rejects missing/unresolved provenance (fail-closed)", () => {
    expect(validateVerificationMetadata({ ...base, provenance: undefined as never }).join()).toContain("provenance");
    const unresolved: ReferenceProvenance = { review_status: "UNRESOLVED" };
    expect(validateVerificationMetadata({ ...base, provenance: unresolved }).join()).toContain("not authoritative");
    const rejected: ReferenceProvenance = { review_status: "REJECTED" };
    expect(validateVerificationMetadata({ ...base, provenance: rejected }).join()).toContain("not authoritative");
  });
});

describe("validateRoundingPolicy", () => {
  it("accepts proposed default", () => {
    expect(validateRoundingPolicy(PROPOSED_DEFAULT_ROUNDING_POLICY)).toEqual([]);
  });

  it("rejects invalid policy", () => {
    expect(validateRoundingPolicy({ ...PROPOSED_DEFAULT_ROUNDING_POLICY, report_rounding: -1 }).length).toBeGreaterThan(0);
  });
});
