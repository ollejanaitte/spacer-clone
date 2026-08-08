/**
 * Cross-section placement frames (Phase 6-1D).
 *
 * Builds the bridge-side cross-section frame at a station: a right-handed local
 * frame (longitudinal = tangent, transverse = normal, vertical = binormal) plus
 * skew rotation and elevation, all sampled from the Alignment Connector (LINER
 * authority). No road-alignment math is reimplemented here.
 *
 * Skew convention (frozen skew_crossfall_contract.md): skew is the angle between
 * a transverse line and the alignment normal; canonical unit rad; the (tangent,
 * normal) frame is rotated about the vertical (binormal/+Z) axis by `skew`;
 * skew = 0 => perpendicular to the alignment.
 */

import { type AlignmentConnector } from "./contracts";
import type { CrossSectionFrame, LocalFrame3, Vec3 } from "./types";

export type CrossSectionFrameRequest = {
  sectionId: string;
  stationM: number;
  /** radians; default 0 (orthogonal). */
  skewRad?: number;
};

/** Rotate an in-plane vector about the vertical axis by `skew` rad. */
function rotateAboutVertical(
  tangent: Vec3,
  normal: Vec3,
  skewRad: number,
): { tangent: Vec3; normal: Vec3 } {
  if (skewRad === 0) {
    return { tangent, normal };
  }
  const c = Math.cos(skewRad);
  const s = Math.sin(skewRad);
  const apply = (base: Vec3, perp: Vec3, sign: 1 | -1): Vec3 => ({
    x: c * base.x + sign * s * perp.x,
    y: c * base.y + sign * s * perp.y,
    z: c * base.z + sign * s * perp.z,
  });
  return {
    tangent: apply(tangent, normal, 1),
    normal: apply(normal, tangent, -1),
  };
}

/**
 * Build the cross-section placement frame at a station.
 */
export function buildCrossSectionFrame(
  request: CrossSectionFrameRequest,
  connector: AlignmentConnector,
  alignmentId: string,
): CrossSectionFrame {
  const sample = connector.samplePoint({ alignmentId, stationM: request.stationM, offsetM: 0 });
  const skewRad = request.skewRad ?? 0;
  const rotated = rotateAboutVertical(sample.tangent, sample.transverse, skewRad);
  const localFrame: LocalFrame3 = {
    tangent: rotated.tangent,
    normal: rotated.normal,
    binormal: sample.vertical,
  };
  return {
    id: `XSEC-${request.sectionId}-${request.stationM}`,
    sectionId: request.sectionId,
    stationM: request.stationM,
    position: sample.position,
    localFrame,
    skewRad,
    transverseAxis: rotated.normal,
    elevationM: sample.position.z,
  };
}

/**
 * Build cross-section frames for a list of stations (e.g. support stations and
 * span mid-points for Reference Bridge 001).
 */
export function buildCrossSectionFrames(
  requests: CrossSectionFrameRequest[],
  connector: AlignmentConnector,
  alignmentId: string,
): CrossSectionFrame[] {
  return requests.map((request) => buildCrossSectionFrame(request, connector, alignmentId));
}

/** Default RB-001 verification stations: support lines 0/40.201/91.201/134.001. */
export const RB001_SECTION_STATIONS = [0, 40.201, 91.201, 134.001];
