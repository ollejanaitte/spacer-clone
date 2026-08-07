import { describe, expect, it } from "vitest";
import { HAUNCH_HOSO_DRAWING_ROWS, HAUNCH_HOSO_DRAWING_UNRESOLVED } from "../dataset-haunch-hoso-drawing";
import { REFERENCE_DATASET_ROWS, REFERENCE_UNRESOLVED_ROWS } from "../dataset";
import { validateDataset, validateReferenceRow } from "../validation";

describe("R1-P01 dataset integrity (P01-04 haunch/hoso/drawing)", () => {
  it("all haunch/hoso/drawing rows pass schema validation", () => {
    const errors: string[] = [];
    for (const row of HAUNCH_HOSO_DRAWING_ROWS) {
      errors.push(...validateReferenceRow(row));
    }
    expect(errors).toEqual([]);
  });

  it("all rows have unique reference_id across the whole dataset", () => {
    const ids = REFERENCE_DATASET_ROWS.map((row) => row.reference_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all rows are golden-usable and not self-referential", () => {
    for (const row of HAUNCH_HOSO_DRAWING_ROWS) {
      expect(["CROSS_CHECKED", "APPROVED"]).toContain(row.review_status);
      expect(row.expected_value_class).not.toBe("SELF_REFERENTIAL");
      expect(row.expected_value_class).not.toBe("INTERPOLATED_PLACEHOLDER");
    }
  });

  it("covers expected categories for P01-04", () => {
    const categories = new Set(HAUNCH_HOSO_DRAWING_ROWS.map((row) => row.category));
    expect(categories.has("haunch")).toBe(true);
    expect(categories.has("hoso")).toBe(true);
    expect(categories.has("drawing_coordinate")).toBe(true);
  });

  it("unresolved entries carry rejection reasons", () => {
    for (const row of HAUNCH_HOSO_DRAWING_UNRESOLVED) {
      expect(row.rejection_reason.length).toBeGreaterThan(0);
      expect(row.reference_id.startsWith("UNRESOLVED-")).toBe(true);
    }
    expect(REFERENCE_UNRESOLVED_ROWS.length).toBeGreaterThan(0);
  });

  it("validateDataset reports no errors, duplicates, or golden rejects", () => {
    const result = validateDataset(REFERENCE_DATASET_ROWS);
    expect(result.errors).toEqual([]);
    expect(result.duplicates).toEqual([]);
    expect(result.goldenRejected).toEqual([]);
  });
});
