/**
 * Step 4-A status evaluators (pure).
 *
 * Base lifecycle status + badges. Derived from current data/checksums only.
 * Never persisted; never manually overridden (WARNING dismissal aside).
 */

import { getWorkflowCapability } from "./capabilityRegistry";
import { getWorkflowStepDefinition } from "./registry";
import type {
  DiagnosticSeverity,
  WorkflowBadge,
  WorkflowCapabilityStatus,
  WorkflowDiagnostic,
  WorkflowDiagnosticCode,
  WorkflowStepId,
  WorkflowStatus,
} from "./types";
import type { StepEvidence } from "./selectors";

export type EvaluateStepParams = {
  readonly stepId: WorkflowStepId;
  readonly evidence: StepEvidence;
  readonly prerequisitesSatisfied: boolean;
};

export type EvaluateStepResult = {
  readonly status: WorkflowStatus;
  readonly badges: readonly WorkflowBadge[];
  readonly diagnostics: readonly WorkflowDiagnostic[];
  readonly warnings: readonly WorkflowDiagnostic[];
};

export type BaseStatusResolvable = {
  readonly status: WorkflowStatus;
  readonly badges: readonly WorkflowBadge[];
};

export function isActionableBaseStatus(status: WorkflowStatus): boolean {
  return status === "AVAILABLE" || status === "READY" || status === "INCOMPLETE" || status === "STALE";
}

function diagnostic(
  stepId: WorkflowStepId,
  code: WorkflowDiagnosticCode,
  severity: DiagnosticSeverity,
  message: string,
  detail: string,
  blocking: boolean,
  remediation: string,
): WorkflowDiagnostic {
  return {
    diagnosticId: `DIAG-${stepId}-${code}`,
    workflowStepId: stepId,
    severity,
    code,
    message,
    technicalDetail: detail,
    blocking,
    source: "frontend/src/apollo/workflow/evaluators.ts",
    remediation,
    navigationTarget: null,
  };
}

export function resolveBaseStatus(
  stepId: WorkflowStepId,
  evidence: StepEvidence,
  prerequisitesSatisfied: boolean,
): BaseStatusResolvable {
  const capability = evidence.capability;

  if (capability === "OUT_OF_SCOPE") {
    return { status: "OUT_OF_SCOPE", badges: ["OUT_OF_SCOPE"] };
  }
  if (evidence.corrupted) {
    return { status: "ERROR", badges: [] };
  }
  if (capability === "PLANNED" || capability === "UNAVAILABLE") {
    return {
      status: "BLOCKED",
      badges: ["CAPABILITY_PLANNED", ...(stepId === "WF-01" ? (["LOCAL_CRS_LEGACY"] as const) : [])],
    };
  }
  if (!prerequisitesSatisfied) {
    return { status: "NOT_STARTED", badges: [] };
  }
  if (evidence.diagnostics.some((entry) => entry.blocking)) {
    return { status: "BLOCKED", badges: [] };
  }
  if (evidence.inputState === "INVALID") {
    return { status: "BLOCKED", badges: [] };
  }
  if (evidence.resultState === "STALE") {
    return { status: "STALE", badges: ["STALE"] };
  }
  if (evidence.complete) {
    return { status: "COMPLETE", badges: ["NOT_AUTHORIZED", "DEVELOPMENT_ONLY"] };
  }
  if (evidence.inputState === "PARTIAL") {
    return { status: "INCOMPLETE", badges: [] };
  }
  if (evidence.inputState === "VALID" && evidence.resultState === "NOT_GENERATED") {
    return { status: "READY", badges: [] };
  }
  if (evidence.inputState === "EMPTY") {
    return { status: "AVAILABLE", badges: [] };
  }
  if (evidence.inputState === "NONE") {
    return { status: "NOT_STARTED", badges: [] };
  }
  return { status: "AVAILABLE", badges: [] };
}

function capabilityDiagnostics(evidence: StepEvidence): readonly WorkflowDiagnostic[] {
  const capability = evidence.capability;
  const stepId = evidence.workflowStepId;
  if (capability === "PLANNED") {
    const cap = getWorkflowCapability(stepId);
    return [
      diagnostic(
        stepId,
        "WF_CAPABILITY_PLANNED",
        "error",
        "この工程は将来工程（STUB）です。現在は利用できません。",
        `implementedIn=${cap.implementedInStep ?? "TBD"}`,
        true,
        `${cap.implementedInStep ?? "今後のStep"} 実装後に評価が有効になります。`,
      ),
    ];
  }
  if (capability === "UNAVAILABLE") {
    return [
      diagnostic(
        stepId,
        "WF_CAPABILITY_UNAVAILABLE",
        "error",
        "この工程は現在利用できません。",
        "capability=UNAVAILABLE",
        true,
        "実装計画を確認してください。",
      ),
    ];
  }
  if (capability === "OUT_OF_SCOPE") {
    return [
      diagnostic(
        stepId,
        "WF_UNSUPPORTED_SCOPE",
        "error",
        "この工程は対象プロジェクトの範囲外です。",
        "capability=OUT_OF_SCOPE",
        true,
        "サポート外の入力です。",
      ),
    ];
  }
  return [];
}

