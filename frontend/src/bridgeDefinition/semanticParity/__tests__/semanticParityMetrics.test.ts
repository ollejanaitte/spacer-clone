import { describe, expect, it } from "vitest";
import { compareSemanticParity } from "../compare";
import {
  baseMembers,
  baseNodes,
  equivalentDifferentIds,
  equivalentReversedMembers,
  project,
} from "./fixtures/semanticParityFixtures";

describe("semantic parity metrics fixtures", () => {
  it("equivalent-different-ids: reports equivalent with geometry and topology parity", () => {
    const report = compareSemanticParity(equivalentDifferentIds.left, equivalentDifferentIds.right);

    expect(report.status).toBe("equivalent");
    expect(report.metrics.geometry.equivalent).toBe(true);
    expect(report.metrics.topology.equivalent).toBe(true);
    expect(report.summary.structurallyValid).toBe(true);
    expect(report.metrics.geometry.left.nodeCount).toBe(3);
    expect(report.metrics.geometry.left.memberCount).toBe(2);
  });

  it("equivalent-reversed-members: treats reversed I/J as equivalent", () => {
    const report = compareSemanticParity(equivalentReversedMembers.left, equivalentReversedMembers.right);

    expect(report.status).toBe("equivalent");
    expect(report.counts.matched.members).toBe(1);
    expect(report.metrics.property.comparedMemberCount).toBe(1);
  });

  it("coordinate-outside-tolerance: reports different", () => {
    const report = compareSemanticParity(
      project(baseNodes, baseMembers),
      project(
        [
          { id: "x", x: 0.01, y: 0, z: 0 },
          { id: "y", x: 10, y: 0, z: 0 },
          { id: "z", x: 20, y: 0, z: 0 },
        ],
        [
          { id: "a", nodeI: "x", nodeJ: "y", materialId: "mat", sectionId: "sec" },
          { id: "b", nodeI: "y", nodeJ: "z", materialId: "mat", sectionId: "sec" },
        ],
      ),
    );

    expect(report.status).toBe("different");
    expect(report.metrics.geometry.equivalent).toBe(false);
  });

  it("missing-member: reports different", () => {
    const report = compareSemanticParity(
      project(baseNodes, baseMembers),
      project(
        [
          { id: "x", x: 0, y: 0, z: 0 },
          { id: "y", x: 10, y: 0, z: 0 },
        ],
        [{ id: "a", nodeI: "x", nodeJ: "y", materialId: "mat", sectionId: "sec" }],
      ),
    );

    expect(report.status).toBe("different");
    expect(report.summary.unmatchedLeft).toBeGreaterThan(0);
  });

  it("disconnected: reports invalid", () => {
    const report = compareSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
          { id: "c", x: 10, y: 0, z: 0 },
          { id: "d", x: 11, y: 0, z: 0 },
        ],
        [
          { id: "m1", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" },
          { id: "m2", nodeI: "c", nodeJ: "d", materialId: "mat", sectionId: "sec" },
        ],
      ),
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
          { id: "c", x: 10, y: 0, z: 0 },
          { id: "d", x: 11, y: 0, z: 0 },
        ],
        [
          { id: "m1", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" },
          { id: "m2", nodeI: "c", nodeJ: "d", materialId: "mat", sectionId: "sec" },
        ],
      ),
    );

    expect(report.status).toBe("invalid");
    expect(report.errors.some((error) => error.code === "SEMANTIC_MODEL_DISCONNECTED")).toBe(true);
    expect(report.metrics.structuralValidation.left.disconnectedComponentCount).toBe(2);
  });

  it("support-mismatch: reports different on fixity mismatch", () => {
    const report = compareSemanticParity(
      project(baseNodes, baseMembers, {
        supports: [{ nodeId: "n-a", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false }],
      }),
      project(
        [
          { id: "x", x: 0, y: 0, z: 0 },
          { id: "y", x: 10, y: 0, z: 0 },
          { id: "z", x: 20, y: 0, z: 0 },
        ],
        [
          { id: "a", nodeI: "x", nodeJ: "y", materialId: "mat", sectionId: "sec" },
          { id: "b", nodeI: "y", nodeJ: "z", materialId: "mat", sectionId: "sec" },
        ],
        {
          supports: [{ nodeId: "x", ux: true, uy: false, uz: true, rx: false, ry: false, rz: false }],
        },
      ),
    );

    expect(report.status).toBe("different");
    expect(report.metrics.support.fixityMismatchCount).toBe(1);
    expect(report.mismatches.some((mismatch) => mismatch.category === "support")).toBe(true);
  });

  it("property-mismatch: reports different on section area mismatch", () => {
    const report = compareSemanticParity(
      project(baseNodes, baseMembers),
      project(
        baseNodes.map((node) => ({ ...node, id: `r-${node.id}` })),
        baseMembers.map((member) => ({
          ...member,
          id: `r-${member.id}`,
          nodeI: `r-${member.nodeI}`,
          nodeJ: `r-${member.nodeJ}`,
        })),
        {
          sections: [{ id: "sec", name: "other", area: 0.02, iy: 1e-4, iz: 2e-4, j: 1e-5 }],
        },
      ),
    );

    expect(report.status).toBe("different");
    expect(report.metrics.property.sectionMismatchCount).toBeGreaterThan(0);
  });

  it("near-equal-property: reports equivalent within scalar tolerance", () => {
    const report = compareSemanticParity(
      project(baseNodes, baseMembers),
      project(
        baseNodes.map((node) => ({ ...node, id: `r-${node.id}` })),
        baseMembers.map((member) => ({
          ...member,
          id: `r-${member.id}`,
          nodeI: `r-${member.nodeI}`,
          nodeJ: `r-${member.nodeJ}`,
        })),
        {
          sections: [{ id: "sec", name: "other", area: 0.0100000005, iy: 1e-4, iz: 2e-4, j: 1e-5 }],
        },
      ),
    );

    expect(report.status).toBe("equivalent");
    expect(report.metrics.property.sectionMismatchCount).toBe(0);
  });

  it("zero-length-member: reports invalid", () => {
    const report = compareSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 6e-7, y: 0, z: 0 },
        ],
        [{ id: "m", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" }],
      ),
      project(
        [
          { id: "x", x: 0, y: 0, z: 0 },
          { id: "y", x: 6e-7, y: 0, z: 0 },
        ],
        [{ id: "rm", nodeI: "x", nodeJ: "y", materialId: "mat", sectionId: "sec" }],
      ),
    );

    expect(report.status).toBe("invalid");
    expect(report.errors.some((error) => error.code === "SEMANTIC_MEMBER_ZERO_LENGTH")).toBe(true);
    expect(report.metrics.structuralValidation.left.zeroLengthMemberCount).toBe(1);
  });

  it("ambiguous-duplicate-node: reports indeterminate", () => {
    const report = compareSemanticParity(
      project([{ id: "n-a", x: 0, y: 0, z: 0 }], []),
      project(
        [
          { id: "r-a", x: 0, y: 0, z: 0 },
          { id: "r-b", x: 0, y: 0, z: 0 },
        ],
        [],
      ),
    );

    expect(report.status).toBe("indeterminate");
    expect(report.ambiguities).toHaveLength(1);
  });

  it("duplicate-parallel-member: reports indeterminate", () => {
    const report = compareSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
        ],
        [{ id: "m", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" }],
      ),
      project(
        [
          { id: "x", x: 0, y: 0, z: 0 },
          { id: "y", x: 1, y: 0, z: 0 },
        ],
        [
          { id: "rm-a", nodeI: "x", nodeJ: "y", materialId: "mat", sectionId: "sec" },
          { id: "rm-b", nodeI: "y", nodeJ: "x", materialId: "mat", sectionId: "sec" },
        ],
      ),
    );

    expect(report.status).toBe("indeterminate");
    expect(report.metrics.topology.right.parallelEdgeCandidateCount).toBe(2);
  });

  it("invalid-missing-endpoint: reports invalid", () => {
    const report = compareSemanticParity(
      project(
        [{ id: "a", x: 0, y: 0, z: 0 }],
        [{ id: "m", nodeI: "a", nodeJ: "missing", materialId: "mat", sectionId: "sec" }],
      ),
      project([{ id: "x", x: 0, y: 0, z: 0 }], []),
    );

    expect(report.status).toBe("invalid");
    expect(report.errors.some((error) => error.code === "SEMANTIC_MEMBER_NODE_REF_MISSING")).toBe(true);
    expect(report.metrics.structuralValidation.left.missingEndpointCount).toBe(1);
  });
});

