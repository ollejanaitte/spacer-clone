export type EarthquakePresetId = "weak" | "medium" | "strong";

export interface EarthquakePreset {
  id: EarthquakePresetId;
  displayLabel: string;
  onomatopoeia: string;
  peakGroundAccelerationGal: number;
  durationSec: number;
  waveformRefId: string;
  description: string;
}

export const EARTHQUAKE_PRESETS: Record<EarthquakePresetId, EarthquakePreset> = {
  weak: { id: "weak", displayLabel: "弱い", onomatopoeia: "コトコト", peakGroundAccelerationGal: 80, durationSec: 20, waveformRefId: "elcentro_ns_scaled_weak", description: "震度4程度のゆれです。" },
  medium: { id: "medium", displayLabel: "中くらい", onomatopoeia: "ガタガタ", peakGroundAccelerationGal: 250, durationSec: 30, waveformRefId: "elcentro_ns_scaled_medium", description: "震度5強程度のゆれです。" },
  strong: { id: "strong", displayLabel: "強い", onomatopoeia: "ゴゴゴ", peakGroundAccelerationGal: 600, durationSec: 40, waveformRefId: "elcentro_ns_scaled_strong", description: "震度6強〜7程度のゆれです。" },
};
