/**
 * Step 4-A data-source selectors.
 *
 * Every step derives its evidence from CURRENT project data + existing canonical
 * models (quantity / report / drawing / output integration). We never fabricate
 * results and we never introduce a second source of truth for artifact state.
 */

import type { ProjectModel } from "../../types";
import { getBridgeStructureInputDraft, isBridgeStructureGenerationCurrent } from "../bridgeStructure/generateBsdd";
import {
  parseBridgeStructureInputDraft,
  validateBridgeStructureInputDraft,
} from "../bridgeStructure/validation";
import { validateBridgeAppurtenanceConfiguration } from "../bridgeStructure/appurtenanceModel";
import { validateRcDeckHaunchConfiguration } from "../bridgeStructure/haunchModel";
import { PRESENCE_STATUS } from "../bridgeStructure/presence";
import { buildInputChecksum, buildInputRevision, buildQuantityModel } from "../quantity/quantityModel";
import { buildAppurtenanceHaunchLoadModel } from "../loads/appurtenanceHaunchLoadModel";
import { buildReportModel } from "../report/reportModel";
import { buildStandardSectionDrawingModel } from "../drawing/drawingModel";
import { buildGeneralArrangementDrawingSet } from "../drawing/drawingSetModel";
import { buildIntegratedOutputs } from "../output/outputIntegration";
import { buildApolloVisualizationModel } from "../visualization";
import type {
  WorkflowCapabilityStatus,
  WorkflowDiagnostic,
  WorkflowStepId,
} from "./types";
import { getWorkflowCapability } from "./capabilityRegistry";
import { getWorkflowStepDefinition } from "./registry";

export type StepInputState = "NONE" | "EMPTY" | "PARTIAL" | "VALID" | "INVALID";

export type StepResultState = "NONE" | "CURRENT" | "NOT_GENERATED" | "STALE";

export type StepEvidence = {
  readonly workflowStepId: WorkflowStepId;
  readonly capability: WorkflowCapabilityStatus;
  readonly inputState: StepInputState;
  readonly resultState: StepResultState;
  readonly complete: boolean;
  readonly corrupted: boolean;
  readonly currentRevision: string | null;
  readonly generatedRevision: string | null;
  readonly currentChecksum: string | null;
  readonly generatedChecksum: string | null;
  readonly diagnostics: readonly WorkflowDiagnostic[];
  readonly warnings: readonly WorkflowDiagnostic[];
};

export const LOCAL_CRS_WARNING_MESSAGE =
  "座標系は local CRS です（Step 4-E 未実装）。道路線形 binding は未接続のため、横断配置は互換モードで運用してください。";

function localCrsWarning(stepId: WorkflowStepId, index: number): WorkflowDiagnostic {
  return {
    diagnosticId: `DIAG-${stepId}-CRS-${index}`,
    workflowStepId: stepId,
    severity: "warning",
    code: "WF_LOCAL_CRS_WARNING",
    message: LOCAL_CRS_WARNING_MESSAGE,
    technicalDetail: "BINDING_PREREQUISITE_GUARD=PENDING_STEP_4E",
    blocking: false,
    source: "frontend/src/apollo/workflow/selectors.ts",
    remediation: "Step 4-E 実装後に道路線形 binding を設定してください。",
    navigationTarget: { kind: "route", path: "/pro/liner", label: "LINER（道路線形）" },
  };
}

function partialCapabilityWarning(stepId: WorkflowStepId, index: number): WorkflowDiagnostic {
  return {
    diagnosticId: `DIAG-${stepId}-PARTIAL-${index}`,
    workflowStepId: stepId,
    severity: "warning",
    code: "WF_PARTIAL_SCOPE_WARNING",
    message: "この工程は development 限定の部分実装です。将来工程の項目は未対応です。",
    technicalDetail: "capability=PARTIAL",
    blocking: false,
    source: "frontend/src/apollo/workflow/selectors.ts",
    remediation: "今後の Step で拡張予定です。",
    navigationTarget: null,
  };
}

