import type { ProjectModel } from "../types";

export const createDefaultProject = (): ProjectModel => ({
  project: {
    id: "project-001",
    name: "MVPサンプルプロジェクト",
    schemaVersion: "1.0.0",
    description: "MVPの片持ち梁サンプルです。",
    createdAt: "2026-06-04T00:00:00Z",
    updatedAt: "2026-06-04T00:00:00Z",
  },
  units: {
    length: "m",
    force: "kN",
    moment: "kN_m",
    modulus: "kN_per_m2",
    area: "m2",
    inertia: "m4",
  },
  nodes: [
    { id: "N1", x: 0, y: 0, z: 0 },
    { id: "N2", x: 4, y: 0, z: 0 },
  ],
  materials: [
    {
      id: "MAT1",
      name: "鋼材",
      elasticModulus: 200000000,
      shearModulus: 200000000 / (2 * (1 + 0.25)),
      poissonRatio: 0.25,
      density: 0,
    },
  ],
  sections: [
    {
      id: "SEC1",
      name: "矩形相当断面",
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
  loadCases: [{ id: "LC1", name: "先端荷重", type: "static" }],
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
  massCases: [
    {
      id: "mass-1",
      name: "Eigen Mass",
      method: "lumped",
      source: "manual",
      items: [
        {
          nodeId: "N2",
          mx: 1,
          my: 1,
          mz: 1,
          irx: 0,
          iry: 0,
          irz: 0,
        },
      ],
    },
  ],
  analysisSettings: {
    analysisType: "linear_static",
    includeShearDeformation: false,
    largeDisplacement: false,
    tolerance: 1e-9,
    eigen: {
      massCaseId: "mass-1",
      modeCount: 3,
    },
    influence: {
      caseId: "influence-line-1",
      line: {
        id: "line-M1",
        memberId: "M1",
        stationCount: 21,
        direction: { x: 0, y: -1, z: 0 },
        magnitude: 1,
      },
      targets: [
        { id: "disp-N2-uy", type: "displacement", nodeId: "N2", component: "uy" },
        { id: "react-N1-fy", type: "reaction", nodeId: "N1", component: "fy" },
        {
          id: "member-M1-Mz-i",
          type: "memberEndForce",
          memberId: "M1",
          component: "Mz",
          end: "i",
        },
      ],
    },
  },
});
