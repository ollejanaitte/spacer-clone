import type {
  CrossSectionTemplateDraft,
  VerticalAlignmentDraft,
} from "../schema/types";

export type Vec2 = {
  x: number;
  y: number;
};

export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type CoordinateSystemMarker = {
  id: string;
  handedness: "right";
  lengthUnit: "m";
  angleUnit: "rad";
};

export type ToleranceConfig = {
  length: number;
  coordinate: number;
  clothoidCoordinate: number;
  azimuth: number;
  elevation: number;
  station: number;
  offset: number;
};

export type DiagnosticLevel = "info" | "warning" | "error";

export type LinerDiagnosticCode =
  | "LINER_GEOM_ZERO_LENGTH_SEGMENT"
  | "LINER_GEOM_POSITION_DISCONTINUITY"
  | "LINER_GEOM_AZIMUTH_DISCONTINUITY"
  | "LINER_GEOM_CLOTHOID_INVALID_RADIUS"
  | "LINER_GEOM_CLOTHOID_ACCURACY_EXCEEDED"
  | "LINER_GEOM_CLOTHOID_LONG_SPIRAL"
  | "LINER_GEOM_INVERSE_PROJECTION_FAILED"
  | "LINER_STATION_DUPLICATE_EQUATION"
  | "LINER_STATION_OUT_OF_RANGE"
  | "LINER_GRID_SPACING_INVALID"
  | "LINER_FRAME_MISSING_NODE"
  | "LINER_FRAME_MISSING_SECTION"
  | "LINER_FRAME_ZERO_LENGTH_MEMBER"
  | "LINER_FRAME_DISCONNECTED"
  | "LINER_FRAME_DUPLICATE_ID"
  | "LINER_FRAME_SCHEMA_INVALID"
  | "LINER_PROFILE_ELEVATION_DISCONTINUITY"
  | "LINER_PROFILE_GRADE_DISCONTINUITY"
  | "LINER_PROFILE_COVERAGE_GAP"
  | "LINER_PROFILE_ADJACENCY_GAP"
  | "LINER_PROFILE_END_COVERAGE_GAP"
  | "LINER_SPAN_END_EXCEEDS_ALIGNMENT"
  | "LINER_ORIGIN_STATION_AMBIGUOUS"
  | "LINER_PROFILE_PARABOLIC_Z_MERGE_DEFERRED";

export type ComputationDiagnostic = {
  level: DiagnosticLevel;
  code: LinerDiagnosticCode | string;
  messageKey?: string;
  entityType?: string;
  entityId?: string;
  entityPath?: string;
  field?: string;
  physicalDistance?: number;
  station?: number;
  detail?: string;
};

export type ValidationIssue = ComputationDiagnostic;

export type CalculationError = ComputationDiagnostic & {
  level: "error";
};

export type LocalFrame = {
  tangent: Vec3;
  normal: Vec3;
  binormal: Vec3;
};

export type AlignmentElementBase = {
  id: string;
  length: number;
};

export type StraightElement = AlignmentElementBase & {
  type: "straight";
  start: Vec2;
  azimuth: number;
};

export type CircularArcElement = AlignmentElementBase & {
  type: "arc";
  start: Vec2;
  azimuth: number;
  radius: number;
  turn: "left" | "right";
};

export type ClothoidElement = AlignmentElementBase & {
  type: "clothoid";
  start: Vec2;
  azimuth: number;
  clothoidParameter: number;
  startRadius?: number | null;
  endRadius?: number | null;
  turn?: "left" | "right";
};

export type AlignmentElement =
  | StraightElement
  | CircularArcElement
  | ClothoidElement;

export type LinearAlignment = {
  id: string;
  linerModelId: string;
  coordinatePolicyId: string;
  elements: AlignmentElement[];
};

export type StationEquation = {
  id: string;
  physicalDistance: number;
  type: "add_constant" | "reset_to_value";
  value: number;
  sortIndex?: number;
};

export type StationDefinition = {
  originDisplayedStation: number;
  interval?: number;
  explicitStations?: number[];
  equations?: StationEquation[];
};

export type GeneratedStationSource = "start" | "end" | "interval" | "explicit" | "equation";

export type GeneratedStation = {
  id: string;
  physicalDistance: number;
  displayedStation: number;
  source: GeneratedStationSource;
  sourceId?: string;
  sortIndex: number;
};

