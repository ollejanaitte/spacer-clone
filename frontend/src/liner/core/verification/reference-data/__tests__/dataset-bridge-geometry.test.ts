import { describe, expect, it } from "vitest";
import { BRIDGE_GEOMETRY_ROWS } from "../dataset-bridge-geometry";
import { REFERENCE_DATASET_ROWS } from "../dataset";
import { validateDataset, validateReferenceRow } from "../validation";

describe("R1-P01 dataset integrity (P01-03 bridge geometry / LDIST)", () => {
  it("all bridge geometry rows pass schema validation", () => {
    const errors: string[] = [];
    for (const row of BRIDGE_GEOMETRY_ROWS) {
      errors.push(...validateReferenceRow(row));
    }
    expect(errors).toEqual([]);
  });

  it("all rows have unique reference_id across the whole dataset", () => {
    const ids = REFERENCE_DATASET_ROWS.map((row) => row.reference_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all rows are golden-usable and not self-referential", () => {
    for (const row of BRIDGE_GEOMETRY_ROWS) {
      expect(["CROSS_CHECKED", "APPROVED"]).toContain(row.review_status);
      expect(row.expected_value_class).not.toBe("SELF_REFERENTIAL");
      expect(row.expected_value_class).not.toBe("INTERPOLATED_PLACEHOLDER");
    }
  });

  it("covers expected categories for P01-03", () => {
    const categories = new Set(BRIDGE_GEOMETRY_ROWS.map((row) => row.category));
    const expected = [
      "span",
      "girder_span_length",
      "girder_panel_length",
      "transverse_spacing",
      "overhang",
      "ldist",
      "girder_point",
      "section_height",
    ] as const;
    for (const item of expected) {
      expect(categories.has(item)).toBe(true);
    }
  });

  it("contains the documented seed values (AG1/AG2 支間長, 格間長)", () => {
    const values = new Map(BRIDGE_GEOMETRY_ROWS.map((row) => [row.reference_id, row.source_value]));
    expect(values.get("REF-span-001")).toBe(40291.5);
    expect(values.get("REF-span-002")).toBe(40020.1);
    expect(values.get("REF-panel-001")).toBe(5344.0);
    expect(values.get("REF-panel-002")).toBe(5020.1);
  });

  it("validateDataset reports no errors, duplicates, or golden rejects", () => {
    const result = validateDataset(REFERENCE_DATASET_ROWS);
    expect(result.errors).toEqual([]);
    expect(result.duplicates).toEqual([]);
    expect(result.goldenRejected).toEqual([]);
  });

  it("normalized values use consistent unit groups", () => {
    const lengthUnits = ["m", "mm"];
    for (const row of BRIDGE_GEOMETRY_ROWS) {
      expect(lengthUnits).toContain(row.source_unit);
      expect(lengthUnits).toContain(row.normalized_unit);
    }
  });
});