export function dimensionPlannedWarning(stepId: WorkflowStepId, index: number): WorkflowDiagnostic {
  return {
    diagnosticId: `DIAG-${stepId}-DIM-${index}`,
    workflowStepId: stepId,
    severity: "warning",
    code: "WF_3D_DIMENSION_PLANNED",
    message: "3D 寸法 overlay・2点計測は Step 4-F で実装予定です。3D 本体とは別に管理します。",
    technicalDetail: "capability model-view=IMPLEMENTED; dimension capability=PLANNED",
    blocking: false,
    source: "frontend/src/apollo/workflow/selectors.ts",
    remediation: "Step 4-F 実装後に有効化されます。",
    navigationTarget: null,
  };
}

function isBridgeStructureInputEmpty(project: ProjectModel): boolean {
  const draft = getBridgeStructureInputDraft(project);
  return (
    draft.generatedAt === null &&
    draft.spanLength === null &&
    draft.bridgeLength === null &&
    draft.width === null &&
    draft.girderCount === null &&
    draft.girderSpacing === null &&
    draft.girderDepth === null &&
    draft.topFlangeWidth === null &&
    draft.topFlangeThickness === null &&
    draft.bottomFlangeWidth === null &&
    draft.bottomFlangeThickness === null &&
    draft.webThickness === null &&
    draft.deckThickness === null &&
    draft.crossBeamSpacing === null &&
    draft.stiffenerSpacing === null &&
    draft.swayBracingInterval === null &&
    draft.steelUnitWeight === null &&
    draft.rcUnitWeight === null &&
    draft.spans.length === 0 &&
    draft.supports.length === 0
  );
}

function isBridgeStructureInputCorrupted(project: ProjectModel): boolean {
  const raw = project.apolloBridgeStructureInput;
  if (raw === undefined || raw === null) return false;
  return parseBridgeStructureInputDraft(raw) === null;
}

/**
 * STALE = an artifact was generated but the upstream input changed since.
 * "Never generated" is NOT stale (未生成をSTALEにしない).
 * Canonical OutputIntegration parity: a generated structuralDesignModel whose
 * input.generatedAt was nulled by editing is stale.
 */
function isArtifactStale(project: ProjectModel): boolean {
  return Boolean(project.apolloBsdd?.structuralDesignModel) && !isBridgeStructureGenerationCurrent(project);
}

/** Safe checksum for a draft; empty when the draft is corrupted/absent. */
function safeInputChecksum(project: ProjectModel): string | null {
  if (isBridgeStructureInputCorrupted(project)) return null;
  try {
    return buildInputChecksum(getBridgeStructureInputDraft(project));
  } catch {
    return null;
  }
}

function safeInputRevision(project: ProjectModel): string | null {
  if (isBridgeStructureInputCorrupted(project)) return null;
  try {
    return buildInputRevision(getBridgeStructureInputDraft(project));
  } catch {
    return null;
  }
}

function classifyBridgeStructureInput(
  project: ProjectModel,
): { readonly inputState: StepInputState; readonly corrupted: boolean } {
  if (isBridgeStructureInputCorrupted(project)) {
    return { inputState: "INVALID", corrupted: true };
  }
  const draft = getBridgeStructureInputDraft(project);
  if (isBridgeStructureInputEmpty(project)) {
    return { inputState: "EMPTY", corrupted: false };
  }
  const validation = validateBridgeStructureInputDraft(draft);
  if (validation.complete) {
    return { inputState: "VALID", corrupted: false };
  }
  const hasValueError = validation.fieldErrors.some((entry) => {
    if (entry.message === null) return false;
    const value = draft[entry.key];
    return value !== null && value !== undefined;
  });
  return { inputState: hasValueError ? "INVALID" : "PARTIAL", corrupted: false };
}

function classifyBridgeStructureResult(project: ProjectModel): StepResultState {
  const hasModel = Boolean(project.apolloBsdd?.structuralDesignModel);
  const current = isBridgeStructureGenerationCurrent(project);
  if (current) return "CURRENT";
  if (hasModel) return "STALE";
  return "NOT_GENERATED";
}

