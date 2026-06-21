import { describe, test, expect } from "vitest";
import { EARTHQUAKE_PRESETS, type EarthquakePresetId } from "../data/earthquakePresets";

describe("earthquakePresets", () => {
  test("3つのプリセットが定義されている", () => {
    const ids: EarthquakePresetId[] = ["weak", "medium", "strong"];
    expect(Object.keys(EARTHQUAKE_PRESETS)).toEqual(ids);
  });

  test("各プリセットに必須フィールドがある", () => {
    for (const preset of Object.values(EARTHQUAKE_PRESETS)) {
      expect(preset.id).toBeTruthy();
      expect(preset.displayLabel).toBeTruthy();
      expect(preset.onomatopoeia).toBeTruthy();
      expect(preset.peakGroundAccelerationGal).toBeGreaterThan(0);
      expect(preset.durationSec).toBeGreaterThan(0);
      expect(preset.waveformRefId).toBeTruthy();
      expect(preset.description).toBeTruthy();
    }
  });

  test("weak の PGA は 80 gal", () => {
    expect(EARTHQUAKE_PRESETS.weak.peakGroundAccelerationGal).toBe(80);
  });

  test("medium の PGA は 250 gal", () => {
    expect(EARTHQUAKE_PRESETS.medium.peakGroundAccelerationGal).toBe(250);
  });

  test("strong の PGA は 600 gal", () => {
    expect(EARTHQUAKE_PRESETS.strong.peakGroundAccelerationGal).toBe(600);
  });

  test("波形 ID は一意", () => {
    const ids = Object.values(EARTHQUAKE_PRESETS).map((p) => p.waveformRefId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
