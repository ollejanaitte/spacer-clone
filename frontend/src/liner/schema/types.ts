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
  domainDraft?: LinerDomainDraftVNext;
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

/** Phase 3.8: measured line x section grid from LINER local coordinates. */
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
  /**
   * Phase 3.9: when false, this line is treated as a reference / non-structural
   * line and is excluded from the SPACER frame model. Default behavior (when
   * undefined) is the same as `true` so legacy drafts keep working.
   */
  frameModelEnabled?: boolean;
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
  gridDefinitions: GridDefinitionDraft[];
  /** Phase 3.8: optional measured local-coordinate grid (highest-priority geometry source). */
  measuredGrid?: MeasuredGridDraft;
  spans: SpanDraft[];
  piers: PierDraft[];
  crossBeams?: CrossBeamDraft[];
  widthChangePoints?: WidthChangePointDraft[];
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
 * N2 section 4 leaves station equation details open; PR-1a-1 defines this conservatively.
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
 * N2 section 4 leaves StationDefinitionDraft details open; PR-1a-1 defines this conservatively.
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
 * Batch 4 / PR-2a-1: vertical grade element.
 * Stations are represented by startStation/endStation and length; grade is a ratio.
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
 * Batch 4 / Master Pre-Decision #2: JIP-LINER-compatible parabolic vertical element.
 * K-value and radius-R editing styles are not adopted.
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
 * Batch 5 / PR-3a-1 / Master Pre-Decision #3: cross slope.
 * Positive means the right side from the road center goes downward. Unit is percent.
 */
export interface CrossSlopeDraft {
  signConvention: "right_down_positive";
  valuePercent: number;
}

/**
 * Batch 5 / PR-3a-1 / Master Pre-Decision #4: cross-section template.
 * Uses the offset-line list model; layer and parametric models are not adopted.
 */
export interface CrossSectionTemplateDraft {
  id: string;
  name: string;
  offsetLines: CrossSectionOffsetLineDraft[];
  crossSlope?: CrossSlopeDraft;
  /** Phase 3.7 optional: normalized physicalDistance of this template. */
  station?: number;
}

/** Pre-Decision #4: semantic role for an offset line. */
export type CrossSectionOffsetLineRole =
  | "shoulder"
  | "lane"
  | "median"
  | "sidewalk"
  | "edge"
  | "custom";

/**
 * Batch 5 / PR-3a-1 / Master Pre-Decision #4: cross-section offset line.
 * offset is the distance from the centerline (m, right positive).
 * elevation is relative elevation (m, up positive).
 *
 * Phase 3.9: frameModelEnabled=false excludes the line from SPACER frame-model
 * nodes, members, and supports. Preview and measured-grid storage are unaffected.
 */
export interface CrossSectionOffsetLineDraft {
  id: string;
  offset: number;
  elevation: number;
  role?: CrossSectionOffsetLineRole;
  label?: string;
  /**
   * Phase 3.9: whether this line participates in SPACER frame-model generation.
   * Undefined resolves from the label defaults: HCL/CL/ECL=false, others=true.
   */
  frameModelEnabled?: boolean;
}

/**
 * N2 section 4 leaves grid definition details open; PR-1a-1 defines this conservatively.
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
 * N2 section 4 leaves station range details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface StationRangeDraft {
  startPhysicalDistance: number;
  endPhysicalDistance: number;
}

/**
 * N2 section 4 leaves span details open; PR-1a-1 defines this conservatively.
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
 * N2 section 4 leaves pier details open; PR-1a-1 defines this conservatively.
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
 * N2 section 4 leaves pier bearing details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface PierBearingOffsetDraft {
  transverseIndex: number;
  offset: number;
}

/**
 * N2 section 4 leaves generation settings details open; PR-1a-1 defines this conservatively.
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
