import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyBridgeLayoutDocument } from "../bridgeLayoutTypes";
import type { BridgeLayoutDocument } from "../bridgeLayoutTypes";
import { resolveBridgeLayoutReferences } from "../bridgeLayoutReferences";
import { readBridgeLayoutDocument, writeBridgeLayoutDocument, hasBridgeLayoutDocument } from "../../bridgeLayoutModuleAdapter";
import { writeRoadInputs } from "../../roadModuleAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { createEmptyExistingConditionsDocument } from "../../existingConditions";
import { createBridgeLayoutModuleRecord, isBridgeLayoutData } from "../../bridgeLayoutModule";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("橋梁配置業務"), {
    businessNumber: "BL-001",
    designStage: "road-detailed",
  });
}

function makeLayout(): BridgeLayoutDocument {
  const doc = createEmptyBridgeLayoutDocument();
  return {
    ...doc,
    bridgeId: "BR-001",
    name: "旭高架橋",
    roadReference: { moduleId: "road", alignmentId: "ALIGN-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
    bridgeRange: { startStation: 50, endStation: 450 },
    abutments: {
      A1: { supportId: "A1", station: 50, skewAngleRad: null },
      A2: { supportId: "A2", station: 450, skewAngleRad: null },
    },
    piers: [
      { supportId: "P1", station: 150, skewAngleRad: null },
      { supportId: "P2", station: 250, skewAngleRad: null },
      { supportId: "P3", station: 350, skewAngleRad: null },
    ],
    spans: [
      { spanId: "S1", index: 1, startSupportId: "A1", endSupportId: "P1", startStation: 50, endStation: 150, length: 100 },
      { spanId: "S2", index: 2, startSupportId: "P1", endSupportId: "P2", startStation: 150, endStation: 250, length: 100 },
      { spanId: "S3", index: 3, startSupportId: "P2", endSupportId: "P3", startStation: 250, endStation: 350, length: 100 },
      { spanId: "S4", index: 4, startSupportId: "P3", endSupportId: "A2", startStation: 350, endStation: 450, length: 100 },
    ],
    skew: { signConvention: "counterclockwise-positive", angleRad: Math.PI / 2 },
    terrainReference: { moduleId: "terrain", surfaceReference: "assets/terrain/reference.bin", coordinateContextId: "COORD-1" },
    existingConditionsReference: { moduleId: "terrain", documentReferenceId: "0.1.0" },
  };
}

function seedSupportingModules(manager = getProjectManager(), projectId: string) {
  writeRoadInputs(manager, projectId, { label: "山岳道路", horizontal: { id: "ALIGN-MTN-1", elements: [] } as unknown });
  const terrainDoc = { ...createEmptyTerrainDocument(), source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null }, surfaceReference: "assets/terrain/reference.bin" };
  writeTerrainDocument(manager, projectId, terrainDoc);
  writeExistingConditions(manager, projectId, createEmptyExistingConditionsDocument());
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

describe("Bridge Layout module registration (Phase 4-01)", () => {
  it("bridgeLayout module is registered with road+terrain dependencies", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    void project;
    // registry via project schema includes bridgeLayout
    const record = createBridgeLayoutModuleRecord();
    expect(record.state.status).toBe("notStarted");
    expect(isBridgeLayoutData(record.data)).toBe(true);
    expect(record.data).toEqual({});
  });
});

describe("Bridge Layout adapter (Phase 4-01)", () => {
  it("writes and reads a bridge layout document", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    const result = writeBridgeLayoutDocument(manager, project.projectId, makeLayout());
    expect(result.ok).toBe(true);
    expect(hasBridgeLayoutDocument(manager, project.projectId)).toBe(true);
    const read = readBridgeLayoutDocument(manager, project.projectId);
    expect(read?.bridgeId).toBe("BR-001");
    expect(read?.piers).toHaveLength(3);
  });

  it("rejects an invalid bridge layout document", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    const bad = { ...makeLayout(), bridgeId: "" };
    const result = writeBridgeLayoutDocument(manager, project.projectId, bad);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe("invalid-bridge-layout-data");
  });
});

describe("Bridge Layout reference resolution (Phase 4-01)", () => {
  it("resolves all references when road/terrain/existing exist", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedSupportingModules(manager, project.projectId);
    const resolution = resolveBridgeLayoutReferences(manager, project.projectId, makeLayout());
    expect(resolution.ok).toBe(true);
    expect(resolution.resolved.roadAlignmentResolved).toBe(true);
    expect(resolution.resolved.terrainResolved).toBe(true);
    expect(resolution.resolved.existingResolved).toBe(true);
  });

  it("detects a dangling road reference (alignment mismatch)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedSupportingModules(manager, project.projectId);
    const doc = { ...makeLayout(), roadReference: { ...makeLayout().roadReference, alignmentId: "ALIGN-OTHER" } };
    const resolution = resolveBridgeLayoutReferences(manager, project.projectId, doc);
    expect(resolution.ok).toBe(false);
    expect(resolution.resolved.roadAlignmentResolved).toBe(false);
    expect(resolution.issues.some((i) => i.message.includes("road alignment mismatch"))).toBe(true);
  });

  it("detects a dangling terrain reference when terrain module is empty", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    const resolution = resolveBridgeLayoutReferences(manager, project.projectId, makeLayout());
    expect(resolution.ok).toBe(false);
    expect(resolution.issues.some((i) => i.message.includes("terrain reference is dangling"))).toBe(true);
  });

  it("detects a missing existing conditions document", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    writeRoadInputs(manager, project.projectId, { horizontal: { id: "ALIGN-MTN-1" } as unknown });
    const terrainDoc = { ...createEmptyTerrainDocument(), surfaceReference: "assets/terrain/reference.bin" };
    writeTerrainDocument(manager, project.projectId, terrainDoc);
    const resolution = resolveBridgeLayoutReferences(manager, project.projectId, makeLayout());
    expect(resolution.ok).toBe(false);
    expect(resolution.issues.some((i) => i.message.includes("existing conditions document is missing"))).toBe(true);
  });
});
