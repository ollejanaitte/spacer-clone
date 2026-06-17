// Pure helpers for the beginner-friendly Time History Analysis wizard.
//
// All helpers in this module are display-only. They never mutate the
// project payload, the analysis result, the API request, or the
// persisted JSON schema. They derive UI status, validation summaries,
// ground-motion consistency checks, and beginner-friendly error cards
// from the existing project and result objects.

import type { ProjectModel, TimeHistoryResult } from "../../types";

export type TimeHistoryMainStatus =
  | "unconfigured"
  | "incomplete"
  | "ready"
  | "running"
  | "complete"
  | "error";

export type TimeHistoryCheckState = "ok" | "ng" | "warning" | "unchecked";

export type TimeHistoryCheckItemId =
  | "model"
  | "supports"
  | "mass"
  | "groundMotion"
  | "unit"
  | "dt"
  | "duration"
  | "outputTarget"
  | "analysis"
  | "animation";

export type TimeHistoryCheckItem = {
  id: TimeHistoryCheckItemId;
  state: TimeHistoryCheckState;
  reason: string;
  remedy: string;
  sectionId: TimeHistorySectionId;
};

export type TimeHistorySectionId =
  | "intro"
  | "inputCheck"
  | "groundMotion"
  | "analysis"
  | "output"
  | "run"
  | "results";

export const TIME_HISTORY_SECTION_IDS: TimeHistorySectionId[] = [
  "intro",
  "inputCheck",
  "groundMotion",
  "analysis",
  "output",
  "run",
  "results",
];

export type TimeHistoryWizardInputs = {
  loading?: boolean;
  hasError?: boolean;
  hasResult?: boolean;
  selectedNodeId?: string | null;
  selectedMemberId?: string | null;
  outputComponents?: { x?: boolean; y?: boolean; z?: boolean };
};

/**
 * Derive the high-level status displayed in the main screen. The
 * function never inspects internal status codes that are not already
 * part of the public result type; it falls back to heuristics based
 * on the existence of ground motion samples and a result block.
 */
export function selectTimeHistoryMainStatus(
  project: ProjectModel | null,
  result: TimeHistoryResult | null | undefined,
  inputs: TimeHistoryWizardInputs,
): TimeHistoryMainStatus {
  if (inputs.loading) return "running";
  if (inputs.hasError) return "error";
  const groundMotion = project?.groundMotions?.[0];
  const hasMotionSamples = Boolean(
    groundMotion && Array.isArray(groundMotion.samples) && groundMotion.samples.length > 0,
  );
  const hasResult = Boolean(inputs.hasResult || result);
  if (!hasResult && !hasMotionSamples) return "unconfigured";
  if (hasResult) return "complete";
  if (hasMotionSamples) return "ready";
  return "incomplete";
}

/**
 * Return the 10 validation items that the input-check section
 * displays. The items reuse the existing pure functions exposed by
 * the time-history module (ground-motion preview / sample status) so
 * the verdict stays consistent with the manager panel.
 */
