import { distanceWithinTolerance } from "./tolerance";
import type { MatchResult, NormalizedNode, SemanticTolerance } from "./types";

type Candidate = {
  left: NormalizedNode;
  right: NormalizedNode;
  delta: number;
};

function unmatchedNode(side: "left" | "right", node: NormalizedNode, reason: string) {
  return {
    side,
    key: node.key,
    sourceId: node.sourceId,
    path: node.trace.sourcePath,
    reason,
  };
}

export function matchNormalizedNodes(
  leftNodes: NormalizedNode[],
  rightNodes: NormalizedNode[],
  tolerance: SemanticTolerance,
): MatchResult {
  const candidates: Candidate[] = [];
  for (const left of leftNodes) {
    for (const right of rightNodes) {
      const result = distanceWithinTolerance(left.position, right.position, tolerance.coordinate);
      if (result.equal) {
        candidates.push({ left, right, delta: result.delta });
      }
    }
  }

  candidates.sort((a, b) =>
    a.delta - b.delta
    || a.left.key.localeCompare(b.left.key)
    || a.right.key.localeCompare(b.right.key)
    || a.left.trace.sourceIndex - b.left.trace.sourceIndex
    || a.right.trace.sourceIndex - b.right.trace.sourceIndex
  );

  const byLeft = new Map<string, Candidate[]>();
  const byRight = new Map<string, Candidate[]>();
  const identity = (node: NormalizedNode) => `${node.key}:${node.trace.sourceIndex}`;
  for (const candidate of candidates) {
    const leftKey = identity(candidate.left);
    const rightKey = identity(candidate.right);
    byLeft.set(leftKey, [...(byLeft.get(leftKey) ?? []), candidate]);
    byRight.set(rightKey, [...(byRight.get(rightKey) ?? []), candidate]);
  }

  const matched: MatchResult["matched"] = [];
  const ambiguities: MatchResult["ambiguities"] = [];
  const matchedLeft = new Set<string>();
  const matchedRight = new Set<string>();
  const ambiguousLeft = new Set<string>();
  const ambiguousRight = new Set<string>();

  for (const left of leftNodes) {
    const leftIdentity = identity(left);
    const leftCandidates = byLeft.get(leftIdentity) ?? [];
    if (leftCandidates.length === 0) continue;
    const uniqueRightIdentities = new Set(leftCandidates.map((candidate) => identity(candidate.right)));
    if (uniqueRightIdentities.size > 1) {
      ambiguities.push({
        category: "node",
        leftKeys: [left.key],
        rightKeys: leftCandidates.map((candidate) => candidate.right.key),
        message: `Node ${left.sourceId ?? left.key} has multiple coordinate matches within tolerance.`,
      });
      ambiguousLeft.add(leftIdentity);
      for (const candidate of leftCandidates) ambiguousRight.add(identity(candidate.right));
      continue;
    }

    const candidate = leftCandidates[0];
    const rightIdentity = identity(candidate.right);
    const rightCandidates = byRight.get(rightIdentity) ?? [];
    const uniqueLeftIdentities = new Set(rightCandidates.map((item) => identity(item.left)));
    if (uniqueLeftIdentities.size > 1) {
      ambiguities.push({
        category: "node",
        leftKeys: rightCandidates.map((item) => item.left.key),
        rightKeys: [candidate.right.key],
        message: `Right node ${candidate.right.sourceId ?? candidate.right.key} has multiple coordinate matches within tolerance.`,
      });
      for (const item of rightCandidates) ambiguousLeft.add(identity(item.left));
      ambiguousRight.add(rightIdentity);
      continue;
    }

    matched.push({ leftKey: leftIdentity, rightKey: rightIdentity });
    matchedLeft.add(leftIdentity);
    matchedRight.add(rightIdentity);
  }

  return {
    matched,
    unmatchedLeft: leftNodes
      .filter((node) => !matchedLeft.has(identity(node)))
      .map((node) => unmatchedNode("left", node, ambiguousLeft.has(identity(node)) ? "ambiguous" : "no coordinate match")),
    unmatchedRight: rightNodes
      .filter((node) => !matchedRight.has(identity(node)))
      .map((node) => unmatchedNode("right", node, ambiguousRight.has(identity(node)) ? "ambiguous" : "no coordinate match")),
    ambiguities,
    diagnostics: { warnings: [], errors: [] },
  };
}
