/**
 * Apollo Step 4-A workflow control — frozen types.
 *
 * Workflow is the *control plane*; existing detail panels remain work surfaces.
 * All step statuses are DERIVED from current project data + checksums. Only
 * WF-15 user acknowledgment is optionally persisted (localStorage, checksum-bound).
 *
 * Development-only: NOT FOR DESIGN OR CONSTRUCTION.
 * NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED
 */

export const WORKFLOW_STATE_SCHEMA_VERSION = 1 as const;

export const WORKFLOW_REVISION = "2026-08-A" as const;

export type WorkflowStepId =
  | "WF-01"
  | "WF-02"
  | "WF-03"
  | "WF-04"
  | "WF-05"
  | "WF-06"
  | "WF-07"
  | "WF-08"
  | "WF-09"
  | "WF-10"
  | "WF-11"
  | "WF-12"
  | "WF-13"
  | "WF-14"
  | "WF-15";

export const WORKFLOW_STEP_IDS: readonly WorkflowStepId[] = [
  "WF-01",
  "WF-02",
  "WF-03",
  "WF-04",
  "WF-05",
  "WF-06",
  "WF-07",
  "WF-08",
  "WF-09",
  "WF-10",
  "WF-11",
  "WF-12",
  "WF-13",
  "WF-14",
  "WF-15",
] as const;

/**
 * Base lifecycle status (primary badge).
 * Priority (highest wins): ERROR > BLOCKED > STALE > INCOMPLETE > WARNING >
 * NOT_AUTHORIZED > RECOMMENDED > AVAILABLE > READY > COMPLETE > NOT_STARTED >
 * OUT_OF_SCOPE
 */
export type WorkflowStatus =
  | "NOT_STARTED"
  | "AVAILABLE"
  | "RECOMMENDED"
  | "INCOMPLETE"
  | "BLOCKED"
  | "READY"
  | "STALE"
  | "WARNING"
  | "ERROR"
  | "COMPLETE"
  | "NOT_AUTHORIZED"
  | "OUT_OF_SCOPE";

/**
 * Secondary badges expressed alongside the primary status (e.g. COMPLETE +
 * NOT_AUTHORIZED). NOT_AUTHORIZED is always a badge, never a status that
 * overrides COMPLETE.
 */
export type WorkflowBadge =
  | "NOT_AUTHORIZED"
  | "WARNING"
  | "STALE"
  | "LOCAL_CRS_LEGACY"
  | "CAPABILITY_PLANNED"
  | "PARTIAL"
  | "DEVELOPMENT_ONLY"
  | "3D_DIMENSION_PLANNED"
  | "OUT_OF_SCOPE";

export type WorkflowGroup = "geometry" | "loads" | "analysis" | "outputs" | "governance";

export type WorkflowCapabilityStatus =
  | "IMPLEMENTED"
  | "PARTIAL"
  | "PLANNED"
  | "UNAVAILABLE"
  | "OUT_OF_SCOPE";

export type WorkflowDiagnosticCode =
  | "WF_INPUT_MISSING"
  | "WF_INPUT_INVALID"
  | "WF_PREREQUISITE_INCOMPLETE"
  | "WF_RESULT_NOT_GENERATED"
  | "WF_RESULT_STALE"
  | "WF_CHECKSUM_MISMATCH"
  | "WF_SOURCE_MISSING"
  | "WF_SOURCE_DELETED"
  | "WF_CAPABILITY_PLANNED"
  | "WF_CAPABILITY_UNAVAILABLE"
  | "WF_UNSUPPORTED_SCOPE"
  | "WF_EXECUTION_ERROR"
  | "WF_NOT_AUTHORIZED"
  | "WF_LOCAL_CRS_WARNING"
  | "WF_PARTIAL_SCOPE_WARNING"
  | "WF_3D_DIMENSION_PLANNED"
  | "WF_STEP_4_C_INTEGRATION_PENDING"
  | "WF_STEP_4_G_REINTEGRATION_PENDING";

export type DiagnosticSeverity = "error" | "warning" | "info";

export type NavigationTarget = {
  readonly kind: "route" | "panel";
  readonly path: string;
  readonly label: string;
};

export type PrimaryActionId =
  | "open-step"
  | "generate-structure"
  | "regenerate"
  | "run-analysis"
  | "open-checklist"
  | "export"
  | "review-3d"
  | "none";

export type WorkflowStepDefinition = {
  readonly workflowStepId: WorkflowStepId;
  readonly label: string;
  readonly group: WorkflowGroup;
  readonly order: number;
  readonly prerequisites: readonly WorkflowStepId[];
  readonly capabilityKey: string;
  readonly supportedScope: string;
  readonly navigationTarget: NavigationTarget;
  readonly primaryActionId: PrimaryActionId;
  readonly completionCriterion: string;
};

export type WorkflowDiagnostic = {
  readonly diagnosticId: string;
  readonly workflowStepId: WorkflowStepId;
  readonly severity: DiagnosticSeverity;
  readonly code: WorkflowDiagnosticCode;
  readonly message: string;
  readonly technicalDetail: string;
  readonly blocking: boolean;
  readonly source: string;
  readonly remediation: string;
  readonly navigationTarget: NavigationTarget | null;
};

export type WorkflowStepState = {
  readonly workflowStepId: WorkflowStepId;
  readonly status: WorkflowStatus;
  readonly badges: readonly WorkflowBadge[];
  readonly capabilityStatus: WorkflowCapabilityStatus;
  readonly prerequisitesSatisfied: boolean;
  readonly completionSatisfied: boolean;
  readonly isRecommended: boolean;
  readonly currentRevision: string | null;
  readonly generatedRevision: string | null;
  readonly currentChecksum: string | null;
  readonly generatedChecksum: string | null;
  readonly diagnostics: readonly WorkflowDiagnostic[];
  readonly warnings: readonly WorkflowDiagnostic[];
  readonly definition: WorkflowStepDefinition;
  readonly recommendedAction: string | null;
  readonly evaluatedAt: string;
};

export type WorkflowProgress = {
  readonly total: number;
  readonly complete: number;
  readonly actionable: number;
  readonly blocked: number;
  readonly stale: number;
  readonly error: number;
  readonly notAuthorized: number;
  readonly notStarted: number;
  readonly ready: number;
  readonly outOfScope: number;
};

export type WorkflowAuthorizationSummary = {
  readonly numericDesignAuthorization: "NOT_GRANTED";
  readonly formalReleaseReadiness: "NO_GO_PENDING_HUMAN_VALIDATION";
  readonly designOrConstructionUse: "PROHIBITED";
};

export type WorkflowStateModel = {
  readonly schemaVersion: typeof WORKFLOW_STATE_SCHEMA_VERSION;
  readonly workflowRevision: typeof WORKFLOW_REVISION;
  readonly projectId: string;
  readonly evaluatedAt: string;
  readonly steps: readonly WorkflowStepState[];
  readonly currentRecommendedStepId: WorkflowStepId | null;
  readonly progress: WorkflowProgress;
  readonly diagnostics: readonly WorkflowDiagnostic[];
  readonly authorizationSummary: WorkflowAuthorizationSummary;
};
