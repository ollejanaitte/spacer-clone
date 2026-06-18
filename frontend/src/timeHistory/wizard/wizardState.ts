import type { ProjectModel, StructuredMessage, TimeHistoryResult } from "../../types";

export type TimeHistoryMainStatus = "not-set" | "unconfigured" | "incomplete" | "ready" | "running" | "done" | "complete" | "error";
export type TimeHistoryWizardStepId = "intro" | "check" | "groundMotion" | "analysis" | "output" | "run" | "results";
export type TimeHistoryCheck = { id: string; label: string; status: "ok" | "ng" | "warning" | "unknown"; reason: string; action: string; section: TimeHistoryWizardStepId };
export type TimeHistoryCheckItem = { id: string; label: string; state: "ok" | "ng" | "warning" | "unknown"; reason: string; action: string; section: TimeHistoryWizardStepId };

export const timeHistoryWizardSteps: Array<{ id: TimeHistoryWizardStepId; label: string; description: string }> = [
  { id: "intro", label: "はじめに", description: "解析の流れを確認します" },
  { id: "check", label: "入力チェック", description: "不足入力を確認します" },
  { id: "groundMotion", label: "地震波設定", description: "CSV / H24波形を読み込みます" },
  { id: "analysis", label: "解析条件設定", description: "dt・解析時間・減衰を確認します" },
  { id: "output", label: "出力対象選択", description: "確認したい節点・部材を整理します" },
  { id: "run", label: "解析実行", description: "条件を確認して実行します" },
  { id: "results", label: "結果表示", description: "グラフ・表・アニメーションを確認します" },
];

export function selectTimeHistoryMainStatus(
  project: ProjectModel | null,
  result: TimeHistoryResult | null | undefined,
  options: { running?: boolean; loading?: boolean; hasResult?: boolean; hasError?: boolean; error?: StructuredMessage | null } = {},
): TimeHistoryMainStatus {
  if (options.running || options.loading) return "running";
  if (options.hasError || options.error || result?.meta?.status === "failed") return "error";
  if (options.hasResult || result) return "complete";
  if (!project) return "unconfigured";
  const checks = buildTimeHistoryChecks(project);
  if (checks.some((check) => check.id === "groundMotion" && check.status === "ng")) return "not-set";
  if (checks.some((check) => check.status === "ng")) return "incomplete";
  return "ready";
}

