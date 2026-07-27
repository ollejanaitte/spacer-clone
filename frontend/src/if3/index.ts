export {
  INTERIM_PROJECT_MODEL_BFAD_NAMESPACE,
  INTERIM_SOURCE_DOCUMENT_REVISION,
  IF3_SOLVER_NAME,
  IF3_SOLVER_VERSION,
  resolveProjectModelSourceDocument,
  type ProjectModelSourceDocument,
} from "./projectModelSourceBinding";

export {
  buildRunAnalysisIf3Metadata,
  type RunAnalysisIf3LoadContext,
  type RunAnalysisIf3LoadContextEntry,
  type RunAnalysisIf3Metadata,
} from "./buildRunAnalysisIf3Metadata";

export {
  assertAuthoritativeIf3Binding,
  assertBindingAgainstProject,
  evaluateBindingAgainstProject,
  RunAnalysisIf3BindingError,
  validateRunAnalysisIf3Metadata,
  type RunAnalysisIf3BindingValidationResult,
} from "./runAnalysisBindingGuard";

export {
  denyLegacyOpenResultPdfReport,
  legacyPdfBypassBlockedMessage,
} from "./legacyPdfBypassGuard";
