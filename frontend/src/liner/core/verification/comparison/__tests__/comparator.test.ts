import { describe, expect, it } from "vitest";
import type { ReferenceValueRow } from "../../reference-data/types";
import { ALIGNMENT_PROFILE_ROWS } from "../../reference-data/dataset-alignment-profile";
import type { CompareInput } from "../comparator";
import { compareExternalValue, fromReferenceRow } from "../comparator";
import { buildComparisonReport, buildComparisonSummary, resultsToCsv } from "../report";
import type { ComparisonKind } from "../types";

function baseInput(overrides: Partial<CompareInput> = {}): CompareInput {
  return {
    reference_id: "REF-test-001",
    case_id: "CASE-TEST",
    category: "vertical_profile",
    comparison_kind: "DERIVED_OUTPUT",
    expected: 18.706,
    expected_unit: "m",
    actual: 18.706,
    actual_unit: "m",
    expected_coordinate_system: "VERTICAL_DATUM",
    actual_coordinate_system: "VERTICAL_DATUM",
    tolerance: { absolute: 1e-3 },
    source_document: "SRC-LINER-SAMPLE",
    source_page: "10",
    ...overrides,
  };
}

describe("compareExternalValue", () => {
  it("exact PASS", () => {
    const r = compareExternalValue(baseInput({ tolerance: { exact: true } }));
    expect(r.status).toBe("PASS");
  });

  it("absolute tolerance PASS", () => {
    const r = compareExternalValue(baseInput({ actual: 18.7060004, tolerance: { absolute: 1e-3 } }));
    expect(r.status).toBe("PASS");
  });

  it("absolute tolerance FAIL", () => {
    const r = compareExternalValue(baseInput({ actual: 18.8, tolerance: { absolute: 1e-3 } }));
    expect(r.status).toBe("FAIL");
  });

  it("relative tolerance PASS", () => {
    const r = compareExternalValue(
      baseInput({ expected: 1000, actual: 1000.4, tolerance: { relative: 1e-3 } }),
    );
    expect(r.status).toBe("PASS");
  });

  it("relative tolerance FAIL", () => {
    const r = compareExternalValue(
      baseInput({ expected: 1000, actual: 1002, tolerance: { relative: 1e-3 } }),
    );
    expect(r.status).toBe("FAIL");
  });

  it("zero edge: expected 0 within absolute", () => {
    const r = compareExternalValue(baseInput({ expected: 0, actual: 1e-4, tolerance: { absolute: 1e-3 } }));
    expect(r.status).toBe("PASS");
  });

  it("negative zero expected == actual", () => {
    const r = compareExternalValue(baseInput({ expected: -0, actual: 0, tolerance: { exact: true } }));
    expect(r.status).toBe("PASS");
  });

  it("NaN expected reject", () => {
    const r = compareExternalValue(baseInput({ expected: Number.NaN }));
    expect(r.status).toBe("CONTRACT_ERROR");
  });

  it("Infinity actual reject", () => {
    const r = compareExternalValue(baseInput({ actual: Number.POSITIVE_INFINITY }));
    expect(r.status).toBe("CONTRACT_ERROR");
  });

  it("unit mismatch", () => {
    const r = compareExternalValue(baseInput({ actual_unit: "degree" }));
    expect(r.status).toBe("UNIT_MISMATCH");
    expect(r.mismatch_reason).toBe("UNIT_ERROR");
  });

  it("coordinate mismatch", () => {
    const r = compareExternalValue(baseInput({ actual_coordinate_system: "GLOBAL_XY" }));
    expect(r.status).toBe("COORDINATE_MISMATCH");
    expect(r.mismatch_reason).toBe("COORDINATE_ERROR");
  });

  it("unresolved skip", () => {
    const r = compareExternalValue(baseInput({ comparison_kind: "UNRESOLVED" }));
    expect(r.status).toBe("SKIP_UNRESOLVED");
  });

  it("missing actual", () => {
    const r = compareExternalValue(baseInput({ actual: null, actual_unit: null }));
    expect(r.status).toBe("ACTUAL_MISSING");
  });

  it("missing tolerance", () => {
    const r = compareExternalValue(baseInput({ tolerance: null }));
    expect(r.status).toBe("CONTRACT_ERROR");
  });

  it("tolerance without comparison rule", () => {
    const r = compareExternalValue(baseInput({ tolerance: {} }));
    expect(r.status).toBe("CONTRACT_ERROR");
  });
});

describe("fromReferenceRow + comparator integration", () => {
  it("classifies a reference row correctly by comparison kind", () => {
    const row: ReferenceValueRow = ALIGNMENT_PROFILE_ROWS[0];
    const input = fromReferenceRow(row, row.normalized_value, row.normalized_unit, row.coordinate_system, "INPUT_PARITY" as ComparisonKind);
    const result = compareExternalValue(input);
    expect(result.reference_id).toBe(row.reference_id);
    expect(result.comparison_kind).toBe("INPUT_PARITY");
    expect(result.status).toBe("PASS");
    expect(result.expected).toBe(row.normalized_value);
    expect(result.coordinate_system).toBe(row.coordinate_system);
    expect(result.source_document).toBe(row.source_document);
  });

  it("uses row tolerance and reports delta", () => {
    const row: ReferenceValueRow = ALIGNMENT_PROFILE_ROWS[1];
    const input = fromReferenceRow(
      row,
      row.normalized_value + 0.0005,
      row.normalized_unit,
      row.coordinate_system,
      "DERIVED_OUTPUT" as ComparisonKind,
    );
    const result = compareExternalValue(input);
    expect(result.absolute_delta).toBeCloseTo(0.0005, 6);
  });
});

describe("report aggregation", () => {
  it("summarizes counts correctly", () => {
    const results = [
      compareExternalValue(baseInput({ comparison_kind: "INPUT_PARITY", tolerance: { exact: true } })),
      compareExternalValue(baseInput({ comparison_kind: "INPUT_PARITY", actual: 99, tolerance: { exact: true } })),
      compareExternalValue(baseInput({ comparison_kind: "DERIVED_OUTPUT", tolerance: { exact: true } })),
      compareExternalValue(baseInput({ comparison_kind: "DERIVED_OUTPUT", actual: 99, tolerance: { exact: true } })),
      compareExternalValue(baseInput({ comparison_kind: "UNRESOLVED" })),
      compareExternalValue(baseInput({ actual: null, actual_unit: null, comparison_kind: "DERIVED_OUTPUT" })),
    ];
    const summary = buildComparisonSummary(results);
    expect(summary.total).toBe(6);
    expect(summary.input_parity_total).toBe(2);
    expect(summary.input_parity_pass).toBe(1);
    expect(summary.derived_total).toBe(3);
    expect(summary.derived_pass).toBe(1);
    expect(summary.derived_fail).toBe(1);
    expect(summary.unresolved_skipped).toBe(1);
  });

  it("builds a report and csv", () => {
    const results = [compareExternalValue(baseInput({ tolerance: { exact: true } }))];
    const report = buildComparisonReport(results, "2026-08-07");
    expect(report.summary.total).toBe(1);
    const csv = resultsToCsv(results);
    expect(csv).toContain("reference_id");
    expect(csv).toContain("REF-test-001");
    expect(csv.trim().split("\n")).toHaveLength(2);
  });
});
