/**
 * Showcase sample metadata + fixture schema (MOUNTAIN-SAMPLE P01).
 *
 * A showcase sample is a full, versioned fixture that can be loaded into the
 * normal Project State (BuildIntermediateInput) and run through the existing
 * pipeline — it is NOT a Three.js scene. The disclaimer marks these samples as
 * SHOWCASE / DEMO (not a guaranteed real-project design).
 */
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import type { PierDraft, SpanDraft } from "../../schema/types";

export const MOUNTAIN_SAMPLE_SCHEMA_VERSION = 1 as const;

export type MountainSampleCategory = "showcase" | "demo";

export interface MountainSampleMetadata {
  sampleId: string;
  title: string;
  description: string;
  category: MountainSampleCategory;
  disclaimer: string;
  schemaVersion: typeof MOUNTAIN_SAMPLE_SCHEMA_VERSION;
}

export interface BridgeStationLayout {
  A1: number;
  P1: number;
  P2: number;
  P3: number;
  P4: number;
  P5: number;
  P6: number;
  P7: number;
  A2: number;
}

export interface MountainTerrainSettings {
  /** deterministic seed/hash so reload is stable. */
  seed: number;
  /** DISPLAY_LAYER — never feeds road geometry calculation. */
  role: "DISPLAY_LAYER";
  cellSizeM: number;
  extentM: number;
}

export interface MountainCameraPreset {
  id: string;
  label: string;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export interface MountainExpectedMetrics {
  totalRouteLengthM: number;
  bridgeStartM: number;
  bridgeEndM: number;
  bridgeLengthM: number;
  spanCount: number;
  nominalSpanM: number;
  pierCount: number;
  abutmentCount: number;
}

export interface MountainSampleFixture {
  metadata: MountainSampleMetadata;
  /** Raw input sections (converted to BuildIntermediateInput on load). */
  draft: BuildIntermediateInput;
  bridgeStations: BridgeStationLayout;
  spans: SpanDraft[];
  piers: PierDraft[];
  terrain: MountainTerrainSettings;
  cameraPresets: MountainCameraPreset[];
  expected: MountainExpectedMetrics;
}

export const MOUNTAIN_VIADUCT_500_METADATA: MountainSampleMetadata = {
  sampleId: "mountain-viaduct-500",
  title: "山岳連続高架橋500m",
  description: "急曲線・急縦断・片勾配・400m連続高架橋",
  category: "showcase",
  disclaimer:
    "SHOWCASE / DEMO — 複雑な線形・縦断・横断・橋梁・3Dを体験するデモ/統合試験データ。道路構造令等への完全適合を保証した実案件設計例ではない。",
  schemaVersion: 1,
};

export const MOUNTAIN_VIADUCT_500_EXPECTED: MountainExpectedMetrics = {
  totalRouteLengthM: 500,
  bridgeStartM: 50,
  bridgeEndM: 450,
  bridgeLengthM: 400,
  spanCount: 8,
  nominalSpanM: 50,
  pierCount: 7,
  abutmentCount: 2,
};
