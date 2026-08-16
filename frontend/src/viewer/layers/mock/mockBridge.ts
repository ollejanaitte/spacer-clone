/**
 * Wave 1 mock bridge superstructure + bearings fixture (Lane V).
 *
 * A 4-span / 5-support continuous deck: two plate girders, deck slab and
 * cross beams. Bearings sit at each support on the girder bottom.
 */

import type { BearingLayerData, OrientedBox3D, SuperstructureLayerData } from "../layerContract";
import { MOCK_BRIDGE_END_X, MOCK_BRIDGE_START_X, MOCK_DECK_ELEVATION } from "./mockRoad";

/** Support station x (A1, P1..P3, A2). Shared with mockSubstructure. */
export const MOCK_SUPPORT_X = [MOCK_BRIDGE_START_X, 55, 90, 125, MOCK_BRIDGE_END_X];

export const MOCK_GIRDER_Y = [-3, 3];
export const MOCK_DECK_HALF_WIDTH = 5;
export const MOCK_CROSSBEAM_SPACING = 17.5;

export function createMockSuperstructureLayerData(): SuperstructureLayerData {
  const spanStart = MOCK_BRIDGE_START_X;
  const spanEnd = MOCK_BRIDGE_END_X;
  const spanLength = spanEnd - spanStart;
  const centerX = (spanStart + spanEnd) / 2;

  const girders: OrientedBox3D[] = MOCK_GIRDER_Y.map((y) => ({
    id: `girder-${y >= 0 ? "r" : "l"}`,
    center: { x: centerX, y, z: MOCK_DECK_ELEVATION - 0.7 },
    size: { x: spanLength, y: 0.9, z: 1.6 },
    color: "#6d7680",
  }));

  const crossBeams: OrientedBox3D[] = [];
  const beamCount = Math.floor(spanLength / MOCK_CROSSBEAM_SPACING);
  for (let i = 0; i <= beamCount; i += 1) {
    const x = spanStart + 8 + i * MOCK_CROSSBEAM_SPACING;
    if (x > spanEnd) break;
    crossBeams.push({
      id: `crossbeam-${i}`,
      center: { x, y: 0, z: MOCK_DECK_ELEVATION - 1.1 },
      size: { x: 0.6, y: MOCK_DECK_HALF_WIDTH * 2 - 1.4, z: 1.2 },
      color: "#7b8590",
    });
  }

  const deck: OrientedBox3D = {
    id: "deck",
    center: { x: centerX, y: 0, z: MOCK_DECK_ELEVATION + 0.15 },
    size: { x: spanLength, y: MOCK_DECK_HALF_WIDTH * 2, z: 0.5 },
    color: "#9aa0a6",
  };

  return { kind: "superstructure", girders, deck, crossBeams };
}

export function createMockBearingLayerData(): BearingLayerData {
  const bearings: OrientedBox3D[] = [];
  for (const supportX of MOCK_SUPPORT_X) {
    for (const y of MOCK_GIRDER_Y) {
      bearings.push({
        id: `bearing-${supportX}-${y >= 0 ? "r" : "l"}`,
        center: { x: supportX, y, z: MOCK_DECK_ELEVATION - 1.6 },
        size: { x: 0.8, y: 1.0, z: 0.5 },
        color: "#4a4a4a",
      });
    }
  }
  return { kind: "bearing", bearings };
}