import { describe, expect, it } from "vitest";
import type { ReferenceValueRow } from "../types";
import {
  isGoldenUsable,
  isInterpolatedPlaceholder,
  isR1P01Category,
  isR1P01Confidence,
  isR1P01ExtractionMethod,
  isR1P01ReviewStatus,
  isSelfReferential,
  validateDataset,
  validateReferenceRow,
} from "../validation";

function baseRow(overrides: Partial<ReferenceValueRow> = {}): ReferenceValueRow {
  return {
    reference_id: "REF-span-001",
    case_id: "CASE-DESIGN-001",
    category: "span",
    value_name: "AG1 支間長 1",
    source_document: "SRC-DESIGN-CALC",
    source_page: "10",
    source_table: "主桁支間長",
    source_row: "1",
    source_column: "AG1",
    source_value: 40291.5,
    source_unit: "mm",
    normalized_value: 40.2915,
    normalized_unit: "m",
    coordinate_system: "BRIDGE_LOCAL",
    comparison_tolerance: { absolute: 1e-6 },
    extraction_method: "TABLE_EXTRACTION",
    expected_value_class: "EXTERNAL_REFERENCE",
    review_status: "CROSS_CHECKED",
    confidence: "HIGH",
    ...overrides,
  };
}

describe("guards", () => {
  it("validates categories", () => {
    expect(isR1P01Category("span")).toBe(true);
    expect(isR1P01Category("girder_point")).toBe(true);
    expect(isR1P01Category("not-a-category")).toBe(false);
  });

  it("validates review statuses", () => {
    expect(isR1P01ReviewStatus("CROSS_CHECKED")).toBe(true);
    expect(isR1P01ReviewStatus("APPROVED")).toBe(true);
    expect(isR1P01ReviewStatus("REVIEWED")).toBe(false);
    expect(isR1P01ReviewStatus("UNRESOLVED")).toBe(true);
  });

  it("validates confidence", () => {
    expect(isR1P01Confidence("HIGH")).toBe(true);
    expect(isR1P01Confidence("UNKNOWN")).toBe(true);
    expect(isR1P01Confidence("MED")).toBe(false);
  });

  it("validates extraction methods", () => {
    expect(isR1P01ExtractionMethod("TABLE_EXTRACTION")).toBe(true);
    expect(isR1P01ExtractionMethod("OCR")).toBe(true);
    expect(isR1P01ExtractionMethod("HAND")).toBe(false);
  });
});

describe("validateReferenceRow", () => {
  it("accepts a valid row", () => {
    expect(validateReferenceRow(baseRow())).toEqual([]);
  });

  it("rejects missing source (fail-closed)", () => {
    expect(validateReferenceRow(baseRow({ source_page: "" })).join()).toContain("source_page");
    expect(validateReferenceRow(baseRow({ source_document: "" })).join()).toContain("source_document");
  });

  it("rejects unknown unit", () => {
    expect(validateReferenceRow(baseRow({ source_unit: "furlong" as never })).join()).toContain("source_unit");
  });

  it("rejects unknown coordinate system", () => {
    expect(validateReferenceRow(baseRow({ coordinate_system: "WGS84" as never })).join()).toContain("coordinate_system");
  });

  it("rejects non-finite values", () => {
    expect(validateReferenceRow(baseRow({ source_value: Number.NaN })).join()).toContain("source_value");
    expect(validateReferenceRow(baseRow({ normalized_value: Number.POSITIVE_INFINITY })).join()).toContain("normalized_value");
  });

  it("rejects invalid tolerance", () => {
    expect(validateReferenceRow(baseRow({ comparison_tolerance: { absolute: -1 } })).join()).toContain("tolerance");
    expect(validateReferenceRow(baseRow({ comparison_tolerance: {} })).join()).toContain("tolerance");
  });

  it("accepts exact tolerance without absolute/relative", () => {
    expect(validateReferenceRow(baseRow({ comparison_tolerance: { exact: true } }))).toEqual([]);
  });

  it("rejects invalid expected_value_class", () => {
    expect(validateReferenceRow(baseRow({ expected_value_class: "ANALYTIC" as never })).join()).toContain("expected_value_class");
  });

  it("rejects invalid review status / confidence", () => {
    expect(validateReferenceRow(baseRow({ review_status: "REVIEWED" as never })).join()).toContain("review_status");
    expect(validateReferenceRow(baseRow({ confidence: "LOW" as never }))).not.toContain("confidence");
    expect(validateReferenceRow(baseRow({ confidence: "WEIRD" as never })).join()).toContain("confidence");
  });
});

describe("validateDataset", () => {
  it("detects duplicate reference ids", () => {
    const rows = [baseRow(), baseRow()];
    const result = validateDataset(rows);
    expect(result.duplicates).toContain("REF-span-001");
  });

  it("rejects self-referential golden", () => {
    const row = baseRow({
      expected_value_class: "SELF_REFERENTIAL",
      review_status: "APPROVED",
    });
    const result = validateDataset([row]);
    expect(result.goldenRejected).toContain("REF-span-001");
  });

  it("rejects interpolated placeholder golden", () => {
    const row = baseRow({
      expected_value_class: "INTERPOLATED_PLACEHOLDER",
      review_status: "APPROVED",
    });
    const result = validateDataset([row]);
    expect(result.goldenRejected).toContain("REF-span-001");
  });

  it("accepts a valid dataset", () => {
    const result = validateDataset([baseRow()]);
    expect(result.errors).toEqual([]);
    expect(result.duplicates).toEqual([]);
    expect(result.goldenRejected).toEqual([]);
  });

  it("accepts unresolved entries", () => {
    const row = baseRow({ review_status: "UNRESOLVED", expected_value_class: "UNKNOWN" });
    const result = validateDataset([row]);
    expect(result.errors).toEqual([]);
  });
});

describe("golden helpers", () => {
  it("golden usable only when CROSS_CHECKED or APPROVED", () => {
    expect(isGoldenUsable(baseRow())).toBe(true);
    expect(isGoldenUsable(baseRow({ review_status: "TRANSCRIBED" }))).toBe(false);
    expect(isGoldenUsable(baseRow({ review_status: "UNRESOLVED" }))).toBe(false);
    expect(isGoldenUsable(baseRow({ review_status: "APPROVED" }))).toBe(true);
  });

  it("detects self-referential and interpolated", () => {
    expect(isSelfReferential(baseRow({ expected_value_class: "SELF_REFERENTIAL" }))).toBe(true);
    expect(isInterpolatedPlaceholder(baseRow({ expected_value_class: "INTERPOLATED_PLACEHOLDER" }))).toBe(true);
  });
});
