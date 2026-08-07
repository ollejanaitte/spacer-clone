import {
  REFERENCE_DATASET_GENERATED_AT,
  REFERENCE_DATASET_ROWS,
  REFERENCE_DATASET_VERSION,
  REFERENCE_UNRESOLVED_ROWS,
} from "./dataset";
import { FIELD_MAPPING_ROWS } from "./field-mapping";
import { PROVENANCE_INDEX } from "./provenance-index";
import { rowsToCsv, buildManifest } from "./manifest";
import { validateDataset } from "./validation";
import type { DatasetManifest, ReferenceDataset } from "./types";

export function loadReferenceDataset(): ReferenceDataset {
  return {
    version: REFERENCE_DATASET_VERSION,
    generated_at: REFERENCE_DATASET_GENERATED_AT,
    rows: REFERENCE_DATASET_ROWS,
  };
}

export function loadUnresolvedRows() {
  return REFERENCE_UNRESOLVED_ROWS;
}

export function loadFieldMapping() {
  return FIELD_MAPPING_ROWS;
}

export function loadProvenanceIndex() {
  return PROVENANCE_INDEX;
}

export function buildDatasetManifest(): DatasetManifest {
  const dataset = loadReferenceDataset();
  const csv = rowsToCsv(dataset.rows);
  return buildManifest(dataset, csv);
}

export function validateLoadedDataset() {
  const dataset = loadReferenceDataset();
  const result = validateDataset(dataset.rows);
  return {
    errors: result.errors,
    duplicates: result.duplicates,
    goldenRejected: result.goldenRejected,
    totalRows: dataset.rows.length,
    unresolvedRows: REFERENCE_UNRESOLVED_ROWS.length,
  };
}