export function buildTimeHistoryChecks(project: ProjectModel): TimeHistoryCheck[] {
  const settings = project.analysisSettings.timeHistory;
  const groundMotions = project.groundMotions ?? [];
  const massCases = project.massCases ?? [];
  const selectedGroundMotion = groundMotions.find((motion) => motion.id === settings?.groundMotionId) ?? groundMotions[0];
  const timeStep = settings?.timeStep ?? selectedGroundMotion?.timeStep;
  const duration = settings?.duration ?? selectedGroundMotion?.duration;
  const sampleCount = selectedGroundMotion?.samples?.length ?? 0;
  const expected = expectedSampleCount(duration, timeStep);
  const sampleDelta = expected === null ? null : sampleCount - expected;
  return [
    { id: "model", label: "モデル定義", status: project.nodes.length > 0 && project.members.length > 0 ? "ok" : "ng", reason: project.nodes.length > 0 && project.members.length > 0 ? "節点・部材があります。" : "節点または部材が不足しています。", action: "モデル入力画面で節点・部材を確認してください。", section: "check" },
    { id: "support", label: "支点条件", status: project.supports.length > 0 ? "ok" : "ng", reason: project.supports.length > 0 ? "支点条件があります。" : "支点条件がありません。", action: "支点条件を設定してください。", section: "check" },
    { id: "mass", label: "質量設定", status: massCases.length > 0 ? "ok" : "ng", reason: massCases.length > 0 ? "質量ケースがあります。" : "時刻歴解析に必要な質量ケースがありません。", action: "質量ケースを作成してください。", section: "analysis" },
    { id: "groundMotion", label: "地震波", status: selectedGroundMotion && sampleCount > 0 ? "ok" : "ng", reason: selectedGroundMotion && sampleCount > 0 ? `${sampleCount} 点の地震波が選択されています。` : "地震波が選択されていません。", action: "地震波設定でCSVまたは道路橋示方書形式の地震波を読み込んでください。", section: "groundMotion" },
    { id: "unit", label: "地震波単位", status: selectedGroundMotion?.unit === "gal" || selectedGroundMotion?.unit === "m/s2" ? "ok" : "ng", reason: selectedGroundMotion ? `単位は ${selectedGroundMotion.unit} です。` : "単位を確認できません。", action: "地震波設定で単位を確認してください。", section: "groundMotion" },
    { id: "timeStep", label: "dt", status: typeof timeStep === "number" && Number.isFinite(timeStep) && timeStep > 0 ? "ok" : "ng", reason: typeof timeStep === "number" && Number.isFinite(timeStep) && timeStep > 0 ? `dt = ${timeStep} 秒です。` : "dtが未設定または不正です。", action: "解析条件設定で時間刻みを確認してください。", section: "analysis" },
    { id: "duration", label: "解析時間", status: typeof duration === "number" && Number.isFinite(duration) && duration > 0 ? "ok" : "ng", reason: typeof duration === "number" && Number.isFinite(duration) && duration > 0 ? `解析時間 = ${duration} 秒です。` : "解析時間が未設定または不正です。", action: "解析条件設定で解析時間を確認してください。", section: "analysis" },
    { id: "sampleCount", label: "地震波点数と解析時間", status: sampleDelta === null || sampleCount === 0 ? "unknown" : sampleDelta === 0 ? "ok" : "warning", reason: sampleDelta === null || sampleCount === 0 ? "地震波点数と解析時間の一致をまだ判定できません。" : sampleDelta === 0 ? `必要点数 ${expected} 点と一致しています。` : `地震波 ${sampleCount} 点、解析条件上の必要点数 ${expected} 点です。`, action: "必要に応じて解析時間を地震波に合わせてください。", section: "groundMotion" },
    { id: "method", label: "解析条件", status: settings?.method === "newmark-beta" ? "ok" : "ng", reason: settings?.method === "newmark-beta" ? "Newmark-β法が選択されています。" : "時刻歴解析条件が未設定です。", action: "解析条件設定で初期値を作成・確認してください。", section: "analysis" },
    { id: "animation", label: "アニメーション用変位成分", status: "unknown", reason: "解析後に、出力された変位成分から表示可否を判定します。", action: "結果表示のアニメーション欄を確認してください。", section: "results" },
  ];
}

export function buildTimeHistoryCheckItems(args: { project: ProjectModel | null; result: TimeHistoryResult | null; inputs?: Record<string, unknown> }): TimeHistoryCheckItem[] {
  if (!args.project) return buildMissingChecks();
  return buildTimeHistoryChecks(args.project).map((check) => ({ ...check, state: check.id === "animation" && args.result && !isXyzAnimationAvailable(args.result).available ? "warning" : check.status }));
}

function buildMissingChecks(): TimeHistoryCheckItem[] {
  return ["model", "support", "mass", "groundMotion", "unit", "timeStep", "duration", "sampleCount", "method", "animation"].map((id) => ({ id, label: id, state: "ng", reason: "未設定です。", action: "入力を確認してください。", section: "check" as TimeHistoryWizardStepId }));
}

export function expectedSampleCount(duration: number | undefined, timeStep: number | undefined): number | null {
  if (typeof duration !== "number" || typeof timeStep !== "number") return null;
  if (!Number.isFinite(duration) || !Number.isFinite(timeStep) || timeStep <= 0 || duration < 0) return null;
  return Math.floor(duration / timeStep) + 1;
}

export function groundMotionDuration(sampleCount: number, timeStep: number | undefined): number | null {
  if (typeof timeStep !== "number" || !Number.isFinite(timeStep) || timeStep <= 0 || sampleCount <= 0) return null;
  return timeStep * Math.max(sampleCount - 1, 0);
}

export function computeMatchDuration(timeStep: number, sampleCount: number): number {
  return groundMotionDuration(sampleCount, timeStep) ?? 0;
}

