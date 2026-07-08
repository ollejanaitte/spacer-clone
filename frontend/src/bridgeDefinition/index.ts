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