export type StationTableEntry = {
  entryId: string;
  displayedStation: number;
  physicalDistance: number;
  equationId?: string;
  sortIndex: number;
  note?: string;
  provenance?: {
    source: GeneratedStationSource;
    sourceId?: string;
  };
};

export type StationTableResult = {
  entries: StationTableEntry[];
  originDisplayedStation: number;
  increasingDirection: "forward" | "backward";
};

export type IntermediateId = string;

export type IntermediateProvenance = {
  alignmentId: string;
  elementId?: string;
  sourceRevision: string;
};

export type AlignmentSamplePoint = {
  physicalDistance: number;
  displayedStation: number;
  x: number;
  y: number;
  azimuth: number;
  curvature: number;
  segmentId: string;
  localFrame: LocalFrame;
};

export type HorizontalSegmentResult = {
  id: string;
  sourceElementId: string;
  type: AlignmentElement["type"];
  startPhysicalDistance: number;
  endPhysicalDistance: number;
  startDisplayedStation: number;
  endDisplayedStation: number;
  startAzimuth: number;
  endAzimuth: number;
  startCurvature: number;
  endCurvature: number;
};

export type HorizontalPiPointResult = {
  id: string;
  x: number;
  y: number;
  physicalDistance?: number;
  displayedStation?: number;
  sourceElementIds: string[];
};

export type HorizontalGeometryResult = {
  totalLength: number;
  segments: HorizontalSegmentResult[];
  sampledPoints: AlignmentSamplePoint[];
  piPoints: HorizontalPiPointResult[];
};

export type Phase0HorizontalGeometryResult = {
  totalLength: number;
  sampledPoints: AlignmentSamplePoint[];
  issues: ValidationIssue[];
};

export type ProfileSegmentResult = {
  id: string;
  startPhysicalDistance: number;
  endPhysicalDistance: number;
  startDisplayedStation: number;
  endDisplayedStation: number;
  startElevation: number;
  endElevation: number;
  startGrade: number;
  endGrade: number;
  pvcPhysicalDistance?: number;
  pviPhysicalDistance?: number;
  pvtPhysicalDistance?: number;
};

export type ProfileSamplePoint = {
  physicalDistance: number;
  displayedStation: number;
  profileElevation: number;
  grade: number;
  segmentId: string;
};

export type GradeBreakResult = {
  id: string;
  physicalDistance: number;
  displayedStation: number;
  incomingGrade?: number;
  outgoingGrade?: number;
};

export type VerticalGeometryResult = {
  profileElevation: number;
  segments: ProfileSegmentResult[];
  sampledPoints: ProfileSamplePoint[];
  gradeBreaks: GradeBreakResult[];
};

export type GridPointRole =
  | "main_girder"
  | "cross_girder"
  | "pier_line"
  | "bearing"
  | "edge"
  | "virtual"
  | "construction_only";

export type GridPointSource = {
  alignmentId: string;
  stationRuleId?: string;
  stationId?: string;
  sectionId?: string;
  elementId?: string;
  spanId?: string;
  pierId?: string;
  crossSectionTemplateId?: string;
  longitudinalLineId?: string;
  transverseLineId?: string;
  gridLineId?: string;
};

export type ZProvenance = {
  profileElevation: number;
  crossfallOffset: number;
  structuralReferenceOffset: number;
  sectionDepthOffset: number;
  girderEccentricity: number;
};

export type GridPointResult = {
  id: string;
  gridDefinitionId: string;
  physicalDistance: number;
  displayedStation: number;
  offset: number;
  x: number;
  y: number;
  z: number;
  localFrame: LocalFrame;
  labels: {
    longitudinalIndex: number;
    transverseIndex: number;
  };
  source: GridPointSource;
  roles: GridPointRole[];
  zProvenance: ZProvenance;
  memberGroupKey?: string;
};

export type GridLineResult = {
  id: string;
  gridDefinitionId: string;
  direction: "longitudinal" | "transverse";
  index: number;
  pointIds: string[];
  role: GridPointRole;
  spanId?: string;
  pierId?: string;
};

export type GridCellResult = {
  id: string;
  cornerPointIds: [string, string, string, string];
  spanId?: string;
};

export type GridResult = {
  points: GridPointResult[];
  lines: GridLineResult[];
  cells: GridCellResult[];
};

export type SpanResult = {
  id: string;
  startPhysicalDistance: number;
  endPhysicalDistance: number;
  startDisplayedStation: number;
  endDisplayedStation: number;
  pierIdStart?: string;
  pierIdEnd?: string;
};

