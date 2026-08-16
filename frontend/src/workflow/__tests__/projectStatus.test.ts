import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../next/project/projectDataCore";
import { writeRoadWorkflowState, writeBridgeWorkflowState, type RoadWorkflowState, type BridgeWorkflowState } from "../workflowState";
import { deriveProjectStatus } from "../projectStatus";

const ROAD_STATE: RoadWorkflowState = {
  roadId: "RB001-ROAD-1",
  alignmentId: "MODEL-RB001",
  name: "郡上市八幡 山岳道路 (長良川横断)",
  totalLengthM: 2450,
  bridgeCandidate: { startStation: 1200, endStation: 1500, nominalSpanM: 50, note: "" },
  placedAt: "2026-08-17T00:00:00.000Z",
};

const BRIDGE_STATE: BridgeWorkflowState = {
  bridgeId: "RB001-BRIDGE-1",
  name: "郡上市八幡 長良川橋",
  roadId: "RB001-ROAD-1",
  bridgeRange: { startStation: 1200, endStation: 1500, bridgeLength: 300 },
  piers: [
    { supportId: "A1", station: 1200 },
    { supportId: "P1", station: 1250 },
    { supportId: "P2", station: 1300 },
    { supportId: "P3", station: 1350 },
    { supportId: "P4", station: 1400 },
    { supportId: "P5", station: 1450 },
    { supportId: "A2", station: 1500 },
  ],
  spans: Array.from({ length: 6 }, (_, i) => ({
    spanId: `S${i + 1}`,
    index: i,
    startSupportId: i === 0 ? "A1" : `P${i}`,
    endSupportId: i === 5 ? "A2" : `P${i + 1}`,
    startStation: 1200 + i * 50,
    endStation: 1250 + i * 50,
    length: 50,
  })),
  placedAt: "2026-08-17T00:00:00.000Z",
};

describe("U-6 Project Status (derived from Project data)", () => {
  it("empty project reports all not-started with siteContext as current", () => {
    const project = createEmptyProject("empty");
    const report = deriveProjectStatus(project);
    expect(report.steps).toHaveLength(7);
    expect(report.readyCount).toBe(0);
    expect(report.totalCount).toBe(7);
    expect(report.currentStepId).toBe("siteContext");
    for (const step of report.steps) {
      expect(step.state).toBe("not-started");
    }
  });

  it("Site Context ready is derived from modules.terrain.data.terrainDocument", () => {
    const project = createEmptyProject("sc");
    const withTerrain = {
      ...project,
      modules: {
        ...project.modules,
        terrain: { data: { terrainDocument: { terrainId: "t-1" } } },
      },
    };
    const report = deriveProjectStatus(withTerrain);
    const siteContext = report.steps.find((s) => s.stepId === "siteContext");
    expect(siteContext?.state).toBe("ready");
    expect(report.currentStepId).toBe("road");
  });

  it("Road / Bridge ready is derived from modules.road / bridgeLayout workflowState", () => {
    let project = createEmptyProject("rb");
    project = {
      ...project,
      modules: {
        ...project.modules,
        terrain: { data: { terrainDocument: { terrainId: "t-1" } } },
      },
    };
    project = writeRoadWorkflowState(project, ROAD_STATE);
    project = writeBridgeWorkflowState(project, BRIDGE_STATE);

    const report = deriveProjectStatus(project);
    expect(report.steps.find((s) => s.stepId === "siteContext")?.state).toBe("ready");
    expect(report.steps.find((s) => s.stepId === "road")?.state).toBe("ready");
    expect(report.steps.find((s) => s.stepId === "bridgeLayout")?.state).toBe("ready");
    expect(report.readyCount).toBe(3);
    expect(report.currentStepId).toBe("superstructure");
  });

  it("Superstructure / Substructure / Analysis / 3D ready are derived from module slots", () => {
    const project = {
      ...createEmptyProject("full"),
      modules: {
        ...createEmptyProject("full").modules,
        superstructure: { data: { spans: [] } },
        substructure: { data: { supports: [] } },
        analysis: { data: { results: [] } },
        cim: { data: { scene: {} } },
      },
    };
    const report = deriveProjectStatus(project);
    for (const stepId of ["superstructure", "substructure", "analysis", "cim3d"]) {
      expect(report.steps.find((s) => s.stepId === stepId)?.state).toBe("ready");
    }
    expect(report.readyCount).toBe(4);
  });

  it("reports project identity (id / name / updatedAt)", () => {
    const project = createEmptyProject("report");
    const report = deriveProjectStatus(project);
    expect(report.projectId).toBe(project.projectId);
    expect(report.projectName).toBe(project.name);
    expect(report.updatedAt).toBe(project.updatedAt);
  });
});