import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { runBridgeLayoutIntegrityGate } from "../bridgeLayoutIntegrityGate";
import { buildBridgeLayoutFromRange } from "../bridgeLayoutDomain";
import { createEmptyBridgeLayoutDocument } from "../bridgeLayoutTypes";
import { addPier, updatePierSkew } from "../bridgeLayoutPiers";
import { generateSpans } from "../bridgeLayoutSpans";
import { writeRoadInputs } from "../../roadModuleAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { createReferenceMountain } from "../../terrain/referenceMountain";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("Integrity Gate"), {
    businessNumber: "BL-I-001",
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
    bridgeId: "BR-900",
    name: "Integrity橋",
    startStation: 100,
    endStation: 700,
  });
  expect(built.ok).toBe(true);
  let doc = built.document!;
  doc = addPier(doc, { supportId: "P1", station: 300 });
  doc = addPier(doc, { supportId: "P2", station: 500 });
  doc = updatePierSkew(doc, "P1", 0.25, "user");
  doc = { ...doc, spans: generateSpans(doc) };
  return doc;
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  resetProjectManagerForTest();
});

describe("Phase 4-04 Reference Integrity Gate", () => {
  it("passes all checks for a valid document (Phase5/Phase6 READY)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const result = runBridgeLayoutIntegrityGate(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    expect(result.checks.documentValid).toBe(true);
    expect(result.checks.rangeValid).toBe(true);
    expect(result.checks.pierConfigurationValid).toBe(true);
    expect(result.checks.spanConfigurationValid).toBe(true);
    expect(result.checks.referencesValid).toBe(true);
    expect(result.checks.supportHandoffReady).toBe(true);
    expect(result.checks.spanHandoffReady).toBe(true);
    expect(result.checks.parserRoundTrip).toBe(true);
    expect(result.phase5Ready).toBe(true);
    expect(result.phase6Ready).toBe(true);
  });

  it("detects dangling references (road missing) and fails ready checks", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    // road NOT seeded
    const built = buildBridgeLayoutFromRange(manager, project.projectId, {
      bridgeId: "BR-901",
      name: "Integrity欠損",
      startStation: 100,
      endStation: 700,
    });
    expect(built.ok).toBe(false);
    const base = createEmptyBridgeLayoutDocument();
    const raw = {
      ...base,
      bridgeId: "BR-901",
      name: "Integrity欠損",
      roadReference: { moduleId: "road" as const, alignmentId: "ROAD-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
      bridgeRange: { startStation: 100, endStation: 700, bridgeLength: 600 },
      abutments: { A1: { supportId: "A1", station: 100, skewAngleRad: null }, A2: { supportId: "A2", station: 700, skewAngleRad: null } },
    };
    const result = runBridgeLayoutIntegrityGate(manager, project.projectId, raw);
    expect(result.ok).toBe(false);
    expect(result.checks.referencesValid).toBe(false);
    expect(result.checks.supportHandoffReady).toBe(false);
    expect(result.phase5Ready).toBe(false);
    expect(result.phase6Ready).toBe(false);
  });

  it("detects pier ordering violations", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const bad = { ...doc, piers: [...doc.piers].reverse() };
    const result = runBridgeLayoutIntegrityGate(manager, project.projectId, bad);
    expect(result.ok).toBe(false);
    expect(result.checks.pierConfigurationValid).toBe(false);
  });

  it("detects span derived inconsistency (direct edit)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const bad = { ...doc, spans: doc.spans.map((s) => (s.spanId === "S2" ? { ...s, length: 999, endStation: 550 } : s)) };
    const result = runBridgeLayoutIntegrityGate(manager, project.projectId, bad);
    expect(result.ok).toBe(false);
    // derived consistency is caught by the Span Handoff validation
    expect(result.checks.spanHandoffReady).toBe(false);
    // Phase 5（上部工）はSpan Handoffが正式入口のため NOT_READY。Phase 6（下部工）はSupport Handoff基準のため維持
    expect(result.phase5Ready).toBe(false);
  });

  it("fails closed on malformed document (NaN bridgeRange)", () => {
    const manager = getProjectManager();
    manager.importProject(makeProject());
    const project = manager.listProjects()[0];
    seedAll(manager, project.projectId);
    const doc = buildDoc(manager, project.projectId);
    const bad = { ...doc, bridgeRange: { startStation: Number.NaN, endStation: 700, bridgeLength: Number.NaN } };
    expect(() => runBridgeLayoutIntegrityGate(manager, project.projectId, bad)).not.toThrow();
    const result = runBridgeLayoutIntegrityGate(manager, project.projectId, bad);
    expect(result.ok).toBe(false);
  });
});
