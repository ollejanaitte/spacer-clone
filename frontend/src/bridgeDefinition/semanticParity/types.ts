import type { ProjectModel } from "../../types";

export type SemanticParityStatus = "equivalent" | "different" | "indeterminate" | "invalid";

export type SemanticParitySeverity = "info" | "warning" | "error" | "blocker";

export type SemanticParitySource = "legacy" | "bridgeDefinition" | "liner" | "imported" | "generated" | "unknown";

export type SemanticParityCategory =
  | "geometry"
  | "normalization"
  | "node"
  | "member"
  | "support"
  | "section"
  | "property"
  | "topology";

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type ToleranceBand = {
  absolute?: number;
  relative?: number;
  floor?: number;
};

export type SemanticTolerance = {
  coordinate: ToleranceBand;
  length: ToleranceBand;
  scalar: ToleranceBand;
  angle: ToleranceBand;
};

export type TraceInfo = {
  sourceId?: string;
  sourceIndex: number;
  sourcePath: string;
};

export type NormalizedNode = {
  kind: "node";
  key: string;
  stableIndex: number;
  sourceId?: string;
  trace: TraceInfo;
  position: Vector3;
};

export type NormalizedMember = {
  kind: "member";
  key: string;
  stableIndex: number;
  sourceId?: string;
  trace: TraceInfo;
  nodeIKey: string;
  nodeJKey: string;
  endpointKey: string;
  materialId?: string;
  sectionId?: string;
  orientationVector?: Vector3;
};

export type NormalizedSupport = {
  kind: "support";
  key: string;
  stableIndex: number;
  trace: TraceInfo;
  nodeKey?: string;
  sourceNodeId?: string;
  fixity: {
    ux: boolean;
    uy: boolean;
    uz: boolean;
    rx: boolean;
    ry: boolean;
    rz: boolean;
  };
};

export type NormalizedSection = {
  kind: "section";
  key: string;
  stableIndex: number;
  sourceId?: string;
  trace: TraceInfo;
  properties: {
    area?: number;
    iy?: number;
    iz?: number;
    j?: number;
  };
};

export type NormalizedMaterial = {
  kind: "material";
  key: string;
  stableIndex: number;
  sourceId?: string;
  trace: TraceInfo;
  properties: {
    elasticModulus?: number;
    shearModulus?: number;
    poissonRatio?: number;
    density?: number;
  };
};

export type NormalizedModelMetadata = {
  source: SemanticParitySource;
  label?: string;
  units?: ProjectModel["units"];
};

export type SemanticParityDiagnostic = {
  category: SemanticParityCategory;
  severity: SemanticParitySeverity;
  code: string;
  path: string;
  message: string;
  sourceId?: string;
};

export type NormalizedModel = {
  metadata: NormalizedModelMetadata;
  nodes: NormalizedNode[];
  members: NormalizedMember[];
  supports: NormalizedSupport[];
  sections: NormalizedSection[];
  materials?: NormalizedMaterial[];
  warnings: SemanticParityDiagnostic[];
  errors: SemanticParityDiagnostic[];
};

export type MatchedPair = {
  leftKey: string;
  rightKey: string;
};

export type UnmatchedItem = {
  side: "left" | "right";
  key: string;
  sourceId?: string;
  path: string;
  reason: string;
};

export type AmbiguousMatch = {
  category: "node" | "member";
  leftKeys: string[];
  rightKeys: string[];
  message: string;
};

export type MatchDiagnostics = {
  warnings: SemanticParityDiagnostic[];
  errors: SemanticParityDiagnostic[];
};

export type MatchResult = {
  matched: MatchedPair[];
  unmatchedLeft: UnmatchedItem[];
  unmatchedRight: UnmatchedItem[];
  ambiguities: AmbiguousMatch[];
  diagnostics: MatchDiagnostics;
};

export type ParityMismatch = {
  category: SemanticParityCategory;
  path: string;
  leftValue: unknown;
  rightValue: unknown;
  delta?: number;
  tolerance?: ToleranceBand;
  severity: SemanticParitySeverity;
  message: string;
};

export type BoundingBox3 = {
  min: Vector3;
  max: Vector3;
};

export type LengthStats = {
  min: number;
  max: number;
  mean: number;
  total: number;
  count: number;
};

