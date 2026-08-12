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
  AbutmentPlacementCandidate,
  PierPlacement,
  PierPlacementCandidate,
  SkewSource,
  BridgeSpan,
  SkewConfig,
} from "./bridgeLayout/bridgeLayoutTypes";
export { createEmptyBridgeLayoutDocument, createBridgeLayoutData, isBridgeLayoutData } from "./bridgeLayout/bridgeLayoutTypes";
export { validateBridgeLayoutDocument, validateBridgeLayoutData, parseBridgeLayoutDocument, createValidationState } from "./bridgeLayout/bridgeLayoutValidation";
export { resolveBridgeLayoutReferences } from "./bridgeLayout/bridgeLayoutReferences";
export type { BridgeLayoutReferenceResolution } from "./bridgeLayout/bridgeLayoutReferences";
export {
  readRoadAlignmentContext,
  buildRoadAlignmentContextFromInputs,
  computeBridgeLength,
  validateBridgeRangeInput,
  buildBridgeLayoutFromRange,
  applyBridgeRangeToDocument,
} from "./bridgeLayout/bridgeLayoutDomain";
export type { RoadAlignmentContext, BuildBridgeRangeResult, ValidateBridgeRangeInput } from "./bridgeLayout/bridgeLayoutDomain";
export {
  computeAbutmentPlacementCandidate,
  computePierPlacementCandidate,
  defaultAutomaticSkew,
  refreshPierPlacements,
  lookupTerrainElevation,
  getProjectTerrainGrid,
  computeBridgeRangeBBox,
  computePierRangeBBox,
  isExistingNearRange,
  collectExistingNearRange,
  assembleBridgeLayoutView,
} from "./bridgeLayout/bridgeLayoutPlacement";
export type {
  ComputeCandidateInput,
  ComputeCandidateResult,
  AbutmentCandidateView,
  PierCandidateView,
  BridgeLayoutView,
  BridgeLayoutTerrainView,
  BridgeLayoutExistingView,
  BridgeRangeBBox,
} from "./bridgeLayout/bridgeLayoutPlacement";
export {
  listOrderedSupports,
  nextPierId,
  addPier,
  removePier,
  updatePierStation,
  updatePierSkew,
  validatePierConfiguration,
} from "./bridgeLayout/bridgeLayoutPiers";
export type { OrderedSupport, AddPierInput } from "./bridgeLayout/bridgeLayoutPiers";
export { generateSpans, validateSpanConfiguration, describeSpans } from "./bridgeLayout/bridgeLayoutSpans";
export type { ValidateSpanConfigurationInput } from "./bridgeLayout/bridgeLayoutSpans";
export { buildSupportHandoff, SUPPORT_HANDOFF_SCHEMA_VERSION } from "./bridgeLayout/bridgeLayoutSupportHandoff";
export type { SupportHandoff, SupportHandoffItem, SupportHandoffResult } from "./bridgeLayout/bridgeLayoutSupportHandoff";
export { buildSpanHandoff, SPAN_HANDOFF_SCHEMA_VERSION } from "./bridgeLayout/bridgeLayoutSpanHandoff";
export type { SpanHandoff, SpanHandoffItem, SpanHandoffResult } from "./bridgeLayout/bridgeLayoutSpanHandoff";
export { runBridgeLayoutIntegrityGate } from "./bridgeLayout/bridgeLayoutIntegrityGate";
export type { BridgeLayoutIntegrityResult } from "./bridgeLayout/bridgeLayoutIntegrityGate";

export function createBridgeLayoutModuleRecord(): ModuleDataRecord {
  return {
    ...createInitialModuleData(),
    data: { ...createBridgeLayoutData() } as BridgeLayoutModuleData as unknown as Record<string, unknown>,
  };
}

export { BRIDGE_LAYOUT_MODULE_ID as BRIDGE_LAYOUT_MODULE_KEY };