function step4cIntegrationPending(stepId: WorkflowStepId, index: number): WorkflowDiagnostic {
  return {
    diagnosticId: `DIAG-${stepId}-S4C-${index}`,
    workflowStepId: stepId,
    severity: "warning",
    code: "WF_STEP_4_C_INTEGRATION_PENDING",
    message:
      "付属物・ハンチの 3D / 数量 / 荷重への接続は Step 4-C で実装予定です。本工程は canonical input までです。",
    technicalDetail: "STEP_4_C_INTEGRATION_PENDING",
    blocking: false,
    source: "frontend/src/apollo/workflow/selectors.ts",
    remediation: "Step 4-C 実装後に下流成果へ反映されます。現時点では未統合と表示します。",
    navigationTarget: null,
  };
}

function bridgeStructureEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  const { inputState, corrupted } = classifyBridgeStructureInput(project);
  if (corrupted) {
    return {
      workflowStepId: stepId,
      capability: getWorkflowCapability(stepId).status,
      inputState,
      resultState: "NONE",
      complete: false,
      corrupted: true,
      currentRevision: null,
      generatedRevision: null,
      currentChecksum: null,
      generatedChecksum: null,
      diagnostics: [],
      warnings: [],
    };
  }
  const resultState = classifyBridgeStructureResult(project);
  const draft = getBridgeStructureInputDraft(project);
  const currentChecksum = buildInputChecksum(draft);
  const currentRevision = buildInputRevision(draft);
  const generatedRevision = draft.generatedAt;
  const generatedChecksum = isBridgeStructureGenerationCurrent(project) ? currentChecksum : null;
  const complete = inputState === "VALID" && resultState === "CURRENT";
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState,
    resultState,
    complete,
    corrupted,
    currentRevision,
    generatedRevision,
    currentChecksum,
    generatedChecksum,
    diagnostics: [],
    warnings: [],
  };
}

function derivedModelEvidence(
  project: ProjectModel,
  stepId: WorkflowStepId,
  kind: "quantity" | "report" | "drawing",
): StepEvidence {
  if (isBridgeStructureInputCorrupted(project)) {
    return corruptedEvidence(project, stepId);
  }
  const draft = getBridgeStructureInputDraft(project);
  const model = buildDerivedModel(project, kind);
  const stale = isArtifactStale(project);
  const currentChecksum = buildInputChecksum(draft);
  const currentRevision = buildInputRevision(draft);
  const hasContent = derivedModelHasContent(model, kind);
  const complete = !stale && hasContent;
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState: classifyBridgeStructureInput(project).inputState,
    resultState: stale ? "STALE" : hasContent ? "CURRENT" : "NOT_GENERATED",
    complete,
    corrupted: false,
    currentRevision,
    generatedRevision: draft.generatedAt,
    currentChecksum,
    generatedChecksum: stale ? null : currentChecksum,
    diagnostics: [],
    warnings: [],
  };
}

function corruptedEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState: "INVALID",
    resultState: "NONE",
    complete: false,
    corrupted: true,
    currentRevision: null,
    generatedRevision: null,
    currentChecksum: null,
    generatedChecksum: null,
    diagnostics: [],
    warnings: [],
  };
}

type DerivedModelLike = { readonly stale: boolean };

function buildDerivedModel(
  project: ProjectModel,
  kind: "quantity" | "report" | "drawing",
): DerivedModelLike & { readonly items?: readonly unknown[]; readonly chapters?: readonly unknown[]; readonly entities?: readonly unknown[] } {
  if (kind === "quantity") return buildQuantityModel(project);
  if (kind === "report") return buildReportModel(project);
  return buildStandardSectionDrawingModel(project);
}

