/**
 * Wave 1 mock road fixture (Lane V).
 *
 * A simple approach -> bridge deck -> approach road strip along the bridge
 * axis. Replaced by road module / ProjectModel adapter output in later waves.
 */

import type { Point3D, RoadLayerData } from "../layerContract";
import { mockTerrainHeight } from "./mockTerrain";

export const MOCK_BRIDGE_START_X = 18;
export const MOCK_BRIDGE_END_X = 162;
export const MOCK_DECK_ELEVATION = 40;
export const MOCK_ROAD_WIDTH = 8;

export function createMockRoadLayerData(): RoadLayerData {
  const alignment: Point3D[] = [];
  for (let x = -10; x <= 220; x += 5) {
    const onBridge = x >= MOCK_BRIDGE_START_X && x <= MOCK_BRIDGE_END_X;
    const z = onBridge ? MOCK_DECK_ELEVATION : mockTerrainHeight(x, 0) + 2;
    alignment.push({ x, y: 0, z });
  }
  return {
    kind: "road",
    alignment,
    width: MOCK_ROAD_WIDTH,
    surfaceColor: "#3b3b3b",
  };
}