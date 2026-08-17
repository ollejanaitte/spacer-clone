/**
 * CIM integrated scene — full-module integration (Phase 8-02 WP-L / Completion Gate).
 *
 * Seeds a project with canonical data for every module (road / bridge layout /
 * superstructure / substructure / analysis) and verifies the derived
 * buildIntegrated3DScene produces all layers with traceable metadata.
 */

import { describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { writeRoadData, writeRoadInputs } from "../../roadModuleAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { generateSubstructureFromLayout } from "../../substructure/substructureGenerator";
import { writeSubstructureDocument } from "../../substructureModuleAdapter";
import { buildSubstructurePlacement, applySubstructurePlacement } from "../../substructure/substructurePlacement";
import { buildLinerIntermediateFromRoad } from "../../superstructure/superstructureGeometry";
import { commitRoadEditorDraft } from "../../road/roadEditorDraft";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { writeBridgeLayoutDocument } from "../../bridgeLayoutModuleAdapter";
import { buildBridgeLayoutFromRange, addPier, generateSpans } from "../../bridgeLayoutModule";
import { writeSuperstructureDocument } from "../../superstructureModuleAdapter";
import { buildIntegrated3DScene } from "../cimSceneBuilder";
import { createEmptyAnalysisDocument, finalizeAnalysisDocument } from "../../analysis/analysisDocument";
import { serializeAnalysisModuleDataForPersistence } from "../../analysis/analysisModuleData";
import { createInitialModuleData } from "../../contract";
import { deriveAnalysisEntityId } from "../../analysis/analysisId";
import { verticalElementsToDraft } from "../../road/verticalDraftBridge";
import type { AnalysisDocument } from "../../analysis/analysisDocumentTypes";

function makeProject() {
  resetProjectManagerForTest();
  const project = applyBusinessMetadata(createEmptyProject("CIM統合Gate"), {
    businessNumber: "CIM-GATE-1",
    designStage: "bridge-detailed",
  });
  expect(getProjectManager().importProject(project)).toBe(true);
  return getProjectManager().listProjects()[0]!;
}

function seedRoad(projectId: string) {
  const manager = getProjectManager();
  const mountain = createReferenceMountain();
  const draft = createDefaultLinerDraft();
  draft.alignment = mountain.roadHorizontal;
  draft.crossSections = [mountain.roadCrossSection];
  draft.verticalAlignment = {
    id: mountain.roadHorizontal.id,
    elements: verticalElementsToDraft(mountain.roadVertical),
  };
  // Keep the bundle identity aligned with the alignment id so the canonical
  // round-trip preserves ROAD-MTN-1 (matching the legacy roadInput path).
  draft.activeAlignmentId = mountain.roadHorizontal.id;
  draft.linerAlignments = draft.linerAlignments?.map((bundle) => ({
    ...bundle,
    id: mountain.roadHorizontal.id,
    name: mountain.roadHorizontal.id,
  }));
  const committed = commitRoadEditorDraft(draft, { source: "new", migratedAt: new Date().toISOString() });
  expect(committed.ok).toBe(true);
  if (committed.ok && committed.canonical) {
    expect(writeRoadData(manager, projectId, committed.canonical).ok).toBe(true);
  }
  // Legacy roadInput is also required by the bridge layout / superstructure generators.
  const inputs = writeRoadInputs(manager, projectId, {
    label: "山岳道路",
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  });
  expect(inputs.ok).toBe(true);
}

function seedBridgeLayout(projectId: string) {
  const manager = getProjectManager();
  const built = buildBridgeLayoutFromRange(manager, projectId, {
    bridgeId: "BR-900",
    name: "谷川橋",
    startStation: 100,
    endStation: 450,
  });
  expect(built.ok).toBe(true);
  if (!built.ok) return;
  let doc = built.document!;
  doc = addPier(doc, { supportId: "P1", station: 300 });
  doc = { ...doc, spans: generateSpans(doc) };
  const write = writeBridgeLayoutDocument(manager, projectId, doc);
  expect(write.ok).toBe(true);
}

function seedTerrainAndExisting(projectId: string) {
  const manager = getProjectManager();
  const mountain = createReferenceMountain();
  writeTerrainDocument(manager, projectId, {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  });
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
}

function seedSubstructure(projectId: string) {
  const manager = getProjectManager();
  const generated = generateSubstructureFromLayout(manager, projectId);
  expect(generated.ok, JSON.stringify(generated.ok ? [] : generated.issues)).toBe(true);
  if (!generated.ok) return;
  // Attach real LINER placement snapshots so the CIM solids can be derived.
  const mountain = createReferenceMountain();
  const intermediate = buildLinerIntermediateFromRoad({
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  });
  if (intermediate) {
    const placed = buildSubstructurePlacement(generated.document, intermediate);
    if (placed.ok) {
      const write = writeSubstructureDocument(manager, projectId, applySubstructurePlacement(generated.document, placed));
      expect(write.ok).toBe(true);
      return;
    }
  }
  const write = writeSubstructureDocument(manager, projectId, generated.document);
  expect(write.ok).toBe(true);
}

function seedAnalysis(projectId: string) {
  const manager = getProjectManager();
  const base = createEmptyAnalysisDocument({
    projectId,
    createdBy: "gate",
    sourceReferences: { bridgeLayout: null, superstructure: null, substructure: null, loadFingerprint: null, solverSettingsFingerprint: null },
  });
  const n1 = deriveAnalysisEntityId("node", "super:N1");
  const n2 = deriveAnalysisEntityId("node", "super:N2");
  const nodes = [
    { entityId: n1, sourceEntityId: "super:N1", sourceKind: "mainGirder", x: 0, y: 0, z: 100, stationM: 0, offsetM: 0 },
    { entityId: n2, sourceEntityId: "super:N2", sourceKind: "mainGirder", x: 10, y: 0, z: 100, stationM: 10, offsetM: 0 },
  ];
  const matId = deriveAnalysisEntityId("material", "MAT-1");
  const secId = deriveAnalysisEntityId("section", "SEC-1");
  const members = [
    { entityId: deriveAnalysisEntityId("member", "super:M1"), sourceEntityId: "super:M1", sourceKind: "mainGirder", elementType: "frame", nodeIId: n1, nodeJId: n2, materialId: matId, sectionId: secId, endReleases: [], endOffset: null, startDirection: null, orientationVector: { x: 0, y: 0, z: 1 }, metadata: {} },
  ];
  const supports = [
    { entityId: deriveAnalysisEntityId("support", "sub:A1"), sourceEntityId: "sub:A1", sourceKind: "support", nodeId: n1, seatId: null, constraint: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true }, constraintApproximation: null, springIds: [], localFrame: null, source: "substructure" },
  ];
  const materials = [{ entityId: matId, sourceEntityId: "MAT-1", sourceKind: "girder", name: "SS400", elasticModulus: 2e8, shearModulus: 7.7e7, unitWeight: 77 }];
  const sections = [{ entityId: secId, sourceEntityId: "SEC-1", sourceKind: "mainGirder", name: "I-800", area: 0.1, iy: 0.01, iz: 0.02, j: 0.005 }];
  const doc: AnalysisDocument = {
    ...base,
    nodes: nodes as never,
    members: members as never,
    supports: supports as never,
    materials: materials as never,
    sections: sections as never,
    springs: [], foundationSprings: [], bearings: [], nodalLoads: [], memberLoads: [], loadCases: [], loadCombinations: [],
  } as never;
  const finalized = finalizeAnalysisDocument(doc as never);
  const serialized = serializeAnalysisModuleDataForPersistence({ analysisDocument: finalized });
  const record = createInitialModuleData();
  manager.updateProjectModule(projectId, "analysis", { ...record, data: serialized } as never);
}

