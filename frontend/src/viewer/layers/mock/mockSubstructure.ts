/**
 * Wave 1 mock substructure fixture (Lane V).
 *
 * A1/A2 abutments + P1..P3 piers sized against the mock terrain so the bridge
 * rests on the ground. Solids are oriented boxes in the canonical world frame.
 */

import type { OrientedBox3D, SubstructureLayerData, SubstructureSupport3D } from "../layerContract";
import { MOCK_DECK_ELEVATION } from "./mockRoad";
import { MOCK_SUPPORT_X } from "./mockBridge";
import { mockTerrainHeight } from "./mockTerrain";

export const MOCK_COLUMN_TOP_ELEVATION = 38.2;

export function createMockSubstructureLayerData(): SubstructureLayerData {
  const supports: SubstructureSupport3D[] = [];
  for (let i = 0; i < MOCK_SUPPORT_X.length; i += 1) {
    const x = MOCK_SUPPORT_X[i];
    const isAbutment = i === 0 || i === MOCK_SUPPORT_X.length - 1;
    const supportId = isAbutment ? (i === 0 ? "A1" : "A2") : `P${i}`;
    const ground = mockTerrainHeight(x, 0);
    const columnTop = MOCK_COLUMN_TOP_ELEVATION;
    const columnHeight = columnTop - ground;

    const column: OrientedBox3D = {
      id: `${supportId}-column`,
      center: { x, y: 0, z: (ground + columnTop) / 2 },
      size: { x: isAbutment ? 2.6 : 2.4, y: isAbutment ? 8.6 : 6.0, z: columnHeight },
      color: isAbutment ? "#a89f93" : "#b8b1a5",
    };
    const cap: OrientedBox3D = {
      id: `${supportId}-cap`,
      center: { x, y: 0, z: columnTop - 1 },
      size: { x: 2.6, y: isAbutment ? 8.6 : 6.4, z: 2 },
      color: "#b8b1a5",
    };
    const foundation: OrientedBox3D = {
      id: `${supportId}-foundation`,
      center: { x, y: 0, z: ground - 1.5 },
      size: { x: 6.5, y: isAbutment ? 9 : 7, z: 3 },
      color: "#8d8578",
    };

    supports.push({
      id: `sub-${supportId}`,
      supportId,
      kind: isAbutment ? "abutment" : "pier",
      column,
      cap,
      foundation,
    });
  }
  return { kind: "substructure", supports };
}

export function createMockPierCount(): number {
  return MOCK_SUPPORT_X.length - 2;
}