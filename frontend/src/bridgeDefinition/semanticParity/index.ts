export { compareNormalizedModels, compareSemanticParity } from "./compare";
export { buildGeometryMetrics, computeGeometryMetrics } from "./geometryParity";
export { matchNormalizedMembers } from "./memberMatching";
export { matchNormalizedNodes } from "./nodeMatching";
export { normalizeProjectModelForSemanticParity } from "./normalize";
export { comparePropertyParity, isNearEqualProperty } from "./propertyParity";
export { validateStructuralModel } from "./structuralValidation";
export { compareSupportParity } from "./supportParity";
export { buildTopologyMetrics, computeTopologyMetrics } from "./topologyParity";
export {
  DEFAULT_SEMANTIC_TOLERANCE,
  angleWithinTolerance,
  compareScalarWithTolerance,
  distance,
  distanceWithinTolerance,
  mergeSemanticTolerance,
  nearlyEqual,
  nearlyZero,
} from "./tolerance";

export type {
  AmbiguousMatch,
  BoundingBox3,
  CompareSemanticParityOptions,
  DegreeHistogram,
  GeometryMetrics,
  LengthStats,
  MatchDiagnostics,
  MatchResult,
  MatchedPair,
  NormalizedMaterial,
  NormalizedMember,
  NormalizedModel,
  NormalizedNode,
  NormalizedSection,
  NormalizedSupport,
  ParityMetrics,
  ParityMismatch,
  ParityReport,
  ParityReportSummary,
  PropertyParitySummary,
  SemanticParityDiagnostic,
  SemanticParitySeverity,
  SemanticParitySource,
  SemanticParityStatus,
  SemanticTolerance,
  StructuralValidationSummary,
  SupportParitySummary,
  ToleranceBand,
  TopologyMetrics,
  TraceInfo,
  UnmatchedItem,
  Vector3,
} from "./types";
