/**
 * Member placement + cross girder references (Phase 6-2).
 *
 * Builds `MemberPlacementReference` (main girders per span, cross beams, bracing)
 * and `CrossGirderReference` from declared input, using the Alignment Connector
 * (LINER) only for endpoint coordinates. No road-alignment math here.
 */

import { type AlignmentConnector } from "./contracts";
import type {
  CrossGirderReference,
  CrossGirderSpec,
  GirderLine,
  LocalFrame3,
  MemberKind,
  MemberPlacementReference,
  Vec3,
} from "./types";

export type MainGirderMemberRequest = {
  girderLines: GirderLine[];
  supportStationsM: number[];
  connector: AlignmentConnector;
  alignmentId: string;
};

function frameFromPoints(a: Vec3, b: Vec3): LocalFrame3 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dy, dz) || 1;
  const tangent = { x: dx / length, y: dy / length, z: dz / length };
  // transverse = horizontal-normal to tangent; vertical = binormal (right-handed)
  const vertical = { x: 0, y: 0, z: 1 };
  const tCrossV = {
    x: tangent.y * vertical.z - tangent.z * vertical.y,
    y: tangent.z * vertical.x - tangent.x * vertical.z,
    z: tangent.x * vertical.y - tangent.y * vertical.x,
  };
  const tCrossVLen = Math.hypot(tCrossV.x, tCrossV.y, tCrossV.z) || 1;
  const normal = { x: tCrossV.x / tCrossVLen, y: tCrossV.y / tCrossVLen, z: tCrossV.z / tCrossVLen };
  const binormal = {
    x: tangent.y * normal.z - tangent.z * normal.y,
    y: tangent.z * normal.x - tangent.x * normal.z,
    z: tangent.x * normal.y - tangent.y * normal.x,
  };
  return { tangent, normal, binormal };
}

/** Sample a girder-line point at a station (endpoint of a member). */
export function sampleGirderPoint(
  girderLine: GirderLine,
  stationM: number,
  offsetM: number,
  connector: AlignmentConnector,
  alignmentId: string,
): { id: string; stationM: number; offsetM: number; position: Vec3; localFrame: LocalFrame3 } {
  const sample = connector.samplePoint({ alignmentId, stationM, offsetM });
  return {
    id: `GIRL-${girderLine.girderId}-SP-${stationM}`,
    stationM,
    offsetM,
    position: sample.position,
    localFrame: sample.localFrame,
  };
}

/**
 * Main girder members: one member per span per girder line, between consecutive
 * support stations. The girder line's offset is used for endpoint sampling.
 */
export function buildMainGirderMembers(
  request: MainGirderMemberRequest,
): MemberPlacementReference[] {
  const { girderLines, supportStationsM, connector, alignmentId } = request;
  if (supportStationsM.length < 2) {
    return [];
  }
  const refs: MemberPlacementReference[] = [];
  for (const girderLine of girderLines) {
    const offsetM = girderLine.offsetM.value ?? 0;
    for (let i = 0; i < supportStationsM.length - 1; i += 1) {
      const a = sampleGirderPoint(girderLine, supportStationsM[i], offsetM, connector, alignmentId);
      const b = sampleGirderPoint(girderLine, supportStationsM[i + 1], offsetM, connector, alignmentId);
      refs.push({
        id: `MBR-${girderLine.girderId}-SP${i + 1}`,
        memberId: `M-${girderLine.girderId}-S${i + 1}`,
        kind: "mainGirder",
        fromPointId: a.id,
        toPointId: b.id,
        localFrame: frameFromPoints(a.position, b.position),
      });
    }
  }
  return refs;
}

/**
 * Cross girder references at declared stations, connecting the given girder ids.
 */
export function buildCrossGirderReferences(
  specs: CrossGirderSpec[],
  allGirderIds: string[],
): CrossGirderReference[] {
  return specs.map((spec) => ({
    id: `XGR-${spec.crossGirderId}`,
    crossGirderId: spec.crossGirderId,
    stationM: spec.stationM,
    connectedGirderIds: spec.connectedGirderIds ?? allGirderIds,
  }));
}

/** Reference Bridge 001 cross girder layout (declared: cross girders at supports). */
export const RB001_CROSS_GIRDER_SPECS: CrossGirderSpec[] = [
  { crossGirderId: "GE1", stationM: 0 },
  { crossGirderId: "C1", stationM: 40.201 },
  { crossGirderId: "C2", stationM: 91.201 },
  { crossGirderId: "GE2", stationM: 134.001 },
];

export type { MemberKind };