describe("orientation parity", () => {
  it("distinguishes opposite orientation as different with warning severity", () => {
    const report = compareSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
        ],
        [{
          id: "m",
          nodeI: "a",
          nodeJ: "b",
          materialId: "mat",
          sectionId: "sec",
          orientationVector: { x: 0, y: 1, z: 0 },
        }],
      ),
      project(
        [
          { id: "x", x: 0, y: 0, z: 0 },
          { id: "y", x: 1, y: 0, z: 0 },
        ],
        [{
          id: "rm",
          nodeI: "x",
          nodeJ: "y",
          materialId: "mat",
          sectionId: "sec",
          orientationVector: { x: 0, y: -1, z: 0 },
        }],
      ),
    );

    expect(report.status).toBe("different");
    expect(report.metrics.property.orientationOppositeCount).toBe(1);
    expect(report.mismatches.some((mismatch) => mismatch.path.includes("orientationVector"))).toBe(true);
  });

  it("does not break endpoint matching when orientation is reversed", () => {
    const report = compareSemanticParity(
      project(
        [
          { id: "a", x: 0, y: 0, z: 0 },
          { id: "b", x: 1, y: 0, z: 0 },
        ],
        [{
          id: "m",
          nodeI: "a",
          nodeJ: "b",
          materialId: "mat",
          sectionId: "sec",
          orientationVector: { x: 0, y: 1, z: 0 },
        }],
      ),
      project(
        [
          { id: "x", x: 0, y: 0, z: 0 },
          { id: "y", x: 1, y: 0, z: 0 },
        ],
        [{
          id: "rm",
          nodeI: "y",
          nodeJ: "x",
          materialId: "mat",
          sectionId: "sec",
          orientationVector: { x: 0, y: 1, z: 0 },
        }],
      ),
    );

    expect(report.counts.matched.members).toBe(1);
  });
});
