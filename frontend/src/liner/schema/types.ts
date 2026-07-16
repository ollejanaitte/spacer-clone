import type { RoadDesignDocument } from "../../contracts/roadDesignDocument";
import type { LinerTraceEntry } from "../mapper/frameModelMapper";
import type { BuildIntermediateInput } from "../core/pipeline/pipeline";
import type { Vec2 } from "../core/types";
import {
  PROJECT_LINER_METADATA_SCHEMA_VERSION,
  LINER_DRAFT_SCHEMA_VERSION,
  type LinerDraftSchemaVersion,
} from "./version";

export {
  PROJECT_LINER_METADATA_SCHEMA_VERSION,
  LINER_DRAFT_SCHEMA_VERSION,
  type LinerDraftSchemaVersion,
};

export type PersistedLinerTraceEntry = LinerTraceEntry;

export type ProjectLinerSourceRef = {
  alignmentId?: string;
  gridDefinitionId?: string;
};

export type ProjectLinerMetadata = {
  schemaVersion: typeof PROJECT_LINER_METADATA_SCHEMA_VERSION;
  draftSchemaVersion?: LinerDraftSchemaVersion;
  sourceRevision: string;
  linerModelId: string;
  coordinatePolicyId: string;
  intermediateSchemaVersion: "0.2.0";
  generatedAt?: string;
  source?: ProjectLinerSourceRef;
  /** Read-only legacy input from older projects; not written by the vNext save path. */
  draft?: BuildIntermediateInput;
  /** In-memory working copy; not written by the persistence save path (use roadDesignDocument). */
  domainDraft?: LinerDomainDraftVNext;
  /** Embedded RoadDesignDocument — sole persistence write-target for road design data. */
  roadDesignDocument?: RoadDesignDocument;
};

export interface ProjectLinerMetadataVNext {
  schemaVersion: "0.1.0";
  draftSchemaVersion: LinerDraftSchemaVersion;
  sourceRevision?: string;
  linerModelId: string;
  coordinatePolicyId: string;
  intermediateSchemaVersion?: "0.2.0";
  generatedAt?: string;
  domainDraft: LinerDomainDraftVNext;
}

/** Phase 3.8: measured line × section grid from LINER local coordinates. */
export interface MeasuredGridPointDraft {
  id: string;
  sectionId: string;
  lineId: string;
  station: number;
  x: number;
  y: number;
  z: number;
  cumulativeWidth: number;
  sortIndex?: number;
}

export interface MeasuredGridSectionDraft {
  id: string;
  label: string;
  station: number;
  sortIndex: number;
}

export interface MeasuredGridLineDraft {
  id: string;
  label: string;
  role?: CrossSectionOffsetLineRole | GirderLineRoleLike;
  sortIndex: number;
}

/** Importer girder-line role alias for measured grid metadata. */
export type GirderLineRoleLike =
  | "center"
  | "girder"
  | "edge"
  | "barrier"
  | "custom";

export interface MeasuredGridDraft {
  id: string;
  source: string;
  sections: MeasuredGridSectionDraft[];
  lines: MeasuredGridLineDraft[];
  points: MeasuredGridPointDraft[];
}

export interface LinerDomainDraftVNext {
  id: string;
  linerModelId: string;
  coordinatePolicyId: string;
  alignment: HorizontalAlignmentDraft;
  stationDefinition: StationDefinitionDraft;
  verticalAlignment: VerticalAlignmentDraft;
  crossSections: CrossSectionTemplateDraft[];
  crossSlopeIntervals?: CrossSlopeIntervalDraft[];
  gridDefinitions: GridDefinitionDraft[];
  /** Phase 3.8: optional measured local-coordinate grid (highest-priority geometry source). */
  measuredGrid?: MeasuredGridDraft;
  spans: SpanDraft[];
  piers: PierDraft[];
  crossBeams?: CrossBeamDraft[];
  widthChangePoints?: WidthChangePointDraft[];
  selectedCrossSectionStation?: number;
  drawingSettings?: LinerDrawingSettingsDraft;
  generationSettings: GenerationSettingsDraft;
  sampling: SamplingSettingsDraft;
}

export interface HorizontalAlignmentDraft {
  id: string;
  elements: HorizontalElementDraft[];
}

export type HorizontalElementDraft =
  | StraightElementDraft
  | CircularArcElementDraft
  | ClothoidElementDraft;

export interface StraightElementDraft {
  type: "straight";
  id: string;
  start: Vec2;
  azimuth: number;
  length: number;
}

export interface CircularArcElementDraft {
  type: "arc";
  id: string;
  start: Vec2;
  azimuth: number;
  radius: number;
  turn: "left" | "right";
  length: number;
}

export interface ClothoidElementDraft {
  type: "clothoid";
  id: string;
  start: Vec2;
  azimuth: number;
  clothoidParameter: number;
  startRadius?: number | null;
  endRadius?: number | null;
  turn: "left" | "right";
  length: number;
}

/**
 * N2 §4 leaves station equation details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface StationEquationDraft {
  id: string;
  physicalDistance: number;
  type: "add_constant" | "reset_to_value";
  value: number;
  sortIndex?: number;
}

/**
 * N2 §4 leaves StationDefinitionDraft details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface StationDefinitionDraft {
  originDisplayedStation: number;
  interval?: number;
  explicitStations?: number[];
  equations?: StationEquationDraft[];
}

export interface VerticalAlignmentDraft {
  id: string;
  elements: VerticalElementDraft[];
}

export type VerticalElementDraft =
  | VerticalGradeElementDraft
  | VerticalParabolicElementDraft;

/**
 * Batch 4 / PR-2a-1: grade 縦断要素。測点 (startStation/endStation) と区間長 (length) で定義する。
 * grade は内部 ratio (gradePercent / 100)。UI では % 表示。
 */
