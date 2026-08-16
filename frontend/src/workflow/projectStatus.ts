/**
 * Lane U Wave 3 U-6: Project Status — ユーザーが現在地点と次作業を判断する最小Status。
 *
 * 設計ルール:
 * - 独立の進捗 store を正本にしない。Project data (PDC modules + workflowState) から導出。
 * - 各 workflow step の状態を Project の module slot から読み取る:
 *   - Site Context: modules.terrain.data に terrainDocument / siteContext があれば ready
 *   - Road:         modules.road.workflowState (roadId) があれば ready
 *   - Bridge Layout: modules.bridgeLayout.workflowState (bridgeId) があれば ready
 *   - Superstructure: modules.superstructure に配置データがあれば ready
 *   - Substructure:  modules.substructure に配置データがあれば ready
 *   - Analysis:      modules.analysis に data があれば ready
 *   - 3D:            modules.cim に統合シーンがあれば ready
 * - 未接続 / invalid / error も表示できるよう、status は union で返す。
 */

import type { Project } from "../next/project/schema";

export type ProjectStepStatusState = "not-started" | "ready" | "invalid";

export interface ProjectStepStatus {
  readonly stepId: string;
  readonly state: ProjectStepStatusState;
  readonly detail: string;
}

export interface ProjectStatusReport {
  readonly projectId: string;
  readonly projectName: string;
  readonly updatedAt: string;
  readonly steps: readonly ProjectStepStatus[];
  /** 全体のうち ready な step 数 (progress 表示用)。 */
  readonly readyCount: number;
  readonly totalCount: number;
  /** 現在地点: 最初に未完了 (not-started) の step。全て完了なら最終 step。 */
  readonly currentStepId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function moduleHasData(project: Project, key: string): boolean {
  const module = project.modules[key as keyof Project["modules"]];
  return isRecord(module) && Object.keys(module).length > 0;
}

function readTerrainData(project: Project): Record<string, unknown> | undefined {
  const module = project.modules.terrain;
  if (!isRecord(module)) return undefined;
  const data = module.data;
  return isRecord(data) ? data : undefined;
}

function stepStatus(
  stepId: string,
  state: ProjectStepStatusState,
  detail: string,
): ProjectStepStatus {
  return { stepId, state, detail };
}

/** Project data から workflow 各 step の状態を導出する純関数。 */
export function deriveProjectStatus(project: Project): ProjectStatusReport {
  const terrainData = readTerrainData(project);
  const siteContextReady = Boolean(terrainData?.terrainDocument || terrainData?.siteContext);
  const roadState = isRecord(project.modules.road.workflowState)
    ? project.modules.road.workflowState
    : undefined;
  const roadReady = isRecord(roadState) && typeof roadState.roadId === "string";
  const bridgeState = isRecord(project.modules.bridgeLayout.workflowState)
    ? project.modules.bridgeLayout.workflowState
    : undefined;
  const bridgeReady = isRecord(bridgeState) && typeof bridgeState.bridgeId === "string";

  const steps: ProjectStepStatus[] = [
    stepStatus(
      "siteContext",
      siteContextReady ? "ready" : "not-started",
      siteContextReady ? "Site Context 設定済み (terrain/siteContext)" : "Site Context 未設定",
    ),
    stepStatus(
      "road",
      roadReady ? "ready" : "not-started",
      roadReady ? `Road 配置済み (${roadState.roadId})` : "Road 未配置",
    ),
    stepStatus(
      "bridgeLayout",
      bridgeReady ? "ready" : "not-started",
      bridgeReady ? `Bridge 配置済み (${bridgeState.bridgeId})` : "Bridge 未配置",
    ),
    stepStatus(
      "superstructure",
      moduleHasData(project, "superstructure") ? "ready" : "not-started",
      moduleHasData(project, "superstructure") ? "Superstructure データあり" : "Superstructure 未設定",
    ),
    stepStatus(
      "substructure",
      moduleHasData(project, "substructure") ? "ready" : "not-started",
      moduleHasData(project, "substructure") ? "Substructure データあり" : "Substructure 未設定",
    ),
    stepStatus(
      "analysis",
      moduleHasData(project, "analysis") ? "ready" : "not-started",
      moduleHasData(project, "analysis") ? "Analysis データあり" : "Analysis 未実行",
    ),
    stepStatus(
      "cim3d",
      moduleHasData(project, "cim") ? "ready" : "not-started",
      moduleHasData(project, "cim") ? "統合 3D シーンあり" : "統合 3D 未構築",
    ),
  ];

  const totalCount = steps.length;
  const readyCount = steps.filter((s) => s.state === "ready").length;
  const currentStepId =
    steps.find((s) => s.state === "not-started")?.stepId ?? steps[steps.length - 1]!.stepId;

  return {
    projectId: project.projectId,
    projectName: project.name,
    updatedAt: project.updatedAt,
    steps,
    readyCount,
    totalCount,
    currentStepId,
  };
}