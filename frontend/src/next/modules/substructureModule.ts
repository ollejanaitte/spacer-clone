/**
 * Substructure module (Phase 6-02 WP-A).
 *
 * Registers the substructure module record + public exports for the
 * SubstructureDocument in the Project Data Core.
 */

import type { ModuleDataRecord } from "./contract";
import { createInitialModuleData } from "./contract";
import { registerModuleValidator } from "./validation";
import type { SubstructureModuleData } from "./substructure/substructureTypes";
import { SUBSTRUCTURE_MODULE_ID } from "./substructure/substructureTypes";
import { validateSubstructureData, isSubstructureData } from "./substructure/substructureValidation";

export { SUBSTRUCTURE_MODULE_ID, SUBSTRUCTURE_SCHEMA_VERSION, SUBSTRUCTURE_DATA_VERSION } from "./substructure/substructureTypes";
export type {
  SubstructureDocument,
  SubstructureModuleData,
  SubstructureIssue,
  SubstructureStatus,
  BridgeLayoutReference,
  SuperstructureReference,
  RoadReference,
  SupportReferences,
  SupportHandoffItem,
  BearingReactionReferences,
  BearingSeatReference,
  ReactionCaseReference,
  FootingConfiguration,
  FoundationConfiguration,
  PileConfiguration,
  SubstructureSupport,
  TerrainReferences,
  ExistingReferences,
  GeometryReference,
  DesignInputs,
  DesignResults,
  QuantityResults,
} from "./substructure/substructureTypes";
export {
  validateSubstructureDocument,
  validateSubstructureData,
  parseSubstructureDocument,
} from "./substructure/substructureValidation";
export {
  substructureDocumentIdFor,
  createEmptySubstructureDocument,
  buildSubstructureDocument,
  attachSubstructureHandoffs,
} from "./substructure/substructureDocumentDomain";

export function createSubstructureData(): SubstructureModuleData {
  return { substructureDocument: undefined };
}

export function createSubstructureModuleRecord(): ModuleDataRecord {
  return {
    ...createInitialModuleData(),
    data: { ...createSubstructureData() } as SubstructureModuleData as unknown as Record<string, unknown>,
  };
}

registerModuleValidator(SUBSTRUCTURE_MODULE_ID, validateSubstructureData);

export { SUBSTRUCTURE_MODULE_ID as SUBSTRUCTURE_MODULE_KEY };

export {
  buildSupportPlacementFromHandoff,
  attachPhase4ToDocument,
  SubstructurePhase4AdapterError,
} from "./substructure/substructurePhase4Adapter";
export type { Phase4AdapterResult } from "./substructure/substructurePhase4Adapter";

export {
  buildBearingReactionFromHandoff,
  attachPhase5ToDocument,
  mapCombinationToCaseKind,
  normalizeSeatId,
} from "./substructure/substructurePhase5Adapter";
export type { Phase5AdapterResult } from "./substructure/substructurePhase5Adapter";

export {
  buildSubstructurePlacement,
  applySubstructurePlacement,
} from "./substructure/substructurePlacement";
export type { PlacementResult } from "./substructure/substructurePlacement";

export {
  validateSubstructureShapes,
  buildSubstructureSolids,
  buildGeometrySupports,
} from "./substructure/substructureGeometry";

export {
  computeFoundationElevations,
  computePileTip,
  buildPileArrangement,
  validateFoundationData,
} from "./substructure/substructureFoundation";
export type { DerivedFoundationElevations } from "./substructure/substructureFoundation";