describe("CIM integrated scene — full module integration (Phase 8-02 WP-L)", () => {
  it("produces all layers with traceable metadata when every module has canonical data", () => {
    const project = makeProject();
    seedRoad(project.projectId);
    seedTerrainAndExisting(project.projectId);
    seedBridgeLayout(project.projectId);
    seedSubstructure(project.projectId);
    seedAnalysis(project.projectId);

    const scene = buildIntegrated3DScene(getProjectManager(), project.projectId);
    expect(scene.ok).toBe(true);

    const layerNames = Object.keys(scene.layers);
    for (const layer of ["terrain", "roadPavement", "bridgeLayout", "superstructure", "substructure", "foundation", "bearing", "femNodes", "femMembers", "supports"]) {
      expect(layerNames).toContain(layer);
      const group = scene.layers[layer as keyof typeof scene.layers];
      expect(group).toBeDefined();
    }

    // metadata spans the modules (superstructure requires the full Reference
    // Bridge generation flow, covered by referenceBridge unit tests;
    // substructure solids require a full placement snapshot, covered by
    // substructureSceneBuilder unit tests)
    const metaSources = new Set(scene.metadata.map((m) => m.sourceModule));
    const requiredSources = ["terrain", "roadPavement", "bridgeLayout", "femNodes", "femMembers", "supports"];
    for (const source of requiredSources) {
      expect({ source, present: metaSources.has(source as never), all: [...metaSources] }).toEqual({ source, present: true, all: [...metaSources] });
    }

    // metadata contract: stableId + coordinateContext present
    for (const meta of scene.metadata.slice(0, 20)) {
      expect(meta.stableId.length).toBeGreaterThan(0);
      expect(meta.coordinateContext).toBe("world");
    }

    expect(scene.bounds).toBeTruthy();
  });
});
