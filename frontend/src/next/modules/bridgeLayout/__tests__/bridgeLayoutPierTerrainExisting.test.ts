import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { assembleBridgeLayoutView, refreshPierPlacements, getProjectTerrainGrid } from "../bridgeLayoutPlacement";
import { buildBridgeLayoutFromRange, applyBridgeRangeToDocument, readRoadAlignmentContext } from "../bridgeLayoutDomain";
import { addPier } from "../bridgeLayoutPiers";
import { generateSpans } from "../bridgeLayoutSpans";
import { writeRoadInputs } from "../../roadModuleAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { createTerrainGrid } from "../../terrain/terrainSurface";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("Pier Terrain/Existing参照"), {
    businessNumber: "BL-4-03",
    designStage: "bridge-detailed",
  });
}

function seedRoad(manager = getProjectManager(), projectId: string) {
  const mountain = createReferenceMountain();
  const result = writeRoadInputs(manager, projectId, {
    label: "山岳道路",
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  });
  expect(result.ok).toBe(true);
}

function seedTerrain(manager = getProjectManager(), projectId: string) {
  const terrainDoc = {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  };
  writeTerrainDocument(manager, projectId, terrainDoc);
}

function seedExisting(manager = getProjectManager(), projectId: string) {
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...createReferenceMountain().existing] });
}

function makeDocWithPiers(manager = getProjectManager(), projectId: string) {
  const built = buildBridgeLayoutFromRange(manager, projectId, {
    bridgeId: "BR-600",
    name: "Pier参照橋",
    startStation: 100,
    endStation: 700,
  });
  expect(built.ok).toBe(true);
  let doc = built.document!;
  doc = addPier(doc, { supportId: "P1", station: 300 });
  doc = addPier(doc, { supportId: "P2", station: 500 });
  doc = { ...doc, spans: generateSpans(doc) };
  return doc;
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

describe("Phase 4-03 Pier Terrain / Existing reference (view)", () => {
  it("computes pier candidates with road XYZ / elevation / tangent / skew", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrain(manager, project.projectId);
    const doc = makeDocWithPiers(manager, project.projectId);
    const view = assembleBridgeLayoutView(manager, project.projectId, doc);
    expect(view.pierCandidates).toHaveLength(2);
    expect(view.pierCandidates.map((p) => p.label)).toEqual(["P1", "P2"]);
    expect(view.pierCandidates[0].station).toBe(300);
    expect(typeof view.pierCandidates[0].candidate.domainX).toBe("number");
    expect(typeof view.pierCandidates[0].candidate.elevation).toBe("number");
    expect(typeof view.pierCandidates[0].candidate.tangentAzimuthRad).toBe("number");
    expect(view.pierCandidates[0].candidate.coordinateContextId).toBe("COORD-JGD2011");
    expect(view.pierCandidates[0].skewAngleRad === null || typeof view.pierCandidates[0].skewAngleRad === "number").toBe(true);
  });

  it("refreshPierPlacements assigns the automatic CCW skew at save time", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrain(manager, project.projectId);
    const doc = makeDocWithPiers(manager, project.projectId);
    const road = readRoadAlignmentContext(manager, project.projectId);
    const grid = getProjectTerrainGrid(manager, project.projectId);
    const refreshed = refreshPierPlacements(doc, road, grid);
    expect(typeof refreshed.piers[0].skewAngleRad).toBe("number");
    expect(refreshed.piers[0].skewSource).toBe("automatic");
    expect(refreshed.piers[0].placement?.terrainElevation).not.toBeNull();
  });

  it("references pier road elevation and terrain elevation with diff", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrain(manager, project.projectId);
    const doc = makeDocWithPiers(manager, project.projectId);
    const view = assembleBridgeLayoutView(manager, project.projectId, doc);
    for (const pier of view.pierCandidates) {
      expect(pier.terrain.elevation).not.toBeNull();
      expect(pier.terrain.diff).not.toBeNull();
      expect(pier.candidate.elevation).toBeGreaterThan(0);
    }
  });

  it("missing terrain -> terrain elevation null warning (pier data preserved)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    // no terrain seeded
    const doc = makeDocWithPiers(manager, project.projectId);
    const view = assembleBridgeLayoutView(manager, project.projectId, doc);
    expect(view.terrain.available).toBe(false);
    expect(view.pierCandidates[0].terrain.elevation).toBeNull();
    expect(view.pierCandidates[0].station).toBe(300);
  });

  it("outside-surface pier station -> terrain elevation null (no crash)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrain(manager, project.projectId);
    const doc = makeDocWithPiers(manager, project.projectId);
    // tiny grid that does NOT cover the road -> lookup returns null
    const tinyGrid = createTerrainGrid(3, 3, 10, 500, 500, () => 100);
    const road = readRoadAlignmentContext(manager, project.projectId);
    const refreshed = refreshPierPlacements(doc, road, tinyGrid);
    expect(refreshed.piers[0].placement?.terrainElevation).toBeNull();
    expect(refreshed.piers[0].station).toBe(300);
  });

  it("finds nearby existing entities around each pier", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrain(manager, project.projectId);
    seedExisting(manager, project.projectId);
    const doc = makeDocWithPiers(manager, project.projectId);
    const view = assembleBridgeLayoutView(manager, project.projectId, doc);
    expect(view.existing.available).toBe(true);
    const withNearby = view.pierCandidates.filter((p) => p.nearbyExisting.length > 0);
    // P1@300 / P2@500: the river (400..600) should be near P2
    const p2 = view.pierCandidates.find((p) => p.label === "P2");
    expect(p2).toBeTruthy();
    expect(p2!.nearbyExisting.length).toBeGreaterThan(0);
    expect(p2!.nearbyExisting.some((e) => e.label === "山岳河川")).toBe(true);
  });

  it("missing existing -> nearbyExisting empty (available=false warning)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrain(manager, project.projectId);
    const doc = makeDocWithPiers(manager, project.projectId);
    const view = assembleBridgeLayoutView(manager, project.projectId, doc);
    expect(view.existing.available).toBe(false);
    expect(view.pierCandidates[0].nearbyExisting).toHaveLength(0);
  });

  it("auto-generates spans in the view (A1-P1-P2-A2)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    const doc = makeDocWithPiers(manager, project.projectId);
    const view = assembleBridgeLayoutView(manager, project.projectId, doc);
    expect(view.spans).toEqual([
      { spanId: "S1", from: "A1", to: "P1", length: 200 },
      { spanId: "S2", from: "P1", to: "P2", length: 200 },
      { spanId: "S3", from: "P2", to: "A2", length: 200 },
    ]);
  });

  it("pier station change recomputes spans and terrain in the view", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrain(manager, project.projectId);
    let doc = makeDocWithPiers(manager, project.projectId);
    doc = { ...doc, piers: doc.piers.map((p) => (p.supportId === "P2" ? { ...p, station: 600 } : p)) };
    doc = { ...doc, spans: generateSpans(doc) };
    const view = assembleBridgeLayoutView(manager, project.projectId, doc);
    const p2 = view.pierCandidates.find((p) => p.supportId === "P2")!;
    expect(p2.station).toBe(600);
    expect(view.spans.find((s) => s.from === "P2")?.length).toBe(100);
    expect(view.spans.find((s) => s.to === "P2")?.length).toBe(300);
  });
});
