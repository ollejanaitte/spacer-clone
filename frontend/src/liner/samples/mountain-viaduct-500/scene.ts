/**
 * Unified 3D scene contract (MAIN3D P03).
 *
 * Combines terrain / road / bridge (superstructure) / substructure / frame
 * into one scene with stable IDs. Extends the existing geometry3d payload
 * WITHOUT breaking it: layers are additive and all IDs are stable.
 *
 * Data flow (no UI-side geometry recomputation):
 *   Project State (draft)
 *     -> solvers (evaluateAlignmentAtDistance / elevationAt / pierLineGeometry)
 *     -> terrain heightfield (deterministic)
 *     -> substructure builders (column/cap/support)
 *     -> frame (existing mapToFrameModel via buildLinerViewerReviewFromDraft)
 *     -> Unified3DScene
 */
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import { evaluateAlignmentAtDistance } from "../../core/geometry/horizontal";
import { elevationAt } from "../../core/elevationAt";
import { buildTerrainHeightfield, buildTerrainIndices, terrainElevation } from "./terrain";
import { resolveSupportMarkers } from "./markers";
import { buildSubstructure3d, type SubstructureElement3d } from "./substructure";
import { cameraStateForPreset } from "./camera";
import { MOUNTAIN_CAMERA_PRESETS } from "./fixture";

export type SceneLayer = "terrain" | "road" | "superstructure" | "substructure" | "frame";

export interface RoadLayer3d {
  points: { x: number; y: number; z: number }[];
}

export interface BridgeLayer3d {
  /** deck / superstructure span polylines (station pairs) with deck Z. */
  spans: { id: string; startX: number; startY: number; startZ: number; endX: number; endY: number; endZ: number }[];
}

export interface FrameLayer3d {
  nodes: { id: string; x: number; y: number; z: number }[];
  members: { id: string; nodeI: string; nodeJ: string }[];
}

export interface LayerState {
  terrain: boolean;
  road: boolean;
  superstructure: boolean;
  substructure: boolean;
  frame: boolean;
}

export interface SceneBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface Unified3DScene {
  layers: { [K in SceneLayer]: boolean };
  terrain: {
    positions: Float32Array;
    indices: Uint32Array;
    widths: number;
    depths: number;
  };
  road: RoadLayer3d;
  bridge: BridgeLayer3d;
  substructure: SubstructureElement3d[];
  frame: FrameLayer3d | null;
  bounds: SceneBounds;
  camera: ReturnType<typeof cameraStateForPreset>;
}

export const DEFAULT_LAYER_STATE: LayerState = {
  terrain: true,
  road: true,
  superstructure: true,
  substructure: true,
  frame: true,
};

/** Sample road centerline points every `step` meters (existing solver). */
export function buildRoadLayer(
  draft: BuildIntermediateInput,
  step = 5,
): RoadLayer3d {
  const total = draft.alignment.elements.reduce((s, e) => s + e.length, 0);
  const points: RoadLayer3d["points"] = [];
  for (let d = 0; d <= total; d += step) {
    const ev = evaluatePoint(d, draft);
    points.push(ev);
  }
  return { points };
}

/** Bridge deck spans from draft spans (deck Z = road elevation). */
export function buildBridgeLayer(draft: BuildIntermediateInput): BridgeLayer3d {
  const spans: BridgeLayer3d["spans"] = [];
  for (const span of draft.spans ?? []) {
    const start = evaluatePoint(span.startPhysicalDistance, draft);
    const end = evaluatePoint(span.endPhysicalDistance, draft);
    spans.push({
      id: span.id,
      startX: start.x,
      startY: start.y,
      startZ: start.z,
      endX: end.x,
      endY: end.y,
      endZ: end.z,
    });
  }
  return { spans };
}

/** Build the complete unified scene for the mountain sample draft. */
export function buildUnified3DScene(
  draft: BuildIntermediateInput,
  presetId = "overview",
  layerState: LayerState = DEFAULT_LAYER_STATE,
): Unified3DScene {
  const heightfield = buildTerrainHeightfield();
  const { markers } = resolveSupportMarkers(draft);
  const substructure = buildSubstructure3d(draft).elements;
  const road = buildRoadLayer(draft);
  const bridge = buildBridgeLayer(draft);

  const bounds = computeBounds(draft, markers, heightfield);

  return {
    layers: { ...layerState },
    terrain: {
      positions: heightfield.positions,
      indices: buildTerrainIndices(heightfield.widths, heightfield.depths),
      widths: heightfield.widths,
      depths: heightfield.depths,
    },
    road,
    bridge,
    substructure,
    frame: null,
    bounds,
    camera: cameraStateForPreset(MOUNTAIN_CAMERA_PRESETS, presetId),
  };
}

/** Evaluate XY at distance, Z via elevation (existing solvers only). */
function evaluatePoint(
  d: number,
  draft: BuildIntermediateInput,
): { x: number; y: number; z: number } {
  const ev = evaluateAlignmentAtDistance(draft.alignment, d);
  const z = draft.verticalAlignment ? elevationAt(d, draft.verticalAlignment) ?? 0 : 0;
  return { x: ev.point.x, y: ev.point.y, z };
}

/** Scene bounds from road points, supports and terrain extents. */
function computeBounds(
  draft: BuildIntermediateInput,
  markers: { x: number; y: number; z: number }[],
  heightfield: { positions: Float32Array },
): SceneBounds {
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  for (const marker of markers) {
    xs.push(marker.x);
    ys.push(marker.y);
    zs.push(marker.z);
  }
  for (const p of heightfield.positions) {
    // positions are x,z,y triplets
  }
  const positions = heightfield.positions;
  for (let i = 0; i < positions.length; i += 3) {
    xs.push(positions[i]);
    zs.push(positions[i + 1]);
    ys.push(positions[i + 2]);
  }
  const min = (arr: number[]) => Math.min(...arr);
  const max = (arr: number[]) => Math.max(...arr);
  return {
    minX: min(xs),
    maxX: max(xs),
    minY: min(ys),
    maxY: max(ys),
    minZ: min(zs),
    maxZ: max(zs),
  };
}

export { terrainElevation };
