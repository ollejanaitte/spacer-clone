/**
 * Lane V-4 — Real-data unified scene assembler (terrain + road).
 *
 * Builds a UnifiedViewerModel from REAL Reference Business 001 data
 * (Gujo terrain + RB001 road alignment), all expressed in the shared
 * canonical world frame (EPSG:6674: X=easting/along, Y=northing/transverse,
 * Z=elevation). The single render transform (domainToThree) is applied by the
 * viewer; no CRS conversion is re-implemented here. V-5 adds the bridge.
 */

import type { TerrainDocument } from "../../next/modules/terrainModule";
import { Heightfield } from "../../terrain/heightfield";
import { buildGujoSampleHeightfield, GUJO_BOUNDS_EPSG6674 } from "../../terrain";
import type { Rb001RoadSample } from "../../liner/samples/reference-business-001/roadAlignment";
import {
  buildReferenceBusiness001RoadSample,
  buildRb001Vertical,
} from "../../liner/samples/reference-business-001/roadAlignment";
import { evaluateAlignmentAtDistance } from "../../liner/core/geometry/horizontal";
import {
  createViewerLayer,
  type LayerSource,
  type UnifiedViewerModel,
  type ViewerLayer,
  type WorldBasis,
} from "../layers/layerContract";
import { DEFAULT_RENDER_COORDINATE_TRANSFORM } from "../layers/renderCoordinate";
import { heightfieldToTerrainLayer, projectOriginFromTerrainDocument } from "./terrainAdapter";
import { roadAlignmentToLayer, elevationAt } from "./roadAdapter";

const REAL_SOURCE: LayerSource = {
  lane: "V",
  moduleId: "reference-business-001",
  format: "lane-t-terrain+s-liner",
  revision: "2",
};

export interface RealGujoSceneInput {
  readonly terrain: {
    readonly heightfield: Heightfield;
    readonly document?: TerrainDocument | null;
    readonly label?: string;
  };
  readonly road?: Rb001RoadSample | null;
}

/** Canonical world basis for the Gujo Reference Business 001 scene. */
export function createRealGujoWorldBasis(
  projectOrigin?: { readonly x: number; readonly y: number; readonly z: number } | null,
): WorldBasis {
  return {
    id: "gujo-rb001-canonical-epsg6674",
    frame: "canonical-project",
    axes: { x: "along", y: "transverse", z: "elevation" },
    handedness: "right-handed",
    unit: "m",
    elevationConvention: "z-up-tp",
    horizontalCrs: { authority: "EPSG", identifier: "6674" },
    verticalDatum: "tp",
    renderOrigin: projectOrigin ?? null,
    note: "Reference Business 001 Gujo Hachiman, EPSG:6674 (JGD2011 plane rect VII). CRS metadata only; conversion is Lane T territory.",
  };
}

export function buildRealGujoUnifiedScene(input: RealGujoSceneInput): UnifiedViewerModel {
  const terrainLayer = buildTerrainLayer(input.terrain);
  const roadLayer = buildRoadLayer(input.road);

  const layers: ViewerLayer[] = [terrainLayer];
  if (roadLayer) layers.push(roadLayer);

  const origin =
    input.terrain.document
      ? projectOriginFromTerrainDocument(input.terrain.document)
      : null;

  return {
    contractVersion: 1,
    id: "real-gujo-unified-scene",
    worldBasis: createRealGujoWorldBasis(origin),
    renderTransform: DEFAULT_RENDER_COORDINATE_TRANSFORM,
    layers,
    selection: null,
  };
}

function buildTerrainLayer(terrain: RealGujoSceneInput["terrain"]): ViewerLayer {
  const { heightfield, document, label } = terrain;
  const origin = document ? projectOriginFromTerrainDocument(document) : null;
  return createViewerLayer({
    id: "layer-real-terrain",
    data: heightfieldToTerrainLayer(heightfield),
    source: REAL_SOURCE,
    metadata: {
      label: label ?? "Terrain (Gujo)",
      terrainId: document?.terrainId ?? null,
      horizontalCrs: "EPSG:6674",
      renderOrigin: origin ?? null,
    },
  });
}

function buildRoadLayer(road: Rb001RoadSample | null | undefined): ViewerLayer | null {
  if (!road) return null;
  return createViewerLayer({
    id: "layer-real-road",
    data: roadAlignmentToLayer(road),
    source: REAL_SOURCE,
    metadata: {
      label: road.name,
      roadId: road.id,
      horizontalCrs: "EPSG:6674",
    },
  });
}

// ---------------------------------------------------------------------------
// Representative full-bounds Gujo terrain (covers the RB001 road corridor)
// ---------------------------------------------------------------------------
//
// The committed Lane T fixture is a representative 32×32 grid (155 m wide)
// that does not cover the RB001 road corridor (road y ≈ -26,900 .. -28,066).
// For the combined real scene we build a deterministic heightfield over the
// DOCUMENTED full Gujo bounds (X 83,996..89,050 / Y -29,697..-24,665,
// elevation band 200..1,200 m, docs/development/reference-business-001-gujo-baseline.md).
// The river (Nagara) incision is centered on the RB001 bridge crossing derived
// from the real road alignment, so the road sits at grade on the approaches and
// the bridge (V-5) stands above the river valley.

