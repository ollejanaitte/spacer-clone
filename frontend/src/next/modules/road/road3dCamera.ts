/**
 * Road 3D camera framing (Phase 7.4).
 *
 * The legacy MountainViaduct3dViewer's preset cameras are framed for the
 * mountain-viaduct sample route and miss the Reference Mountain road (which
 * runs along domain y≈500+). This helper computes a camera that frames the
 * active road's own XY bounds so the 3D preview always shows the centerline.
 *
 * Domain coords -> three coords (shared Render Coordinate Adapter):
 *   three.x = domain.x   three.y = domain.z (height)   three.z = -domain.y
 */

import type { CameraState } from "../../../liner/samples/mountain-viaduct-500/camera";
import type { BuildIntermediateInput } from "../../../liner/core/pipeline/pipeline";
import { evaluateAlignmentAtDistance } from "../../../liner/core/geometry/horizontal";
import { elevationAt } from "../../../liner/core/elevationAt";

const SAMPLE_STEP = 5;

export function roadCameraForDraft(draft: BuildIntermediateInput): CameraState {
  const total = draft.alignment.elements.reduce((s, e) => s + e.length, 0);
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  for (let d = 0; d <= total; d += SAMPLE_STEP) {
    const ev = evaluateAlignmentAtDistance(draft.alignment, d);
    const z = draft.verticalAlignment ? elevationAt(d, draft.verticalAlignment) ?? 0 : 0;
    xs.push(ev.point.x);
    ys.push(ev.point.y);
    zs.push(z);
  }
  if (xs.length === 0) {
    return { position: { x: 250, y: 120, z: 300 }, target: { x: 250, y: 60, z: 0 } };
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxY - minY, 100);
  // Overhead view: the loop road reads as one continuous U-shape.
  const dist = span * 1.0;
  return {
    target: { x: cx, y: cz, z: -cy },
    position: { x: cx, y: cz + dist, z: -cy + dist * 0.15 },
  };
}
