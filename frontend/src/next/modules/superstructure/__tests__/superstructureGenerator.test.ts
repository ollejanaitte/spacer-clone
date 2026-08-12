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
import { generateSuperstructureFromLayout } from "../superstructureGenerator";
import { readSuperstructureDocument } from "../../superstructureModuleAdapter";
import { regenerateSuperstructureDerived } from "../superstructurePersistence";
import { runSuperstructureIntegrityGate } from "../superstructureIntegrityGate";

describe("Superstructure generator (WP-J E2E)", () => {
  it("generates a document from Bridge Layout and passes the gate", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("Gen"), {
      businessNumber: "GEN-1",
      designStage: "bridge-detailed",
    }));
    const projectId = manager.listProjects()[0].projectId;
    const mountain = createReferenceMountain();
    writeRoadInputs(manager, projectId, {
      label: "山岳道路",
      horizontal: mountain.roadHorizontal,
      vertical: mountain.roadVertical,
      crossSections: [mountain.roadCrossSection],
    });
    writeTerrainDocument(manager, projectId, {
      ...createEmptyTerrainDocument(),
      source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
      surfaceReference: "assets/terrain/reference.bin",
    });
    writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });

    const built = buildBridgeLayoutFromRange(manager, projectId, {
      bridgeId: "BR-900",
      name: "谷川橋",
      startStation: 100,
      endStation: 450,
    });
    if (!built.ok) throw new Error("layout failed");
    let layout = built.document!;
    layout = addPier(layout, { supportId: "P1", station: 300 });
    layout = { ...layout, spans: generateSpans(layout) };
    expect(writeBridgeLayoutDocument(manager, projectId, layout).ok).toBe(true);

    const result = generateSuperstructureFromLayout(manager, projectId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.bridgeLayoutReference?.bridgeId).toBe("BR-900");
    expect(result.document.structuralSystem.bridgeSystem).toBe("CONTINUOUS");
    expect(result.document.girderConfiguration.girderCount).toBe(2);

    // read back (derived stripped) + regenerate -> gate PASS
    const readBack = readSuperstructureDocument(manager, projectId)!;
    const regenerated = regenerateSuperstructureDerived(manager, projectId, readBack);
    const gate = runSuperstructureIntegrityGate(manager, projectId, regenerated);
    expect(gate.ok).toBe(true);
    expect(gate.phase6Ready).toBe(true);
  });

  it("fails closed when Bridge Layout is missing", () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("GenNG"), {
      businessNumber: "GEN-2",
      designStage: "bridge-detailed",
    }));
    const projectId = manager.listProjects()[0].projectId;
    const result = generateSuperstructureFromLayout(manager, projectId);
    expect(result.ok).toBe(false);
  });
});
