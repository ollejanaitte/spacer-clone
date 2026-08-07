import { describe, expect, it } from "vitest";
import { ALIGNMENT_PROFILE_ROWS } from "../dataset-alignment-profile";
import {
  REFERENCE_DATASET_GENERATED_AT,
  REFERENCE_DATASET_ROWS,
  REFERENCE_DATASET_VERSION,
} from "../dataset";
import { validateDataset, validateReferenceRow } from "../validation";

describe("R1-P01 dataset integrity (P01-02 alignment/profile)", () => {
  it("all alignment/profile rows pass schema validation", () => {
    const errors: string[] = [];
    for (const row of ALIGNMENT_PROFILE_ROWS) {
      errors.push(...validateReferenceRow(row));
    }
    expect(errors).toEqual([]);
  });

  it("all rows have unique reference_id", () => {
    const ids = ALIGNMENT_PROFILE_ROWS.map((row) => row.reference_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all rows are golden-usable (CROSS_CHECKED/APPROVED) and not self-referential", () => {
    for (const row of ALIGNMENT_PROFILE_ROWS) {
      expect(["CROSS_CHECKED", "APPROVED"]).toContain(row.review_status);
      expect(row.expected_value_class).not.toBe("SELF_REFERENTIAL");
      expect(row.expected_value_class).not.toBe("INTERPOLATED_PLACEHOLDER");
    }
  });

  it("normalized unit matches source unit group", () => {
    const lengthUnits = ["m", "mm"];
    const ratioUnits = ["percent", "permille"];
    for (const row of ALIGNMENT_PROFILE_ROWS) {
      if (lengthUnits.includes(row.source_unit) && lengthUnits.includes(row.normalized_unit)) continue;
      if (ratioUnits.includes(row.source_unit) && ratioUnits.includes(row.normalized_unit)) continue;
      expect(`${row.reference_id}: ${row.source_unit}->${row.normalized_unit}`).toBe(
        `${row.reference_id}: same-unit`,
      );
    }
  });

  it("dataset aggregate is consistent", () => {
    expect(REFERENCE_DATASET_VERSION).toBe("v1");
    expect(REFERENCE_DATASET_GENERATED_AT.length).toBeGreaterThan(0);
    expect(REFERENCE_DATASET_ROWS.length).toBeGreaterThan(0);
  });

  it("covers expected categories for P01-02", () => {
    const categories = new Set(ALIGNMENT_PROFILE_ROWS.map((row) => row.category));
    const expected = [
      "horizontal_alignment",
      "station",
      "vertical_profile",
      "crossfall",
      "section_height",
    ] as const;
    for (const item of expected) {
      expect(categories.has(item)).toBe(true);
    }
  });

  it("validateDataset reports no errors or duplicates", () => {
    const result = validateDataset(REFERENCE_DATASET_ROWS);
    expect(result.errors).toEqual([]);
    expect(result.duplicates).toEqual([]);
    expect(result.goldenRejected).toEqual([]);
  });
});
