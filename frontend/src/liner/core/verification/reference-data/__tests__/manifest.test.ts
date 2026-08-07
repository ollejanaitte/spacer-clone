import { describe, expect, it } from "vitest";
import type { ReferenceValueRow } from "../types";
import {
  buildManifest,
  canonicalDatasetJson,
  rowsToCsv,
  sha256Of,
  sha256OfCsv,
} from "../manifest";

const row: ReferenceValueRow = {
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
};

describe("canonicalDatasetJson", () => {
  it("produces deterministic output", () => {
    expect(canonicalDatasetJson({ b: 1, a: 2 })).toBe(canonicalDatasetJson({ a: 2, b: 1 }));
  });

  it("drops undefined", () => {
    expect(canonicalDatasetJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});

describe("rowsToCsv", () => {
  it("escapes quotes and commas", () => {
    const special: ReferenceValueRow = { ...row, notes: 'has "quote", and comma' };
    const csv = rowsToCsv([special]);
    expect(csv).toContain('"has ""quote"", and comma"');
  });

  it("has header + 1 row", () => {
    const csv = rowsToCsv([row]);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("reference_id");
    expect(lines[1]).toContain("REF-span-001");
  });
});

describe("manifest", () => {
  it("computes counts and hashes", () => {
    const dataset = { version: "v1" as const, generated_at: "2026-08-07", rows: [row] };
    const csv = rowsToCsv(dataset.rows);
    const manifest = buildManifest(dataset, csv);
    expect(manifest.total_rows).toBe(1);
    expect(manifest.approved_rows).toBe(1);
    expect(manifest.cross_checked_rows).toBe(1);
    expect(manifest.unresolved_rows).toBe(0);
    expect(manifest.categories).toEqual(["span"]);
    expect(manifest.parity).toBe(true);
    expect(manifest.csv_sha256).toBe(sha256OfCsv(csv));
    expect(manifest.json_sha256).toBe(sha256Of(dataset));
  });
});
