import { describe, expect, it } from "vitest";
import type { ProjectModel } from "../../../types";
import { compareSemanticParity } from "../compare";

function project(
  nodes: ProjectModel["nodes"],
  members: ProjectModel["members"],
  overrides: Partial<ProjectModel> = {},
): ProjectModel {
  return {
    schemaVersion: 1,
    project: {
      id: "p",
      name: "test",
      schemaVersion: "1.0.0",
      description: "",
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T00:00:00.000Z",
    },
    units: {
      length: "m",
      force: "kN",
      moment: "kN-m",
      modulus: "kN/m2",
      area: "m2",
      inertia: "m4",
    },
    nodes,
    materials: [{ id: "mat", name: "steel", elasticModulus: 1, shearModulus: 1, poissonRatio: 0.3, density: 0 }],
    sections: [{ id: "sec", name: "section", area: 1, iy: 1, iz: 1, j: 1 }],
    members,
    supports: [],
    loadCases: [],
    nodalLoads: [],
    memberLoads: [],
    analysisSettings: {
      analysisType: "linear_static",
      includeShearDeformation: false,
      largeDisplacement: false,
      tolerance: 1e-6,
    },
    ...overrides,
  };
}

const baseNodes = [
  { id: "n-a", x: 0, y: 0, z: 0 },
  { id: "n-b", x: 10, y: 0, z: 0 },
  { id: "n-c", x: 20, y: 0, z: 0 },
];

const baseMembers = [
  { id: "m-a", nodeI: "n-a", nodeJ: "n-b", materialId: "mat", sectionId: "sec" },
  { id: "m-b", nodeI: "n-b", nodeJ: "n-c", materialId: "mat", sectionId: "sec" },
];

describe("semantic parity comparison", () => {
  it("treats identical geometry with different IDs as equivalent", () => {
    const left = project(baseNodes, baseMembers);
    const right = project(
      [
        { id: "r-3", x: 20, y: 0, z: 0 },
        { id: "r-1", x: 0, y: 0, z: 0 },
        { id: "r-2", x: 10, y: 0, z: 0 },
      ],
      [
        { id: "rm-2", nodeI: "r-3", nodeJ: "r-2", materialId: "mat", sectionId: "sec" },
        { id: "rm-1", nodeI: "r-1", nodeJ: "r-2", materialId: "mat", sectionId: "sec" },
      ],
    );

    const report = compareSemanticParity(left, right);

    expect(report.status).toBe("equivalent");
    expect(report.counts.matched.nodes).toBe(3);
    expect(report.counts.matched.members).toBe(2);
  });

  it("accepts node coordinates within tolerance", () => {
    const report = compareSemanticParity(
      project(baseNodes, baseMembers),
      project(
        [
          { id: "x", x: 0.0000005, y: 0, z: 0 },
          { id: "y", x: 10, y: 0, z: 0 },
          { id: "z", x: 20, y: 0, z: 0 },
        ],
        [
          { id: "a", nodeI: "x", nodeJ: "y", materialId: "mat", sectionId: "sec" },
          { id: "b", nodeI: "y", nodeJ: "z", materialId: "mat", sectionId: "sec" },
        ],
      ),
    );

    expect(report.status).toBe("equivalent");
  });

  it("reports different when a node exceeds tolerance", () => {
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
    expect(report.mismatches.some((mismatch) => mismatch.category === "node")).toBe(true);
  });

  it("reports different when a node is missing", () => {
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

  it("keeps duplicate node candidates indeterminate instead of choosing one", () => {
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

  it("treats reversed member I/J direction as equivalent", () => {
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
        [{ id: "rm", nodeI: "y", nodeJ: "x", materialId: "mat", sectionId: "sec" }],
      ),
    );

    expect(report.status).toBe("equivalent");
    expect(report.counts.matched.members).toBe(1);
  });

  it("reports duplicate members on the same node pair as ambiguous", () => {
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
    expect(report.ambiguities.some((ambiguity) => ambiguity.category === "member")).toBe(true);
  });

  it("is invalid when normalization finds non-finite coordinates", () => {
    const report = compareSemanticParity(
      project([{ id: "bad", x: Number.NaN, y: 0, z: 0 }], []),
      project([{ id: "ok", x: 0, y: 0, z: 0 }], []),
    );

    expect(report.status).toBe("invalid");
    expect(report.errors.some((error) => error.code === "SEMANTIC_NODE_NON_FINITE")).toBe(true);
  });
});
