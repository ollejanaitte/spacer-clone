import { describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { buildProjectPackage } from "../../../persistence/package/projectPackageBuilder";
import { extractProjectFromPackage } from "../../../persistence/package/projectPackageImporter";
import { buildSuperstructureDocument } from "../../superstructure/superstructureDocumentDomain";
import { writeSuperstructureDocument, readSuperstructureDocument } from "../../superstructureModuleAdapter";
import { buildSubstructureDocument } from "../substructureDocumentDomain";
import { writeSubstructureDocument, readSubstructureDocument } from "../../substructureModuleAdapter";
import { runSuperstructureIntegrityGate } from "../../superstructure/superstructureIntegrityGate";
import { writeBridgeLayoutDocument } from "../../bridgeLayoutModuleAdapter";
import { buildBridgeLayoutFromRange, addPier, generateSpans } from "../../bridgeLayoutModule";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { writeRoadInputs } from "../../roadModuleAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { commitRoadEditorDraft } from "../../road/roadEditorDraft";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import { verticalElementsToDraft } from "../../road/verticalDraftBridge";
import { writeRoadData } from "../../roadModuleAdapter";

function makeProject() {
  resetProjectManagerForTest();
  const project = applyBusinessMetadata(createEmptyProject("Rescue Persist"), {
    businessNumber: "RES-P-1",
    designStage: "bridge-detailed",
  });
  expect(getProjectManager().importProject(project)).toBe(true);
  return getProjectManager().listProjects()[0]!;
}

function seedUpstream(projectId: string) {
  const manager = getProjectManager();
  const mountain = createReferenceMountain();
  const draft = createDefaultLinerDraft();
  draft.alignment = mountain.roadHorizontal;
  draft.crossSections = [mountain.roadCrossSection];
  draft.verticalAlignment = { id: mountain.roadHorizontal.id, elements: verticalElementsToDraft(mountain.roadVertical) };
  draft.activeAlignmentId = mountain.roadHorizontal.id;
  draft.linerAlignments = draft.linerAlignments?.map((b) => ({ ...b, id: mountain.roadHorizontal.id }));
  const committed = commitRoadEditorDraft(draft, { source: "new", migratedAt: new Date().toISOString() });
  if (committed.ok && committed.canonical) writeRoadData(manager, projectId, committed.canonical);
  writeRoadInputs(manager, projectId, { label: "山岳道路", horizontal: mountain.roadHorizontal, vertical: mountain.roadVertical, crossSections: [mountain.roadCrossSection] });
  writeTerrainDocument(manager, projectId, { ...createEmptyTerrainDocument(), source: { sourceType: "none", importedAt: null, sourceName: "MTN" } } as never);
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
  const built = buildBridgeLayoutFromRange(manager, projectId, { bridgeId: "BR-900", name: "谷川橋", startStation: 100, endStation: 450 });
  let doc = built.ok ? built.document! : undefined;
  if (doc) { doc = addPier(doc, { supportId: "P1", station: 300 }); doc = { ...doc, spans: generateSpans(doc) }; }
  writeBridgeLayoutDocument(manager, projectId, doc!);
}

function seedSuperWithRescue(projectId: string) {
  const manager = getProjectManager();
  const built = buildSuperstructureDocument({
    projectId,
    bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
    roadReference: { moduleId: "road", alignmentId: "ROAD-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
    structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
    girderConfiguration: { girderCount: 4, girderSpacingM: 3.0, girderLines: [], girderSectionModel: { depthM: 2.2, webThicknessM: 0.014, topFlange: { widthM: 0.5, thicknessM: 0.03 }, bottomFlange: { widthM: 0.6, thicknessM: 0.035 }, areaM2: null, unitWeightPerM: null } },
    deckConfiguration: { deckId: "DECK-1", deckKind: "rc_non_composite", thicknessM: 0.24, unitWeight: 24.5, overhangLeftM: 0.6, overhangRightM: 0.6, resolvedWidthM: 12 },
    crossBeamConfiguration: null, crossFrameConfiguration: null,
    bearingConfiguration: { bearingSupportRelation: [], bearingSeats: [] },
    superstructureType: "plate_girder_rc_slab_non_composite",
  });
  expect(built.ok).toBe(true);
  if (built.ok) writeSuperstructureDocument(manager, projectId, built.document);
}

function seedSubWithRescue(projectId: string) {
  const manager = getProjectManager();
  const built = buildSubstructureDocument({
    projectId,
    bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
    superstructureReference: { bridgeId: "BR-900", moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "SS-1", handoffSchemaVersion: "1.0.0" },
    roadReference: { moduleId: "road", alignmentId: "ROAD-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
    supports: [
      {
        supportId: "P1",
        supportType: "pier",
        placement: { source: "liner", alignmentId: "ROAD-MTN-1", station: 300, offset: 0 },
        skewRad: 0,
        bearingSeats: [],
        pier: { id: "p1", formType: "single_column_rect", column: { id: "c1", width: 3.0, depth: 2.5, height: 9.0 }, footing: { id: "ft-p1", length: 7.0, width: 7.0, thickness: 2.2, topElevation: 98.0 }, pileGroup: { id: "pg1", pileType: "bored_pile", diameter: 1.2, length: 20, pileCount: 6, spacing: { x: 3.6, y: 3.6 } } },
      },
    ],
  });
  expect(built.ok).toBe(true);
  if (built.ok) writeSubstructureDocument(manager, projectId, built.document);
}

describe("Rescue persistence round-trip (Phase 9-03 WP-H)", () => {
  it("superstructure rescue edits survive .spacerproj export/import", () => {
    const project = makeProject();
    seedUpstream(project.projectId);
    seedSuperWithRescue(project.projectId);
    const manager = getProjectManager();
    const builtPkg = buildProjectPackage(manager.getProject(project.projectId)!);
    expect(builtPkg.ok).toBe(true);
    if (!builtPkg.ok) return;

    resetProjectManagerForTest();
    const imported = extractProjectFromPackage(JSON.parse(builtPkg.json));
    expect(imported).toBeTruthy();
    if (!imported) return;
    expect(getProjectManager().importProject(imported)).toBe(true);

    const restored = readSuperstructureDocument(getProjectManager(), project.projectId);
    expect(restored).toBeDefined();
    if (restored) {
      expect(restored.girderConfiguration.girderCount).toBe(4);
      expect(restored.girderConfiguration.girderSectionModel.depthM).toBe(2.2);
      expect(restored.deckConfiguration.thicknessM).toBe(0.24);
    }
  });

  it("substructure rescue edits survive .spacerproj export/import", () => {
    const project = makeProject();
    seedUpstream(project.projectId);
    seedSubWithRescue(project.projectId);
    const manager = getProjectManager();
    const builtPkg = buildProjectPackage(manager.getProject(project.projectId)!);
    expect(builtPkg.ok).toBe(true);
    if (!builtPkg.ok) return;

    resetProjectManagerForTest();
    const imported = extractProjectFromPackage(JSON.parse(builtPkg.json));
    expect(imported).toBeTruthy();
    if (!imported) return;
    expect(getProjectManager().importProject(imported)).toBe(true);

    const restored = readSubstructureDocument(getProjectManager(), project.projectId);
    expect(restored).toBeDefined();
    if (restored) {
      expect(restored.supports[0]?.pier?.column?.width).toBe(3.0);
      expect(restored.supports[0]?.pier?.pileGroup?.pileCount).toBe(6);
    }
  });
});
