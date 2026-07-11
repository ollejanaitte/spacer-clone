import { describe, expect, it } from "vitest";
import { comparePropertyParity, isNearEqualProperty } from "../propertyParity";
import { matchNormalizedMembers } from "../memberMatching";
import { matchNormalizedNodes } from "../nodeMatching";
import { normalizeProjectModelForSemanticParity } from "../normalize";
import { DEFAULT_SEMANTIC_TOLERANCE } from "../tolerance";
import { project, baseMembers, baseNodes } from "./fixtures/semanticParityFixtures";

describe("property parity", () => {
  it("compares section properties by value not ID", () => {
    const left = normalizeProjectModelForSemanticParity(project(baseNodes, baseMembers));
    const right = normalizeProjectModelForSemanticParity(
      project(baseNodes, baseMembers, {
        sections: [{ id: "other-sec", name: "renamed", area: 0.01, iy: 1e-4, iz: 2e-4, j: 1e-5 }],
        members: baseMembers.map((member) => ({ ...member, sectionId: "other-sec" })),
      }),
    );
    const nodeMatches = matchNormalizedNodes(left.nodes, right.nodes, DEFAULT_SEMANTIC_TOLERANCE);
    const memberMatches = matchNormalizedMembers(left.members, right.members, nodeMatches.matched);
    const result = comparePropertyParity(left, right, memberMatches.matched, DEFAULT_SEMANTIC_TOLERANCE);

    expect(result.summary.sectionMismatchCount).toBe(0);
    expect(result.mismatches).toHaveLength(0);
  });

  it("detects material property mismatch", () => {
    const left = normalizeProjectModelForSemanticParity(project(baseNodes, baseMembers));
    const right = normalizeProjectModelForSemanticParity(
      project(baseNodes, baseMembers, {
        materials: [{ id: "mat", name: "steel", elasticModulus: 210000, shearModulus: 79000, poissonRatio: 0.3, density: 7850 }],
      }),
    );
    const nodeMatches = matchNormalizedNodes(left.nodes, right.nodes, DEFAULT_SEMANTIC_TOLERANCE);
    const memberMatches = matchNormalizedMembers(left.members, right.members, nodeMatches.matched);
    const result = comparePropertyParity(left, right, memberMatches.matched, DEFAULT_SEMANTIC_TOLERANCE);

    expect(result.summary.materialMismatchCount).toBeGreaterThan(0);
  });

  it("detects inertia property mismatch", () => {
    const left = normalizeProjectModelForSemanticParity(project(baseNodes, baseMembers));
    const right = normalizeProjectModelForSemanticParity(
      project(baseNodes, baseMembers, {
        sections: [{ id: "sec", name: "section", area: 0.01, iy: 5e-4, iz: 2e-4, j: 1e-5 }],
      }),
    );
    const nodeMatches = matchNormalizedNodes(left.nodes, right.nodes, DEFAULT_SEMANTIC_TOLERANCE);
    const memberMatches = matchNormalizedMembers(left.members, right.members, nodeMatches.matched);
    const result = comparePropertyParity(left, right, memberMatches.matched, DEFAULT_SEMANTIC_TOLERANCE);

    expect(result.summary.sectionMismatchCount).toBeGreaterThan(0);
    expect(result.mismatches.some((mismatch) => mismatch.path.endsWith("/section/iy"))).toBe(true);
  });


  it("does not treat undefined as zero", () => {
    const left = normalizeProjectModelForSemanticParity(
      project(
        baseNodes,
        [{ id: "m-a", nodeI: "n-a", nodeJ: "n-b", materialId: "mat", sectionId: "sec" }],
        {
          sections: [{ id: "sec", name: "partial", area: 0.01, iy: 1e-4, iz: 2e-4, j: 1e-5 }],
        },
      ),
    );
    const right = normalizeProjectModelForSemanticParity(
      project(
        baseNodes,
        [{ id: "m-a", nodeI: "n-a", nodeJ: "n-b", materialId: "mat", sectionId: "other" }],
        {
          sections: [{ id: "other", name: "missing-area", area: 0, iy: 1e-4, iz: 2e-4, j: 1e-5 }],
          members: [{ id: "m-a", nodeI: "n-a", nodeJ: "n-b", materialId: "mat", sectionId: "other" }],
        },
      ),
    );
    // Simulate missing resolved property by using a member without section assignment on left.
    const leftMissingSection = normalizeProjectModelForSemanticParity(
      project(
        baseNodes,
        [{ id: "m-a", nodeI: "n-a", nodeJ: "n-b", materialId: "mat", sectionId: "missing" }],
        { sections: [] },
      ),
    );
    const nodeMatches = matchNormalizedNodes(leftMissingSection.nodes, right.nodes, DEFAULT_SEMANTIC_TOLERANCE);
    const memberMatches = matchNormalizedMembers(
      leftMissingSection.members,
      right.members,
      nodeMatches.matched,
    );
    const result = comparePropertyParity(
      leftMissingSection,
      right,
      memberMatches.matched,
      DEFAULT_SEMANTIC_TOLERANCE,
    );

    expect(result.mismatches.some((mismatch) => mismatch.message.includes("undefined is not treated as zero"))).toBe(true);
  });

  it("supports near-equal scalar comparison helper", () => {
    expect(isNearEqualProperty(1, 1.0000005, DEFAULT_SEMANTIC_TOLERANCE)).toBe(true);
    expect(isNearEqualProperty(1, 1.1, DEFAULT_SEMANTIC_TOLERANCE)).toBe(false);
    expect(isNearEqualProperty(undefined, 0, DEFAULT_SEMANTIC_TOLERANCE)).toBe(false);
  });

  it("accepts identical orientation vectors", () => {
    const left = normalizeProjectModelForSemanticParity(
      project(baseNodes, [
        { ...baseMembers[0], orientationVector: { x: 0, y: 1, z: 0 } },
      ]),
    );
    const right = normalizeProjectModelForSemanticParity(
      project(baseNodes, [
        { ...baseMembers[0], orientationVector: { x: 0, y: 1, z: 0 } },
      ]),
    );
    const nodeMatches = matchNormalizedNodes(left.nodes, right.nodes, DEFAULT_SEMANTIC_TOLERANCE);
    const memberMatches = matchNormalizedMembers(left.members, right.members, nodeMatches.matched);
    const result = comparePropertyParity(left, right, memberMatches.matched, DEFAULT_SEMANTIC_TOLERANCE);

    expect(result.summary.orientationMismatchCount).toBe(0);
    expect(result.summary.orientationOppositeCount).toBe(0);
  });
});
