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

export interface LinerDomainDraftVNext {
  id: string;
  linerModelId: string;
  coordinatePolicyId: string;
  alignment: HorizontalAlignmentDraft;
  stationDefinition: StationDefinitionDraft;
  verticalAlignment: VerticalAlignmentDraft;
  crossSections: CrossSectionTemplateDraft[];
  gridDefinitions: GridDefinitionDraft[];
  spans: SpanDraft[];
  piers: PierDraft[];
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
 * N2 §4 leaves vertical element details open; PR-1a-1 defines grade fields conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface VerticalGradeElementDraft {
  type: "grade";
  id: string;
  startPhysicalDistance: number;
  endPhysicalDistance: number;
  startElevation: number;
  grade: number;
}

/**
 * N2 §4 leaves vertical element details open; PR-1a-1 defines parabolic fields conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
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
 * N2 §4 leaves cross-section template details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export interface CrossSectionTemplateDraft {
  id: string;
  name?: string;
  offsetLines: CrossSectionOffsetLineDraft[];
}

/**
 * N2 §4 leaves cross-section offset details open; PR-1a-1 defines this conservatively.
 * Final field constraints should be fixed in PR-1a-2 or later.
 */
export type CrossSectionOffsetLineRole =
  | "shoulder"
  | "lane"
  | "median"
  | "sidewalk"
  | "edge"
  | "custom";

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
  skewAngleRad?: number;
  bearingOffsets?: PierBearingOffsetDraft[];
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
