/**
 * Wave 1 mock existing-conditions fixture (Lane V).
 *
 * River under the bridge, a crossing existing road, a parallel railway and a
 * building. Elevations follow the mock terrain so entities sit on the ground.
 */

import type { ExistingConditionsLayerData, ExistingEntity3D, Point3D } from "../layerContract";
import { mockTerrainHeight } from "./mockTerrain";

export const MOCK_RIVER_X = 130;
export const MOCK_CROSSING_ROAD_X = 55;
export const MOCK_RAILWAY_Y = 38;
export const MOCK_BUILDING_CENTER = { x: 195, y: 25 };

export function createMockExistingConditionsLayerData(): ExistingConditionsLayerData {
  const entities: ExistingEntity3D[] = [];

  const river: Point3D[] = [];
  for (let y = -40; y <= 40; y += 8) {
    river.push({ x: MOCK_RIVER_X, y, z: mockTerrainHeight(MOCK_RIVER_X, y) - 0.3 });
  }
  entities.push({
    id: "river-1",
    type: "river",
    geometry: { geometryKind: "polyline", points: river },
    color: "#4a7cbf",
  });

  const crossingRoad: Point3D[] = [];
  for (let y = -40; y <= 40; y += 8) {
    crossingRoad.push({ x: MOCK_CROSSING_ROAD_X, y, z: mockTerrainHeight(MOCK_CROSSING_ROAD_X, y) + 0.2 });
  }
  entities.push({
    id: "existing-road-1",
    type: "road",
    geometry: { geometryKind: "polyline", points: crossingRoad },
    color: "#6b6b6b",
  });

  const railway: Point3D[] = [];
  for (let x = -10; x <= 220; x += 5) {
    railway.push({ x, y: MOCK_RAILWAY_Y, z: mockTerrainHeight(x, MOCK_RAILWAY_Y) + 0.3 });
  }
  entities.push({
    id: "railway-1",
    type: "railway",
    geometry: { geometryKind: "polyline", points: railway },
    color: "#555555",
  });

  const b = MOCK_BUILDING_CENTER;
  const baseZ = mockTerrainHeight(b.x, b.y) + 1;
  entities.push({
    id: "building-1",
    type: "building",
    geometry: {
      geometryKind: "polygon",
      points: [
        { x: b.x - 8, y: b.y - 6, z: baseZ },
        { x: b.x + 8, y: b.y - 6, z: baseZ },
        { x: b.x + 8, y: b.y + 6, z: baseZ },
        { x: b.x - 8, y: b.y + 6, z: baseZ },
      ],
    },
    color: "#d9a066",
  });

  return { kind: "existingConditions", entities };
}