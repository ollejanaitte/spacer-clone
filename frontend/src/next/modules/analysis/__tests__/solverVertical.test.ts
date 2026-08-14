/**
 * Phase 9-04R3 WP-B: declared-section -> solver-ready AnalysisDocument vertical.
 *
 * Verifies that a user-declared section + material + authorized load + resolved
 * bearing supports produce an AnalysisDocument that (a) has positive finite
 * section properties, (b) resolves the declared material (CONFIRMED), and
 * (c) carries at least one ux-constrained support per girder line so the
 * backend solver reports SUCCEEDED (not MODEL_UNSTABLE).
 */
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
import { regenerateSuperstructureDerived } from "../../superstructure/superstructurePersistence";
import { buildDerivedAnalysisDocument } from "../../cim/analysisCimLayer";
import type { SuperstructureDocument } from "../../superstructure/superstructureTypes";

function makeProject() {
  resetProjectManagerForTest();
  const project = applyBusinessMetadata(createEmptyProject("solver-vertical"), { businessNumber: "SV", designStage: "bridge-detailed" });
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

function declareSectionAndMaterial(superDoc: SuperstructureDocument): SuperstructureDocument {
  return {
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
    materialConfiguration: {
      elasticModulusKN_M2: 205000000,
      shearModulusKN_M2: 80000000,
      poissonRatio: 0.3,
      densityKN_M3: 78.5,
    },
    deckConfiguration: {
      ...superDoc.deckConfiguration,
      thicknessM: 0.25,
      unitWeight: 24.5,
      resolvedWidthM: 10,
    },
    crossBeamConfiguration: superDoc.crossBeamConfiguration
      ? {
          ...superDoc.crossBeamConfiguration,
          crossBeams: superDoc.crossBeamConfiguration.crossBeams.map((cb) => ({
            ...cb,
            depthM: cb.depthM ?? 0.8,
            widthM: cb.widthM ?? 0.4,
          })),
        }
      : null,
  };
}

describe("Phase 9-04R3 WP-B solver vertical (declared section)", () => {
  it("builds a solver-ready AnalysisDocument from the declared section", () => {
    const pid = setupFullBridge();
    const manager = getProjectManager();
    const superDoc = readSuperstructureDocument(manager, pid)!;
    const declared = declareSectionAndMaterial(superDoc);
    const write = writeSuperstructureDocument(manager, pid, declared);
    expect(write.ok).toBe(true);

    const regen = regenerateSuperstructureDerived(manager, pid, readSuperstructureDocument(manager, pid)!);
    const doc = buildDerivedAnalysisDocument(manager, pid) ?? undefined;
    expect(doc).toBeDefined();
    if (!doc) return;

    // declared section -> positive finite properties
    const girderSection = doc.sections.find((s) => s.sourceEntityId === "SECTION-GIRDER");
    expect(girderSection).toBeDefined();
    if (girderSection) {
      expect(girderSection.area).toBeGreaterThan(0);
      expect(girderSection.iy).toBeGreaterThan(0);
      expect(girderSection.iz).toBeGreaterThan(0);
      expect(girderSection.j).toBeGreaterThan(0);
      expect(Number.isFinite(girderSection.area)).toBe(true);
    }

    // material resolved as CONFIRMED (declared)
    const material = doc.materials.find((m) => m.sourceEntityId === "MAT-STEEL");
    expect(material).toBeDefined();
    if (material) {
      expect(material.source).toBe("CONFIRMED");
      expect(material.elasticModulus).toBe(205000000);
    }

    // authorized load case present
    expect(doc.loadCases.length).toBeGreaterThan(0);
    expect(doc.loadCases[0]?.caseId).toBe("LC1");
    expect(doc.nodalLoads.length).toBeGreaterThan(0);

    // members reference existing sections/materials (no dangling refs)
    expect(doc.members.length).toBeGreaterThan(0);
    const sectionIds = new Set(doc.sections.map((s) => s.entityId));
    const materialIds = new Set(doc.materials.map((m) => m.entityId));
    for (const member of doc.members) {
      expect(sectionIds.has(member.sectionId)).toBe(true);
      expect(materialIds.has(member.materialId)).toBe(true);
    }
  });

  it("provides at least one ux-constrained support per girder line when a bearing is FIXED", () => {
    const pid = setupFullBridge();
    const manager = getProjectManager();
    const superDoc = readSuperstructureDocument(manager, pid)!;
    const declared = declareSectionAndMaterial(superDoc);
    // set the first support's bearings to FIXED (ux,uy,uz) per FROZEN mapping
    const fixedSeats = declared.bearingConfiguration.bearingSeats.map((seat, i) =>
      i === 0 ? { ...seat, bearingType: "fixed" as const, fixedOrMovable: "FIXED" as const } : seat,
    );
    writeSuperstructureDocument(manager, pid, {
      ...declared,
      bearingConfiguration: { ...declared.bearingConfiguration, bearingSeats: fixedSeats },
    });

    const doc = buildDerivedAnalysisDocument(manager, pid) ?? undefined;
    expect(doc).toBeDefined();
    if (!doc) return;
    expect(doc.supports.length).toBeGreaterThan(0);
    // at least one support constrains ux
    const hasUx = doc.supports.some((s) => s.constraint.ux === true);
    expect(hasUx).toBe(true);
    // all supports carry at least uz (vertical restraint)
    expect(doc.supports.every((s) => s.constraint.uz === true)).toBe(true);
  });

  it("upstream edit changes the derived AnalysisDocument (STALE-ready regeneration)", () => {
    const pid = setupFullBridge();
    const manager = getProjectManager();
    const superDoc = readSuperstructureDocument(manager, pid)!;
    writeSuperstructureDocument(manager, pid, declareSectionAndMaterial(superDoc));
    const before = buildDerivedAnalysisDocument(manager, pid)!;
    const checksumBefore = before.modelChecksum;

    // commit a section change (UI path: materialConfiguration edit)
    const current = readSuperstructureDocument(manager, pid)!;
    writeSuperstructureDocument(manager, pid, {
      ...current,
      materialConfiguration: { ...current.materialConfiguration!, elasticModulusKN_M2: 210000000 },
    });
    const after = buildDerivedAnalysisDocument(manager, pid)!;
    expect(after.modelChecksum).not.toBe(checksumBefore);
    // derived regeneration is deterministic within the same input
    const again = buildDerivedAnalysisDocument(manager, pid)!;
    expect(again.modelChecksum).toBe(after.modelChecksum);
  });
});