export function buildStepDiagnostics(
  stepId: WorkflowStepId,
  evidence: StepEvidence,
  prerequisitesSatisfied: boolean,
): { readonly diagnostics: readonly WorkflowDiagnostic[]; readonly warnings: readonly WorkflowDiagnostic[] } {
  const diagnostics: WorkflowDiagnostic[] = [...evidence.diagnostics];
  const warnings: WorkflowDiagnostic[] = [...evidence.warnings];

  if (evidence.corrupted) {
    diagnostics.push(
      diagnostic(
        stepId,
        "WF_EXECUTION_ERROR",
        "error",
        "永続化データの破損により状態を評価できません。",
        "parseBridgeStructureInputDraft returned null",
        true,
        "入力データを修復するか、再入力をしてください。",
      ),
    );
  }

  diagnostics.push(...capabilityDiagnostics(evidence));

  if (!prerequisitesSatisfied && !isPlannedCapability(evidence.capability)) {
    warnings.push(
      diagnostic(
        stepId,
        "WF_PREREQUISITE_INCOMPLETE",
        "info",
        "先行工程が未完了のため、この工程は未着手です。",
        `activePrerequisites not satisfied`,
        false,
        "先行工程（dependencies）を先に進めてください。",
      ),
    );
  }

  if (evidence.inputState === "INVALID") {
    diagnostics.push(
      diagnostic(
        stepId,
        "WF_INPUT_INVALID",
        "error",
        "入力値に不整合があります。修正してください。",
        "inputState=INVALID",
        true,
        "値の符号・範囲・相互関係を確認して修正してください。",
      ),
    );
  }

  if (evidence.inputState === "EMPTY") {
    warnings.push(
      diagnostic(
        stepId,
        "WF_INPUT_MISSING",
        "info",
        "まだ入力がありません。この工程を開始してください。",
        "inputState=EMPTY",
        false,
        "工程を開いて入力を開始してください。",
      ),
    );
  }

  if (evidence.resultState === "STALE") {
    diagnostics.push(
      diagnostic(
        stepId,
        "WF_RESULT_STALE",
        "warning",
        "入力が変更され、生成結果が古くなっています。再生成してください。",
        "resultState=STALE (upstream checksum changed)",
        false,
        "上流工程を再生成して current に戻してください。",
      ),
    );
    diagnostics.push(
      diagnostic(
        stepId,
        "WF_CHECKSUM_MISMATCH",
        "warning",
        "current checksum と generated 状態が一致しません。",
        "currentRevision != generatedRevision",
        false,
        "再生成後に checksum を一致させてください。",
      ),
    );
  }

  if (evidence.resultState === "NOT_GENERATED" && evidence.inputState === "VALID") {
    warnings.push(
      diagnostic(
        stepId,
        "WF_RESULT_NOT_GENERATED",
        "info",
        "入力は有効ですが、まだ生成結果がありません。",
        "resultState=NOT_GENERATED",
        false,
        "primary action（生成）を実行してください。",
      ),
    );
  }

  if (evidence.complete) {
    warnings.push(
      diagnostic(
        stepId,
        "WF_NOT_AUTHORIZED",
        "info",
        "開発上の完了です。正式認可（formal authorization）は未付与です。",
        "NUMERIC_DESIGN_AUTHORIZATION=NOT_GRANTED",
        false,
        "正式 OK/NG は人間による確認後に付与されます。",
      ),
    );
  }

  return { diagnostics, warnings };
}

function isPlannedCapability(capability: WorkflowCapabilityStatus): boolean {
  return capability === "PLANNED" || capability === "UNAVAILABLE" || capability === "OUT_OF_SCOPE";
}

export function applyWarningBadges(
  badges: readonly WorkflowBadge[],
  warnings: readonly WorkflowDiagnostic[],
  capability: WorkflowCapabilityStatus,
  stepId: WorkflowStepId,
): readonly WorkflowBadge[] {
  const next = [...badges];
  if (capability === "PARTIAL" && !next.includes("PARTIAL")) {
    next.push("PARTIAL", "DEVELOPMENT_ONLY");
  }
  if (warnings.some((entry) => entry.code === "WF_LOCAL_CRS_WARNING") && !next.includes("LOCAL_CRS_LEGACY")) {
    next.push("LOCAL_CRS_LEGACY");
  }
  if (stepId === "WF-11" && warnings.some((entry) => entry.code === "WF_3D_DIMENSION_PLANNED") && !next.includes("3D_DIMENSION_PLANNED")) {
    next.push("3D_DIMENSION_PLANNED");
  }
  if (warnings.some((entry) => entry.severity === "warning") && !next.includes("WARNING")) {
    next.push("WARNING");
  }
  return next;
}

export function evaluateStep(params: EvaluateStepParams): EvaluateStepResult {
  const { stepId, evidence, prerequisitesSatisfied } = params;
  const base = resolveBaseStatus(stepId, evidence, prerequisitesSatisfied);
  const { diagnostics, warnings } = buildStepDiagnostics(stepId, evidence, prerequisitesSatisfied);
  const badges = applyWarningBadges(base.badges, warnings, evidence.capability, stepId);
  return { status: base.status, badges, diagnostics, warnings };
}

export function definitionOf(stepId: WorkflowStepId) {
  return getWorkflowStepDefinition(stepId);
}