export type PierResult = {
  id: string;
  physicalDistance: number;
  displayedStation: number;
  skewAngleRad: number;
  bearingOffsets?: { transverseIndex: number; offset: number }[];
  supportLinePointIds: string[];
};

export type MemberGroupRule = {
  key: string;
  match: {
    role?: GridPointRole;
    direction?: "longitudinal" | "transverse";
    transverseIndex?: number;
    spanId?: string;
  };
  materialId: string;
  sectionId: string;
};

export type SupportTemplateHint = {
  templateId: string;
  pierId?: string;
  physicalDistance?: number;
  nodeRoles: GridPointRole[];
  dof: {
    ux: boolean;
    uy: boolean;
    uz: boolean;
    rx: boolean;
    ry: boolean;
    rz: boolean;
  };
  coordinateSystem: "global" | "local_pier";
};

export type FrameGenerationHintResult = {
  defaultMemberGroupKey: string;
  memberGroupRules: MemberGroupRule[];
  supportTemplates: SupportTemplateHint[];
  connectivityMode: "longitudinal_only" | "transverse_only" | "grid_full";
};

export type SectionSliceResult = {
  physicalDistance: number;
  displayedStation: number;
  width: number;
  leftEdge: { offset: number; z: number };
  rightEdge: { offset: number; z: number };
  templateId: string;
};

export type DependencyNodeKind =
  | "horizontal"
  | "vertical"
  | "stations"
  | "grid"
  | "spans"
  | "piers"
  | "frameHints"
  | "sections"
  | "diagnostics";

export type DependencySnapshotNode = {
  id: string;
  kind: DependencyNodeKind;
  sourceEntityIds: string[];
  revision: string;
};

export type DependencySnapshotEdge = {
  fromNodeId: string;
  toNodeId: string;
  invalidates: boolean;
};

export type DependencySnapshot = {
  nodes: DependencySnapshotNode[];
  edges: DependencySnapshotEdge[];
  createdFromSourceRevision: string;
};

export type CanonicalLinerIntermediateResult = {
  schemaVersion: "0.2.0";
  computedAt: string;
  sourceRevision: string;
  linerModelId: string;
  coordinatePolicyId: string;
  horizontal: HorizontalGeometryResult;
  vertical: VerticalGeometryResult;
  stations: StationTableResult;
  grid: GridResult;
  spans: SpanResult[];
  piers: PierResult[];
  frameHints: FrameGenerationHintResult;
  sections: SectionSliceResult[];
  diagnostics: ComputationDiagnostic[];
  dependencyGraph: DependencySnapshot;
};

export type GridPointPreparation = Omit<GridPointResult, "gridDefinitionId" | "memberGroupKey"> & {
  source: GridPointSource & {
    stationId: string;
  };
};

export type NodePreparation = {
  id: string;
  gridPointId: string;
  x: number;
  y: number;
  z: number;
  provenance: IntermediateProvenance;
};

export type MemberPreparation = {
  id: string;
  nodeIId: string;
  nodeJId: string;
  stationIId: string;
  stationJId: string;
  direction: "longitudinal" | "transverse";
  provenance: IntermediateProvenance;
};

export type Phase0LinerIntermediateResult = {
  schemaVersion: "0.2.0";
  sourceRevision: string;
  linerModelId: string;
  coordinatePolicyId: string;
  horizontal: Phase0HorizontalGeometryResult;
  stations: GeneratedStation[];
  gridPoints: GridPointPreparation[];
  nodeCandidates: NodePreparation[];
  memberCandidates: MemberPreparation[];
  issues: ValidationIssue[];
};

export type LinerIntermediateResult =
  | CanonicalLinerIntermediateResult
  | Phase0LinerIntermediateResult;

export type ElementEvaluation = {
  point: Vec2;
  azimuth: number;
  curvature: number;
  localDistance: number;
  elementId: string;
};

export type AlignmentEvaluation = ElementEvaluation & {
  physicalDistance: number;
  displayedStation: number;
  localFrame: LocalFrame;
};

export type GridPreparationInput = {
  alignment: LinearAlignment;
  stations: GeneratedStation[];
  offsets: number[];
  sourceRevision: string;
  z?: number;
  verticalAlignment?: VerticalAlignmentDraft;
  crossSectionTemplate?: CrossSectionTemplateDraft;
};
