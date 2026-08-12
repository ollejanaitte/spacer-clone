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
import { generateSubstructureFromLayout } from "../substructureGenerator";
import { buildBearingReactionFromHandoff } from "../substructurePhase5Adapter";
import { computeSubstructureQuantity, runSubstructureDesign } from "../substructureDesign";
import { readSubstructureDocument, writeSubstructureDocument } from "../../substructureModuleAdapter";
import { runSubstructureIntegrityGate } from "../substructureIntegrityGate";
import { validateSubstructureData } from "../substructureValidation";
function validateDraft(doc: unknown) {
  return validateSubstructureData({ substructureDocument: doc } as Record<string, unknown>);
}

describe("Substructure Completion Gate (WP-K)", () => {
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

  it("reports gate state for a generated document (may be partial before shapes)", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("Gate"), { businessNumber: "G-1", designStage: "bridge-detailed" }));
    const projectId = manager.listProjects()[0].projectId;
    seed(projectId);
    const built = buildBridgeLayoutFromRange(manager, projectId, { bridgeId: "BR-900", name: "谷川橋", startStation: 100, endStation: 450 });
    if (!built.ok) throw new Error("layout failed");
    let layout = built.document!;
    layout = addPier(layout, { supportId: "P1", station: 300 });
    layout = { ...layout, spans: generateSpans(layout) };
    expect(writeBridgeLayoutDocument(manager, projectId, layout).ok).toBe(true);

    const gen = generateSubstructureFromLayout(manager, projectId);
    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    // attach design/quantity results + bearing seats (Phase 5 path via generator-ready doc)
    const withQty = {
      ...gen.document,
      quantityResults: computeSubstructureQuantity(gen.document),
      designResults: runSubstructureDesign(gen.document),
      bearingSeatReferences: [],
    };
    const write = writeSubstructureDocument(manager, projectId, withQty);
    if (!write.ok) {
      console.log("WRITE FAIL", JSON.stringify(validateDraft(withQty)));
    }
    expect(write.ok).toBe(true);

    const read = readSubstructureDocument(manager, projectId)!;
    const result = runSubstructureIntegrityGate(manager, projectId, read);
    // Gate (strict) requires shapes; generated doc is partial -> documentValid/shapesValid false
    expect(result.checks.documentValid).toBe(false); // shape required (missing)
    expect(result.checks.shapesValid).toBe(true); // existing shapes have valid dims
    expect(result.checks.bridgeLayoutPresent).toBe(true);
    expect(result.checks.supportsPresent).toBe(true);
    // quantity derived after we attached results
    expect(result.checks.quantityDerived).toBe(true);
    expect(result.checks.authorizationPreserved).toBe(true);
    // gate overall not ready until shapes/phase5 configured
    expect(result.ok).toBe(false);
    expect(result.phase6Ready).toBe(false);
  });

  it("gate fails closed when document is missing (no supports)", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("GateNG"), { businessNumber: "G-2", designStage: "bridge-detailed" }));
    const projectId = manager.listProjects()[0].projectId;
    // no bridge layout, no document
    const doc = {
      schemaVersion: "0.1.0" as const,
      documentKind: "substructure-design" as const,
      documentId: "x",
      projectId,
      revisionId: 1,
      status: "DRAFT" as const,
      provenance: { createdAt: "2026-08-12T00:00:00.000Z", createdBy: "t", producer: "t" },
      timestamps: { updatedAt: "2026-08-12T00:00:00.000Z", derivedAt: null },
      bridgeLayoutReference: null,
      superstructureReference: null,
      roadReference: null,
      supportReferences: null,
      bearingReactionReferences: null,
      supports: [],
      bearingSeatReferences: [],
      footingConfigurations: [],
      foundationConfigurations: [],
      pileConfigurations: [],
      terrainReferences: null,
      existingReferences: null,
      geometryReference: { snapshotFingerprint: null, snapshotVersion: null, generatedAt: null, model3DReference: { solidsDigest: null } },
      designInputs: { superstructureReactions: [] },
      designResults: { designStatus: "NOT_AUTHORIZED", checks: [], reactionStatus: "NOT_AVAILABLE" },
      quantityResults: { quantityStatus: "NOT_AVAILABLE", totalConcreteVolumeM3: null, totalPileLengthM: null, units: "m³ / m" },
      validation: { schemaVersion: "0.1.0", validatedAt: null, ok: false, issues: [] },
      extensions: {},
    } as never;
    const result = runSubstructureIntegrityGate(manager, projectId, doc);
    expect(result.ok).toBe(false);
    expect(result.phase6Ready).toBe(false);
  });
});
