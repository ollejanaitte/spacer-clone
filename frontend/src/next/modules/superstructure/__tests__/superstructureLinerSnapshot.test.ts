import { describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { createReferenceMountain } from "../../terrain/referenceMountain";
import { writeRoadInputs, writeRoadData } from "../../roadModuleAdapter";
import { commitRoadEditorDraft } from "../../road/roadEditorDraft";
import { createDefaultLinerDraft } from "../../../../liner/adapters/linerUiAdapter";
import { verticalElementsToDraft, verticalDraftToElements } from "../../road/verticalDraftBridge";
import { writeTerrainDocument } from "../../terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../../terrainModule";
import { writeExistingConditions } from "../../existingConditionsAdapter";
import { buildBridgeLayoutFromRange, addPier, generateSpans } from "../../bridgeLayoutModule";
import { writeBridgeLayoutDocument } from "../../bridgeLayoutModuleAdapter";
import { generateSuperstructureFromLayout } from "../superstructureGenerator";
import { readRoadData } from "../../roadModuleAdapter";
import { loadRoadEditorDraft } from "../../road/roadEditorDraft";
import { readSuperstructureDocument } from "../../superstructureModuleAdapter";
import { regenerateSuperstructureDerived } from "../superstructurePersistence";
import { buildLinerIntermediateFromRoad, generateSuperstructureSnapshot, toVerticalElementDraft } from "../superstructureGeometry";

function makeProject() {
  resetProjectManagerForTest();
  const project = applyBusinessMetadata(createEmptyProject("x"), { businessNumber: "D", designStage: "bridge-detailed" });
  getProjectManager().importProject(project);
  return getProjectManager().listProjects()[0]!;
}

describe("superstructure LINER snapshot (Phase 9-04 fix)", () => {
  it("preserves parabolic startElevation through the draft conversion", () => {
    const ref = createReferenceMountain();
    const parabolic = ref.roadVertical.find((e) => e.type === "parabolic");
    expect(parabolic).toBeDefined();
    if (parabolic && parabolic.type === "parabolic") {
      const draft = toVerticalElementDraft(parabolic);
      if (draft.type === "parabolic") {
        expect(draft.startElevation).toBe(parabolic.startElevation);
      }
    }
  });

  it.fails("KNOWN BLOCKER: LINER snapshot FATAL at station 100 (LINER_COORDINATE_FATAL_DIAGNOSTICS) through the browser-authentic road path", () => {
    const project = makeProject();
    const manager = getProjectManager();
    const pid = project.projectId;
    const mountain = createReferenceMountain();
    // Authentic browser path: reference mountain seed WITHOUT manual bundle sync.
    const draft = createDefaultLinerDraft();
    draft.alignment = mountain.roadHorizontal;
    draft.crossSections = [mountain.roadCrossSection];
    draft.verticalAlignment = { id: mountain.roadHorizontal.id, elements: verticalElementsToDraft(mountain.roadVertical) };
    const committed = commitRoadEditorDraft(draft, { source: "new", migratedAt: new Date().toISOString() });
    expect(committed.ok).toBe(true);
    if (committed.ok && committed.canonical) writeRoadData(manager, pid, committed.canonical);
    writeRoadInputs(manager, pid, { label: "山", horizontal: mountain.roadHorizontal, vertical: mountain.roadVertical, crossSections: [mountain.roadCrossSection] });
    writeTerrainDocument(manager, pid, { ...createEmptyTerrainDocument(), source: { sourceType: "none", importedAt: null, sourceName: "MTN" } } as never);
    writeExistingConditions(manager, pid, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
    const bl = buildBridgeLayoutFromRange(manager, pid, { bridgeId: "BR-900", name: "橋", startStation: 100, endStation: 450 });
    let doc = bl.ok ? bl.document! : undefined;
    if (doc) { doc = addPier(doc, { supportId: "P1", station: 300 }); doc = { ...doc, spans: generateSpans(doc) }; }
    writeBridgeLayoutDocument(manager, pid, doc!);
    const gen = generateSuperstructureFromLayout(manager, pid);
    expect(gen.ok).toBe(true);

    const roadData = readRoadData(manager, pid)!;
    const loaded = loadRoadEditorDraft(roadData);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const inter = buildLinerIntermediateFromRoad({
      label: "",
      horizontal: loaded.draft.alignment,
      vertical: verticalDraftToElements(loaded.draft.verticalAlignment?.elements ?? []),
      crossSections: loaded.draft.crossSections ?? [],
    } as never);
    expect(inter).toBeDefined();
    const superDoc = readSuperstructureDocument(manager, pid)!;
    const regen = regenerateSuperstructureDerived(manager, pid, superDoc);
    const snap = generateSuperstructureSnapshot(inter!, regen);
    expect(snap.ok, snap.ok ? "" : snap.issues[0]?.message ?? "snapshot failed").toBe(true);
  });
});
