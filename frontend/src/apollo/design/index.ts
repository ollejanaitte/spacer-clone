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
export {
  RB001_DECLARED_CHECKS,
  runChecks,
  type CheckKind,
  type DeclaredCheck,
} from "./checkFramework";
export {
  RB001_SECTION_CANDIDATES,
  runDesignIteration,
  type DesignIteration,
  type DesignIterationState,
  type SectionCandidate,
} from "./autoDesign";
export {
  outputFileName,
  quantityRowsFromSnapshot,
  reportSectionsFromDesignResult,
  type QuantityRow,
  type ReportSectionSkeleton,
} from "./designOutput";
