/**
 * Lane V-3 — Real Terrain Adapter (Heightfield / SCT1 / CRS -> TerrainLayerData).
 *
 * Connects Lane T's real terrain output (Heightfield + TerrainDocument
 * projectOrigin) into the unified viewer's TerrainLayerData, WITHOUT
 * re-implementing any CRS conversion inside the viewer.
 *
 * Coordinate mapping (single canonical frame):
 *   - Lane T Heightfield uses survey coordinates (x = easting, y = northing,
 *     z = elevation, EPSG:6674). The layer contract's canonical world frame is
 *     X = along (easting), Y = transverse (northing), Z = elevation (up).
 *   - Therefore easting -> X and northing -> Y directly; elevation -> Z.
 *   - The TerrainDocument.projectOrigin is carried as the viewer render origin
 *     (subtracted at render time by domainToThree), not folded into the data.
 *
 * CRS conversion (lat/lon <-> plane) is Lane T territory and is intentionally
 * NOT implemented here; the horizontal CRS is carried as metadata only.
 */

import type { Heightfield } from "../../terrain/heightfield";
import { NO_DATA } from "../../terrain/heightfield";
import type { TerrainDocument } from "../../next/modules/terrainModule";
import type { LayerBounds, TerrainLayerData } from "../layers/layerContract";

/** Sentinel used by Lane T heightfields (also the viewer contract's noDataValue). */
export const TERRAIN_NO_DATA_VALUE = NO_DATA;

export interface HeightfieldToTerrainLayerOptions {
  /** projectOrigin from the TerrainDocument.coordinateContext (render local origin). */
  readonly projectOrigin?: { readonly x: number; readonly y: number; readonly z: number } | null;
  /** Optional no-data sentinel override (defaults to Lane T NO_DATA = -9999). */
  readonly noDataValue?: number;
}

/**
 * Convert a Lane T Heightfield into a viewer TerrainLayerData in the shared
 * canonical frame. Cell-center rule is preserved: originX/originY are the
 * grid origin and bounds derive from width/height/cellSize exactly as the
 * layer contract's computeTerrainLayerBounds does.
 */
export function heightfieldToTerrainLayer(
  heightfield: Heightfield,
  options?: HeightfieldToTerrainLayerOptions,
): TerrainLayerData {
  const noDataValue = options?.noDataValue ?? TERRAIN_NO_DATA_VALUE;
  return {
    kind: "terrain",
    width: heightfield.width,
    height: heightfield.height,
    cellSize: heightfield.cellSize,
    originX: heightfield.originX,
    originY: heightfield.originY,
    heights: heightfield.data,
    noDataValue,
  };
}

/**
 * Derive the canonical bounds of a real terrain layer from the heightfield
 * grid plus the elevation range over valid (non-no-data) cells.
 */
export function heightfieldLayerBounds(heightfield: Heightfield): LayerBounds {
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < heightfield.data.length; i += 1) {
    const z = heightfield.data[i];
    if (z === heightfield.noDataValue) continue;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  if (minZ === Infinity) {
    minZ = 0;
    maxZ = 0;
  }
  return {
    minX: heightfield.originX,
    minY: heightfield.originY,
    maxX: heightfield.originX + (heightfield.width - 1) * heightfield.cellSize,
    maxY: heightfield.originY + (heightfield.height - 1) * heightfield.cellSize,
    minZ,
    maxZ,
  };
}

/**
 * Extract the projectOrigin (render local origin) from a TerrainDocument.
 * Returns null when absent so the viewer falls back to a zero render origin.
 */
export function projectOriginFromTerrainDocument(
  doc: TerrainDocument,
): { readonly x: number; readonly y: number; readonly z: number } | null {
  const origin = doc.coordinateContext?.projectOrigin;
  if (!origin) return null;
  return { x: origin.x, y: origin.y, z: origin.z };
}
