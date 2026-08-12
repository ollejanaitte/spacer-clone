/**
 * Superstructure module (Phase 5-02 WP-A).
 *
 * Registers the superstructure module record + public exports for the
 * SuperstructureDocument in the Project Data Core.
 */

import type { ModuleDataRecord } from "./contract";
import { createInitialModuleData } from "./contract";
import { registerModuleValidator } from "./validation";
import type { SuperstructureModuleData } from "./superstructure/superstructureTypes";
import { SUPERSTRUCTURE_MODULE_ID } from "./superstructure/superstructureTypes";
import { validateSuperstructureData, isSuperstructureData } from "./superstructure/superstructureValidation";

export { SUPERSTRUCTURE_MODULE_ID, SUPERSTRUCTURE_SCHEMA_VERSION, SUPERSTRUCTURE_DATA_VERSION } from "./superstructure/superstructureTypes";
export type {
  SuperstructureDocument,
  SuperstructureModuleData,
  SuperstructureIssue,
  SuperstructureDocumentStatus,
  BridgeLayoutReference,
  RoadReference,
  SpanHandoffItem,
  SpanReferences,
  SupportHandoffItem,
  SupportReferences,
  StructuralSystem,
  GirderLine,
  GirderSectionModel,
  GirderConfiguration,
  DeckConfiguration,
  CrossBeam,
  CrossBeamConfiguration,
  CrossFrameConfiguration,
  BearingRelation,
  BearingSeat,
  BearingConfiguration,
  GeometryReference,
  DeadLoads,
  DeadLoadEntry,
  LoadModel,
  AnalysisModel,
  DesignCheckResult,
  DesignResults,
  ReactionCase,
  ReactionResults,
} from "./superstructure/superstructureTypes";
export {
  validateSuperstructureDocument,
  validateSuperstructureData,
  parseSuperstructureDocument,
} from "./superstructure/superstructureValidation";
export {
  superstructureDocumentIdFor,
  createEmptySuperstructureDocument,
  deriveGirderOffsets,
  buildSuperstructureDocument,
  attachSuperstructureHandoffs,
} from "./superstructure/superstructureDocumentDomain";
export { buildSuperstructureFacts } from "./superstructure/superstructureFacts";
export type { SuperstructureFacts, SuperstructureFactsResult } from "./superstructure/superstructureFacts";
export { buildSuperstructureGeometryInput, SUPER_BINDING_CODES } from "./superstructure/superstructureBindingNew";
export type { SuperstructureGeometryInputOptions } from "./superstructure/superstructureBindingNew";
export {
  buildLinerIntermediateFromRoad,
  generateSuperstructureSnapshot,
  withGeometryReference,
  toVerticalElementDraft,
  toVerticalAlignmentDraft,
} from "./superstructure/superstructureGeometry";
export type { GenerateSnapshotResult, RoadModuleInputs } from "./superstructure/superstructureGeometry";
export {
  computeSuperstructureSectionProperties,
  buildCrossBeamConfiguration,
  buildCrossFrameConfiguration,
  buildBearingConfiguration,
} from "./superstructure/superstructureComponents";
export type { SupportStation } from "./superstructure/superstructureComponents";
export {
  buildSuperstructureSceneGroup,
  addSuperstructureToScene,
} from "./superstructure/superstructureSceneBuilder";
export type { SuperstructureSceneBuildResult } from "./superstructure/superstructureSceneBuilder";
export {
  buildDeadLoads,
  buildLoadModel,
  comboOneTotalKN,
  bridgeLengthMFromSpans,
  STEEL_UNIT_WEIGHT_KN_M3,
} from "./superstructure/superstructureLoadModel";

export function createSuperstructureData(): SuperstructureModuleData {
  return { superstructureDocument: undefined };
}

export function createSuperstructureModuleRecord(): ModuleDataRecord {
  return {
    ...createInitialModuleData(),
    data: { ...createSuperstructureData() } as SuperstructureModuleData as unknown as Record<string, unknown>,
  };
}

registerModuleValidator(SUPERSTRUCTURE_MODULE_ID, validateSuperstructureData);

export { SUPERSTRUCTURE_MODULE_ID as SUPERSTRUCTURE_MODULE_KEY };
