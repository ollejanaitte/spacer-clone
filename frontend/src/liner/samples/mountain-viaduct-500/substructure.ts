/**
 * Mountain sample — substructure 3D builders (MAIN3D P02).
 *
 * Generates simplified abutment / pier 3D meshes (column + cap + support zone)
 * from the canonical Bridge Geometry:
 *   - placement: markers.ts (station -> X/Y via solver, Z via elevationAt)
 *   - height   : road/bridge top Z minus terrain elevation (never hand-placed)
 *   - direction: pier line direction from skew (pierLineGeometry)
 *
 * Output is box-geometry data (center/size) that the 3D viewer turns into
 * meshes; no geometry is recomputed on the Three.js side.
 */
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import { terrainElevation } from "./terrain";
import { resolveSupportMarkers, type SupportMarker3d } from "./markers";

export interface Box3d {
  centerX: number;
  centerY: number;
  centerZ: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
}

export interface SubstructureElement3d {
  id: string;
  kind: "abutment" | "pier";
  station: number;
  topZ: number;
  groundZ: number;
  pierHeight: number;
  /** plan orientation (radians) of the pier line. */
  directionAngle: number;
  boxes: Box3d[];
}

export interface Substructure3dBundle {
  elements: SubstructureElement3d[];
}

const PIER_COLUMN_SIZE_X = 2.4;
const PIER_COLUMN_SIZE_Z = 2.4;
const PIER_CAP_WIDTH = 8.5; // transverse
const PIER_CAP_HEIGHT = 1.2;
const SUPPORT_ZONE_HEIGHT = 0.8;

/** Build a single pier/abutment element's boxes from a marker. */
export function buildSubstructureElement(
  marker: SupportMarker3d,
  settings: { columnSize: number; capWidth: number; capHeight: number } = {
    columnSize: PIER_COLUMN_SIZE_X,
    capWidth: PIER_CAP_WIDTH,
    capHeight: PIER_CAP_HEIGHT,
  },
): SubstructureElement3d {
  const groundZ = terrainElevation(marker.x, marker.y);
  const topZ = marker.z;
  const pierHeight = Math.max(0, topZ - groundZ);
  const directionAngle = Math.atan2(marker.direction.y, marker.direction.x);

  const boxes: Box3d[] = [];
  if (pierHeight > 0) {
    // column (vertical box) from ground to cap bottom
    boxes.push({
      centerX: marker.x,
      centerY: marker.y,
      centerZ: groundZ + pierHeight / 2,
      sizeX: settings.columnSize,
      sizeY: settings.columnSize,
      sizeZ: pierHeight,
    });
    // pier head / cap (transverse, wider box) under the deck
    boxes.push({
      centerX: marker.x,
      centerY: marker.y,
      centerZ: topZ - settings.capHeight / 2,
      sizeX: settings.capWidth,
      sizeY: settings.columnSize,
      sizeZ: settings.capHeight,
    });
    // support zone (thin box at the very top)
    boxes.push({
      centerX: marker.x,
      centerY: marker.y,
      centerZ: topZ - SUPPORT_ZONE_HEIGHT / 2,
      sizeX: settings.capWidth + 0.6,
      sizeY: settings.columnSize + 0.6,
      sizeZ: SUPPORT_ZONE_HEIGHT,
    });
  }

  return {
    id: marker.id,
    kind: marker.kind,
    station: marker.station,
    topZ,
    groundZ,
    pierHeight,
    directionAngle,
    boxes,
  };
}

/** Build all substructure elements (A1/P1..P7/A2). */
export function buildSubstructure3d(draft: BuildIntermediateInput): Substructure3dBundle {
  const { markers } = resolveSupportMarkers(draft);
  return {
    elements: markers.map((marker) => buildSubstructureElement(marker)),
  };
}
