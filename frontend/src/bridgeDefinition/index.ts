export type {
  BridgeDefinition,
  BridgeDefinitionAlignmentRef,
  BridgeDefinitionBearing,
  BridgeDefinitionCoordinatePolicy,
  BridgeDefinitionCrossBeam,
  BridgeDefinitionDeck,
  BridgeDefinitionGenerationSettings,
  BridgeDefinitionGirder,
  BridgeDefinitionLoad,
  BridgeDefinitionLoadTarget,
  BridgeDefinitionMetadata,
  BridgeDefinitionSchemaVersion,
  BridgeDefinitionSource,
  BridgeDefinitionSpan,
  BridgeDefinitionStation,
  BridgeDefinitionSuperstructure,
  BridgeDefinitionSuperstructureKind,
  BridgeDefinitionSupport,
} from "./types";

export { BRIDGE_DEFINITION_SCHEMA_VERSION_LITERAL } from "./types";

export {
  createBridgeDefinitionFromLinerBridge,
  validateLinerBridgeForBridgeDefinition,
} from "./adapters/fromLinerBridge";

export type { LinerBridgeToBridgeDefinitionOptions } from "./adapters/fromLinerBridge";

export {
  createBridgeDefinitionFromBridgeProject,
  validateBridgeProjectForBridgeDefinition,
} from "./adapters/fromBridgeProject";

export type { BridgeProjectToBridgeDefinitionOptions } from "./adapters/fromBridgeProject";

export {
  createStructuralModelFromBridgeDefinition,
  validateBridgeDefinitionForStructuralModel,
  generateStructuralModel,
  generateStructuralModelFromLinerBridge,
} from "./generator";

export type {
  BridgeDefinitionStructuralModelDiagnostic,
  BridgeDefinitionStructuralModelOptions,
  StructuralModelGenerationResult,
} from "./generator";

export {
  DEFAULT_SEMANTIC_TOLERANCE,
  angleWithinTolerance,
  buildGeometryMetrics,
  buildTopologyMetrics,
  compareNormalizedModels,
  comparePropertyParity,
  compareScalarWithTolerance,
  compareSemanticParity,
  compareSupportParity,
  computeGeometryMetrics,
  computeTopologyMetrics,
  distance,
  distanceWithinTolerance,
  isNearEqualProperty,
  matchNormalizedMembers,
  matchNormalizedNodes,
  mergeSemanticTolerance,
  nearlyEqual,
  nearlyZero,
  normalizeProjectModelForSemanticParity,
  validateStructuralModel,
} from "./semanticParity";

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
} from "./semanticParity";