export const GUJO_FULL_BOUNDS = {
  minX: GUJO_BOUNDS_EPSG6674.minX,
  minY: GUJO_BOUNDS_EPSG6674.minY,
  maxX: GUJO_BOUNDS_EPSG6674.maxX,
  maxY: GUJO_BOUNDS_EPSG6674.maxY,
} as const;

export const GUJO_FULL_TERRAIN_CELL_SIZE = 25;

const RB001_BRIDGE_CROSSING_STATION = 1350;
const CHANNEL_DEPTH = 70;
const CHANNEL_HALF_WIDTH = 200;
const MOUNTAIN_TOP_RISE = 750;
const MOUNTAIN_RISE_DISTANCE = 2400;
const ROAD_ALONG_BEFORE_BRIDGE = 1400;
const ROAD_ALONG_AFTER_BRIDGE = 1100;
const ELEVATION_CLAMP_MIN = 180;
const ELEVATION_CLAMP_MAX = 1250;

/** Road direction (unit vector, canonical X/Y) at the bridge crossing. */
function bridgeCrossingDirection(): { readonly x: number; readonly y: number } {
  const road = buildReferenceBusiness001RoadSample();
  const a = evaluateAlignmentAtDistance(road.horizontal, RB001_BRIDGE_CROSSING_STATION).point;
  const b = evaluateAlignmentAtDistance(road.horizontal, RB001_BRIDGE_CROSSING_STATION + 50).point;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

/** Road direction + the right-hand perpendicular (river-along) at the crossing. */
export function gujoBridgeCrossingFrame(): {
  readonly center: { readonly x: number; readonly y: number };
  readonly dir: { readonly x: number; readonly y: number };
  readonly normal: { readonly x: number; readonly y: number };
} {
  const road = buildReferenceBusiness001RoadSample();
  const center = evaluateAlignmentAtDistance(road.horizontal, RB001_BRIDGE_CROSSING_STATION).point;
  const dir = bridgeCrossingDirection();
  const normal = { x: -dir.y, y: dir.x };
  return { center, dir, normal };
}

/** Representative deterministic terrain height for the full Gujo bounds. */
export function representativeGujoTerrainHeight(x: number, y: number): number {
  const frame = gujoBridgeCrossingFrame();
  const dx = x - frame.center.x;
  const dy = y - frame.center.y;
  const u = dx * frame.dir.x + dy * frame.dir.y; // along the road (station - crossing)
  const v = dx * frame.normal.x + dy * frame.normal.y; // lateral to the road

  const station = Math.min(Math.max(RB001_BRIDGE_CROSSING_STATION + u, 0), 2450);
  const roadZ = elevationAt(station, buildRb001Vertical());

  const channel = CHANNEL_DEPTH * Math.exp(-((u / CHANNEL_HALF_WIDTH) ** 2));

  const dAlong = Math.max(0, -u - ROAD_ALONG_BEFORE_BRIDGE, u - ROAD_ALONG_AFTER_BRIDGE);
  const d = Math.hypot(v, dAlong);
  const rise = MOUNTAIN_TOP_RISE * Math.min(1, (d / MOUNTAIN_RISE_DISTANCE) ** 2);

  const z = roadZ - channel + rise;
  return Math.min(ELEVATION_CLAMP_MAX, Math.max(ELEVATION_CLAMP_MIN, z));
}

/** Build the representative full-bounds Gujo Heightfield (deterministic, offline). */
export function buildRepresentativeGujoTerrainHeightfield(): Heightfield {
  const { minX, minY, maxX, maxY } = GUJO_FULL_BOUNDS;
  const cellSize = GUJO_FULL_TERRAIN_CELL_SIZE;
  const width = Math.ceil((maxX - minX) / cellSize) + 1;
  const height = Math.ceil((maxY - minY) / cellSize) + 1;
  const data = new Float32Array(width * height);
  for (let j = 0; j < height; j += 1) {
    const y = minY + j * cellSize;
    for (let i = 0; i < width; i += 1) {
      const x = minX + i * cellSize;
      data[j * width + i] = representativeGujoTerrainHeight(x, y);
    }
  }
  return new Heightfield(
    { width, height, cellSize, originX: minX, originY: minY, rowMajor: true },
    data,
  );
}

/** Real terrain + RB001 road scene over the full Gujo bounds. */
export function buildRealGujoRoadScene(): UnifiedViewerModel {
  return buildRealGujoUnifiedScene({
    terrain: {
      heightfield: buildRepresentativeGujoTerrainHeightfield(),
      document: null,
      label: "Terrain (Gujo full-bounds representative)",
    },
    road: buildReferenceBusiness001RoadSample(),
  });
}

/** V-3 real terrain scene using the Lane T Gujo DEM sample fixture. */
export function buildRealGujoTerrainScene(): UnifiedViewerModel {
  return buildRealGujoUnifiedScene({
    terrain: {
      heightfield: buildGujoSampleHeightfield(),
      document: null,
      label: "Terrain (Gujo DEM sample fixture)",
    },
  });
}