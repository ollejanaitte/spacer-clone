import type { ReferenceValueRow } from "./types";
import { ALIGNMENT_PROFILE_ROWS } from "./dataset-alignment-profile";
import { BRIDGE_GEOMETRY_ROWS } from "./dataset-bridge-geometry";
import {
  HAUNCH_HOSO_DRAWING_ROWS,
  HAUNCH_HOSO_DRAWING_UNRESOLVED,
} from "./dataset-haunch-hoso-drawing";
import type { UnresolvedValueRow } from "./types";

export const REFERENCE_DATASET_ROWS: ReferenceValueRow[] = [
  ...ALIGNMENT_PROFILE_ROWS,
  ...BRIDGE_GEOMETRY_ROWS,
  ...HAUNCH_HOSO_DRAWING_ROWS,
];

export const REFERENCE_UNRESOLVED_ROWS: UnresolvedValueRow[] = [
  ...HAUNCH_HOSO_DRAWING_UNRESOLVED,
];

export const REFERENCE_DATASET_VERSION = "v1";
export const REFERENCE_DATASET_GENERATED_AT = "2026-08-07";
