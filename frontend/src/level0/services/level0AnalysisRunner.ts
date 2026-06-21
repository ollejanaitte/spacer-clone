import type { ProjectModel, TimeHistoryResult } from "../../types";

export type EarthquakePresetId = "weak" | "medium" | "strong";

export type Level0AnalysisInput = {
  project: ProjectModel;
  earthquakePreset: EarthquakePresetId;
};

export type Level0AnalysisOutput = {
  rawResult: unknown;
  maxDisplacement: {
    nodeId: string;
    valueCm: number;
    timeSec: number;
  };
  timeHistoryResult: TimeHistoryResult;
};

/**
 * レベル0の解析を実行する。
 * T14 では fakeAnalysisRunner を使用し、T21 で実 API に差し替える。
 */
export async function runLevel0Analysis(input: Level0AnalysisInput): Promise<Level0AnalysisOutput> {
  const { fakeRun } = await import("./fakeAnalysisRunner");
  return fakeRun(input);
}
