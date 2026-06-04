import type { ProjectModel } from "../types";

export const createDefaultProject = (): ProjectModel => ({
  project: {
    id: "project-001",
    name: "MVP Example Project",
    schemaVersion: "1.0.0",
    description: "Default MVP cantilever example.",
    createdAt: "2026-06-04T00:00:00Z",
    updatedAt: "2026-06-04T00:00:00Z",
  },
  nodes: [
    { id: "N1", x: 0, y: 0, z: 0 },
    { id: "N2", x: 4, y: 0, z: 0 },
  ],
  materials: [
    {
      id: "MAT1",
      name: "Steel",
      elasticModulus: 200000000,
      poissonRatio: 0.25,
      density: 0,
    },
  ],
  sections: [
    {
      id: "SEC1",
      name: "Rectangular equivalent",
      area: 0.02,
      iy: 0.00008,
      iz: 0.00006,
      j: 0.00004,
    },
  ],
  members: [
    {
      id: "M1",
      nodeI: "N1",
      nodeJ: "N2",
      materialId: "MAT1",
      sectionId: "SEC1",
      orientationVector: { x: 0, y: 0, z: 1 },
    },
  ],
  supports: [
    {
      nodeId: "N1",
      ux: true,
      uy: true,
      uz: true,
      rx: true,
      ry: true,
      rz: true,
    },
  ],
  loadCases: [{ id: "LC1", name: "Tip Load", type: "static" }],
  nodalLoads: [
    {
      id: "NL1",
      loadCaseId: "LC1",
      nodeId: "N2",
      fx: 0,
      fy: -12,
      fz: 0,
      mx: 0,
      my: 0,
      mz: 0,
    },
  ],
  memberLoads: [],
  analysisSettings: {
    analysisType: "linear_static",
    includeShearDeformation: false,
    largeDisplacement: false,
    tolerance: 1e-9,
  },
});
