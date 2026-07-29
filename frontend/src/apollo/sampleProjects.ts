import { createDefaultProject } from "../data/defaultProject";
import type { ProjectModel } from "../types";
import { hydrateApolloPhase1Unit2FromPersistence } from "./unit2Draft";

const SAMPLE_TIMESTAMP = "2026-07-29T00:00:00.000Z";

export const APOLLO_STANDARD_SAMPLE_ID = "apollo-200m-5span-standard";

export function createApollo200mContinuousBridgeSample(): ProjectModel {
  const base = createDefaultProject();
  const project: ProjectModel = {
    ...base,
    project: {
      ...base.project,
      id: "bridge-200m-001",
      name: "200m級 5径間連続橋",
      description: "橋長200m、5径間連続橋、Apollo操作確認用サンプル",
      createdAt: SAMPLE_TIMESTAMP,
      updatedAt: SAMPLE_TIMESTAMP,
    },
    nodes: [
      { id: "N-A1", x: 0, y: 0, z: 0, label: "A1" },
      { id: "N-P1", x: 35, y: 0, z: 0, label: "P1" },
      { id: "N-P2", x: 75, y: 0, z: 0, label: "P2" },
      { id: "N-P3", x: 125, y: 0, z: 0, label: "P3" },
      { id: "N-P4", x: 165, y: 0, z: 0, label: "P4" },
      { id: "N-A2", x: 200, y: 0, z: 0, label: "A2" },
    ],
    materials: [
      {
        id: "MAT-BRIDGE",
        name: "標準材料参照",
        elasticModulus: 0,
        shearModulus: 0,
        poissonRatio: 0,
        density: 0,
      },
    ],
    sections: [
      {
        id: "SEC-BRIDGE",
        name: "標準断面参照",
        area: 0,
        iy: 0,
        iz: 0,
        j: 0,
      },
    ],
    members: [
      { id: "M-01", nodeI: "N-A1", nodeJ: "N-P1", materialId: "MAT-BRIDGE", sectionId: "SEC-BRIDGE", label: "第1径間" },
      { id: "M-02", nodeI: "N-P1", nodeJ: "N-P2", materialId: "MAT-BRIDGE", sectionId: "SEC-BRIDGE", label: "第2径間" },
      { id: "M-03", nodeI: "N-P2", nodeJ: "N-P3", materialId: "MAT-BRIDGE", sectionId: "SEC-BRIDGE", label: "第3径間" },
      { id: "M-04", nodeI: "N-P3", nodeJ: "N-P4", materialId: "MAT-BRIDGE", sectionId: "SEC-BRIDGE", label: "第4径間" },
      { id: "M-05", nodeI: "N-P4", nodeJ: "N-A2", materialId: "MAT-BRIDGE", sectionId: "SEC-BRIDGE", label: "第5径間" },
    ],
    supports: [
      { id: "SUP-A1", nodeId: "N-A1", label: "A1", ux: true, uy: true, uz: true, rx: true, ry: true, rz: true },
      { id: "SUP-P1", nodeId: "N-P1", label: "P1", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false },
      { id: "SUP-P2", nodeId: "N-P2", label: "P2", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false },
      { id: "SUP-P3", nodeId: "N-P3", label: "P3", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false },
      { id: "SUP-P4", nodeId: "N-P4", label: "P4", ux: true, uy: true, uz: true, rx: false, ry: false, rz: false },
      { id: "SUP-A2", nodeId: "N-A2", label: "A2", ux: true, uy: true, uz: true, rx: true, ry: true, rz: true },
    ],
    loadCases: [{ id: "LC-REF", name: "Reference", type: "static" }],
    nodalLoads: [],
    memberLoads: [],
    massCases: [],
    analysisSettings: {
      ...base.analysisSettings,
      eigen: undefined,
      influence: undefined,
      responseSpectrum: undefined,
      timeHistory: undefined,
    },
    analysisResults: undefined,
  };

  const hydrated = hydrateApolloPhase1Unit2FromPersistence(project);
  if (!hydrated.ok) {
    throw new Error(hydrated.diagnostics.join("; "));
  }

  return hydrated.project;
}
