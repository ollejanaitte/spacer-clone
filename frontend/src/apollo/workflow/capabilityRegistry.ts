/**
 * Step 4-A capability registry.
 *
 * FUTURE capabilities are NEVER reported as AVAILABLE/COMPLETE. PLANNED steps
 * evaluate to BLOCKED with a stable diagnostic (WF_CAPABILITY_PLANNED).
 * OUT_OF_SCOPE is reserved for project-type / geometry scope rejection, not for
 * simple "not yet implemented".
 */

import type {
  WorkflowCapabilityStatus,
  WorkflowDiagnosticCode,
  WorkflowStepId,
} from "./types";

export type WorkflowCapability = {
  readonly capabilityKey: string;
  readonly stepId: WorkflowStepId;
  readonly status: WorkflowCapabilityStatus;
  readonly implementedInStep: string | null;
  readonly note: string;
  /** If true, this capability is a binding prerequisite that is NOT gating yet. */
  readonly gatingGuard: "ACTIVE" | "PENDING_FUTURE_STEP";
};

export const WORKFLOW_CAPABILITIES: readonly WorkflowCapability[] = [
  {
    capabilityKey: "alignment-binding",
    stepId: "WF-01",
    status: "PLANNED",
    implementedInStep: "Step 4-E",
    note: "LINER/道路線形 binding。Step 4-E 実装待ち。local CRS で互換運用。",
    gatingGuard: "PENDING_FUTURE_STEP",
  },
  {
    capabilityKey: "bridge-structure-input",
    stepId: "WF-02",
    status: "IMPLEMENTED",
    implementedInStep: "Step 2-A",
    note: "BridgeStructureInputPanel で canonical input。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "appurtenance-input",
    stepId: "WF-03",
    status: "IMPLEMENTED",
    implementedInStep: "Step 4-B",
    note: "床版・橋面付属物 (curb/railing/median)。presence と canonical input。3D/数量/荷重は Step 4-C。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "section-input",
    stepId: "WF-04",
    status: "IMPLEMENTED",
    implementedInStep: "Step 2-A",
    note: "主桁断面諸量 (girderDepth/flanges/web) は bridge structure input に含む。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "haunch-input",
    stepId: "WF-05",
    status: "IMPLEMENTED",
    implementedInStep: "Step 4-B",
    note: "ハンチ canonical input。空 haunches:[] は COMPLETE と解釈しない（EXPLICIT_NONE と区別）。3D/数量は Step 4-C。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "splice-input",
    stepId: "WF-06",
    status: "PLANNED",
    implementedInStep: "Step 4-D",
    note: "添接・フィラー canonical input。Step 4-D 実装待ち。splices:[] は COMPLETE と解釈しない。",
    gatingGuard: "PENDING_FUTURE_STEP",
  },
  {
    capabilityKey: "load-confirmation",
    stepId: "WF-07",
    status: "PARTIAL",
    implementedInStep: "Step 2-C (development loads)",
    note: "荷重確認。構造から派生する development 荷重のみ。付属物/ハンチ/添接荷重は将来。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "analysis",
    stepId: "WF-08",
    status: "PARTIAL",
    implementedInStep: "Step 1-C (development probe)",
    note: "解析は development probe (GOLD-AN-001/002)。結果は永続化されない。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "demand-check",
    stepId: "WF-09",
    status: "PARTIAL",
    implementedInStep: "Step 1-D (development candidate)",
    note: "候補照査は development candidate。formal OK/NG は出さない。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "quantity-model",
    stepId: "WF-10",
    status: "IMPLEMENTED",
    implementedInStep: "Step 2-B",
    note: "概算数量モデル (revision/checksum 付き)。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "model-view",
    stepId: "WF-11",
    status: "IMPLEMENTED",
    implementedInStep: "Step 2-C (3D solids)",
    note: "3D モデル表示。dimension overlay は Step 4-F (PLANNED) で分離診断。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "report-model",
    stepId: "WF-12",
    status: "IMPLEMENTED",
    implementedInStep: "Step 2-D",
    note: "計算書モデル (revision/checksum 付き)。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "drawing-set",
    stepId: "WF-13",
    status: "IMPLEMENTED",
    implementedInStep: "Step 3-D",
    note: "標準断面 + GA 図面一式 (DrawingSet)。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "output-integration",
    stepId: "WF-14",
    status: "IMPLEMENTED",
    implementedInStep: "Step 3-E",
    note: "成果物統合 (OutputIntegrationPanel)。STALE guard は既存を正本とする。",
    gatingGuard: "ACTIVE",
  },
  {
    capabilityKey: "user-acknowledgment",
    stepId: "WF-15",
    status: "IMPLEMENTED",
    implementedInStep: "Step 3-E (checklist)",
    note: "ユーザー確認。human validation は自動で PASS にしない。",
    gatingGuard: "ACTIVE",
  },
] as const;

export function getWorkflowCapability(stepId: WorkflowStepId): WorkflowCapability {
  const capability = WORKFLOW_CAPABILITIES.find((entry) => entry.stepId === stepId);
  if (!capability) {
    throw new Error(`Unknown workflow capability for step: ${stepId}`);
  }
  return capability;
}

export function capabilityDiagnosticCode(status: WorkflowCapabilityStatus): WorkflowDiagnosticCode | null {
  if (status === "PLANNED") return "WF_CAPABILITY_PLANNED";
  if (status === "UNAVAILABLE") return "WF_CAPABILITY_UNAVAILABLE";
  if (status === "OUT_OF_SCOPE") return "WF_UNSUPPORTED_SCOPE";
  return null;
}

/** Steps whose capability is a planned future stub and therefore does NOT gate downstream yet. */
export function isFutureCapability(stepId: WorkflowStepId): boolean {
  return getWorkflowCapability(stepId).gatingGuard === "PENDING_FUTURE_STEP";
}
