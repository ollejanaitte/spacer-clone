export {
  buildBridgeSuperstructureDesignDocument,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  getBridgeStructureQuantities,
  isBridgeStructureGenerationCurrent,
  withAppurtenanceConfiguration,
  withBridgeStructureField,
  withBridgeStructureInputDraft,
  withHaunchConfiguration,
} from "./generateBsdd";
export {
  buildApolloBsddFingerprintPayload,
  getApolloBsdd,
  hydrateApolloBsddFromPersistence,
  serializeApolloBsddForPersistence,
  withApolloBsdd,
} from "./projectBsdd";
export { computeBridgeStructureApproximateQuantities } from "./quantities";
export { syncOverlayFrameToLayout } from "./syncOverlayFrame";
export { stableEntitySeed, stableUuidFromSeed } from "./stableIds";
export { computeGirderSectionProperties, type GirderSectionProperties } from "./sectionProperties";
export {
  getBridgeStructureUnitWeightAdoption,
  withAdoptedBridgeStructureUnitWeight,
  withBridgeStructureUnitWeightReset,
  type BridgeStructureAdoptionResult,
  type BridgeStructureUnitWeightKind,
} from "./adoption";
export {
  BRIDGE_STRUCTURE_INPUT_FIELDS,
  BRIDGE_STRUCTURE_INPUT_FIELD_KEYS,
  BRIDGE_STRUCTURE_BOOLEAN_INPUT_KEYS,
  BRIDGE_STRUCTURE_CONFIGURATION_FIELD_KEYS,
  APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION,
  APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION_LEGACY,
  type ApolloBridgeStructureInputDraft,
  type BridgeStructureApproximateQuantity,
  type BridgeStructureBooleanInputKey,
  type BridgeStructureGenerationResult,
  type BridgeStructureInputFieldDefinition,
  type BridgeStructureInputFieldKey,
  type BridgeStructureQuantityStatus,
} from "./types";
export { withBridgeStructureBooleanField } from "./generateBsdd";
export {
  createEmptyBridgeStructureInputDraft,
  parseBridgeStructureInputDraft,
  resolveSpanCount,
  SPAN_LENGTH_RATIO_TOLERANCE,
  validateBridgeStructureInputDraft,
  validateBridgeStructureInputPersistence,
  type BridgeStructureFieldValidation,
  type BridgeStructureValidationResult,
} from "./validation";
export {
  PRESENCE_STATUS,
  isPresenceStatus,
  validatePresenceConsistency,
  type PresenceStatus,
} from "./presence";
export {
  APPURTENANCE_SLOTS,
  APPURTENANCE_SLOT_LABELS,
  APPURTENANCE_SLOT_TYPE_SIDE,
  type ApolloAppurtenanceConfigurationDraft,
  type ApolloAppurtenanceItemDraft,
  type ApolloAppurtenanceSlotDraft,
  type AppurtenanceSlot,
  type BridgeAppurtenanceModel,
} from "./appurtenanceTypes";
export {
  buildBridgeAppurtenanceModels,
  createDefaultAppurtenanceConfiguration,
  setAppurtenanceFullLength,
  stableAppurtenanceId,
  validateBridgeAppurtenanceConfiguration,
  withAppurtenanceSlotItem,
  withAppurtenanceSlotPresence,
} from "./appurtenanceModel";
export {
  HAUNCH_SHAPE_TYPES,
  mainGirderKeyFromIndex,
  type ApolloHaunchConfigurationDraft,
  type ApolloHaunchGirderDraft,
  type ApolloHaunchItemDraft,
  type HaunchShapeType,
  type RcDeckHaunchModel,
} from "./haunchTypes";
export {
  applyHaunchExplicitNoneAll,
  applyHaunchToAllGirders,
  buildRcDeckHaunchModels,
  createDefaultHaunchConfiguration,
  createEmptyHaunchItemDraft,
  expectedGirderKeys,
  resetHaunchConfiguration,
  resolveMainGirderRefId,
  setHaunchFullLength,
  stableHaunchId,
  validateRcDeckHaunchConfiguration,
  withHaunchGirderItem,
  withHaunchGirderPresence,
} from "./haunchModel";
export {
  buildContinuousLayout,
  buildSimpleSingleLayout,
  buildSupportsFromSpans,
  BridgeSystem,
  CONTINUOUS_SPAN_COUNT_MAX,
  CONTINUOUS_SPAN_COUNT_MIN,
  SupportLayoutRole,
  validateBridgeLayoutContract,
} from "../contracts";
export {
  CONTINUOUS_ANALYSIS_DISCLAIMER,
  CONTINUOUS_GIRDER_SAMPLE_DISCLAIMER,
  CONTINUOUS_GIRDER_SAMPLE_SPANS,
  SIMPLE_SINGLE_SPAN_SAMPLE_DISCLAIMER,
  SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
  applyContinuousGirderSampleInput,
  applySimpleSingleSpanSampleInput,
  clearBridgeStructureInput,
  deriveSingleSpanModelLength,
} from "./sampleInputs";
export {
  BRIDGE_SYSTEM_LABELS,
  addContinuousSpan,
  removeContinuousSpan,
  withBridgeStructureSystem,
  withContinuousSpanCount,
  withContinuousSpanLength,
  type SelectableBridgeSystem,
} from "./layoutInput";
