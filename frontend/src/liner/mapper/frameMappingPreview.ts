import type {
  GridPointPreparation,
  MemberPreparation,
  NodePreparation,
} from "../core/types";
import { frameMemberId, frameNodeIdForGridPoint } from "./frameIds";

export function prepareFrameNodes(
  linerModelId: string,
  gridPoints: GridPointPreparation[],
  sourceRevision: string,
): NodePreparation[] {
  return gridPoints.map((point) => ({
    id: frameNodeIdForGridPoint(point),
    gridPointId: point.id,
    x: point.x,
    y: point.y,
    z: point.z,
    provenance: {
      alignmentId: point.source.alignmentId,
      elementId: point.source.elementId,
      sourceRevision,
    },
  }));
}

export function prepareStationPairMember(
  linerModelId: string,
  nodeI: NodePreparation,
  nodeJ: NodePreparation,
  stationIId: string,
  stationJId: string,
  longitudinalIndex: number,
  transverseIndex: number,
): MemberPreparation {
  return {
    id: frameMemberId(linerModelId, "L", longitudinalIndex, transverseIndex),
    nodeIId: nodeI.id,
    nodeJId: nodeJ.id,
    stationIId,
    stationJId,
    direction: "longitudinal",
    provenance: {
      alignmentId: nodeI.provenance.alignmentId,
      sourceRevision: nodeI.provenance.sourceRevision,
    },
  };
}
