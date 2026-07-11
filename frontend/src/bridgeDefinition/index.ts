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
  compareNormalizedModels,
  compareScalarWithTolerance,
  compareSemanticParity,
  distance,
  distanceWithinTolerance,
  matchNormalizedMembers,
  matchNormalizedNodes,
  mergeSemanticTolerance,
  nearlyEqual,
  nearlyZero,
  normalizeProjectModelForSemanticParity,
} from "./semanticParity";

export type {
  AmbiguousMatch,
  CompareSemanticParityOptions,
  MatchDiagnostics,
  MatchResult,
  MatchedPair,
  NormalizedMember,
  NormalizedModel,
  NormalizedNode,
  NormalizedSection,
  NormalizedSupport,
  ParityMismatch,
  ParityReport,
  ParityReportSummary,
  SemanticParityDiagnostic,
  SemanticParitySeverity,
  SemanticParitySource,
  SemanticParityStatus,
  SemanticTolerance,
  ToleranceBand,
  TraceInfo,
  UnmatchedItem,
  Vector3,
} from "./semanticParity";
