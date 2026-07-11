import { distance } from "./tolerance";
import type { NormalizedMember, NormalizedNode, SemanticTolerance, Vector3 } from "./types";

export function isFiniteVector(vector: Vector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

export function nodesByKey(nodes: NormalizedNode[]): Map<string, NormalizedNode> {
  return new Map(nodes.map((node) => [node.key, node]));
}

export function memberLength(
  member: NormalizedMember,
  nodeLookup: Map<string, NormalizedNode>,
): number | undefined {
  const nodeI = nodeLookup.get(member.nodeIKey);
  const nodeJ = nodeLookup.get(member.nodeJKey);
  if (!nodeI || !nodeJ) return undefined;
  if (!isFiniteVector(nodeI.position) || !isFiniteVector(nodeJ.position)) return undefined;
  return distance(nodeI.position, nodeJ.position);
}

export function memberLengths(
  members: NormalizedMember[],
  nodeLookup: Map<string, NormalizedNode>,
): number[] {
  const lengths: number[] = [];
  for (const member of members) {
    const length = memberLength(member, nodeLookup);
    if (length !== undefined && Number.isFinite(length)) {
      lengths.push(length);
    }
  }
  return lengths;
}

export function buildUndirectedAdjacency(
  nodes: NormalizedNode[],
  members: NormalizedMember[],
): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.key, new Set());
  }
  for (const member of members) {
    if (member.nodeIKey === member.nodeJKey) continue;
    if (!adjacency.has(member.nodeIKey) || !adjacency.has(member.nodeJKey)) continue;
    adjacency.get(member.nodeIKey)?.add(member.nodeJKey);
    adjacency.get(member.nodeJKey)?.add(member.nodeIKey);
  }
  return adjacency;
}

export function connectedComponents(adjacency: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const nodeKey of [...adjacency.keys()].sort()) {
    if (visited.has(nodeKey)) continue;
    const stack = [nodeKey];
    const component: string[] = [];
    visited.add(nodeKey);
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      component.push(current);
      for (const neighbor of [...(adjacency.get(current) ?? [])].sort()) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
    components.push(component.sort());
  }
  return components.sort((a, b) => a[0].localeCompare(b[0]));
}

export function degreeHistogram(adjacency: Map<string, Set<string>>): Record<string, number> {
  const histogram: Record<string, number> = {};
  for (const neighbors of adjacency.values()) {
    const degree = neighbors.size;
    const key = degree.toString();
    histogram[key] = (histogram[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(histogram).sort(([a], [b]) => Number(a) - Number(b)),
  );
}

export function countParallelEdgeCandidates(members: NormalizedMember[]): number {
  const endpointCounts = new Map<string, number>();
  for (const member of members) {
    endpointCounts.set(member.endpointKey, (endpointCounts.get(member.endpointKey) ?? 0) + 1);
  }
  let count = 0;
  for (const value of endpointCounts.values()) {
    if (value > 1) count += value;
  }
  return count;
}

export function countSelfLoopCandidates(members: NormalizedMember[]): number {
  return members.filter((member) => member.nodeIKey === member.nodeJKey).length;
}

export function computeBoundingBox(nodes: NormalizedNode[]): { min: Vector3; max: Vector3 } {
  const finiteNodes = nodes.filter((node) => isFiniteVector(node.position));
  if (finiteNodes.length === 0) {
    return {
      min: { x: Number.NaN, y: Number.NaN, z: Number.NaN },
      max: { x: Number.NaN, y: Number.NaN, z: Number.NaN },
    };
  }
  let minX = finiteNodes[0].position.x;
  let minY = finiteNodes[0].position.y;
  let minZ = finiteNodes[0].position.z;
  let maxX = minX;
  let maxY = minY;
  let maxZ = minZ;
  for (const node of finiteNodes.slice(1)) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    minZ = Math.min(minZ, node.position.z);
    maxX = Math.max(maxX, node.position.x);
    maxY = Math.max(maxY, node.position.y);
    maxZ = Math.max(maxZ, node.position.z);
  }
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

export function computeCentroid(nodes: NormalizedNode[]): Vector3 {
  const finiteNodes = nodes.filter((node) => isFiniteVector(node.position));
  if (finiteNodes.length === 0) {
    return { x: Number.NaN, y: Number.NaN, z: Number.NaN };
  }
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  for (const node of finiteNodes) {
    sumX += node.position.x;
    sumY += node.position.y;
    sumZ += node.position.z;
  }
  const count = finiteNodes.length;
  return { x: sumX / count, y: sumY / count, z: sumZ / count };
}

export function computeLengthStats(lengths: number[]): {
  min: number;
  max: number;
  mean: number;
  total: number;
  count: number;
} {
  if (lengths.length === 0) {
    return { min: Number.NaN, max: Number.NaN, mean: Number.NaN, total: 0, count: 0 };
  }
  let min = lengths[0];
  let max = lengths[0];
  let total = 0;
  for (const length of lengths) {
    min = Math.min(min, length);
    max = Math.max(max, length);
    total += length;
  }
  return {
    min,
    max,
    mean: total / lengths.length,
    total,
    count: lengths.length,
  };
}

export function normalizeOrientationVector(vector: Vector3): Vector3 | undefined {
  if (!isFiniteVector(vector)) return undefined;
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  if (magnitude === 0) return undefined;
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
    z: vector.z / magnitude,
  };
}

export function orientationDotProduct(left: Vector3, right: Vector3): number | undefined {
  const normalizedLeft = normalizeOrientationVector(left);
  const normalizedRight = normalizeOrientationVector(right);
  if (!normalizedLeft || !normalizedRight) return undefined;
  return normalizedLeft.x * normalizedRight.x
    + normalizedLeft.y * normalizedRight.y
    + normalizedLeft.z * normalizedRight.z;
}

export type MemberLookup = {
  byIdentity: Map<string, NormalizedMember>;
  identity: (member: NormalizedMember) => string;
};

export function createMemberLookup(members: NormalizedMember[]): MemberLookup {
  const identity = (member: NormalizedMember) => `${member.endpointKey}:${member.trace.sourceIndex}`;
  return {
    byIdentity: new Map(members.map((member) => [identity(member), member])),
    identity,
  };
}

export function zeroLengthEpsilon(tolerance: SemanticTolerance): number {
  return tolerance.length.absolute ?? 1e-9;
}
