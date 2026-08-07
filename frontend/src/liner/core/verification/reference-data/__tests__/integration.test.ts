import { describe, expect, it } from "vitest";
import {
  buildDatasetManifest,
  loadFieldMapping,
  loadProvenanceIndex,
  loadReferenceDataset,
  loadUnresolvedRows,
  validateLoadedDataset,
} from "../loader";
import { rowsToCsv } from "../manifest";
import { REFERENCE_DATASET_ROWS } from "../dataset";

describe("R1-P01 integration validation (P01-05)", () => {
  it("dataset loads with expected row counts", () => {
    const dataset = loadReferenceDataset();
    expect(dataset.version).toBe("v1");
    expect(dataset.rows.length).toBe(REFERENCE_DATASET_ROWS.length);
    expect(dataset.rows.length).toBeGreaterThan(0);
  });

  it("full dataset validation is clean", () => {
    const result = validateLoadedDataset();
    expect(result.errors).toEqual([]);
    expect(result.duplicates).toEqual([]);
    expect(result.goldenRejected).toEqual([]);
    expect(result.totalRows).toBe(REFERENCE_DATASET_ROWS.length);
  });

  it("manifest hashes are deterministic and consistent", () => {
    const dataset = loadReferenceDataset();
    const csv1 = rowsToCsv(dataset.rows);
    const csv2 = rowsToCsv(dataset.rows);
    expect(csv1).toBe(csv2);
    const manifest = buildDatasetManifest();
    expect(manifest.total_rows).toBe(dataset.rows.length);
    expect(manifest.parity).toBe(true);
    expect(manifest.csv_sha256.length).toBe(64);
    expect(manifest.json_sha256.length).toBe(64);
    expect(manifest.generated_at.length).toBeGreaterThan(0);
  });

  it("csv/json parity: each csv row corresponds to a dataset row", () => {
    const dataset = loadReferenceDataset();
    const csv = rowsToCsv(dataset.rows);
    const csvLines = csv.trim().split("\n");
    // header + N rows
    expect(csvLines.length).toBe(dataset.rows.length + 1);
  });

  it("field mapping covers all dataset categories", () => {
    const mapping = loadFieldMapping();
    const dataset = loadReferenceDataset();
    const mappedSourceDocs = new Set(mapping.map((m) => m.source_document));
    for (const row of dataset.rows) {
      expect(mappedSourceDocs.has(row.source_document)).toBe(true);
    }
    expect(mapping.length).toBeGreaterThan(0);
  });

  it("provenance index covers all dataset source pages", () => {
    const index = loadProvenanceIndex();
    const entries = new Set(index.map((e) => `${e.source_document}:${e.source_page}`));
    const dataset = loadReferenceDataset();
    for (const row of dataset.rows) {
      expect(entries.has(`${row.source_document}:${row.source_page}`)).toBe(true);
    }
    expect(index.length).toBeGreaterThan(0);
  });

  it("unresolved rows are separated and non-golden", () => {
    const unresolved = loadUnresolvedRows();
    expect(unresolved.length).toBeGreaterThan(0);
    for (const row of unresolved) {
      expect(row.rejection_reason.length).toBeGreaterThan(0);
    }
    const goldenIds = new Set(REFERENCE_DATASET_ROWS.map((row) => row.reference_id));
    for (const row of unresolved) {
      expect(goldenIds.has(row.reference_id)).toBe(false);
    }
  });

  it("every category has at least one row", () => {
    const dataset = loadReferenceDataset();
    const categories = new Set(dataset.rows.map((row) => row.category));
    const required = [
      "horizontal_alignment",
      "station",
      "vertical_profile",
      "crossfall",
      "section_height",
      "span",
      "girder_point",
      "girder_panel_length",
      "transverse_spacing",
      "overhang",
      "ldist",
      "haunch",
      "hoso",
      "drawing_coordinate",
    ] as const;
    for (const item of required) {
      expect(categories.has(item), `missing category ${item}`).toBe(true);
    }
  });
});
