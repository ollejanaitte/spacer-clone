import type { ProjectModel, TimeHistoryResult } from "../../types";

export type EarthquakePresetId = "weak" | "medium" | "strong";

export type Level0AnalysisInput = {
  project: ProjectModel;
  earthquakePreset: EarthquakePresetId;
};

export type Level0AnalysisOutput = {
  rawResult: unknown;
  maxDisplacement: { nodeId: string; valueCm: number; timeSec: number };
  timeHistoryResult: TimeHistoryResult;
};

/**
 * レベル0の解析を実行する。
 * 既存の time history analysis API を使用する。
 */
export async function runLevel0Analysis(input: Level0AnalysisInput): Promise<Level0AnalysisOutput> {
  const endpoint = "/api/analysis/time-history";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project: input.project }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.status}`);
  }

  const payload = (await response.json()) as { result: { timeHistoryResult: TimeHistoryResult } };
  const timeHistoryResult = payload.result.timeHistoryResult;

  // 最大変位を計算
  let maxDisplCm = 0;
  let maxNodeId = "N007";
  let maxTimeSec = 0;

  for (const [key, values] of Object.entries(timeHistoryResult.displacements)) {
    for (let i = 0; i < values.length; i++) {
      if (Math.abs(values[i]) > Math.abs(maxDisplCm)) {
        maxDisplCm = values[i];
        maxNodeId = key.replace(/_(ux|uy|uz)$/, "");
        maxTimeSec = timeHistoryResult.time[i] ?? 0;
      }
    }
  }

  return {
    rawResult: payload.result,
    maxDisplacement: { nodeId: maxNodeId, valueCm: Math.abs(maxDisplCm), timeSec: maxTimeSec },
    timeHistoryResult,
  };
}
