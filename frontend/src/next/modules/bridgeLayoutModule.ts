import type { ModuleDataRecord } from "./contract";
import { createInitialModuleData } from "./contract";
import type { BridgeLayoutModuleData } from "./bridgeLayout/bridgeLayoutTypes";
import { createBridgeLayoutData } from "./bridgeLayout/bridgeLayoutTypes";
import { validateBridgeLayoutData } from "./bridgeLayout/bridgeLayoutValidation";
import { BRIDGE_LAYOUT_MODULE_ID } from "./bridgeLayout/bridgeLayoutTypes";

export { BRIDGE_LAYOUT_MODULE_ID, BRIDGE_LAYOUT_SCHEMA_VERSION, BRIDGE_LAYOUT_DATA_VERSION } from "./bridgeLayout/bridgeLayoutTypes";
export type {
  BridgeLayoutDocument,
  BridgeLayoutModuleData,
  BridgeLayoutIssue,
  RoadReference,
  TerrainReference,
  ExistingConditionsReference,
  BridgeRange,
  AbutmentPlacement,
  PierPlacement,
  BridgeSpan,
  SkewConfig,
} from "./bridgeLayout/bridgeLayoutTypes";
export { createEmptyBridgeLayoutDocument, createBridgeLayoutData, isBridgeLayoutData } from "./bridgeLayout/bridgeLayoutTypes";
export { validateBridgeLayoutDocument, validateBridgeLayoutData, parseBridgeLayoutDocument, createValidationState } from "./bridgeLayout/bridgeLayoutValidation";
export { resolveBridgeLayoutReferences } from "./bridgeLayout/bridgeLayoutReferences";
export type { BridgeLayoutReferenceResolution } from "./bridgeLayout/bridgeLayoutReferences";
export {
  readRoadAlignmentContext,
  computeBridgeLength,
  validateBridgeRangeInput,
  buildBridgeLayoutFromRange,
  applyBridgeRangeToDocument,
} from "./bridgeLayout/bridgeLayoutDomain";
export type { RoadAlignmentContext, BuildBridgeRangeResult, ValidateBridgeRangeInput } from "./bridgeLayout/bridgeLayoutDomain";

export function createBridgeLayoutModuleRecord(): ModuleDataRecord {
  return {
    ...createInitialModuleData(),
    data: { ...createBridgeLayoutData() } as BridgeLayoutModuleData as unknown as Record<string, unknown>,
  };
}

export { BRIDGE_LAYOUT_MODULE_ID as BRIDGE_LAYOUT_MODULE_KEY };
