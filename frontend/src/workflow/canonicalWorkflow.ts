/**
 * Lane U Wave 1: Canonical Workflow definition.
 *
 * The single source of truth for the 10-step business workflow (see
 * docs/development/canonical-workflow.md). Pure data + pure functions so it
 * can be exercised by FAST tests (test:fast) and consumed by the UI skeleton.
 *
 * Design rules:
 * - Never create a new project store here; the workflow only references
 *   existing canonical entry routes and describes each step's handover.
 * - `connectionStatus` is one of:
 *   - "connected": an existing screen/route entry is available.
 *   - "partial":   an entry exists but is not fully workflow-connected
 *                  (modal-only / feature-flag gated / dedicated page missing).
 *   - "pending":   no entry yet (later wave / owning lane required).
 */

import {
  APP_SHELL_PATH,
  MAIN3D_PATH,
  PROJECT_SELECTION_PATH,
  ROAD_DESIGN_PATH,
  SITE_CONTEXT_ROUTE_PATH,
  SUBSTRUCTURE_DESIGN_PATH,
  SUPERSTRUCTURE_DESIGN_PATH,
} from "./routes";

export const CANONICAL_WORKFLOW_STEP_IDS = [
  "project",
  "siteContext",
  "road",
  "bridgePlacement",
  "superstructure",
  "substructure",
  "analysis",
  "main3d",
  "deliverables",
  "saveClose",
] as const;

export type CanonicalWorkflowStepId = (typeof CANONICAL_WORKFLOW_STEP_IDS)[number];

export type WorkflowConnectionStatus = "connected" | "partial" | "pending";

export interface CanonicalWorkflowStep {
  readonly id: CanonicalWorkflowStepId;
  readonly order: number;
  /** Canonical entry route. `null` when the workflow entry is not determined. */
  readonly route: string | null;
  readonly connectionStatus: WorkflowConnectionStatus;
  /** Owning lane / subsystem for this step. */
  readonly ownerLane: string;
  /** What this step carries forward on the shared SPACER Project. */
  readonly projectHandover: string;
}

export const CANONICAL_WORKFLOW: readonly CanonicalWorkflowStep[] = [
  {
    id: "project",
    order: 1,
    route: PROJECT_SELECTION_PATH,
    connectionStatus: "connected",
    ownerLane: "U (entry) / A (persistence) / Design Platform",
    projectHandover: "project.id / project.name / design stage; runtime project state in App",
  },
  {
    id: "siteContext",
    order: 2,
    route: SITE_CONTEXT_ROUTE_PATH,
    connectionStatus: "partial",
    ownerLane: "U (entry) / B (adapter) / T (terrain/CRS/DEM) / V (display)",
    projectHandover: "coordinateContexts / terrain / selectionArea / sources / existingConditions (mapped into terrain module + metadata)",
  },
  {
    id: "road",
    order: 3,
    route: ROAD_DESIGN_PATH,
    connectionStatus: "connected",
    ownerLane: "existing LINER subsystem",
    projectHandover: "liner sidecar (roadDesignDocument / domainDraft)",
  },
  {
    id: "bridgePlacement",
    order: 4,
    route: APP_SHELL_PATH,
    connectionStatus: "partial",
    ownerLane: "existing BridgeWizard / BridgeProject",
    projectHandover: "bridge placement / span division feeding superstructure + substructure",
  },
  {
    id: "superstructure",
    order: 5,
    route: SUPERSTRUCTURE_DESIGN_PATH,
    connectionStatus: "partial",
    ownerLane: "existing Apollo subsystem",
    projectHandover: "apolloPhase1Unit2 / apolloBsdd / apolloBridgeProjectSuperstructure sidecars",
  },
  {
    id: "substructure",
    order: 6,
    route: SUBSTRUCTURE_DESIGN_PATH,
    connectionStatus: "partial",
    ownerLane: "existing Substructure subsystem",
    projectHandover: "substructure supports (standalone AdapterEnvelope today; Project embed is a Phase A known exception)",
  },
  {
    id: "analysis",
    order: 7,
    route: APP_SHELL_PATH,
    connectionStatus: "connected",
    ownerLane: "existing FEM / Analysis subsystem",
    projectHandover: "analysisResults sidecar + in-memory result",
  },
  {
    id: "main3d",
    order: 8,
    route: MAIN3D_PATH,
    connectionStatus: "partial",
    ownerLane: "existing Main3D / Viewer3D (V: unified viewer pending)",
    projectHandover: "display-only / output model (STL / DXF)",
  },
  {
    id: "deliverables",
    order: 9,
    route: APP_SHELL_PATH,
    connectionStatus: "partial",
    ownerLane: "existing exports / LINER drawing / apollo artifact",
    projectHandover: "output artifacts (outside the Project)",
  },
  {
    id: "saveClose",
    order: 10,
    route: APP_SHELL_PATH,
    connectionStatus: "connected",
    ownerLane: "A (canonical save/load/migration) / desktop / Electron",
    projectHandover: "persisted project.json (canonical save/load)",
  },
];

const byId = new Map<CanonicalWorkflowStepId, CanonicalWorkflowStep>(
  CANONICAL_WORKFLOW.map((step) => [step.id, step]),
);

export function canonicalWorkflowSteps(): readonly CanonicalWorkflowStep[] {
  return CANONICAL_WORKFLOW;
}

export function resolveWorkflowStep(id: CanonicalWorkflowStepId): CanonicalWorkflowStep | null {
  return byId.get(id) ?? null;
}

export function isCanonicalWorkflowStepId(value: string): value is CanonicalWorkflowStepId {
  return (CANONICAL_WORKFLOW_STEP_IDS as readonly string[]).includes(value);
}

export function isWorkflowConnected(id: CanonicalWorkflowStepId): boolean {
  const step = byId.get(id);
  return step !== undefined && step.connectionStatus === "connected";
}

/**
 * Whether a workflow step's entry button should be enabled.
 * Pending steps (no route yet) are shown disabled until the owning lane
 * provides an entry. Partial steps keep their existing fallback route.
 */
export function isWorkflowStepEntryEnabled(step: CanonicalWorkflowStep): boolean {
  return step.route !== null && step.connectionStatus !== "pending";
}

export interface WorkflowNavigation {
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
  readonly prev: CanonicalWorkflowStepId | null;
  readonly next: CanonicalWorkflowStepId | null;
  readonly index: number;
}

/** Guided ordering (prev / next). Free navigation is retained elsewhere. */
export function resolveWorkflowNavigation(id: CanonicalWorkflowStepId): WorkflowNavigation {
  const index = CANONICAL_WORKFLOW_STEP_IDS.indexOf(id);
  if (index === -1) {
    return { hasPrev: false, hasNext: false, prev: null, next: null, index: -1 };
  }
  const prev = index > 0 ? CANONICAL_WORKFLOW_STEP_IDS[index - 1]! : null;
  const next =
    index < CANONICAL_WORKFLOW_STEP_IDS.length - 1 ? CANONICAL_WORKFLOW_STEP_IDS[index + 1]! : null;
  return {
    hasPrev: prev !== null,
    hasNext: next !== null,
    prev,
    next,
    index,
  };
}

/** 1-based progress position for the current step. */
export function workflowProgress(id: CanonicalWorkflowStepId): number {
  const index = CANONICAL_WORKFLOW_STEP_IDS.indexOf(id);
  return index === -1 ? 0 : index + 1;
}

export const CANONICAL_WORKFLOW_TOTAL_STEPS = CANONICAL_WORKFLOW_STEP_IDS.length;