export function computeGroundMotionConsistency(args: { samples: number[]; timeStep: number; duration: number }) {
  const expectedSamples = args.duration <= 0 || args.timeStep <= 0 ? 0 : Math.floor(args.duration / args.timeStep) + 1;
  const motionDuration = computeMatchDuration(args.timeStep, args.samples.length);
  const matches = expectedSamples === args.samples.length;
  return { ok: matches, matches, expectedSamples, motionDuration, sampleCount: args.samples.length };
}

export function formatCheckStatus(status: TimeHistoryCheck["status"]): string {
  if (status === "ok") return "OK";
  if (status === "ng") return "NG";
  if (status === "warning") return "警告";
  return "未確認";
}

export function summarizeTimeHistoryResult(result: TimeHistoryResult | null | undefined): Array<{ label: string; value: string }> {
  if (!result) return [];
  return [
    { label: "最大変位", value: maxAbsRecord(result.displacements) },
    { label: "最大速度", value: maxAbsRecord(result.velocities) },
    { label: "最大加速度", value: maxAbsRecord(result.accelerations) },
    { label: "最大断面力", value: "-" },
    { label: "最大値の発生時刻", value: maxAbsTime(result) },
  ];
}

export function isXyzAnimationAvailable(result: TimeHistoryResult | null | undefined): { available: boolean; missingAxes: Array<"X" | "Y" | "Z"> } {
  if (!result) return { available: false, missingAxes: ["X", "Y", "Z"] };
  const keys = Object.keys(result.displacements ?? {});
  const active = String(result.meta.groundMotions?.[0]?.direction ?? "").toUpperCase();
  const has = {
    X: keys.some((key) => key.endsWith("_ux")) || (active === "X" && keys.some((key) => !key.includes("_"))),
    Y: keys.some((key) => key.endsWith("_uy")) || (active === "Y" && keys.some((key) => !key.includes("_"))),
    Z: keys.some((key) => key.endsWith("_uz")) || (active === "Z" && keys.some((key) => !key.includes("_"))),
  };
  const missingAxes = (["X", "Y", "Z"] as Array<"X" | "Y" | "Z">).filter((axis) => !has[axis]);
  return { available: missingAxes.length === 0, missingAxes };
}

export function toWizardError(kind: string, detail: Record<string, any> = {}) {
  const targetSection: TimeHistoryWizardStepId = kind.includes("ground-motion") ? "groundMotion" : kind.includes("dt") ? "analysis" : kind.includes("output") ? "output" : "results";
  const missingAxes = Array.isArray(detail.missingAxes) ? detail.missingAxes.join("・") : "";
  return {
    title: kind === "ground-motion-mismatch" ? "地震波データの点数と解析時間が一致していません" : kind === "ground-motion-missing" ? "地震波が選択されていません" : kind === "invalid-dt" ? "dtを確認してください" : kind === "output-target-missing" ? "出力対象が選択されていません" : "XYZ合成変位を表示できません",
    reason: missingAxes ? `${missingAxes}方向が不足しています。` : "入力条件を確認してください。",
    detail: Object.entries(detail).map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
    buttons: [{ id: "go-to-section", label: "該当セクションへ移動" }, { id: "match-duration", label: "解析時間を地震波に合わせる" }],
    targetSection,
  };
}

function maxAbsRecord(record: Record<string, number[]> | undefined): string {
  if (!record) return "-";
  let max = 0;
  let key = "";
  for (const [entryKey, values] of Object.entries(record)) for (const value of values) if (Number.isFinite(value) && Math.abs(value) >= Math.abs(max)) { max = value; key = entryKey; }
  return key ? `${key}: ${formatNumber(max)}` : "-";
}

function maxAbsTime(result: TimeHistoryResult): string {
  let max = 0;
  let index = -1;
  for (const record of [result.displacements, result.velocities, result.accelerations]) for (const values of Object.values(record ?? {})) values.forEach((value, valueIndex) => { if (Number.isFinite(value) && Math.abs(value) >= Math.abs(max)) { max = value; index = valueIndex; } });
  const time = index >= 0 ? result.time?.[index] : undefined;
  return typeof time === "number" ? `${formatNumber(time)} 秒` : "-";
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001) ? value.toExponential(4) : value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}
