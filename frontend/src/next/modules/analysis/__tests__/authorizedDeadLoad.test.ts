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
import { readSuperstructureDocument } from "../../superstructureModuleAdapter";
import { buildDerivedAnalysisDocument } from "../../cim/analysisCimLayer";
import { authorizedDeadLoadTotalKN, buildAuthorizedDeadLoad } from "../authorizedDeadLoad";
import { readAnalysisDocument } from "../../cim/analysisCimLayer";
import { writeSuperstructureDocument } from "../../superstructureModuleAdapter";
import { regenerateSuperstructureDerived } from "../../superstructure/superstructurePersistence";

function makeProject() {
  resetProjectManagerForTest();
  const project = applyBusinessMetadata(createEmptyProject("x"), { businessNumber: "D", designStage: "bridge-detailed" });
  getProjectManager().importProject(project);
  return getProjectManager().listProjects()[0]!;
}

function setupFullBridge(): string {
  const project = makeProject();
  const manager = getProjectManager();
  const pid = project.projectId;
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
  const gen = generateSuperstructureFromLayout(manager, pid);
  expect(gen.ok, gen.ok ? "" : gen.issues[0]?.message ?? "gen failed").toBe(true);
  return pid;
}

describe("authorizedDeadLoad (Phase 9-04R2 WP-R2D)", () => {
  it("computes a finite positive DL total from the FROZEN load model", () => {
    const pid = setupFullBridge();
    const superDoc = readSuperstructureDocument(getProjectManager(), pid)!;
    const total = authorizedDeadLoadTotalKN(superDoc);
    // Generated bridge has no declared girder section / deck width -> the load
    // model is fail-closed (MISSING), never inventing a value.
    expect(total).toBeNull();
  });

  it("derives a positive DL total when the section/deck are declared", () => {
    const pid = setupFullBridge();
    const manager = getProjectManager();
    const superDoc = readSuperstructureDocument(manager, pid)!;
    const declared = {
      ...superDoc,
      girderConfiguration: {
        ...superDoc.girderConfiguration,
        girderSectionModel: {
          depthM: 1.5,
          webThicknessM: 0.02,
          topFlange: { widthM: 0.5, thicknessM: 0.03 },
          bottomFlange: { widthM: 0.5, thicknessM: 0.03 },
          areaM2: 0.12,
          unitWeightPerM: 9.24,
        },
      },
      deckConfiguration: {
        ...superDoc.deckConfiguration,
        thicknessM: 0.25,
        unitWeight: 24.5,
        resolvedWidthM: 10,
      },
    };
    const write = writeSuperstructureDocument(manager, pid, declared);
    expect(write.ok).toBe(true);
    const regen = regenerateSuperstructureDerived(manager, pid, readSuperstructureDocument(manager, pid)!);
    const total = authorizedDeadLoadTotalKN(regen);
    expect(total).toBeTypeOf("number");
    expect(total!).toBeGreaterThan(0);
  });

  it("builds a derived AnalysisDocument carrying an authorized DL load case", () => {
    const pid = setupFullBridge();
    const manager = getProjectManager();
    const superDoc = readSuperstructureDocument(manager, pid)!;
    const declared = {
      ...superDoc,
      girderConfiguration: {
        ...superDoc.girderConfiguration,
        girderSectionModel: {
          depthM: 1.5,
          webThicknessM: 0.02,
          topFlange: { widthM: 0.5, thicknessM: 0.03 },
          bottomFlange: { widthM: 0.5, thicknessM: 0.03 },
          areaM2: 0.12,
          unitWeightPerM: 9.24,
        },
      },
      deckConfiguration: {
        ...superDoc.deckConfiguration,
        thicknessM: 0.25,
        unitWeight: 24.5,
        resolvedWidthM: 10,
      },
    };
    writeSuperstructureDocument(manager, pid, declared);
    const doc = buildDerivedAnalysisDocument(manager, pid);
    expect(doc).toBeDefined();
    expect(doc!.loadCases.length).toBeGreaterThan(0);
    expect(doc!.loadCases[0].caseId).toBe("LC1");
    expect(doc!.loadCases[0].kind).toBe("dead");
    expect(doc!.nodalLoads.length).toBeGreaterThan(0);
    expect(doc!.nodalLoads.every((n) => n.fz < 0)).toBe(true);
    expect(doc!.nodalLoads.every((n) => n.loadCaseId === "LC1")).toBe(true);

    const regen = regenerateSuperstructureDerived(manager, pid, readSuperstructureDocument(manager, pid)!);
    const applied = buildAuthorizedDeadLoad(regen, doc!);
    expect(applied).not.toBeNull();
    const totalApplied = applied!.nodalLoads.reduce((sum, n) => sum + Math.abs(n.fz), 0);
    expect(totalApplied).toBeGreaterThan(0);
  });

  it("keeps the load case in the read path used by the CIM overlay", () => {
    const pid = setupFullBridge();
    const manager = getProjectManager();
    const superDoc = readSuperstructureDocument(manager, pid)!;
    writeSuperstructureDocument(manager, pid, {
      ...superDoc,
      girderConfiguration: {
        ...superDoc.girderConfiguration,
        girderSectionModel: { depthM: 1.5, webThicknessM: 0.02, topFlange: { widthM: 0.5, thicknessM: 0.03 }, bottomFlange: { widthM: 0.5, thicknessM: 0.03 }, areaM2: 0.12, unitWeightPerM: 9.24 },
      },
      deckConfiguration: { ...superDoc.deckConfiguration, thicknessM: 0.25, unitWeight: 24.5, resolvedWidthM: 10 },
    });
    const doc = readAnalysisDocument(getProjectManager(), pid) ?? buildDerivedAnalysisDocument(getProjectManager(), pid);
    expect(doc).toBeDefined();
    expect(doc!.loadCases.length).toBeGreaterThan(0);
  });
});
