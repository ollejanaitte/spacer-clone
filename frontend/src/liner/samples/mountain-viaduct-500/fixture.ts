/**
 * Mountain Viaduct 500 — full fixture assembly (MOUNTAIN-SAMPLE P06).
 *
 * Assembles all input sections into a single MountainSampleFixture that can be
 * loaded into normal Project State via loadMountainSample. Also exports the
 * camera presets and the expected metrics fixture.
 */
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import { buildMountainHorizontalAlignment } from "./horizontalFixture";
import {
  applyMountainProfile,
  buildMountainCrossSectionTemplate,
  buildMountainCrossSlopeIntervals,
  buildMountainVerticalProfile,
} from "./verticalFixture";
import {
  applyMountainBridge,
  buildMountainPiers,
  buildMountainSpans,
} from "./bridgeFixture";
import {
  MOUNTAIN_TERRAIN_SETTINGS,
  buildTerrainHeightfield,
  buildTerrainIndices,
} from "./terrain";
import type {
  MountainCameraPreset,
  MountainSampleFixture,
} from "./schema";
import {
  MOUNTAIN_VIADUCT_500_EXPECTED,
  MOUNTAIN_VIADUCT_500_METADATA,
} from "./schema";

export const MOUNTAIN_CAMERA_PRESETS: MountainCameraPreset[] = [
  {
    id: "overview",
    label: "全景",
    position: { x: 250, y: 130, z: 320 },
    target: { x: 250, y: 60, z: 0 },
  },
  {
    id: "bridge",
    label: "橋梁区間",
    position: { x: 250, y: 90, z: 120 },
    target: { x: 250, y: 60, z: 0 },
  },
  {
    id: "follow",
    label: "路面追従",
    position: { x: 80, y: 55, z: 20 },
    target: { x: 420, y: 70, z: 0 },
  },
  {
    id: "valley",
    label: "谷俯瞰",
    position: { x: 150, y: 85, z: 260 },
    target: { x: 250, y: 40, z: 0 },
  },
];

/** Build the full editable LinerDraft for the sample. */
export function buildMountainDraft(): BuildIntermediateInput {
  const alignment = buildMountainHorizontalAlignment();
  const offsets = [0, -3.25, -6, 3.25, 6];
  const base: BuildIntermediateInput = {
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
    },
    verticalAlignment: buildMountainVerticalProfile(),
    crossSections: [
      buildMountainCrossSectionTemplate(alignment.id) as unknown as NonNullable<
        BuildIntermediateInput["crossSections"]
      >[number],
    ],
    offsets,
    sampleInterval: 10,
    z: 0,
    crossSlopeIntervals: buildMountainCrossSlopeIntervals(),
    selectedCrossSectionStation: 0,
  };
  const withBridge = applyMountainBridge(base);
  return withBridge;
}

/** Assemble the complete fixture. */
export function buildMountainViaduct500Fixture(): MountainSampleFixture {
  return {
    metadata: MOUNTAIN_VIADUCT_500_METADATA,
    draft: buildMountainDraft(),
    bridgeStations: {
      A1: 50,
      P1: 100,
      P2: 150,
      P3: 200,
      P4: 250,
      P5: 300,
      P6: 350,
      P7: 400,
      A2: 450,
    },
    spans: buildMountainSpans(),
    piers: buildMountainPiers(),
    terrain: MOUNTAIN_TERRAIN_SETTINGS,
    cameraPresets: MOUNTAIN_CAMERA_PRESETS,
    expected: MOUNTAIN_VIADUCT_500_EXPECTED,
  };
}

export { buildTerrainHeightfield, buildTerrainIndices };

/** Apply profile + bridge to a base draft (used by the picker). */
export function applyMountainSample(draft: BuildIntermediateInput): BuildIntermediateInput {
  const withProfile = applyMountainProfile(draft);
  return applyMountainBridge(withProfile);
}
