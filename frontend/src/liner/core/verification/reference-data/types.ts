import type {
  R1CoordinateSystem,
  ReferenceSourceClassification,
  R1Unit,
  TolerancePolicy,
} from "../types";

export const R1_P01_CATEGORIES = [
  "horizontal_alignment",
  "station",
  "vertical_profile",
  "crossfall",
  "section_height",
  "pier",
  "span",
  "girder_point",
  "girder_span_length",
  "girder_panel_length",
  "transverse_spacing",
  "overhang",
  "ldist",
  "haunch",
  "hoso",
  "drawing_coordinate",
  "dxf_coordinate",
] as const;

export type R1P01Category = (typeof R1_P01_CATEGORIES)[number];

export const R1_P01_REVIEW_STATUSES = [
  "UNREVIEWED",
  "TRANSCRIBED",
  "CROSS_CHECKED",
  "APPROVED",
  "REJECTED",
  "UNRESOLVED",
] as const;

export type R1P01ReviewStatus = (typeof R1_P01_REVIEW_STATUSES)[number];

export const R1_P01_CONFIDENCES = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"] as const;

export type R1P01Confidence = (typeof R1_P01_CONFIDENCES)[number];

export const R1_P01_EXTRACTION_METHODS = [
  "TEXT_EXTRACTION",
  "TABLE_EXTRACTION",
  "MANUAL_TRANSCRIPTION",
  "INDEPENDENT_FORMULA",
  "OCR",
] as const;

export type R1P01ExtractionMethod = (typeof R1_P01_EXTRACTION_METHODS)[number];

export type ReferenceValueRow = {
  reference_id: string;
  case_id: string;
  category: R1P01Category;
  value_name: string;
  source_document: string;
  source_page: string;
  source_section?: string;
  source_table?: string;
  source_row?: string;
  source_column?: string;
  source_value: number;
  source_unit: R1Unit;
  normalized_value: number;
  normalized_unit: R1Unit;
  coordinate_system: R1CoordinateSystem;
  sign_convention?: string;
  rounding_rule?: string;
  display_precision?: number;
  comparison_tolerance: TolerancePolicy;
  extraction_method: R1P01ExtractionMethod;
  expected_value_class: ReferenceSourceClassification;
  review_status: R1P01ReviewStatus;
  confidence: R1P01Confidence;
  notes?: string;
};

export type ReferenceDataset = {
  version: "v1";
  generated_at: string;
  rows: ReferenceValueRow[];
};

export type DatasetManifest = {
  dataset_version: string;
  generated_at: string;
  total_rows: number;
  approved_rows: number;
  cross_checked_rows: number;
  unresolved_rows: number;
  categories: string[];
  csv_sha256: string;
  json_sha256: string;
  parity: boolean;
};

export type UnresolvedValueRow = {
  reference_id: string;
  category: R1P01Category | string;
  value_name: string;
  source_document?: string;
  source_page?: string;
  rejection_reason: string;
};

export type FieldMappingRow = {
  source_field: string;
  source_document: string;
  normalized_field: string;
  normalized_unit?: R1Unit;
  notes?: string;
};
