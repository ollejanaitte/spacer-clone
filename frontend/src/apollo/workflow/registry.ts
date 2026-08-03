/**
 * Frozen workflow registry — WF-01..WF-15.
 *
 * IDs and order are FIXED (docs/apollo/step4_scope_design_refreeze/03_workflow_control_design.md).
 * Change requires a P0 design refreeze; never reorder here.
 */

import {
  WORKFLOW_STEP_IDS,
  type NavigationTarget,
  type PrimaryActionId,
  type WorkflowGroup,
  type WorkflowStepDefinition,
  type WorkflowStepId,
} from "./types";

export type WorkflowDefinitionInput = {
  readonly workflowStepId: WorkflowStepId;
  readonly label: string;
  readonly group: WorkflowGroup;
  readonly prerequisites: readonly WorkflowStepId[];
  readonly capabilityKey: string;
  readonly supportedScope: string;
  readonly navigationTarget: NavigationTarget;
  readonly primaryActionId: PrimaryActionId;
  readonly completionCriterion: string;
};

const PANEL = (id: string, label: string): NavigationTarget => ({
  kind: "panel",
  path: id,
  label,
});

export const WORKFLOW_STEP_DEFINITIONS: readonly WorkflowStepDefinition[] = [
  {
    workflowStepId: "WF-01",
    label: "道路線形",
    group: "geometry",
    order: 1,
    prerequisites: [],
    capabilityKey: "alignment-binding",
    supportedScope: "LINER alignment available; binding is Step 4-E",
    navigationTarget: { kind: "route", path: "/pro/liner", label: "LINER（道路線形）" },
    primaryActionId: "open-step",
    completionCriterion: "alignment binding 成立 (Step 4-E 実装後評価)",
  },
  {
    workflowStepId: "WF-02",
    label: "橋梁基本条件",
    group: "geometry",
    order: 2,
    prerequisites: ["WF-01"],
    capabilityKey: "bridge-structure-input",
    supportedScope: "SIMPLE_SINGLE / SIMPLE_MULTIPLE / CONTINUOUS bridge structure input",
    navigationTarget: PANEL("wf-panel-bridge-structure", "橋梁基本条件入力"),
    primaryActionId: "generate-structure",
    completionCriterion: "入力 valid + 構造生成 current (generatedAt)",
  },
  {
    workflowStepId: "WF-03",
    label: "床版・橋面付属物",
    group: "geometry",
    order: 3,
    prerequisites: ["WF-02"],
    capabilityKey: "appurtenance-input",
    supportedScope: "地覆/壁高欄/中央分離帯/任意バリア canonical input (constant segment)",
    navigationTarget: PANEL("wf-panel-appurtenance", "床版・橋面付属物入力"),
    primaryActionId: "generate-structure",
    completionCriterion: "全スロット presence 決定 + valid PROVIDED + 構造生成 current",
  },
  {
    workflowStepId: "WF-04",
    label: "主桁断面",
    group: "geometry",
    order: 4,
    prerequisites: ["WF-02"],
    capabilityKey: "section-input",
    supportedScope: "平板I桁断面 (girderDepth/flange/web)",
    navigationTarget: PANEL("wf-panel-bridge-structure", "主桁断面入力"),
    primaryActionId: "generate-structure",
    completionCriterion: "断面入力 valid + 構造生成 current",
  },
  {
    workflowStepId: "WF-05",
    label: "ハンチ",
    group: "geometry",
    order: 5,
    prerequisites: ["WF-04"],
    capabilityKey: "haunch-input",
    supportedScope: "主桁ごと RECT/TRAPEZOID constant range haunch input",
    navigationTarget: PANEL("wf-panel-haunch", "ハンチ入力"),
    primaryActionId: "generate-structure",
    completionCriterion: "全主桁 presence 決定 + valid + BSSD projection current",
  },
  {
    workflowStepId: "WF-06",
    label: "添接・フィラー",
    group: "geometry",
    order: 6,
    prerequisites: ["WF-04"],
    capabilityKey: "splice-input",
    supportedScope: "Step 4-D 実装後に評価",
    navigationTarget: PANEL("wf-panel-bridge-structure", "添接入力（未実装）"),
    primaryActionId: "none",
    completionCriterion: "添接 canonical input (Step 4-D)",
  },
  {
    workflowStepId: "WF-07",
    label: "荷重",
    group: "loads",
    order: 7,
    prerequisites: ["WF-03", "WF-05", "WF-06"],
    capabilityKey: "load-confirmation",
    supportedScope: "development loads; future appurtenance/haunch/splice loads pending",
    navigationTarget: PANEL("wf-panel-analysis", "解析パネル（荷重確認）"),
    primaryActionId: "open-step",
    completionCriterion: "荷重 input valid + 構造生成 current",
  },
  {
    workflowStepId: "WF-08",
    label: "構造解析",
    group: "analysis",
    order: 8,
    prerequisites: ["WF-07"],
    capabilityKey: "analysis",
    supportedScope: "development probe (GOLD-AN-001/002)",
    navigationTarget: PANEL("wf-panel-analysis", "構造解析パネル"),
    primaryActionId: "run-analysis",
    completionCriterion: "current input に対する解析結果あり",
  },
  {
    workflowStepId: "WF-09",
    label: "候補照査",
    group: "analysis",
    order: 9,
    prerequisites: ["WF-08"],
    capabilityKey: "demand-check",
    supportedScope: "development candidate (UNVERIFIED)",
    navigationTarget: PANEL("wf-panel-demand", "候補照査パネル"),
    primaryActionId: "open-step",
    completionCriterion: "current 解析結果に基づく候補照査あり",
  },
  {
    workflowStepId: "WF-10",
    label: "数量",
    group: "outputs",
    order: 10,
    prerequisites: ["WF-03", "WF-04", "WF-05", "WF-06"],
    capabilityKey: "quantity-model",
    supportedScope: "bridge structure approximate quantities",
    navigationTarget: PANEL("wf-panel-quantity", "数量パネル"),
    primaryActionId: "regenerate",
    completionCriterion: "quantity model current (checksum aligned)",
  },
  {
    workflowStepId: "WF-11",
    label: "3D確認",
    group: "outputs",
    order: 11,
    prerequisites: ["WF-08"],
    capabilityKey: "model-view",
    supportedScope: "3D solids; dimension overlay is Step 4-F",
    navigationTarget: PANEL("wf-panel-model-view", "3Dモデルビュー"),
    primaryActionId: "review-3d",
    completionCriterion: "3Dモデル build ok; dimension overlay は別診断",
  },
  {
    workflowStepId: "WF-12",
    label: "計算書",
    group: "outputs",
    order: 12,
    prerequisites: ["WF-10"],
    capabilityKey: "report-model",
    supportedScope: "development report",
    navigationTarget: PANEL("wf-panel-report", "計算書パネル"),
    primaryActionId: "regenerate",
    completionCriterion: "report model current (checksum aligned)",
  },
  {
    workflowStepId: "WF-13",
    label: "図面",
    group: "outputs",
    order: 13,
    prerequisites: ["WF-10"],
    capabilityKey: "drawing-set",
    supportedScope: "standard section + GA drawing set",
    navigationTarget: PANEL("wf-panel-drawing", "図面パネル"),
    primaryActionId: "regenerate",
    completionCriterion: "drawing set current + sheet count >= 7",
  },
  {
    workflowStepId: "WF-14",
    label: "成果品出力",
    group: "outputs",
    order: 14,
    prerequisites: ["WF-12", "WF-13"],
    capabilityKey: "output-integration",
    supportedScope: "artifact bundle / ZIP (OutputIntegrationPanel)",
    navigationTarget: PANEL("wf-panel-output", "成果品出力パネル"),
    primaryActionId: "export",
    completionCriterion: "integrated outputs current + consistency PASS",
  },
  {
    workflowStepId: "WF-15",
    label: "ユーザー確認",
    group: "governance",
    order: 15,
    prerequisites: ["WF-14"],
    capabilityKey: "user-acknowledgment",
    supportedScope: "human review checklist",
    navigationTarget: PANEL("wf-panel-output", "成果品出力パネル（確認チェックリスト）"),
    primaryActionId: "open-checklist",
    completionCriterion: "human acknowledgment 記録あり (checksum bound)",
  },
] as const;

