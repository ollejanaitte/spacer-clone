<<<<<<< HEAD
// このファイルは設計書 §26.1 をそのままコピーしたものです。
// MiMo は数値を改変しないこと。改変が必要な場合は人間に確認。

export type EarthquakePresetId = "weak" | "medium" | "strong";

export interface EarthquakePreset {
  id: EarthquakePresetId;
  /** UI表示ラベル（初心者向け） */
  displayLabel: string;
  /** UI表示の擬音 */
  onomatopoeia: string;
  /** 最大地動加速度 cm/s^2 (gal) */
  peakGroundAccelerationGal: number;
  /** 継続時間 秒 */
  durationSec: number;
  /** 既存解析エンジンに渡す波形ID（テンプレートに同梱した波形を参照） */
  waveformRefId: string;
  /** 教育用説明 */
  description: string;
}

export const EARTHQUAKE_PRESETS: Record<EarthquakePresetId, EarthquakePreset> = {
  weak: {
    id: "weak",
    displayLabel: "弱い",
    onomatopoeia: "コトコト",
    peakGroundAccelerationGal: 80,
    durationSec: 20,
    waveformRefId: "elcentro_ns_scaled_weak",
    description: "震度4程度のゆれです。",
  },
  medium: {
    id: "medium",
    displayLabel: "中くらい",
    onomatopoeia: "ガタガタ",
    peakGroundAccelerationGal: 250,
    durationSec: 30,
    waveformRefId: "elcentro_ns_scaled_medium",
    description: "震度5強程度のゆれです。",
  },
  strong: {
    id: "strong",
    displayLabel: "強い",
    onomatopoeia: "ゴゴゴ",
    peakGroundAccelerationGal: 600,
    durationSec: 40,
    waveformRefId: "elcentro_ns_scaled_strong",
    description: "震度6強〜7程度のゆれです。",
  },
};
=======
// T03 で実装予定
export {};
>>>>>>> origin/main
