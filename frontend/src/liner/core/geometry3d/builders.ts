/**
 * 3D geometry -> Three.js geometry builders (STEP-3 S3-UX09).
 *
 * Pure functions that convert the Step2 geometry3d payload into typed arrays
 * for Three.js BufferGeometry. No geometry is computed here: the payload is
 * consumed as-is (UI never re-implements the road/bridge geometry solvers).
 */
import type {
  BridgeGeometry3dPayload,
  EdgePoint3d,
  Girder3d,
  Node3d,
  Pier3d,
} from "./types";

/** Float32 positions of a polyline of points. */
export function polylinePositions(points: readonly { x: number; y: number; z: number }[]): Float32Array {
  const positions = new Float32Array(points.length * 3);
  points.forEach((p, i) => {
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  });
  return positions;
}

/** Line segment index pairs (0-1, 1-2, ...) for a polyline. */
export function polylineIndices(pointCount: number): Uint32Array {
  if (pointCount < 2) {
    return new Uint32Array(0);
  }
  const indices = new Uint32Array((pointCount - 1) * 2);
  for (let i = 0; i < pointCount - 1; i += 1) {
    indices[i * 2] = i;
    indices[i * 2 + 1] = i + 1;
  }
  return indices;
}

export interface CenterlineGeometry {
  positions: Float32Array;
  indices: Uint32Array;
}

export function centerlineGeometry(payload: BridgeGeometry3dPayload): CenterlineGeometry | null {
  if (!payload.centerline || payload.centerline.points.length === 0) {
    return null;
  }
  return {
    positions: polylinePositions(payload.centerline.points),
    indices: polylineIndices(payload.centerline.points.length),
  };
}

export interface EdgeGeometry {
  left: CenterlineGeometry | null;
  right: CenterlineGeometry | null;
}

function edgeGeometry(points: readonly EdgePoint3d[]): CenterlineGeometry | null {
  if (points.length === 0) return null;
  return { positions: polylinePositions(points), indices: polylineIndices(points.length) };
}

export function edgesGeometry(payload: BridgeGeometry3dPayload): EdgeGeometry {
  return {
    left: payload.edges ? edgeGeometry(payload.edges.left.points) : null,
    right: payload.edges ? edgeGeometry(payload.edges.right.points) : null,
  };
}

/** Positions for pier support points (points, not lines). */
export function pierPositions(pier: Pier3d): Float32Array {
  return polylinePositions(pier.supports);
}

/** Positions for girder node polylines. */
export function girderGeometry(girder: Girder3d): CenterlineGeometry | null {
  if (girder.nodes.length === 0) return null;
  return {
    positions: polylinePositions(girder.nodes),
    indices: polylineIndices(girder.nodes.length),
  };
}

/** Positions for standalone node markers. */
export function nodePositions(nodes: readonly Node3d[]): Float32Array {
  return polylinePositions(nodes);
}
