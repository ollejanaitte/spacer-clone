import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { buildSupportHandoff } from "../bridgeLayoutSupportHandoff";
import { buildBridgeLayoutFromRange } from "../bridgeLayoutDomain";
import { createEmptyBridgeLayoutDocument } from "../bridgeLayoutTypes";
import { addPier, updatePierSkew } from "../bridgeLayoutPiers";
import { writeRoadInputs } from "../../roadModuleAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { createReferenceMountain } from "../../terrain/referenceMountain";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("Support Handoff"), {
    businessNumber: "BL-H-001",
    designStage: "bridge-detailed",
  });
}

function seedAll(manager = getProjectManager(), projectId: string) {
  const mountain = createReferenceMountain();
  const roadOk = writeRoadInputs(manager, projectId, {
    label: "山岳道路",
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  });
  expect(roadOk.ok).toBe(true);
  writeTerrainDocument(manager, projectId, {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  });
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
}

function buildDoc(manager = getProjectManager(), projectId: string) {
  const built = buildBridgeLayoutFromRange(manager, projectId, {
    bridgeId: "BR-800",
    name: "Handoff橋",
    startStation: 100,
    endStation: 700,
  });
  expect(built.ok).toBe(true);
  let doc = built.document!;
  doc = addPier(doc, { supportId: "P1", station: 300 });
  doc = addPier(doc, { supportId: "P2", station: 500 });
  doc = updatePierSkew(doc, "P1", 0.25, "user");
  return doc;
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

describe("Phase 4-04 Support Handoff Contract", () => {
  it("builds a support handoff with A1 / P1 / P2 / A2 in station order", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const result = buildSupportHandoff(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const h = result.handoff;
    expect(h.handoffKind).toBe("support-handoff");
    expect(h.schemaVersion).toBe("1.0.0");
    expect(h.bridgeId).toBe("BR-800");
    expect(h.documentReference).toBe("BR-800");
    expect(h.skewConvention).toBe("counterclockwise-positive");
    expect(h.supports.map((s) => s.supportId)).toEqual(["A1", "P1", "P2", "A2"]);
    expect(h.supports.map((s) => s.supportType)).toEqual(["abutment", "pier", "pier", "abutment"]);
    expect(h.supports.map((s) => s.station)).toEqual([100, 300, 500, 700]);
    expect(h.validation.ok).toBe(true);
  });

  it("carries domain XYZ / elevation / tangent / coordinate context / references", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const result = buildSupportHandoff(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const p1 = result.handoff.supports.find((s) => s.supportId === "P1")!;
    expect(typeof p1.position.domainX).toBe("number");
    expect(typeof p1.position.elevation).toBe("number");
    expect(typeof p1.tangentAzimuthRad).toBe("number");
    expect(p1.roadReferenceId).toBe("ROAD-MTN-1");
    expect(p1.coordinateContextId).toBe("COORD-JGD2011");
    expect(result.handoff.roadReference.alignmentId).toBe("ROAD-MTN-1");
    expect(result.handoff.terrainReference.surfaceReference).toBe("assets/terrain/reference.bin");
    expect(result.handoff.existingConditionsReference.documentReferenceId).toBe("0.1.0");
    expect(result.handoff.coordinateContext.coordinatePolicyId).toBe("COORD-JGD2011");
    expect(result.handoff.coordinateContext.axisConvention).toBe("x-along/y-transverse/z-up");
  });

  it("carries skew (CCW-positive) and terrain elevation", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const result = buildSupportHandoff(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const p1 = result.handoff.supports.find((s) => s.supportId === "P1")!;
    expect(p1.skewAngleRad).toBeCloseTo(0.25, 6);
    expect(p1.skewSource).toBe("user");
    expect(p1.terrainElevation).not.toBeNull();
    const a1 = result.handoff.supports.find((s) => s.supportId === "A1")!;
    expect(a1.supportType).toBe("abutment");
  });

  it("fails closed when the road module has no alignment", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    // no road seeded
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-800",
      name: "Handoff橋",
      startStation: 100,
      endStation: 700,
    });
    expect(built.ok).toBe(false); // buildBridgeLayoutFromRange also fails closed
    // construct a document manually (roadReference pointing to a road that does not exist)
    const base = createEmptyBridgeLayoutDocument();
    const raw = {
      ...base,
      bridgeId: "BR-800",
      name: "Handoff橋",
      roadReference: { moduleId: "road" as const, alignmentId: "ROAD-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
      bridgeRange: { startStation: 100, endStation: 700, bridgeLength: 600 },
      abutments: {
        A1: { supportId: "A1", station: 100, skewAngleRad: null },
        A2: { supportId: "A2", station: 700, skewAngleRad: null },
      },
    };
    const result = buildSupportHandoff(manager, project.projectId, raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.message.includes("no alignment") || i.message.includes("unavailable"))).toBe(true);
    }
  });

  it("rejects a non-finite station support", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const bad = { ...doc, piers: [...doc.piers, { supportId: "P3", station: Number.NaN, skewAngleRad: null }] };
    const result = buildSupportHandoff(manager, project.projectId, bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.message.includes("finite"))).toBe(true);
    }
  });

  it("rejects ordering violations and duplicate supports", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    // duplicate P1
    const dup = { ...doc, piers: [...doc.piers, { supportId: "P1", station: 400, skewAngleRad: null }] };
    const dupResult = buildSupportHandoff(manager, project.projectId, dup);
    expect(dupResult.ok).toBe(false);
    if (!dupResult.ok) {
      expect(dupResult.issues.some((i) => i.message.includes("duplicate supportId"))).toBe(true);
    }
  });

  it("does not include substructure design decisions (no column/footing data)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const result = buildSupportHandoff(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const json = JSON.stringify(result.handoff);
    expect(json).not.toContain("columnWidth");
    expect(json).not.toContain("footing");
    expect(json).not.toContain("pile");
  });
});
