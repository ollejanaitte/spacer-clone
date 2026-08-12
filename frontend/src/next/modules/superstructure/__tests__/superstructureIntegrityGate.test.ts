import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { writeRoadInputs } from "../../roadModuleAdapter";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { buildBridgeLayoutFromRange, addPier, generateSpans } from "../../bridgeLayoutModule";
import { writeBridgeLayoutDocument } from "../../bridgeLayoutModuleAdapter";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { runSuperstructureIntegrityGate } from "../superstructureIntegrityGate";
import { writeSuperstructureDocument, readSuperstructureDocument } from "../../superstructureModuleAdapter";
import { regenerateSuperstructureDerived } from "../superstructurePersistence";
import { buildSuperstructureDocument, attachSuperstructureHandoffs } from "../superstructureDocumentDomain";

describe("Superstructure Completion Gate (WP-J)", () => {
  function seed(projectId: string) {
    const mountain = createReferenceMountain();
    writeRoadInputs(getProjectManager(), projectId, {
      label: "山岳道路",
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSections: [mountain.roadCrossSection],
    });
    writeTerrainDocument(getProjectManager(), projectId, {
      ...createEmptyTerrainDocument(),
      source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
      surfaceReference: "assets/terrain/reference.bin",
    });
    writeExistingConditions(getProjectManager(), projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
  }

  function makeDoc(projectId: string) {
    const built = buildBridgeLayoutFromRange(getProjectManager(), projectId, {
      bridgeId: "BR-900",
      name: "谷川橋",
      startStation: 100,
      endStation: 450,
    });
    if (!built.ok) throw new Error("layout failed");
    let layout = built.document!;
    layout = addPier(layout, { supportId: "P1", station: 300 });
    layout = { ...layout, spans: generateSpans(layout) };
    writeBridgeLayoutDocument(getProjectManager(), projectId, layout);

    const docBuild = buildSuperstructureDocument({
      projectId,
      bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
      roadReference: { moduleId: "road", alignmentId: "ROAD-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
      girderConfiguration: {
        girderCount: 2,
        girderSpacingM: 8,
        girderLines: [] as never[],
        girderSectionModel: { depthM: null, webThicknessM: null, topFlange: null, bottomFlange: null, areaM2: null, unitWeightPerM: null },
      },
      deckConfiguration: {
        deckId: "DECK-1",
        deckKind: "rc_non_composite",
        thicknessM: 0.24,
        unitWeight: 24.5,
        overhangLeftM: 0.5,
        overhangRightM: 0.5,
        resolvedWidthM: 12.0,
      },
    });
    if (!docBuild.ok) throw new Error("doc failed");
    return attachSuperstructureHandoffs(docBuild.document, {
      handoffId: "SH-1",
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-12T00:00:00.000Z",
      spans: layout.spans.map((s, i) => ({
        spanId: s.spanId,
        index: i,
        startSupportId: s.startSupportId,
        endSupportId: s.endSupportId,
        startStation: s.startStation,
        endStation: s.endStation,
        spanLength: s.length,
        startSupportSkew: null,
        endSupportSkew: null,
      })),
    }, {
      handoffId: "SH-2",
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-12T00:00:00.000Z",
      supports: [
        { supportId: "A1", supportType: "abutment", label: "A1", station: 100, position: { domainX: 100, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 95, roadReferenceId: "r", coordinateContextId: null },
        { supportId: "P1", supportType: "pier", label: "P1", station: 300, position: { domainX: 300, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 92, roadReferenceId: "r", coordinateContextId: null },
        { supportId: "A2", supportType: "abutment", label: "A2", station: 450, position: { domainX: 450, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 96, roadReferenceId: "r", coordinateContextId: null },
      ],
    });
  }

  it("passes the gate for a complete document", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("Gate"), {
      businessNumber: "G-1",
      designStage: "bridge-detailed",
    }));
    const projectId = manager.listProjects()[0].projectId;
    seed(projectId);
    const doc = makeDoc(projectId);
    expect(writeSuperstructureDocument(manager, projectId, doc).ok).toBe(true);
    // read back (derived stripped) then regenerate
    const readBack = readSuperstructureDocument(manager, projectId);
    const regenerated = regenerateSuperstructureDerived(manager, projectId, readBack!);
    const result = runSuperstructureIntegrityGate(manager, projectId, regenerated);
    expect(result.ok).toBe(true);
    expect(result.checks.documentValid).toBe(true);
    expect(result.checks.derivedConsistent).toBe(true);
    expect(result.checks.handoffReady).toBe(true);
    expect(result.phase6Ready).toBe(true);
  });

  it("fails the gate when Bridge Layout is missing", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("GateNG"), {
      businessNumber: "G-2",
      designStage: "bridge-detailed",
    }));
    const projectId = manager.listProjects()[0].projectId;
    const docBuild = buildSuperstructureDocument({
      projectId,
      bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
      roadReference: { moduleId: "road", alignmentId: "ALN", stationReferenceId: null, coordinatePolicyId: null },
      girderConfiguration: {
        girderCount: 2,
        girderSpacingM: 8,
        girderLines: [] as never[],
        girderSectionModel: { depthM: null, webThicknessM: null, topFlange: null, bottomFlange: null, areaM2: null, unitWeightPerM: null },
      },
      deckConfiguration: {
        deckId: "DECK-1",
        deckKind: "rc_non_composite",
        thicknessM: 0.24,
        unitWeight: 24.5,
        overhangLeftM: 0.5,
        overhangRightM: 0.5,
        resolvedWidthM: 12.0,
      },
    });
    if (!docBuild.ok) throw new Error("doc failed");
    const result = runSuperstructureIntegrityGate(manager, projectId, docBuild.document);
    expect(result.ok).toBe(false);
    expect(result.checks.bridgeLayoutPresent).toBe(false);
    expect(result.phase6Ready).toBe(false);
  });
});
