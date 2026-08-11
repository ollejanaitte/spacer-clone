import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import {
  readRoadAlignmentContext,
  computeBridgeLength,
  validateBridgeRangeInput,
  buildBridgeLayoutFromRange,
  applyBridgeRangeToDocument,
} from "../bridgeLayoutDomain";
import { writeRoadInputs } from "../../roadModuleAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { createEmptyExistingConditionsDocument } from "../../existingConditions";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import type { LinearAlignment } from "../../../../liner/core/types";
import type { VerticalElement } from "../../../../liner/core/geometry/vertical";
import type { CrossSectionTemplateDraft } from "../../../../liner/schema/types";
import { readBridgeLayoutDocument, writeBridgeLayoutDocument } from "../../bridgeLayoutModuleAdapter";
import { createEmptyBridgeLayoutDocument } from "../bridgeLayoutTypes";
import type { BridgeLayoutDocument } from "../bridgeLayoutTypes";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("橋梁区間設定"), {
    businessNumber: "BL-002",
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
  writeExistingConditions(manager, projectId, createEmptyExistingConditionsDocument());
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

describe("readRoadAlignmentContext (Road reference)", () => {
  it("resolves alignment from road module data (no duplication)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    const context = readRoadAlignmentContext(manager, project.projectId);
    expect(context.ok).toBe(true);
    expect(context.alignmentId).toBe("ROAD-MTN-1");
    expect(context.totalLength).toBeGreaterThan(700);
    expect(context.coordinatePolicyId).toBe("COORD-JGD2011");
    expect(context.intermediate?.samplePoints.length).toBeGreaterThan(0);
  });

  it("fails closed when road module has no alignment", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    const context = readRoadAlignmentContext(manager, project.projectId);
    expect(context.ok).toBe(false);
    expect(context.alignmentId).toBeNull();
    expect(context.issues.some((i) => i.message.includes("no alignment"))).toBe(true);
  });

  it("fails closed when alignment has no elements", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    writeRoadInputs(manager, project.projectId, { horizontal: { id: "ALIGN-EMPTY", elements: [] } as unknown });
    const context = readRoadAlignmentContext(manager, project.projectId);
    expect(context.ok).toBe(false);
    expect(context.issues.some((i) => i.message.includes("no elements"))).toBe(true);
  });
});

describe("bridgeLength", () => {
  it("computes bridgeLength as endStation - startStation", () => {
    expect(computeBridgeLength({ startStation: 100, endStation: 450 })).toBe(350);
  });
});

describe("validateBridgeRangeInput (Bridge Range)", () => {
  const valid = {
    startStation: 100,
    endStation: 450,
    alignmentTotalLength: 760,
    roadReferenceValid: true,
    alignmentReferenceValid: true,
  };

  it("accepts a valid range", () => {
    expect(validateBridgeRangeInput(valid)).toHaveLength(0);
  });

  it("rejects startStation === endStation", () => {
    const issues = validateBridgeRangeInput({ ...valid, startStation: 450, endStation: 450 });
    expect(issues.some((i) => i.message.includes("must not equal"))).toBe(true);
  });

  it("rejects startStation > endStation", () => {
    const issues = validateBridgeRangeInput({ ...valid, startStation: 500, endStation: 100 });
    expect(issues.some((i) => i.message.includes("less than endStation"))).toBe(true);
  });

  it("rejects NaN", () => {
    const issues = validateBridgeRangeInput({ ...valid, startStation: Number.NaN });
    expect(issues.some((i) => i.path.includes("startStation") && i.message.includes("finite"))).toBe(true);
  });

  it("rejects Infinity", () => {
    const issues = validateBridgeRangeInput({ ...valid, endStation: Infinity });
    expect(issues.some((i) => i.path.includes("endStation") && i.message.includes("finite"))).toBe(true);
  });

  it("rejects stations outside the alignment range", () => {
    const issues = validateBridgeRangeInput({ ...valid, startStation: -1, endStation: 1000 });
    expect(issues.some((i) => i.message.includes("outside the road alignment range"))).toBe(true);
    expect(issues.filter((i) => i.message.includes("outside the road alignment range"))).toHaveLength(2);
  });

  it("rejects invalid road / alignment references", () => {
    const issues = validateBridgeRangeInput({ ...valid, roadReferenceValid: false, alignmentReferenceValid: false });
    expect(issues.some((i) => i.message.includes("roadReference is invalid"))).toBe(true);
    expect(issues.some((i) => i.message.includes("alignmentReference is invalid"))).toBe(true);
  });
});