function derivedModelHasContent(
  model: DerivedModelLike & {
    readonly items?: readonly unknown[];
    readonly chapters?: readonly unknown[];
    readonly entities?: readonly unknown[];
  },
  kind: "quantity" | "report" | "drawing",
): boolean {
  if (kind === "quantity") return (model.items?.length ?? 0) > 0;
  if (kind === "report") return (model.chapters?.length ?? 0) > 0;
  return (model.entities?.length ?? 0) > 0;
}

function outputIntegrationEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  if (isBridgeStructureInputCorrupted(project)) {
    return corruptedEvidence(project, stepId);
  }
  const draft = getBridgeStructureInputDraft(project);
  const outputs = buildIntegratedOutputs(project);
  const currentChecksum = buildInputChecksum(draft);
  const currentRevision = buildInputRevision(draft);
  const stale = isArtifactStale(project);
  const complete =
    !stale &&
    outputs.consistency.overall === "PASS" &&
    outputs.statuses.bundle === "READY";
  const diagnostics: WorkflowDiagnostic[] = [];
  if (!stale && outputs.statuses.bundle === "BLOCKED") {
    diagnostics.push({
      diagnosticId: `DIAG-${stepId}-BUNDLE-BLOCKED`,
      workflowStepId: stepId,
      severity: "error",
      code: "WF_RESULT_NOT_GENERATED",
      message: "成果品一式が未生成です（図面セット未完成など）。先に上流工程を完了してください。",
      technicalDetail: `bundle=${outputs.statuses.bundle}`,
      blocking: true,
      source: "frontend/src/apollo/workflow/selectors.ts",
      remediation: "図面セット（WF-13）と計算書（WF-12）を生成・再生成してください。",
      navigationTarget: { kind: "panel", path: "wf-panel-output", label: "成果品出力パネル" },
    });
  }
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState: classifyBridgeStructureInput(project).inputState,
    resultState: stale ? "STALE" : complete ? "CURRENT" : "NOT_GENERATED",
    complete,
    corrupted: false,
    currentRevision,
    generatedRevision: draft.generatedAt,
    currentChecksum,
    generatedChecksum: stale ? null : currentChecksum,
    diagnostics,
    warnings: [],
  };
}

function modelViewEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  if (isBridgeStructureInputCorrupted(project)) {
    return corruptedEvidence(project, stepId);
  }
  const draft = getBridgeStructureInputDraft(project);
  const currentChecksum = buildInputChecksum(draft);
  const currentRevision = buildInputRevision(draft);
  const stale = isArtifactStale(project);
  const build = buildApolloVisualizationModel({ project });
  const hasEntities = build.ok && build.model.elements.length > 0;
  const complete = !stale && hasEntities;
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState: classifyBridgeStructureInput(project).inputState,
    resultState: stale ? "STALE" : hasEntities ? "CURRENT" : "NOT_GENERATED",
    complete,
    corrupted: false,
    currentRevision,
    generatedRevision: draft.generatedAt,
    currentChecksum,
    generatedChecksum: stale ? null : currentChecksum,
    diagnostics: [],
    warnings: [],
  };
}

function analysisEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  if (isBridgeStructureInputCorrupted(project)) {
    return corruptedEvidence(project, stepId);
  }
  const { inputState } = classifyBridgeStructureInput(project);
  const resultState = classifyBridgeStructureResult(project);
  const draft = getBridgeStructureInputDraft(project);
  const currentChecksum = buildInputChecksum(draft);
  const persistedResult = Boolean(project.analysisResults?.timeHistory);
  const stale = isArtifactStale(project);
  const hasCurrentResult = persistedResult && !stale;
  const complete = inputState === "VALID" && hasCurrentResult;
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState,
    resultState: hasCurrentResult ? "CURRENT" : stale ? "STALE" : "NOT_GENERATED",
    complete,
    corrupted: false,
    currentRevision: buildInputRevision(draft),
    generatedRevision: draft.generatedAt,
    currentChecksum,
    generatedChecksum: null,
    diagnostics: [],
    warnings: [],
  };
}

function demandEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  return analysisEvidence(project, stepId);
}

function linerEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  const hasLinerSource = Boolean(project.liner);
  const liner = project.liner;
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState: hasLinerSource ? "VALID" : "EMPTY",
    resultState: "NONE",
    complete: false,
    corrupted: false,
    currentRevision: null,
    generatedRevision: null,
    currentChecksum: liner ? String(liner.schemaVersion ?? "v1") : null,
    generatedChecksum: null,
    diagnostics: [],
    warnings: [],
  };
}

/**
 * WF-15 acknowledgment persistence (the only persisted workflow data).
 * localStorage-bound and input-checksum-bound so reload reproduces derived state
 * and any input mutation invalidates the ack (→ STALE).
 */
export const WF15_ACK_STORAGE_PREFIX = "apollo.workflow.wf15.ack.";

export type WorkflowAck = {
  readonly acknowledgedAt: string;
  readonly inputChecksum: string;
};

export function readWorkflowAck(projectId: string): WorkflowAck | null {
  try {
    const raw = globalThis.localStorage?.getItem(`${WF15_ACK_STORAGE_PREFIX}${projectId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkflowAck;
    if (typeof parsed.acknowledgedAt !== "string" || typeof parsed.inputChecksum !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeWorkflowAck(projectId: string, ack: WorkflowAck): void {
  try {
    globalThis.localStorage?.setItem(`${WF15_ACK_STORAGE_PREFIX}${projectId}`, JSON.stringify(ack));
  } catch {
    // localStorage unavailable (e.g. SSR/tests): ack stays in-memory only.
  }
}

function wf15AcknowledgmentEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  const currentChecksum = safeInputChecksum(project) ?? "";
  const currentRevision = safeInputRevision(project);
  const ack = readWorkflowAck(project.project.id);
  const acknowledgedCurrent = ack !== null && ack.inputChecksum === currentChecksum;
  const acknowledgedStale = ack !== null && ack.inputChecksum !== currentChecksum;
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState: "VALID",
    resultState: acknowledgedCurrent ? "CURRENT" : acknowledgedStale ? "STALE" : "NOT_GENERATED",
    complete: acknowledgedCurrent,
    corrupted: false,
    currentRevision,
    generatedRevision: ack?.acknowledgedAt ?? null,
    currentChecksum: currentChecksum || null,
    generatedChecksum: acknowledgedCurrent ? currentChecksum : null,
    diagnostics: [],
    warnings: [],
  };
}

function appurtenanceEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  if (isBridgeStructureInputCorrupted(project)) {
    return corruptedEvidence(project, stepId);
  }
  const draft = getBridgeStructureInputDraft(project);
  const validation = validateBridgeAppurtenanceConfiguration(draft.appurtenanceConfiguration, {
    bridgeLength: draft.bridgeLength,
    width: draft.width,
    projectScopeId: project.project.id,
  });
  const currentChecksum = buildInputChecksum(draft);
  const currentRevision = buildInputRevision(draft);
  const resultState = classifyBridgeStructureResult(project);
  const anyProvided = draft.appurtenanceConfiguration.slots.some(
    (slot) => slot.presence === PRESENCE_STATUS.PROVIDED,
  );
  const allNotProvided = draft.appurtenanceConfiguration.slots.every(
    (slot) => slot.presence === PRESENCE_STATUS.NOT_PROVIDED,
  );
  const warnings: WorkflowDiagnostic[] = [
    localCrsWarning(stepId, 0),
    step4cIntegrationPending(stepId, 0),
  ];
  if (anyProvided) {
    warnings.push({
      diagnosticId: `DIAG-${stepId}-DOWNSTREAM-PENDING`,
      workflowStepId: stepId,
      severity: "warning",
      code: "WF_PARTIAL_SCOPE_WARNING",
      message:
        "付属物が PROVIDED ですが、下流の 3D・数量・荷重・図面は Step 4-C 未統合です。既存 Step 3 成果を新 entity 対応済みとみなしません。",
      technicalDetail: "appurtenance PROVIDED; Step 4-C pending",
      blocking: false,
      source: "frontend/src/apollo/workflow/selectors.ts",
      remediation: "Step 4-C 実装まで下流成果は未統合警告付きで扱ってください。",
      navigationTarget: null,
    });
  }

  if (validation.blockingDiagnostics.length > 0) {
    return {
      workflowStepId: stepId,
      capability: getWorkflowCapability(stepId).status,
      inputState: "INVALID",
      resultState,
      complete: false,
      corrupted: false,
      currentRevision,
      generatedRevision: draft.generatedAt,
      currentChecksum,
      generatedChecksum: resultState === "CURRENT" ? currentChecksum : null,
      diagnostics: validation.blockingDiagnostics.map((d, index) => ({
        diagnosticId: `DIAG-${stepId}-${d.code}-${index}`,
        workflowStepId: stepId,
        severity: "error" as const,
        code: "WF_INPUT_INVALID" as const,
        message: d.message,
        technicalDetail: d.code,
        blocking: true,
        source: "frontend/src/apollo/bridgeStructure/appurtenanceModel.ts",
        remediation: d.remediation,
        navigationTarget: {
          kind: "panel" as const,
          path: "wf-panel-appurtenance",
          label: "床版・橋面付属物入力",
        },
      })),
      warnings,
    };
  }

  let inputState: StepInputState;
  if (allNotProvided) {
    inputState = "EMPTY";
  } else if (!validation.complete) {
    inputState = "PARTIAL";
  } else {
    inputState = "VALID";
  }

  const complete = validation.complete && resultState === "CURRENT";
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState,
    resultState: allNotProvided && resultState === "NOT_GENERATED" ? "NONE" : resultState,
    complete,
    corrupted: false,
    currentRevision,
    generatedRevision: draft.generatedAt,
    currentChecksum,
    generatedChecksum: resultState === "CURRENT" ? currentChecksum : null,
    diagnostics: [],
    warnings,
  };
}

function haunchEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  if (isBridgeStructureInputCorrupted(project)) {
    return corruptedEvidence(project, stepId);
  }
  const draft = getBridgeStructureInputDraft(project);
  const validation = validateRcDeckHaunchConfiguration(draft.haunchConfiguration, {
    bridgeLength: draft.bridgeLength,
    girderCount: draft.girderCount,
    projectScopeId: project.project.id,
  });
  const currentChecksum = buildInputChecksum(draft);
  const currentRevision = buildInputRevision(draft);
  const resultState = classifyBridgeStructureResult(project);
  const allNotProvided =
    draft.haunchConfiguration.girders.length === 0 ||
    draft.haunchConfiguration.girders.every((g) => g.presence === PRESENCE_STATUS.NOT_PROVIDED);
  const anyProvided = draft.haunchConfiguration.girders.some(
    (g) => g.presence === PRESENCE_STATUS.PROVIDED,
  );
  const warnings: WorkflowDiagnostic[] = [step4cIntegrationPending(stepId, 0)];
  if (anyProvided) {
    warnings.push({
      diagnosticId: `DIAG-${stepId}-DOWNSTREAM-PENDING`,
      workflowStepId: stepId,
      severity: "warning",
      code: "WF_PARTIAL_SCOPE_WARNING",
      message:
        "ハンチが PROVIDED ですが、3D・数量・自重への接続は Step 4-C 未統合です。",
      technicalDetail: "haunch PROVIDED; Step 4-C pending",
      blocking: false,
      source: "frontend/src/apollo/workflow/selectors.ts",
      remediation: "Step 4-C 実装まで下流成果は未統合警告付きで扱ってください。",
      navigationTarget: null,
    });
  }

  if (validation.blockingDiagnostics.length > 0) {
    return {
      workflowStepId: stepId,
      capability: getWorkflowCapability(stepId).status,
      inputState: "INVALID",
      resultState,
      complete: false,
      corrupted: false,
      currentRevision,
      generatedRevision: draft.generatedAt,
      currentChecksum,
      generatedChecksum: resultState === "CURRENT" ? currentChecksum : null,
      diagnostics: validation.blockingDiagnostics.map((d, index) => ({
        diagnosticId: `DIAG-${stepId}-${d.code}-${index}`,
        workflowStepId: stepId,
        severity: "error" as const,
        code: "WF_INPUT_INVALID" as const,
        message: d.message,
        technicalDetail: d.code,
        blocking: true,
        source: "frontend/src/apollo/bridgeStructure/haunchModel.ts",
        remediation: d.remediation,
        navigationTarget: {
          kind: "panel" as const,
          path: "wf-panel-haunch",
          label: "ハンチ入力",
        },
      })),
      warnings,
    };
  }

  let inputState: StepInputState;
  if (allNotProvided) {
    inputState = "EMPTY";
  } else if (!validation.complete) {
    inputState = "PARTIAL";
  } else {
    inputState = "VALID";
  }

  const complete = validation.complete && resultState === "CURRENT";
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState,
    resultState: allNotProvided && resultState === "NOT_GENERATED" ? "NONE" : resultState,
    complete,
    corrupted: false,
    currentRevision,
    generatedRevision: draft.generatedAt,
    currentChecksum,
    generatedChecksum: resultState === "CURRENT" ? currentChecksum : null,
    diagnostics: [],
    warnings,
  };
}

function loadConfirmationEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  if (isBridgeStructureInputCorrupted(project)) {
    return corruptedEvidence(project, stepId);
  }
  const draft = getBridgeStructureInputDraft(project);
  const currentChecksum = buildInputChecksum(draft);
  const currentRevision = buildInputRevision(draft);
  const stale = isArtifactStale(project);
  const loadModel = buildAppurtenanceHaunchLoadModel(project);
  const structureCurrent = isBridgeStructureGenerationCurrent(project);
  const inputState = classifyBridgeStructureInput(project).inputState;
  const diagnostics: WorkflowDiagnostic[] = [];
  if (!stale && loadModel.status === "INCOMPLETE") {
    diagnostics.push({
      diagnosticId: `DIAG-${stepId}-LOAD-UNIT-WEIGHT`,
      workflowStepId: stepId,
      severity: "warning",
      code: "WF_INPUT_MISSING",
      message: "付属物/ハンチの単位体積重量が不足しています。該当荷重は NOT_AVAILABLE です。",
      technicalDetail: `loadStatus=${loadModel.status}; unavailable=${loadModel.loads.filter((l) => l.status === "NOT_AVAILABLE").length}`,
      blocking: false,
      source: "frontend/src/apollo/workflow/selectors.ts",
      remediation: "単位体積重量を入力するか、解析へ渡す前に当該エンティティを見直してください。",
      navigationTarget: { kind: "panel", path: "wf-panel-load-confirmation", label: "荷重確認パネル" },
    });
  }
  const complete =
    structureCurrent &&
    !stale &&
    inputState === "VALID" &&
    (loadModel.status === "READY" || loadModel.status === "EMPTY");
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState,
    resultState: stale ? "STALE" : complete ? "CURRENT" : structureCurrent ? "CURRENT" : "NOT_GENERATED",
    complete,
    corrupted: false,
    currentRevision,
    generatedRevision: draft.generatedAt,
    currentChecksum,
    generatedChecksum: stale ? null : currentChecksum,
    diagnostics,
    warnings: [],
  };
}

export function evaluateStepEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  switch (stepId) {
    case "WF-01":
      return linerEvidence(project, stepId);
    case "WF-02":
      return bridgeStructureEvidence(project, stepId);
    case "WF-03":
      return appurtenanceEvidence(project, stepId);
    case "WF-05":
      return haunchEvidence(project, stepId);
    case "WF-06":
      return bridgeStructureEvidence(project, stepId);
    case "WF-04":
      return bridgeStructureEvidence(project, stepId);
    case "WF-07":
      return loadConfirmationEvidence(project, stepId);
    case "WF-08":
      return analysisEvidence(project, stepId);
    case "WF-09":
      return demandEvidence(project, stepId);
    case "WF-10":
      return derivedModelEvidence(project, stepId, "quantity");
    case "WF-11":
      return modelViewEvidence(project, stepId);
    case "WF-12":
      return derivedModelEvidence(project, stepId, "report");
    case "WF-13":
      return drawingEvidence(project, stepId);
    case "WF-14":
      return outputIntegrationEvidence(project, stepId);
    case "WF-15":
      return wf15AcknowledgmentEvidence(project, stepId);
  }
}

function drawingEvidence(project: ProjectModel, stepId: WorkflowStepId): StepEvidence {
  if (isBridgeStructureInputCorrupted(project)) {
    return corruptedEvidence(project, stepId);
  }
  const draft = getBridgeStructureInputDraft(project);
  const drawingSet = buildGeneralArrangementDrawingSet(project);
  const stale = isArtifactStale(project);
  const currentChecksum = buildInputChecksum(draft);
  const currentRevision = buildInputRevision(draft);
  const hasSheets = drawingSet.sheets.length >= 7;
  const complete = !stale && hasSheets;
  const diagnostics: WorkflowDiagnostic[] = [];
  if (!stale && !hasSheets) {
    const scopeOnly = drawingSet.warnings.some((entry) => entry.includes("SIMPLE_SINGLE only"));
    if (scopeOnly) {
      diagnostics.push({
        diagnosticId: `DIAG-${stepId}-SCOPE`,
        workflowStepId: stepId,
        severity: "error",
        code: "WF_UNSUPPORTED_SCOPE",
        message: "図面一式は現在 SIMPLE_SINGLE のみ対応です（STEP3_SCOPE）。連続桁・曲線・斜橋は未対応。",
        technicalDetail: "STEP3_SCOPE: SIMPLE_SINGLE only",
        blocking: true,
        source: "frontend/src/apollo/workflow/selectors.ts",
        remediation: "SIMPLE_SINGLE モデルで図面を生成するか、将来の Step で図面スコープを拡張してください。",
        navigationTarget: { kind: "panel", path: "wf-panel-drawing", label: "図面パネル" },
      });
    } else {
      diagnostics.push({
        diagnosticId: `DIAG-${stepId}-DRAWING-NOT-GENERATED`,
        workflowStepId: stepId,
        severity: "error",
        code: "WF_RESULT_NOT_GENERATED",
        message: "図面一式が未生成です。",
        technicalDetail: `sheets=${drawingSet.sheets.length}`,
        blocking: true,
        source: "frontend/src/apollo/workflow/selectors.ts",
        remediation: "図面（WF-13）を生成・再生成してください。",
        navigationTarget: { kind: "panel", path: "wf-panel-drawing", label: "図面パネル" },
      });
    }
  }
  return {
    workflowStepId: stepId,
    capability: getWorkflowCapability(stepId).status,
    inputState: classifyBridgeStructureInput(project).inputState,
    resultState: stale ? "STALE" : hasSheets ? "CURRENT" : "NOT_GENERATED",
    complete,
    corrupted: false,
    currentRevision,
    generatedRevision: draft.generatedAt,
    currentChecksum,
    generatedChecksum: stale ? null : currentChecksum,
    diagnostics,
    warnings: [],
  };
}

export function getStepEvidenceWithWarnings(
  project: ProjectModel,
  stepId: WorkflowStepId,
): StepEvidence {
  const evidence = evaluateStepEvidence(project, stepId);
  const warnings: WorkflowDiagnostic[] = [...evidence.warnings];
  const group = getWorkflowStepDefinition(stepId).group;

  if (group !== "governance") {
    warnings.push(localCrsWarning(stepId, warnings.length));
  }
  if (evidence.capability === "PARTIAL") {
    warnings.push(partialCapabilityWarning(stepId, warnings.length));
  }
  if (stepId === "WF-11") {
    warnings.push(dimensionPlannedWarning(stepId, warnings.length));
  }
  return { ...evidence, warnings };
}
