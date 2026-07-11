export { compareNormalizedModels, compareSemanticParity } from "./compare";
export {
  compareGeneratedProjectModels,
  compareLegacyAndBridgeDefinitionModels,
  createLegacyBridgeDefinitionSourceMeta,
  createLinerStructureOnlySourceMeta,
  createSemanticParityReportForGeneratedModels,
  generateBridgeDefinitionProjectModelFromBridgeProject,
  generateBridgeDefinitionProjectModelFromLinerBridge,
  SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
  SEMANTIC_PARITY_TOOL_VERSION,
  serializeSemanticParityReportForGolden,
} from "./generatedModelParity";
export { buildGeometryMetrics, computeGeometryMetrics } from "./geometryParity";
export { compareLoadParity } from "./loadParity";
export { loadCaseSemanticKey, normalizeLoadCaseName } from "./normalize";
export { matchNormalizedMembers } from "./memberMatching";
export { matchNormalizedNodes } from "./nodeMatching";
export { normalizeProjectModelForSemanticParity } from "./normalize";
export { comparePropertyParity, isNearEqualProperty } from "./propertyParity";
export {
  PARITY_REPORT_ENVELOPE_SCHEMA_VERSION,
  canonicalizeParityReportEnvelope,
  createParityReportEnvelope,
  serializeParityReportEnvelope,
} from "./serializer";
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
  CompareGeneratedProjectModelsOptions,
  CreateSemanticParityReportOptions,
  GeneratedProjectModelSourceMeta,
} from "./generatedModelParity";
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
  NormalizedLoadCase,
  NormalizedMaterial,
  NormalizedMember,
  NormalizedMemberLoad,
  NormalizedModel,
  NormalizedNode,
  NormalizedNodalLoad,
  NormalizedSection,
  NormalizedSupport,
  NodalLoadVector,
  MemberLoadVector,
  LoadParitySummary,
  ParityMetrics,
  ParityMismatch,
  ParityReport,
  ParityReportEnvelope,
  ParityReportSource,
  ParityReportSummary,
  PropertyParitySummary,
  SemanticParityDiagnostic,
  SemanticParitySeverity,
  SemanticParitySource,
  SemanticParityStatus,
  SemanticTolerance,
  SerializeParityReportEnvelopeOptions,
  StructuralValidationSummary,
  SupportParitySummary,
  ToleranceBand,
  TopologyMetrics,
  TraceInfo,
  UnmatchedItem,
  Vector3,
  CanonicalizeParityReportEnvelopeOptions,
  CreateParityReportEnvelopeOptions,
  JsonSafeValue,
} from "./types";
