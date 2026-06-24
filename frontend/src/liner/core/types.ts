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
  | "LINER_GEOM_CLOTHOID_LONG_SPIRAL"
  | "LINER_GEOM_INVERSE_PROJECTION_FAILED"
  | "LINER_STATION_DUPLICATE_EQUATION"
  | "LINER_STATION_OUT_OF_RANGE"
  | "LINER_GRID_SPACING_INVALID"
  | "LINER_FRAME_ZERO_LENGTH_MEMBER";

export type ValidationIssue = {
  level: DiagnosticLevel;
  code: LinerDiagnosticCode;
  entityType?: string;
  entityId?: string;
  entityPath?: string;
  field?: string;
  physicalDistance?: number;
  station?: number;
  detail?: string;
};

export type CalculationError = ValidationIssue & {
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

export type GeneratedStation = {
  id: string;
  physicalDistance: number;
  displayedStation: number;
  source: "start" | "end" | "interval" | "explicit" | "equation";
  sourceId?: string;
  sortIndex: number;
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

export type HorizontalGeometryResult = {
  totalLength: number;
  sampledPoints: AlignmentSamplePoint[];
  issues: ValidationIssue[];
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
  stationId: string;
  elementId?: string;
};

export type ZProvenance = {
  profileElevation: number;
  crossfallOffset: number;
  structuralReferenceOffset: number;
  sectionDepthOffset: number;
  girderEccentricity: number;
};

export type GridPointPreparation = {
  id: string;
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

export type LinerIntermediateResult = {
  schemaVersion: "0.2.0";
  sourceRevision: string;
  linerModelId: string;
  coordinatePolicyId: string;
  horizontal: HorizontalGeometryResult;
  stations: GeneratedStation[];
  gridPoints: GridPointPreparation[];
  nodeCandidates: NodePreparation[];
  memberCandidates: MemberPreparation[];
  issues: ValidationIssue[];
};

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
};
