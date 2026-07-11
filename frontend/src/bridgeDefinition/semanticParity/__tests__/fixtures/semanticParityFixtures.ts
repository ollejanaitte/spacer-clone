import type { ProjectModel } from "../../../../types";

export function project(
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
    materials: overrides.materials ?? [
      { id: "mat", name: "steel", elasticModulus: 205000, shearModulus: 79000, poissonRatio: 0.3, density: 7850 },
    ],
    sections: overrides.sections ?? [
      { id: "sec", name: "section", area: 0.01, iy: 1e-4, iz: 2e-4, j: 1e-5 },
    ],
    members,
    supports: overrides.supports ?? [],
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

export const baseNodes = [
  { id: "n-a", x: 0, y: 0, z: 0 },
  { id: "n-b", x: 10, y: 0, z: 0 },
  { id: "n-c", x: 20, y: 0, z: 0 },
];

export const baseMembers = [
  { id: "m-a", nodeI: "n-a", nodeJ: "n-b", materialId: "mat", sectionId: "sec" },
  { id: "m-b", nodeI: "n-b", nodeJ: "n-c", materialId: "mat", sectionId: "sec" },
];

export const equivalentDifferentIds = {
  left: project(baseNodes, baseMembers),
  right: project(
    [
      { id: "r-3", x: 20, y: 0, z: 0 },
      { id: "r-1", x: 0, y: 0, z: 0 },
      { id: "r-2", x: 10, y: 0, z: 0 },
    ],
    [
      { id: "rm-2", nodeI: "r-3", nodeJ: "r-2", materialId: "mat", sectionId: "sec" },
      { id: "rm-1", nodeI: "r-1", nodeJ: "r-2", materialId: "mat", sectionId: "sec" },
    ],
  ),
};

export const equivalentReversedMembers = {
  left: project(
    [
      { id: "a", x: 0, y: 0, z: 0 },
      { id: "b", x: 1, y: 0, z: 0 },
    ],
    [{ id: "m", nodeI: "a", nodeJ: "b", materialId: "mat", sectionId: "sec" }],
  ),
  right: project(
    [
      { id: "x", x: 0, y: 0, z: 0 },
      { id: "y", x: 1, y: 0, z: 0 },
    ],
    [{ id: "rm", nodeI: "y", nodeJ: "x", materialId: "mat", sectionId: "sec" }],
  ),
};
