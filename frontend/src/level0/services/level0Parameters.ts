import type { Level0Parameters } from "../components/ParameterPanel";
import { ja } from "../../i18n/ja";

export type SamplePreset = {
  id: string;
  name: string;
  defaultParameters: Level0Parameters;
};

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "short-bridge",
    name: ja.level0.samples.shortBridge.name,
    defaultParameters: {
      bridgeLength: 30,
      pierHeight: 8,
      pierCount: 2,
      loadMultiplier: 1.0,
    },
  },
  {
    id: "standard-bridge",
    name: ja.level0.samples.standardBridge.name,
    defaultParameters: {
      bridgeLength: 50,
      pierHeight: 10,
      pierCount: 2,
      loadMultiplier: 1.0,
    },
  },
  {
    id: "tall-pier-bridge",
    name: ja.level0.samples.tallPierBridge.name,
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
    parts.push(ja.level0.descriptions.shortBridge);
  } else if (parameters.bridgeLength > 70) {
    parts.push(ja.level0.descriptions.longBridge);
  }

  if (parameters.pierHeight > 15) {
    parts.push(ja.level0.descriptions.tallPier);
  } else if (parameters.pierHeight < 8) {
    parts.push(ja.level0.descriptions.shortPier);
  }

  if (parameters.pierCount === 1) {
    parts.push(ja.level0.descriptions.singleSpan);
  } else if (parameters.pierCount >= 3) {
    parts.push(ja.level0.descriptions.multiSpan);
  }

  if (parameters.loadMultiplier > 1.5) {
    parts.push(ja.level0.descriptions.heavyLoad);
  } else if (parameters.loadMultiplier < 0.8) {
    parts.push(ja.level0.descriptions.lightLoad);
  }

  if (parts.length === 0) {
    return ja.level0.descriptions.default;
  }

  const connector = ja.level0.descriptions.connector;
  return ja.level0.descriptions.compose(parts.join(connector));
}
