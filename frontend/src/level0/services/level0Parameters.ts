import type { Level0Parameters } from "../components/ParameterPanel";

export type SamplePreset = {
  id: string;
  name: string;
  defaultParameters: Level0Parameters;
};

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "short-bridge",
    name: "短い橋",
    defaultParameters: {
      bridgeLength: 30,
      pierHeight: 8,
      pierCount: 2,
      loadMultiplier: 1.0,
    },
  },
  {
    id: "standard-bridge",
    name: "標準的な橋",
    defaultParameters: {
      bridgeLength: 50,
      pierHeight: 10,
      pierCount: 2,
      loadMultiplier: 1.0,
    },
  },
  {
    id: "tall-pier-bridge",
    name: "高い橋脚の橋",
    defaultParameters: {
      bridgeLength: 60,
      pierHeight: 20,
      pierCount: 2,
      loadMultiplier: 1.0,
    },
  },
];

export function getSamplePreset(sampleId: string): SamplePreset | undefined {
  return SAMPLE_PRESETS.find((preset) => preset.id === sampleId);
}

export function getDefaultParametersForSample(sampleId: string): Level0Parameters {
  const preset = getSamplePreset(sampleId);
  if (preset) {
    return { ...preset.defaultParameters };
  }
  return {
    bridgeLength: 50,
    pierHeight: 10,
    pierCount: 2,
    loadMultiplier: 1.0,
  };
}

export function hasUnreflectedParameters(_parameters: Level0Parameters): boolean {
  // For now, all parameters are reflected in the display description
  // This will be updated when actual calculation is implemented
  return false;
}

export function getParameterDescription(parameters: Level0Parameters): string {
  const parts: string[] = [];

  if (parameters.bridgeLength < 40) {
    parts.push("短い橋");
  } else if (parameters.bridgeLength > 70) {
    parts.push("長い橋");
  }

  if (parameters.pierHeight > 15) {
    parts.push("高い橋脚");
  } else if (parameters.pierHeight < 8) {
    parts.push("低い橋脚");
  }

  if (parameters.pierCount === 1) {
    parts.push("単支間");
  } else if (parameters.pierCount >= 3) {
    parts.push("多支間");
  }

  if (parameters.loadMultiplier > 1.5) {
    parts.push("重い荷重");
  } else if (parameters.loadMultiplier < 0.8) {
    parts.push("軽い荷重");
  }

  if (parts.length === 0) {
    return "標準的な条件の橋です。";
  }

  return `${parts.join("・")}の橋です。`;
}
