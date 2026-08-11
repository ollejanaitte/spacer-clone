import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import {
  computeAbutmentPlacementCandidate,
  lookupTerrainElevation,
  getProjectTerrainGrid,
  computeBridgeRangeBBox,
  isExistingNearRange,
  collectExistingNearRange,
  assembleBridgeLayoutView,
} from "../bridgeLayoutPlacement";
import { readRoadAlignmentContext, buildBridgeLayoutFromRange } from "../bridgeLayoutDomain";
import { writeRoadInputs } from "../../roadModuleAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { gridToMesh } from "../../terrain/terrainSurface";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("A1/A2配置候補"), {
    businessNumber: "BL-003",
    designStage: "bridge-detailed",
  });
}

function makeRoadInputs() {
  const mountain = createReferenceMountain();
  return {
    label: "山岳道路",
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  };
}

function seedRoad(manager = getProjectManager(), projectId: string) {
  const result = writeRoadInputs(manager, projectId, makeRoadInputs());
  expect(result.ok).toBe(true);
}

function seedTerrainAndExisting(manager = getProjectManager(), projectId: string) {
  const terrainDoc = {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  };
  writeTerrainDocument(manager, projectId, terrainDoc);
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...createReferenceMountain().existing] });
}

function existingDoc() {
  return { schemaVersion: "0.1.0" as const, entities: [...createReferenceMountain().existing] };
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

describe("computeAbutmentPlacementCandidate (A1/A2)", () => {
  it("computes XYZ / elevation / tangent from the road module at a station", () => {
    const mountain = createReferenceMountain();
    const result = computeAbutmentPlacementCandidate({
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSections: [mountain.roadCrossSection],
      station: 100,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const c = result.candidate;
    expect(c.roadReferenceId).toBe("ROAD-MTN-1");
    expect(c.coordinateContextId).toBe("COORD-JGD2011");
    expect(typeof c.domainX).toBe("number");
    expect(typeof c.domainY).toBe("number");
    expect(typeof c.elevation).toBe("number");
    expect(typeof c.tangentAzimuthRad).toBe("number");
    expect(c.terrainElevation).toBeNull();
    expect(Number.isFinite(c.capturedAt.length ? Date.parse(c.capturedAt) : NaN)).toBe(true);
  });

  it("rejects a non-finite station", () => {
    const mountain = createReferenceMountain();
    const result = computeAbutmentPlacementCandidate({
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSections: [mountain.roadCrossSection],
      station: Number.NaN,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a station that cannot be evaluated on the alignment", () => {
    const mountain = createReferenceMountain();
    const result = computeAbutmentPlacementCandidate({
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSections: [mountain.roadCrossSection],
      station: 999999,
    });
    expect(result.ok).toBe(false);
  });

  it("A1 station == startStation / A2 station == endStation via the domain flow", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrainAndExisting(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-300",
      name: "谷川橋",
      startStation: 100,
      endStation: 450,
    });
    expect(built.ok).toBe(true);
    const view = assembleBridgeLayoutView(manager, project.projectId, built.document);
    expect(view.candidates.A1?.station).toBe(100);
    expect(view.candidates.A2?.station).toBe(450);
    expect(view.bridgeLength).toBe(350);
  });
});

describe("Terrain reference", () => {
  it("looks up an elevation inside the grid and returns null outside the TIN", () => {
    const mountain = createReferenceMountain();
    const grid = mountain.terrainGrid;
    const inside = lookupTerrainElevation(grid, 500, 500);
    expect(inside).not.toBeNull();
    expect(inside).toBeGreaterThan(0);
    const outside = lookupTerrainElevation(grid, 5000, 5000);
    expect(outside).toBeNull();
  });

  it("returns null elevation when there is no terrain grid", () => {
    expect(lookupTerrainElevation(null, 100, 100)).toBeNull();
  });

  it("getProjectTerrainGrid is null when terrain module has no surface", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    expect(getProjectTerrainGrid(manager, project.projectId)).toBeNull();
  });

  it("assemble view reports terrain availability and diff", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrainAndExisting(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-301",
      name: "谷川橋",
      startStation: 400,
      endStation: 500,
    });
    expect(built.ok).toBe(true);
    const view = assembleBridgeLayoutView(manager, project.projectId, built.document);
    expect(view.terrain.available).toBe(true);
    expect(view.terrain.surfaceReference).toBe("assets/terrain/reference.bin");
    expect(view.terrain.elevationA1).not.toBeNull();
    expect(view.terrain.elevationA2).not.toBeNull();
    expect(view.terrain.diffA1).not.toBeNull();
    expect(view.terrain.diffA2).not.toBeNull();
  });

  it("missing terrain is a warning (data preserved, available=false)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    writeExistingConditions(manager, project.projectId, existingDoc());
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-302",
      name: "谷川橋",
      startStation: 100,
      endStation: 200,
    });
    expect(built.ok).toBe(true);
    const view = assembleBridgeLayoutView(manager, project.projectId, built.document);
    expect(view.terrain.available).toBe(false);
    expect(view.terrain.elevationA1).toBeNull();
    expect(view.document?.bridgeRange.startStation).toBe(100);
  });
});

describe("Existing Conditions reference", () => {
  it("collects entities near the bridge range", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrainAndExisting(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-303",
      name: "谷川橋",
      startStation: 300,
      endStation: 600,
    });
    expect(built.ok).toBe(true);
    const view = assembleBridgeLayoutView(manager, project.projectId, built.document);
    expect(view.existing.available).toBe(true);
    expect(view.existing.entityCount).toBeGreaterThan(0);
    const labels = view.existing.entities.map((e) => e.label);
    expect(labels).toContain("山岳河川");
  });

  it("computes a bbox from the road centerline over the range", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    const context = readRoadAlignmentContext(manager, project.projectId);
    const bbox = computeBridgeRangeBBox(context, 300, 600);
    expect(bbox).not.toBeNull();
    expect(bbox!.minX).toBeLessThan(bbox!.maxX);
    expect(bbox!.minY).toBeLessThan(bbox!.maxY);
    expect(bbox!.minX).toBeLessThan(400);
    expect(bbox!.maxX).toBeGreaterThan(400);
  });

  it("isExistingNearRange detects overlap and rejects far entities", () => {
    const mountain = createReferenceMountain();
    const river = mountain.existing.find((e) => e.entityId === "RIVER-1")!;
    const bbox = { minX: 300, minY: 0, maxX: 700, maxY: 1000 };
    expect(isExistingNearRange(river, bbox)).toBe(true);
    expect(isExistingNearRange(river, { minX: 0, minY: 0, maxX: 50, maxY: 50 })).toBe(false);
  });

  it("missing existing document is available=false (no crash)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-304",
      name: "谷川橋",
      startStation: 100,
      endStation: 200,
    });
    expect(built.ok).toBe(true);
    const view = assembleBridgeLayoutView(manager, project.projectId, built.document);
    expect(view.existing.available).toBe(false);
    expect(view.existing.entities).toHaveLength(0);
  });
});

describe("assembleBridgeLayoutView validation", () => {
  it("surfaces out-of-range validation without building a document", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrainAndExisting(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-305",
      name: "谷川橋",
      startStation: -50,
      endStation: 100,
    });
    expect(built.ok).toBe(false);
    expect(built.issues.some((i) => i.message.includes("outside the road alignment range"))).toBe(true);
  });
});

// 3D geometry sanity: gridToMesh remains the same terrain surface used for viewing
void gridToMesh;