export interface VerticalGradeElementDraft {
  type: "grade";
  id: string;
  startStation: number;
  endStation: number;
  startElevation: number;
  grade: number;
  length: number;
}

/**
 * Batch 4 / Master Pre-Decision #2: JIP-LINER 互換 parabolic 縦断要素。
 * K値方式・半径 R 方式は採用しない。
 */
export interface VerticalParabolicElementDraft {
  type: "parabolic";
  id: string;
  startStation: number;
  endStation: number;
  startGrade: number;
  endGrade: number;
  length: number;
  startElevation?: number;
  curveType?: "crest" | "sag";
}

/**
 * Batch 5 / PR-3a-1 / Master Pre-Decision #3: 横断勾配。
 * 道路センターから見て右下がりを正（+）。単位は %。
 */
export interface CrossSlopeDraft {
  signConvention: "right_down_positive";
  valuePercent: number;
}

export type CrossfallMode =
  | "flat"
  | "one_way_left"
  | "one_way_right"
  | "crown"
  | "independent";

export interface CrossSlopeIntervalDraft {
  id: string;
  startPhysicalDistance: number;
  endPhysicalDistance: number;
  mode: CrossfallMode;
  leftSlopePercent: number;
  rightSlopePercent: number;
  pivotDistance?: number;
}

export type LinerDrawingPaperSize =
  | "A0"
  | "A1"
  | "A2"
  | "A3"
  | "A4";

export type LinerDrawingPaperOrientation = "landscape" | "portrait";

export interface LinerDrawingSettingsDraft {
  version: "0.1.0";
  planPaperSize?: LinerDrawingPaperSize;
  profilePaperSize?: LinerDrawingPaperSize;
  crossSectionPaperSize?: LinerDrawingPaperSize;
  bandPaperSize?: LinerDrawingPaperSize;
  paperOrientation?: LinerDrawingPaperOrientation;
  marginMm?: number;
}

/**
 * Batch 5 / PR-3a-1 / Master Pre-Decision #4: 横断テンプレート。
 * オフセット線リスト方式を採用する。レイヤー方式・パラメトリック方式は採用しない。
 */
export interface CrossSectionTemplateDraft {
  id: string;
  name: string;
  offsetLines: CrossSectionOffsetLineDraft[];
  crossSlope?: CrossSlopeDraft;
  /** Phase 3.7 optional: normalized physicalDistance of this template. */
  station?: number;
}

/** Pre-Decision #4: オフセット線の意味論ロール。 */
export type CrossSectionOffsetLineRole =
  | "shoulder"
  | "lane"
  | "median"
  | "sidewalk"
  | "edge"
  | "custom";

/**
 * Batch 5 / PR-3a-1 / Master Pre-Decision #4: 横断オフセット線。
 * offset は中心線からのオフセット (m, 右正)。
 * elevation は相対標高 (m, 上正)。
 */
export interface CrossSectionOffsetLineDraft {
  id: string;
  offset: number;
  elevation: number;
  role?: CrossSectionOffsetLineRole;
  label?: string;
}

/**
 * N2 §4 leaves grid definition details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface GridDefinitionDraft {
  id: string;
  crossSectionTemplateId: string;
  stationRange: StationRangeDraft;
  stationInterval?: number;
  offsetLineIds?: string[];
}

/**
 * N2 §4 leaves station range details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface StationRangeDraft {
  startPhysicalDistance: number;
  endPhysicalDistance: number;
}

/**
 * N2 §4 leaves span details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface SpanDraft {
  id: string;
  startPhysicalDistance: number;
  endPhysicalDistance: number;
  pierIdStart?: string;
  pierIdEnd?: string;
}

/**
 * N2 §4 leaves pier details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface PierDraft {
  id: string;
  physicalDistance: number;
  kind: "abutment" | "pier" | "virtual_pier";
  skewAngleRad?: number;
  bearingOffsets?: PierBearingOffsetDraft[];
}

/** Phase 3.7: cross-beam support at a normalized station. */
export interface CrossBeamDraft {
  id: string;
  physicalDistance: number;
  spanId?: string;
}

/** Phase 3.7: width change point at a normalized station. */
export interface WidthChangePointDraft {
  id: string;
  physicalDistance: number;
  leftOffset: number;
  rightOffset: number;
}

/**
 * N2 §4 leaves pier bearing details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface PierBearingOffsetDraft {
  transverseIndex: number;
  offset: number;
}

/**
 * N2 §4 leaves generation settings details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface GenerationSettingsDraft {
  defaultMemberGroupKey?: string;
  connectivityMode?: "longitudinal_only" | "transverse_only" | "grid_full";
}

export interface SamplingSettingsDraft {
  display: SamplingProfileDraft;
  dxf: SamplingProfileDraft;
  frame: FrameSamplingProfileDraft;
}

export interface SamplingProfileDraft {
  maxChordLength: number;
  maxSagitta: number;
  minSegmentsPerElement: number;
}

export interface FrameSamplingProfileDraft {
  maxMemberLength: number;
  maxSagitta: number;
  stationIntervalFallback: number;
}

export type ProjectLinerExtension = {
  liner?: ProjectLinerMetadata;
  linerTrace?: PersistedLinerTraceEntry[];
};

export type ProjectLinerValidationDiagnostic = {
  level: "error";
  code: "LINER_SCHEMA_INVALID";
  path: string;
  message: string;
};