export function getWorkflowStepDefinition(stepId: WorkflowStepId): WorkflowStepDefinition {
  const def = WORKFLOW_STEP_DEFINITIONS.find((entry) => entry.workflowStepId === stepId);
  if (!def) {
    throw new Error(`Unknown workflow step: ${stepId}`);
  }
  return def;
}

export function assertWorkflowRegistryShape(): void {
  const ids = WORKFLOW_STEP_DEFINITIONS.map((entry) => entry.workflowStepId);
  if (ids.length !== WORKFLOW_STEP_IDS.length) {
    throw new Error("Workflow registry step count mismatch");
  }
  for (const id of WORKFLOW_STEP_IDS) {
    if (!ids.includes(id)) {
      throw new Error(`Workflow registry missing ${id}`);
    }
  }
  for (let index = 0; index < WORKFLOW_STEP_DEFINITIONS.length; index += 1) {
    const entry = WORKFLOW_STEP_DEFINITIONS[index];
    if (entry.order !== index + 1) {
      throw new Error(`Workflow step ${entry.workflowStepId} order mismatch (${entry.order} != ${index + 1})`);
    }
    const duplicate = WORKFLOW_STEP_DEFINITIONS.filter((other) => other.workflowStepId === entry.workflowStepId);
    if (duplicate.length !== 1) {
      throw new Error(`Workflow step id duplicate: ${entry.workflowStepId}`);
    }
  }
}
