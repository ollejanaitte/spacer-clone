import { describe, expect, it } from "vitest";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import {
  attachSubstructureToManifest,
  attachSuperstructureToManifest,
  buildBridgeProjectManifest,
  buildCommonBridgeModel,
  parseCommonBridgeModel,
  serializeCommonBridgeModel,
} from "../cbdmDocument";
import { buildBridgeProjectSuperstructure } from "../superstructureAdapter";
import { buildBoundGeometryInput } from "../superstructureBinding";
import { buildBoundSubstructure } from "../substructureBinding";
import { buildIntegratedScene3d } from "../integratedScene3d";
import { evaluateBridgeProjectReadiness } from "../workflowReadiness";
import { DefaultGeometryEngine } from "../../apollo/geometry/engine";
import { buildSnapshotVisualizationModel } from "../../apollo/visualization/snapshotVisualizationModel";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import { makePlacementSnapshots } from "../../substructure/planning/useSubstructureRealtimeUpdate";
import { buildAllSupportSolids } from "../../substructure/SubstructureSolidGenerator";
import type { BuildIntermediateInput } from "../../liner/core/pipeline/pipeline";

const GIRDERS = { "GIRDER-1": -4.0, "GIRDER-2": 4.0 };

function runCaseA(draft: BuildIntermediateInput) {
  const alignment = buildBridgeProjectAlignment(draft);
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  const commonModel = buildCommonBridgeModel(alignment, geometry);
  const input = buildBoundGeometryInput(commonModel, {
    girderOffsetsM: { ...GIRDERS },
    girderIds: Object.keys(GIRDERS),
  });
  const snapshot = new DefaultGeometryEngine(draft).generateSnapshot(input);
  const superSolids = buildSnapshotVisualizationModel(snapshot, { bridgeName: "bridge-mtn" })
    .solidGeometryParameters;
  const superstructure = buildBridgeProjectSuperstructure(snapshot, { spanSystem: "continuous" });
  let manifest = attachSuperstructureToManifest(
    buildBridgeProjectManifest(alignment, geometry, commonModel),
    superstructure,
  );
  const supports = buildBoundSubstructure(commonModel, manifest);
  const snapshots = makePlacementSnapshots(supports, draft);
  const subGroups = buildAllSupportSolids(supports as never, snapshots);
  manifest = attachSubstructureToManifest(
    manifest,
    supports.map((s) => s.supportId),
  );
  const integrated = buildIntegratedScene3d(draft, {
    superSolids,
    subGroups,
    commonModel,
    snapshot,
  });
  return { alignment, geometry, commonModel, snapshot, superstructure, manifest, supports, subGroups, integrated };
}

describe("Phase 3-7 CASE A E2E (①→②→③→統合3D)", () => {
  it("runs the full CASE A chain to the integrated 3D scene", () => {
    const { snapshot, manifest, supports, subGroups, integrated } = runCaseA(buildMountainDraft());
    // ①→② Geometry: 9 supports on the real alignment
    expect(snapshot.supportLines.map((l) => l.stationM.value)).toEqual([
      50, 100, 150, 200, 250, 300, 350, 400, 450,
    ]);
    // ②→BP.Superstructure: shared facts + NOT_AUTHORIZED analysis
    expect(manifest.status.sections.superstructure.state).toBe("COMPLETE");
    // →③ Support[] → solids
    expect(supports.length).toBe(9);
    expect(subGroups.length).toBe(9);
    // 統合3D: terrain + ② + ③ with support-XYZ parity
    expect(integrated.base.terrain.positions.length).toBeGreaterThan(0);
    expect(integrated.substructureBoxes.length).toBeGreaterThanOrEqual(9);
    expect(integrated.superstructureBoxes.length).toBeGreaterThan(0);
    expect(integrated.consistency.supportsMatch).toBe(true);
  });

  it("propagates a road-alignment mutation through ② and ③ to the integrated 3D", () => {
    const base = runCaseA(buildMountainDraft());
    const mutatedDraft = buildMountainDraft();
    mutatedDraft.piers = (mutatedDraft.piers ?? []).map((p) =>
      p.id === "A2" ? { ...p, physicalDistance: 460 } : p,
    );
    mutatedDraft.spans = (mutatedDraft.spans ?? []).map((s) =>
      s.pierIdEnd === "A2" ? { ...s, endPhysicalDistance: 460 } : s,
    );
    const after = runCaseA(mutatedDraft);

    // ② Geometry reflects the change.
    expect(after.snapshot.supportLines[8]!.stationM.value).toBe(460);
    expect(after.snapshot.alignmentReferences[0]!.bridgeLengthM.value).toBe(410);
    // ③ binding reflects the change (support station + solid origin).
    const a2 = after.supports.find((s) => s.supportId === "A2")!;
    expect(a2.placement.station).toBe(460);
    const a2Group = after.subGroups.find((g) => g.supportId === "A2")!;
    expect(a2Group.transform.origin.x).not.toBeCloseTo(
      base.subGroups.find((g) => g.supportId === "A2")!.transform.origin.x,
      3,
    );
    // Integrated scene stays consistent after mutation.
    expect(after.integrated.consistency.supportsMatch).toBe(true);
    expect(after.integrated.consistency.mismatches).toEqual([]);
  });

  it("Save → Load → Replay reproduces the same shared records and fingerprint", () => {
    const { commonModel, snapshot } = runCaseA(buildMountainDraft());
    const text = serializeCommonBridgeModel(commonModel);
    const loaded = parseCommonBridgeModel(text);
    const draft = buildMountainDraft();
    const replayedInput = buildBoundGeometryInput(loaded, {
      girderOffsetsM: { ...GIRDERS },
      girderIds: Object.keys(GIRDERS),
    });
    const replayed = new DefaultGeometryEngine(draft).generateSnapshot(replayedInput);
    expect(replayed.fingerprint).toBe(snapshot.fingerprint);
  });

  it("is deterministic: identical input → identical integrated scene", () => {
    const a = runCaseA(buildMountainDraft());
    const b = runCaseA(buildMountainDraft());
    expect(a.integrated.substructureBoxes).toEqual(b.integrated.substructureBoxes);
    expect(a.integrated.superstructureBoxes).toEqual(b.integrated.superstructureBoxes);
    expect(a.manifest).toEqual(b.manifest);
  });
});

describe("Phase 3-7 workflow-ready (minimal readiness)", () => {
  it("reports the next actionable step from the manifest + CBDM", () => {
    const { manifest, commonModel } = runCaseA(buildMountainDraft());
    const readiness = evaluateBridgeProjectReadiness(manifest, commonModel);
    // ①→②→③ chain complete → review (NOT_AUTHORIZED analysis).
    expect(readiness.nextAction).toBe("review");
    expect(readiness.notAuthorized).toContain("numericDesignAuthorization");
    expect(readiness.needsUserConfirmation).toBe(false);
  });
});