export type GeometryMetrics = {
  nodeCount: number;
  memberCount: number;
  boundingBox: BoundingBox3;
  centroid: Vector3;
  memberLengths: LengthStats;
  maxMatchedNodeDistance?: number;
  maxMatchedMemberLengthDelta?: number;
  matchedMemberLengthDeltas?: number[];
};

export type DegreeHistogram = Record<string, number>;

export type TopologyMetrics = {
  degreeHistogram: DegreeHistogram;
  isolatedNodeCount: number;
  connectedComponentCount: number;
  connectedComponentSizes: number[];
  parallelEdgeCandidateCount: number;
  selfLoopCandidateCount: number;
  unmatchedConnectivityEdgeCount?: number;
};

export type StructuralValidationSummary = {
  valid: boolean;
  isolatedNodeCount: number;
  disconnectedComponentCount: number;
  zeroLengthMemberCount: number;
  selfLoopCount: number;
  missingEndpointCount: number;
  nonFiniteGeometryCount: number;
};

export type SupportParitySummary = {
  matchedSupportCount: number;
  unmatchedLeftCount: number;
  unmatchedRightCount: number;
  fixityMismatchCount: number;
  ambiguousNodeCount: number;
};

export type PropertyParitySummary = {
  comparedMemberCount: number;
  sectionMismatchCount: number;
  materialMismatchCount: number;
  orientationMismatchCount: number;
  orientationOppositeCount: number;
  skippedUndefinedCount: number;
};

export type ParityMetrics = {
  geometry: {
    left: GeometryMetrics;
    right: GeometryMetrics;
    equivalent: boolean;
  };
  topology: {
    left: TopologyMetrics;
    right: TopologyMetrics;
    equivalent: boolean;
  };
  structuralValidation: {
    left: StructuralValidationSummary;
    right: StructuralValidationSummary;
  };
  support: SupportParitySummary;
  property: PropertyParitySummary;
};

export type ParityReportSummary = {
  status: SemanticParityStatus;
  matchedNodes: number;
  matchedMembers: number;
  unmatchedLeft: number;
  unmatchedRight: number;
  mismatchCount: number;
  ambiguityCount: number;
  warningCount: number;
  errorCount: number;
  geometryEquivalent?: boolean;
  topologyEquivalent?: boolean;
  structurallyValid?: boolean;
  supportEquivalent?: boolean;
  propertyEquivalent?: boolean;
};

export type ParityReport = {
  status: SemanticParityStatus;
  tolerance: SemanticTolerance;
  counts: {
    left: {
      nodes: number;
      members: number;
      supports: number;
      sections: number;
      materials?: number;
    };
    right: {
      nodes: number;
      members: number;
      supports: number;
      sections: number;
      materials?: number;
    };
    matched: {
      nodes: number;
      members: number;
    };
  };
  unmatchedLeft: UnmatchedItem[];
  unmatchedRight: UnmatchedItem[];
  mismatches: ParityMismatch[];
  ambiguities: AmbiguousMatch[];
  warnings: SemanticParityDiagnostic[];
  errors: SemanticParityDiagnostic[];
  metrics: ParityMetrics;
  summary: ParityReportSummary;
};

export type CompareSemanticParityOptions = {
  tolerance?: Partial<SemanticTolerance>;
  leftSource?: SemanticParitySource;
  rightSource?: SemanticParitySource;
  leftLabel?: string;
  rightLabel?: string;
};

export type JsonSafeValue =
  | null
  | boolean
  | number
  | string
  | JsonSafeValue[]
  | { [key: string]: JsonSafeValue };

export type ParityReportSource = {
  source: SemanticParitySource;
  label?: string;
  generatorRoute?: string;
  metadata?: Record<string, JsonSafeValue>;
};

export type ParityReportEnvelope = {
  schemaVersion: string;
  sources: {
    left: ParityReportSource;
    right: ParityReportSource;
  };
  tolerance: SemanticTolerance;
  report: ParityReport;
  generatedAt?: string;
  toolVersion?: string;
};

export type CreateParityReportEnvelopeOptions = {
  sources: {
    left: ParityReportSource;
    right: ParityReportSource;
  };
  tolerance?: SemanticTolerance;
  schemaVersion?: string;
  generatedAt?: string;
  toolVersion?: string;
};

export type CanonicalizeParityReportEnvelopeOptions = {
  generatedAt?: string;
};

export type SerializeParityReportEnvelopeOptions = {
  pretty?: boolean;
  generatedAt?: string;
};
