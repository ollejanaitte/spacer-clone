import { describe, expect, it } from "vitest";
import { compareSupportParity } from "../supportParity";
import { matchNormalizedNodes } from "../nodeMatching";
import { normalizeProjectModelForSemanticParity } from "../normalize";
import { DEFAULT_SEMANTIC_TOLERANCE } from "../tolerance";
import { project, baseMembers, baseNodes } from "./fixtures/semanticParityFixtures";

describe("support parity", () => {
  it("matches supports on matched nodes with identical fixity", () => {
    const left = normalizeProjectModelForSemanticParity(
      project(baseNodes, baseMembers, {
        supports: [{ nodeId: "n-a", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
      }),
    );
    const right = normalizeProjectModelForSemanticParity(
      project(
        [
          { id: "x", x: 0, y: 0, z: 0 },
          { id: "y", x: 10, y: 0, z: 0 },
          { id: "z", x: 20, y: 0, z: 0 },
        ],
        baseMembers.map((member) => ({
          ...member,
          nodeI: member.nodeI === "n-a" ? "x" : member.nodeI === "n-b" ? "y" : "z",
          nodeJ: member.nodeJ === "n-a" ? "x" : member.nodeJ === "n-b" ? "y" : "z",
        })),
        {
          supports: [{ nodeId: "x", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
        },
      ),
    );
    const nodeMatches = matchNormalizedNodes(left.nodes, right.nodes, DEFAULT_SEMANTIC_TOLERANCE);
    const result = compareSupportParity(left, right, nodeMatches.matched);

    expect(result.summary.matchedSupportCount).toBe(1);
    expect(result.mismatches).toHaveLength(0);
  });

  it("reports fixity mismatch at matched node", () => {
    const left = normalizeProjectModelForSemanticParity(
      project(baseNodes, baseMembers, {
        supports: [{ nodeId: "n-a", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
      }),
    );
    const right = normalizeProjectModelForSemanticParity(
      project(baseNodes, baseMembers, {
        supports: [{ nodeId: "n-a", ux: true, uy: false, uz: true, rx: false, ry: false, rz: false }],
      }),
    );
    const nodeMatches = matchNormalizedNodes(left.nodes, right.nodes, DEFAULT_SEMANTIC_TOLERANCE);
    const result = compareSupportParity(left, right, nodeMatches.matched);

    expect(result.summary.fixityMismatchCount).toBe(1);
    expect(result.mismatches[0].category).toBe("support");
  });

  it("reports support on only one side", () => {
    const left = normalizeProjectModelForSemanticParity(
      project(baseNodes, baseMembers, {
        supports: [{ nodeId: "n-a", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
      }),
    );
    const right = normalizeProjectModelForSemanticParity(project(baseNodes, baseMembers));
    const nodeMatches = matchNormalizedNodes(left.nodes, right.nodes, DEFAULT_SEMANTIC_TOLERANCE);
    const result = compareSupportParity(left, right, nodeMatches.matched);

    expect(result.summary.unmatchedLeftCount).toBe(1);
    expect(result.mismatches[0].message).toContain("no right counterpart");
  });

  it("reports ambiguity when multiple supports share a node", () => {
    const left = normalizeProjectModelForSemanticParity(
      project(baseNodes, baseMembers, {
        supports: [
          { nodeId: "n-a", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false },
          { nodeId: "n-a", ux: false, uy: true, uz: true, rx: false, ry: false, rz: false },
        ],
      }),
    );
    const right = normalizeProjectModelForSemanticParity(project(baseNodes, baseMembers));
    const nodeMatches = matchNormalizedNodes(left.nodes, right.nodes, DEFAULT_SEMANTIC_TOLERANCE);
    const result = compareSupportParity(left, right, nodeMatches.matched);

    expect(result.summary.ambiguousNodeCount).toBe(1);
    expect(result.ambiguities).toHaveLength(1);
  });
});
