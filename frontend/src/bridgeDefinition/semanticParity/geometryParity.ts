import {
  computeBoundingBox,
  computeCentroid,
  computeLengthStats,
  memberLengths,
  nodesByKey,
} from "./modelGraph";
import { compareScalarWithTolerance, distanceWithinTolerance } from "./tolerance";
import type {
  GeometryMetrics,
  MatchedPair,
  NormalizedMember,
  NormalizedModel,
  NormalizedNode,
  ParityMismatch,
  SemanticTolerance,
  Vector3,
} from "./types";

function compareVector(
  left: Vector3,
  right: Vector3,
  tolerance: SemanticTolerance,
  path: string,
): ParityMismatch | undefined {
  const axes: Array<keyof Vector3> = ["x", "y", "z"];
  for (const axis of axes) {
    const result = compareScalarWithTolerance(left[axis], right[axis], tolerance.coordinate);
    if (!result.equal) {
      return {
        category: "geometry",
        path,
        leftValue: left[axis],
        rightValue: right[axis],
        delta: result.delta,
        tolerance: tolerance.coordinate,
        severity: "error",
        message: `Geometry ${path}.${axis} differs beyond coordinate tolerance.`,
      };
    }
  }
  return undefined;
}

export function computeGeometryMetrics(model: NormalizedModel): GeometryMetrics {
  const nodeLookup = nodesByKey(model.nodes);
  const lengths = memberLengths(model.members, nodeLookup);
  return {
    nodeCount: model.nodes.length,
    memberCount: model.members.length,
    boundingBox: computeBoundingBox(model.nodes),
    centroid: computeCentroid(model.nodes),
    memberLengths: computeLengthStats(lengths),
  };
}

export function computeMatchedGeometryMetrics(
  leftNodes: NormalizedNode[],
  rightNodes: NormalizedNode[],
  leftMembers: NormalizedMember[],
  rightMembers: NormalizedMember[],
  nodeMatches: MatchedPair[],
  memberMatches: MatchedPair[],
  tolerance: SemanticTolerance,
): Pick<GeometryMetrics, "maxMatchedNodeDistance" | "maxMatchedMemberLengthDelta" | "matchedMemberLengthDeltas"> {
  const leftNodeByIdentity = new Map(
    leftNodes.map((node) => [`${node.key}:${node.trace.sourceIndex}`, node]),
  );
  const rightNodeByIdentity = new Map(
    rightNodes.map((node) => [`${node.key}:${node.trace.sourceIndex}`, node]),
  );
  const leftNodeLookup = nodesByKey(leftNodes);
  const rightNodeLookup = nodesByKey(rightNodes);

  let maxMatchedNodeDistance = 0;
  for (const match of nodeMatches) {
    const left = leftNodeByIdentity.get(match.leftKey);
    const right = rightNodeByIdentity.get(match.rightKey);
    if (!left || !right) continue;
    const result = distanceWithinTolerance(left.position, right.position, tolerance.coordinate);
    if (Number.isFinite(result.delta)) {
      maxMatchedNodeDistance = Math.max(maxMatchedNodeDistance, result.delta);
    }
  }

  const leftMemberLookup = new Map(
    leftMembers.map((member) => [`${member.endpointKey}:${member.trace.sourceIndex}`, member]),
  );
  const rightMemberLookup = new Map(
    rightMembers.map((member) => [`${member.endpointKey}:${member.trace.sourceIndex}`, member]),
  );
  const matchedMemberLengthDeltas: number[] = [];
  let maxMatchedMemberLengthDelta = 0;
  for (const match of memberMatches) {
    const left = leftMemberLookup.get(match.leftKey);
    const right = rightMemberLookup.get(match.rightKey);
    if (!left || !right) continue;
    const leftLength = memberLengths([left], leftNodeLookup)[0];
    const rightLength = memberLengths([right], rightNodeLookup)[0];
    if (leftLength === undefined || rightLength === undefined) continue;
    const delta = Math.abs(leftLength - rightLength);
    matchedMemberLengthDeltas.push(delta);
    maxMatchedMemberLengthDelta = Math.max(maxMatchedMemberLengthDelta, delta);
  }

  return {
    maxMatchedNodeDistance: nodeMatches.length > 0 ? maxMatchedNodeDistance : undefined,
    maxMatchedMemberLengthDelta: memberMatches.length > 0 ? maxMatchedMemberLengthDelta : undefined,
    matchedMemberLengthDeltas,
  };
}

