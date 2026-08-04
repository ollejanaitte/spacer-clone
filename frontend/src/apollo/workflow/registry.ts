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
    completionCriterion: "道路線形の接続が成立していること（道路線形連携実装後に評価）",
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
    completionCriterion: "入力が妥当で、構造生成結果が最新であること",
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
    completionCriterion: "全スロットの有無が決定し、提供値が妥当で、構造生成結果が最新であること",
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
    completionCriterion: "断面入力が妥当で、構造生成結果が最新であること",
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
    completionCriterion: "全主桁の有無が決定し、入力が妥当で、投影結果が最新であること",
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
    completionCriterion: "添接の正規入力が完了していること（添接工程実装後）",
  },
  {
    workflowStepId: "WF-07",
    label: "荷重",
    group: "loads",
    order: 7,
    prerequisites: ["WF-03", "WF-05", "WF-06"],
    capabilityKey: "load-confirmation",
    supportedScope: "development dead loads for appurtenance/haunch (DEC-S4-0010); splice pending 4-D",
    navigationTarget: PANEL("wf-panel-load-confirmation", "荷重確認パネル"),
    primaryActionId: "open-step",
    completionCriterion: "構造が最新で、荷重モデルが準備完了またはデータなし（単位重量不足は入力不足）",
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
    completionCriterion: "現在の入力に対する解析結果があること",
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
    completionCriterion: "現在の解析結果に基づく候補照査があること",
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
    completionCriterion: "数量モデルが最新で照合値が一致していること",
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
    completionCriterion: "3Dモデルの構築が成功していること（寸法表示は別診断）",
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
    completionCriterion: "計算書モデルが最新で照合値が一致していること",
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
    completionCriterion: "図面セットが最新で、シート数が7以上であること",
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
    completionCriterion: "統合成果が最新で、整合チェックを通過していること",
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
    completionCriterion: "利用者確認の記録があり、照合値に紐づいていること",
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
