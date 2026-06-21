import type { TimeHistoryResult } from "../../types";
import type { Level0AnalysisInput, Level0AnalysisOutput } from "./level0AnalysisRunner";

type EarthquakePresetId = "weak" | "medium" | "strong";

const PRESET_AMPLITUDES: Record<EarthquakePresetId, number> = {
  weak: 4,
  medium: 12,
  strong: 25,
};

const PRESET_DURATIONS: Record<EarthquakePresetId, number> = {
  weak: 20,
  medium: 30,
  strong: 40,
};

/**
 * ダミーの解析を実行する。
 * 正弦波変位応答を返す。
 */
export async function fakeRun(input: Level0AnalysisInput): Promise<Level0AnalysisOutput> {
  const preset = input.earthquakePreset;
  const amplitudeCm = PRESET_AMPLITUDES[preset];
  const duration = PRESET_DURATIONS[preset];
  const dt = 0.01;
  const sampleCount = Math.floor(duration / dt);

  // ダミーの時刻歴結果を生成
  const time: number[] = [];
  const displacements: Record<string, number[]> = {};

  for (let i = 0; i < sampleCount; i++) {
    const t = i * dt;
    time.push(t);

    // 各ノードに正弦波変位を割り当て
    for (const nodeId of ["N001", "N002", "N003", "N004", "N005", "N006", "N007", "N008", "N009", "N010", "N011", "N012", "N013"]) {
      const key = `${nodeId}_ux`;
      if (!displacements[key]) displacements[key] = [];
      // 中央寄りのノードほど変位が大きい
      const position = parseInt(nodeId.replace("N", "")) / 13;
      const factor = Math.sin(position * Math.PI);
      displacements[key].push(amplitudeCm * factor * Math.sin(2 * Math.PI * t / duration));
    }
  }

  const timeHistoryResult: TimeHistoryResult = {
    meta: {
      analysisId: "fake-analysis",
      status: "success",
      method: "fake",
      timeStep: dt,
      duration,
      sampleCount,
    },
    time,
    displacements,
    velocities: {},
    accelerations: {},
  };

  // 最大変位ノードを探す
  let maxDisplCm = 0;
  let maxNodeId = "N007";
  let maxTimeSec = duration / 2;

  for (const [key, values] of Object.entries(displacements)) {
    for (let i = 0; i < values.length; i++) {
      if (Math.abs(values[i]) > Math.abs(maxDisplCm)) {
        maxDisplCm = values[i];
        maxNodeId = key.replace("_ux", "");
        maxTimeSec = time[i];
      }
    }
  }

  return {
    rawResult: null,
    maxDisplacement: {
      nodeId: maxNodeId,
      valueCm: Math.abs(maxDisplCm),
      timeSec: maxTimeSec,
    },
    timeHistoryResult,
  };
}
