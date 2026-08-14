import { describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { writeRoadInputs, writeRoadData } from "../../roadModuleAdapter";
import { commitRoadEditorDraft } from "../../road/roadEditorDraft";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import { verticalElementsToDraft } from "../../road/verticalDraftBridge";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { buildBridgeLayoutFromRange, addPier, generateSpans } from "../../bridgeLayoutModule";
import { writeBridgeLayoutDocument } from "../../bridgeLayoutModuleAdapter";
import { generateSuperstructureFromLayout } from "../../superstructure/superstructureGenerator";
import { readSuperstructureDocument, writeSuperstructureDocument } from "../../superstructureModuleAdapter";
import { buildDerivedAnalysisDocument } from "../../cim/analysisCimLayer";
import { buildAuthorizedDeadLoad } from "../authorizedDeadLoad";

function setupFullBridge(): string {
  resetProjectManagerForTest();
  const project = applyBusinessMetadata(createEmptyProject("sv3"), { businessNumber: "SV3", designStage: "bridge-detailed" });
  getProjectManager().importProject(project);
  const manager = getProjectManager();
  const pid = manager.listProjects()[0]!.projectId;
  const mountain = createReferenceMountain();
  const draft = createDefaultLinerDraft();
  draft.alignment = mountain.roadHorizontal;
  draft.crossSections = [mountain.roadCrossSection];
  draft.verticalAlignment = { id: mountain.roadHorizontal.id, elements: verticalElementsToDraft(mountain.roadVertical) };
  const committed = commitRoadEditorDraft(draft, { source: "new", migratedAt: new Date().toISOString() });
  if (committed.ok && committed.canonical) writeRoadData(manager, pid, committed.canonical);
  writeRoadInputs(manager, pid, { label: "山", horizontal: mountain.roadHorizontal, vertical: mountain.roadVertical, crossSections: [mountain.roadCrossSection] });
  writeTerrainDocument(manager, pid, { ...createEmptyTerrainDocument(), source: { sourceType: "none", importedAt: null, sourceName: "MTN" } } as never);
  writeExistingConditions(manager, pid, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
  const bl = buildBridgeLayoutFromRange(manager, pid, { bridgeId: "BR-900", name: "橋", startStation: 100, endStation: 450 });
  let doc = bl.ok ? bl.document! : undefined;
  if (doc) { doc = addPier(doc, { supportId: "P1", station: 300 }); doc = { ...doc, spans: generateSpans(doc) }; }
  writeBridgeLayoutDocument(manager, pid, doc!);
  generateSuperstructureFromLayout(manager, pid);
  const superDoc = readSuperstructureDocument(manager, pid)!;
  writeSuperstructureDocument(manager, pid, {
    ...superDoc,
    girderConfiguration: { ...superDoc.girderConfiguration, girderSectionModel: { depthM: 1.5, webThicknessM: 0.02, topFlange: { widthM: 0.5, thicknessM: 0.03 }, bottomFlange: { widthM: 0.5, thicknessM: 0.03 }, areaM2: 0.12, unitWeightPerM: 9.24 } },
    materialConfiguration: { elasticModulusKN_M2: 205000000, shearModulusKN_M2: 80000000, poissonRatio: 0.3, densityKN_M3: 78.5 },
    deckConfiguration: { ...superDoc.deckConfiguration, thicknessM: 0.25, unitWeight: 24.5, resolvedWidthM: 10 },
    bearingConfiguration: { ...superDoc.bearingConfiguration, bearingSeats: superDoc.bearingConfiguration.bearingSeats.map((s, i) => i === 0 ? { ...s, bearingType: "fixed", fixedOrMovable: "FIXED" } : s) },
  });
  return pid;
}

describe("Phase 9-04R3 Sol #4: distributed dead load on main girders", () => {
  it("creates intermediate girderPanel nodes so loads act on the girders", () => {
    const pid = setupFullBridge();
    const doc = buildDerivedAnalysisDocument(getProjectManager(), pid)!;
    const panelNodes = doc.nodes.filter((n) => n.sourceKind === "girderPanel");
    expect(panelNodes.length).toBeGreaterThan(0);
    // nodal loads target girderPanel nodes too (not only support points)
    const loadedPanels = doc.nodalLoads.filter((l) => panelNodes.some((n) => n.entityId === l.nodeId));
    expect(loadedPanels.length).toBeGreaterThan(0);
    // members connect through intermediate nodes (mesh is connected)
    const nodeIds = new Set(doc.nodes.map((n) => n.entityId));
    const memberNodeIds = new Set<string>();
    for (const m of doc.members) {
      expect(nodeIds.has(m.nodeIId)).toBe(true);
      expect(nodeIds.has(m.nodeJId)).toBe(true);
      memberNodeIds.add(m.nodeIId);
      memberNodeIds.add(m.nodeJId);
    }
    // every girderPanel node is connected to a member (no floating load nodes)
    for (const n of panelNodes) {
      expect(memberNodeIds.has(n.entityId)).toBe(true);
    }
  });

  it("conserves the total load: sum(-Fz) == loadCase.totalKN (Sol review #7)", () => {
    const pid = setupFullBridge();
    const doc = buildDerivedAnalysisDocument(getProjectManager(), pid)!;
    expect(doc.loadCases.length).toBeGreaterThan(0);
    const totalKN = doc.loadCases[0]!.totalKN!;
    const applied = doc.nodalLoads.reduce((sum, l) => sum + Math.abs(l.fz), 0);
    expect(Math.abs(applied - totalKN)).toBeLessThan(totalKN * 1e-6);
    // all loads are downward (fz < 0)
    expect(doc.nodalLoads.every((l) => l.fz < 0)).toBe(true);
  });

  it("fails closed when the resolved girder set does not match girderCount (Sol review #7)", () => {
    // Simulate a document whose declared girderCount is 3 but only 2 girder
    // lines resolve to FEM nodes: buildAuthorizedDeadLoad must return null
    // (no load case) rather than silently under-distribute.
    const pid = setupFullBridge();
    const doc = buildDerivedAnalysisDocument(getProjectManager(), pid)!;
    const superDoc = readSuperstructureDocument(getProjectManager(), pid)!;
    // count actual girder groups resolved from girderPanel/supportPoint nodes
    const girderIds = new Set<string>();
    for (const n of doc.nodes) {
      if (n.sourceKind === "girderPanel" || n.sourceKind === "supportPoint") {
        const parts = n.sourceEntityId.split(":");
        if (parts[0] === "girderPanel") girderIds.add(parts[1]!);
        if (parts[0] === "supportPoint") girderIds.add(parts[2]!);
      }
    }
    // the fixture resolves more than one girder group, so a declared
    // girderCount of 1 is a guaranteed mismatch
    expect(girderIds.size).toBeGreaterThan(1);
    const mismatched = {
      ...superDoc,
      girderConfiguration: { ...superDoc.girderConfiguration, girderCount: 1 },
    };
    const result = buildAuthorizedDeadLoad(mismatched, doc);
    // girderCount=1 != resolved groups -> null (fail-closed)
    expect(result).toBeNull();
  });
});