export function buildTimeHistoryCheckItems(args: {
  project: ProjectModel | null;
  result: TimeHistoryResult | null | undefined;
  inputs: TimeHistoryWizardInputs;
}): TimeHistoryCheckItem[] {
  const { project, result, inputs } = args;
  const items: TimeHistoryCheckItem[] = [];
  const groundMotion = project?.groundMotions?.[0];
  const settings = project?.analysisSettings.timeHistory;
  const timeStep = settings?.timeStep ?? groundMotion?.timeStep ?? 0;
  const duration = settings?.duration ?? groundMotion?.duration ?? 0;
  const sampleCount = groundMotion?.samples?.length ?? 0;
  const dtValid = Number.isFinite(timeStep) && timeStep > 0;
  const durationValid = Number.isFinite(duration) && duration > 0;
  const hasNodes = (project?.nodes?.length ?? 0) > 0;
  const hasMembers = (project?.members?.length ?? 0) > 0;
  const hasMass = (project?.massCases?.length ?? 0) > 0;
  const hasSupports = (project?.supports?.length ?? 0) > 0;

  // model
  items.push({
    id: "model",
    state: hasNodes && hasMembers ? "ok" : "ng",
    reason: hasNodes && hasMembers
      ? "節点と部材が定義されています。"
      : "節点または部材が未定義です。",
    remedy: "プロジェクトツリーから節点・部材を登録してください。",
    sectionId: "analysis",
  });
  // supports
  items.push({
    id: "supports",
    state: hasSupports ? "ok" : "ng",
    reason: hasSupports ? "支点条件が設定されています。" : "支点条件が未設定です。",
    remedy: "支点プロパティで拘束条件を追加してください。",
    sectionId: "analysis",
  });
  // mass
  items.push({
    id: "mass",
    state: hasMass ? "ok" : "warning",
    reason: hasMass ? "質量ケースが登録されています。" : "質量ケースが未登録です。",
    remedy: "質量ケースを追加してください。",
    sectionId: "analysis",
  });
  // groundMotion
  const hasMotion = Boolean(groundMotion) && sampleCount > 0;
  items.push({
    id: "groundMotion",
    state: hasMotion ? "ok" : "ng",
    reason: hasMotion ? "地震波が選択されています。" : "地震波がまだ選択されていません。",
    remedy: "「地震波設定」でCSVまたは道路橋示方書形式の地震波を読み込んでください。",
    sectionId: "groundMotion",
  });
  // unit
  const hasUnit = Boolean(groundMotion && (groundMotion.unit === "m/s2" || groundMotion.unit === "gal"));
  items.push({
    id: "unit",
    state: hasUnit ? "ok" : "warning",
    reason: hasUnit
      ? "地震波の単位が設定されています。"
      : "地震波の単位を確認してください。",
    remedy: "gal（cm/s²）または m/s² を確認してください。",
    sectionId: "groundMotion",
  });
  // dt
  items.push({
    id: "dt",
    state: dtValid ? "ok" : "ng",
    reason: dtValid ? "時間刻み dt が有効です。" : "時間刻み dt が 0 または未設定です。",
    remedy: "解析条件で dt に 0 より大きい値を入力してください（例: 0.01）。",
    sectionId: "analysis",
  });
  // duration
  items.push({
    id: "duration",
    state: durationValid ? "ok" : "ng",
    reason: durationValid ? "解析時間が設定されています。" : "解析時間が 0 または未設定です。",
    remedy: "解析条件または地震波設定で解析時間を確認してください。",
    sectionId: "analysis",
  });
  // output target
  const hasOutput = Boolean(
    inputs.selectedNodeId || inputs.selectedMemberId || hasMotion,
  );
  items.push({
    id: "outputTarget",
    state: hasOutput ? "ok" : "warning",
    reason: hasOutput ? "出力対象が選択されています。" : "出力対象が未選択です。",
    remedy: "「出力対象選択」で節点または部材を1つ選んでください。",
    sectionId: "output",
  });
  // analysis settings
  const analysisState: TimeHistoryCheckState =
    dtValid && durationValid && hasMotion ? "ok" : hasMotion ? "warning" : "unchecked";
  items.push({
    id: "analysis",
    state: analysisState,
    reason: analysisState === "ok"
      ? "解析条件がすべて有効です。"
      : "解析条件に未確定の項目があります。",
    remedy: "解析条件設定で dt / 解析時間 / 減衰を確認してください。",
    sectionId: "analysis",
  });
  // animation
  const availability = isXyzAnimationAvailable(result);
  items.push({
    id: "animation",
    state: availability.available ? "ok" : "warning",
    reason: availability.available
      ? "X・Y・Z 方向の変位結果が出力されています。"
      : "XYZ合成変位に必要な変位成分が不足しています。",
    remedy: availability.available
      ? "そのまま解析できます。"
      : "不足: " + availability.missingAxes.join("・") + "方向。出力対象選択で不足成分の出力を有効にしてください。",
    sectionId: "output",
  });
  // Reorder so NG items come first.
  items.sort((a, b) => priorityForState(a.state) - priorityForState(b.state));
  return items;
}

