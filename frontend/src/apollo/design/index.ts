/**
 * Superstructure design engine framework (Phase 7).
 */
export {
  RB001_DESIGN_CONDITIONS,
  type DesignConditions,
  type DesignStandardProfile,
} from "./designConditions";
export {
  buildGrillageModel,
  GRILLAGE_STEEL_MATERIAL,
  type GrillageMember,
  type GrillageModel,
  type GrillageNode,
  type GrillageSupport,
} from "./grillageModel";
export {
  emptyNotAuthorizedResult,
  type DesignAuthorization,
  type DesignCheckPart,
  type DesignResult,
} from "./designResult";