describe("buildBridgeLayoutFromRange", () => {
  it("builds a document with roadReference resolved from the road module", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrainAndExisting(manager, project.projectId);
    const result = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-100",
      name: "旭高架橋",
      startStation: 100,
      endStation: 450,
    });
    expect(result.ok).toBe(true);
    const doc = result.document!;
    expect(doc.roadReference.alignmentId).toBe("ROAD-MTN-1");
    expect(doc.bridgeRange.startStation).toBe(100);
    expect(doc.bridgeRange.endStation).toBe(450);
    expect(doc.bridgeRange.bridgeLength).toBe(350);
    expect(doc.abutments.A1.station).toBe(100);
    expect(doc.abutments.A2.station).toBe(450);
    expect(doc.abutments.A1.supportId).toBe("A1");
    expect(doc.abutments.A2.supportId).toBe("A2");
    expect(doc.terrainReference.surfaceReference).toBe("assets/terrain/reference.bin");
    expect(doc.existingConditionsReference.documentReferenceId).toBe("0.1.0");
  });

  it("fails closed when the road module has no alignment", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    const result = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-100",
      name: "旭高架橋",
      startStation: 100,
      endStation: 450,
    });
    expect(result.ok).toBe(false);
    expect(result.document).toBeUndefined();
  });

  it("fails closed when the range is outside the alignment", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    const result = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-100",
      name: "旭高架橋",
      startStation: 100,
      endStation: 9999,
    });
    expect(result.ok).toBe(false);
  });

  it("persists the built document via the adapter and reads it back", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedRoad(manager, project.projectId);
    seedTerrainAndExisting(manager, project.projectId);
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-101",
      name: "谷川橋",
      startStation: 300,
      endStation: 600,
    });
    expect(built.ok).toBe(true);
    const write = writeBridgeLayoutDocument(manager, project.projectId, built.document);
    expect(write.ok).toBe(true);
    const read = readBridgeLayoutDocument(manager, project.projectId);
    expect(read?.bridgeId).toBe("BR-101");
    expect(read?.bridgeRange.bridgeLength).toBe(300);
    expect(read?.abutments.A1.station).toBe(300);
    expect(read?.abutments.A2.station).toBe(600);
  });
});

describe("applyBridgeRangeToDocument", () => {
  function baseDoc(): BridgeLayoutDocument {
    return {
      ...createEmptyBridgeLayoutDocument(),
      bridgeId: "BR-200",
      name: "再計算橋",
      roadReference: { moduleId: "road", alignmentId: "ROAD-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
      bridgeRange: { startStation: 100, endStation: 200, bridgeLength: 100 },
      abutments: {
        A1: { supportId: "A1", station: 100, skewAngleRad: null },
        A2: { supportId: "A2", station: 200, skewAngleRad: null },
      },
    };
  }

  it("recomputes bridgeLength and A1/A2 stations after station change", () => {
    const next = applyBridgeRangeToDocument(baseDoc(), 150, 500);
    expect(next.bridgeRange.startStation).toBe(150);
    expect(next.bridgeRange.endStation).toBe(500);
    expect(next.bridgeRange.bridgeLength).toBe(350);
    expect(next.abutments.A1.station).toBe(150);
    expect(next.abutments.A2.station).toBe(500);
  });
});

// Type-level sanity: domain helpers accept the official LinearAlignment shape.
void (null as unknown as LinearAlignment);
void (null as unknown as VerticalElement[]);
void (null as unknown as CrossSectionTemplateDraft);