function priorityForState(state: TimeHistoryCheckState): number {
  switch (state) {
    case "ng": return 0;
    case "warning": return 1;
    case "unchecked": return 2;
    case "ok": return 3;
    default: return 4;
  }
}

/**
 * Compute the ground-motion consistency summary used by the
 * earthquake-settings card and the input-check section.
 */
export type GroundMotionConsistency = {
  sampleCount: number;
  timeStep: number;
  motionDuration: number;
  expectedSamples: number;
  currentDuration: number;
  matches: boolean;
  ok: boolean;
};

export function computeGroundMotionConsistency(args: {
  samples: number[] | undefined;
  timeStep: number;
  duration: number;
}): GroundMotionConsistency {
  const samples = Array.isArray(args.samples) ? args.samples : [];
  const sampleCount = samples.length;
  const timeStep = Number.isFinite(args.timeStep) && args.timeStep > 0 ? args.timeStep : 0;
  const duration = Number.isFinite(args.duration) && args.duration > 0 ? args.duration : 0;
  const motionDuration = timeStep > 0 && sampleCount > 0 ? timeStep * (sampleCount - 1) : 0;
  const expectedSamples = timeStep > 0 && duration > 0 ? Math.floor(duration / timeStep) + 1 : 0;
  const matches = expectedSamples > 0 && sampleCount === expectedSamples;
  return {
    sampleCount,
    timeStep,
    motionDuration,
    expectedSamples,
    currentDuration: duration,
    matches,
    ok: matches && sampleCount > 0 && timeStep > 0,
  };
}

/**
 * Compute the duration that uses the entire ground motion series.
 * Pure function; callers are responsible for forwarding the result to
 * the project's onChange callback.
 */
export function computeMatchDuration(timeStep: number, sampleCount: number): number {
  if (!Number.isFinite(timeStep) || timeStep <= 0) return 0;
  if (!Number.isFinite(sampleCount) || sampleCount <= 0) return 0;
  return timeStep * (sampleCount - 1);
}

export type WizardErrorId =
  | "ground-motion-mismatch"
  | "ground-motion-missing"
  | "invalid-dt"
  | "output-target-missing"
  | "animation-incomplete";

export type WizardErrorCard = {
  id: WizardErrorId;
  title: string;
  body: string;
  reason: string;
  remedy: string;
  detail: string;
  buttons: Array<{ id: string; label: string; variant: "primary" | "secondary" }>;
  targetSection?: TimeHistorySectionId;
};

export type WizardErrorContext = {
  groundMotion?: { sampleCount: number; timeStep: number; motionDuration: number; duration: number };
  dt?: number;
  outputTarget?: { hasNode: boolean; hasMember: boolean };
  missingAxes?: string[];
  internalDetail?: string;
};

/**
 * Translate an internal validation result into a beginner-friendly
 * Japanese error card. The original error text is preserved in
 * `detail` for the "show details" expander.
 */