export function compareGeometryMetrics(
  left: GeometryMetrics,
  right: GeometryMetrics,
  tolerance: SemanticTolerance,
): { equivalent: boolean; mismatches: ParityMismatch[] } {
  const mismatches: ParityMismatch[] = [];

  const boundingBoxMismatch = compareVector(left.boundingBox.min, right.boundingBox.min, tolerance, "boundingBox.min")
    ?? compareVector(left.boundingBox.max, right.boundingBox.max, tolerance, "boundingBox.max");
  if (boundingBoxMismatch) mismatches.push(boundingBoxMismatch);

  const centroidMismatch = compareVector(left.centroid, right.centroid, tolerance, "centroid");
  if (centroidMismatch) mismatches.push(centroidMismatch);

  const lengthComparisons: Array<{ key: "min" | "max" | "mean" | "total"; label: string }> = [
    { key: "min", label: "Minimum member length" },
    { key: "max", label: "Maximum member length" },
    { key: "mean", label: "Mean member length" },
    { key: "total", label: "Total member length" },
  ];
  for (const { key, label } of lengthComparisons) {
    const result = compareScalarWithTolerance(left.memberLengths[key], right.memberLengths[key], tolerance.length);
    if (!result.equal) {
      mismatches.push({
        category: "geometry",
        path: `geometry.memberLengths.${key}`,
        leftValue: left.memberLengths[key],
        rightValue: right.memberLengths[key],
        delta: result.delta,
        tolerance: tolerance.length,
        severity: "error",
        message: `${label} differs beyond tolerance.`,
      });
    }
  }

  if (
    left.maxMatchedNodeDistance !== undefined
    && right.maxMatchedNodeDistance !== undefined
    && left.maxMatchedNodeDistance !== right.maxMatchedNodeDistance
  ) {
    const delta = Math.abs(left.maxMatchedNodeDistance - right.maxMatchedNodeDistance);
    const result = compareScalarWithTolerance(left.maxMatchedNodeDistance, right.maxMatchedNodeDistance, tolerance.coordinate);
    if (!result.equal) {
      mismatches.push({
        category: "node",
        path: "geometry.maxMatchedNodeDistance",
        leftValue: left.maxMatchedNodeDistance,
        rightValue: right.maxMatchedNodeDistance,
        delta,
        tolerance: tolerance.coordinate,
        severity: "warning",
        message: "Matched node distance summary differs between sides.",
      });
    }
  }

  if (left.maxMatchedMemberLengthDelta !== undefined && right.maxMatchedMemberLengthDelta !== undefined) {
    const result = compareScalarWithTolerance(
      left.maxMatchedMemberLengthDelta,
      right.maxMatchedMemberLengthDelta,
      tolerance.length,
    );
    if (!result.equal) {
      mismatches.push({
        category: "member",
        path: "geometry.maxMatchedMemberLengthDelta",
        leftValue: left.maxMatchedMemberLengthDelta,
        rightValue: right.maxMatchedMemberLengthDelta,
        delta: result.delta,
        tolerance: tolerance.length,
        severity: "warning",
        message: "Matched member length delta summary differs between sides.",
      });
    }
  }

  return { equivalent: mismatches.length === 0, mismatches };
}

export function buildGeometryMetrics(
  leftModel: NormalizedModel,
  rightModel: NormalizedModel,
  nodeMatches: MatchedPair[],
  memberMatches: MatchedPair[],
  tolerance: SemanticTolerance,
): { left: GeometryMetrics; right: GeometryMetrics; equivalent: boolean; mismatches: ParityMismatch[] } {
  const leftBase = computeGeometryMetrics(leftModel);
  const rightBase = computeGeometryMetrics(rightModel);
  const matched = computeMatchedGeometryMetrics(
    leftModel.nodes,
    rightModel.nodes,
    leftModel.members,
    rightModel.members,
    nodeMatches,
    memberMatches,
    tolerance,
  );

  const left: GeometryMetrics = { ...leftBase, ...matched };
  const right: GeometryMetrics = { ...rightBase, ...matched };
  const comparison = compareGeometryMetrics(left, right, tolerance);
  return { left, right, ...comparison };
}