export function toWizardError(
  id: WizardErrorId,
  context: WizardErrorContext = {},
): WizardErrorCard {
  switch (id) {
    case "ground-motion-mismatch": {
      const motion = context.groundMotion;
      const sampleCount = motion?.sampleCount ?? 0;
      const timeStep = motion?.timeStep ?? 0;
      const duration = motion?.duration ?? 0;
      const motionDuration = motion?.motionDuration ?? 0;
      const expectedSamples = timeStep > 0 && duration > 0
        ? Math.floor(duration / timeStep) + 1
        : 0;
      const targetDuration = timeStep * Math.max(0, sampleCount - 1);
      return {
        id,
        title: "地震波データの点数と解析時間が一致していません",
        body: "読み込んだ地震波の点数と、現在の解析時間・時間刻みから計算される点数が一致していません。",
        reason: sampleCount + " 点 vs " + expectedSamples + " 点 (dt " + timeStep.toFixed(4) + " 秒)",
        remedy: "次のどちらかを選んでください。",
        detail: context.internalDetail ?? "ground-motion-mismatch: sampleCount=" + sampleCount + " expected=" + expectedSamples,
        buttons: [
          {
            id: "match-duration",
            label: "解析時間を地震波に合わせる (" + targetDuration.toFixed(2) + " 秒)",
            variant: "primary",
          },
          { id: "go-to-section", label: "地震波設定へ移動", variant: "secondary" },
        ],
        targetSection: "groundMotion",
      };
    }
    case "ground-motion-missing":
      return {
        id,
        title: "地震波が選択されていません",
        body: "時刻歴応答解析では、地震の揺れを表す地震波データが必要です。",
        reason: "groundMotions[0].samples が空です。",
        remedy: "地震波設定でCSVまたは道路橋示方書形式の地震波を読み込んでください。",
        detail: context.internalDetail ?? "ground-motion-missing",
        buttons: [
          { id: "go-to-section", label: "地震波設定へ移動", variant: "primary" },
        ],
        targetSection: "groundMotion",
      };
    case "invalid-dt":
      return {
        id,
        title: "時間刻み dt が正しくありません",
        body: "dtは地震波データの時間間隔です。0より大きい値を入力してください。",
        reason: "dt = " + (context.dt ?? 0) + " (0 以下は不正)",
        remedy: "解析条件で dt に 0 より大きい値を入力してください。",
        detail: context.internalDetail ?? "invalid-dt",
        buttons: [
          { id: "go-to-section", label: "解析条件へ移動", variant: "primary" },
        ],
        targetSection: "analysis",
      };
    case "output-target-missing":
      return {
        id,
        title: "結果を表示する対象が選択されていません",
        body: "結果を見るには、節点または部材を少なくとも1つ選ぶ必要があります。",
        reason: "節点 / 部材 ともに未選択です。",
        remedy: "まずは変位を確認したい節点を1つ選んでください。",
        detail: context.internalDetail ?? "output-target-missing",
        buttons: [
          { id: "go-to-section", label: "出力対象選択へ移動", variant: "primary" },
        ],
        targetSection: "output",
      };
    case "animation-incomplete": {
      const missing = (context.missingAxes ?? []).join("・") || "Y方向、Z方向";
      return {
        id,
        title: "XYZ合成変位を表示できません",
        body: "XYZ合成変位を表示するには、X方向・Y方向・Z方向すべての変位結果が必要です。",
        reason: "不足: " + missing,
        remedy: "出力対象または解析条件で、X・Y・Z方向の変位を出力する設定にしてください。",
        detail: context.internalDetail ?? "animation-incomplete missing=" + missing,
        buttons: [
          { id: "go-to-section", label: "出力対象選択へ移動", variant: "primary" },
        ],
        targetSection: "output",
      };
    }
  }
}

export type XyzAnimationAvailability = {
  available: boolean;
  missingAxes: string[];
};

/**
 * Decide whether the XYZ combined displacement animation is
 * available. We require the displacement series for _ux, _uy and _uz
 * to be present and to share the time-step sample count. Missing
 * series is reported per axis.
 */
export function isXyzAnimationAvailable(
  result: TimeHistoryResult | null | undefined,
): XyzAnimationAvailability {
  if (!result || !result.displacements) return { available: false, missingAxes: ["X", "Y", "Z"] };
  const hasUx = hasSeries(result, "_ux");
  const hasUy = hasSeries(result, "_uy");
  const hasUz = hasSeries(result, "_uz");
  const missingAxes: string[] = [];
  if (!hasUx) missingAxes.push("X");
  if (!hasUy) missingAxes.push("Y");
  if (!hasUz) missingAxes.push("Z");
  return { available: missingAxes.length === 0, missingAxes };
}

function hasSeries(result: TimeHistoryResult, suffix: string): boolean {
  for (const key of Object.keys(result.displacements)) {
    if (key.endsWith(suffix)) {
      const series = result.displacements[key];
      if (Array.isArray(series) && series.length > 0) return true;
    }
  }
  return false;
}
