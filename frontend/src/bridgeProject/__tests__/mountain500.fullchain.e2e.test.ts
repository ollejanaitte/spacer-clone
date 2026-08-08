import { describe, expect, it } from "vitest";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import {
  attachSuperstructureToManifest,
  buildBridgeProjectManifest,
  buildCommonBridgeModel,
  parseCommonBridgeModel,
  serializeCommonBridgeModel,
} from "../cbdmDocument";
import {
  buildBridgeProjectSuperstructure,
  parseBridgeProjectSuperstructure,
  serializeBridgeProjectSuperstructure,
} from "../superstructureAdapter";
import { buildBoundGeometryInput } from "../superstructureBinding";
import { buildBoundSubstructure } from "../substructureBinding";
import { DefaultGeometryEngine } from "../../apollo/geometry/engine";
import { buildSnapshotVisualizationModel } from "../../apollo/visualization/snapshotVisualizationModel";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import { makePlacementSnapshots } from "../../substructure/planning/useSubstructureRealtimeUpdate";
import { buildAllSupportSolids } from "../../substructure/SubstructureSolidGenerator";
import {
  deserializeSubstructureProject,
  serializeSubstructureProject,
} from "../../substructure/planning/persistence";

const GIRDERS = { "GIRDER-1": -4.0, "GIRDER-2": 4.0 };

function fullChain() {
  const draft = buildMountainDraft();

  // ① -> BridgeProject.Alignment -> BridgeGeometry -> CBDM
  const alignment = buildBridgeProjectAlignment(draft);
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  const commonModel = buildCommonBridgeModel(alignment, geometry);

  // -> ② GeometryEngineInput -> Geometry snapshot -> 3D
  const input = buildBoundGeometryInput(commonModel, {
    girderOffsetsM: { ...GIRDERS },
    girderIds: Object.keys(GIRDERS),
  });
  const engine = new DefaultGeometryEngine(draft);
  const snapshot = engine.generateSnapshot(input);
  const visualization = buildSnapshotVisualizationModel(snapshot, { bridgeName: "bridge-mtn" });

  // ② -> BridgeProject.Superstructure -> manifest
  const superstructure = buildBridgeProjectSuperstructure(snapshot, { spanSystem: "continuous" });
  const manifest = attachSuperstructureToManifest(
    buildBridgeProjectManifest(alignment, geometry, commonModel),
    superstructure,
  );

  // -> ③ Support[] -> real placement -> Pier/Abutment initial model solids
  const supports = buildBoundSubstructure(commonModel, manifest);
  const snapshots = makePlacementSnapshots(supports, draft);
  const solids = buildAllSupportSolids(supports as never, snapshots);

  return { draft, commonModel, snapshot, visualization, superstructure, manifest, supports, snapshots, solids };
}

describe("Phase 3-4/3-5 full chain E2E (mountain-viaduct-500)", () => {
  it("runs ① → BridgeProject → ② → BridgeProject.Superstructure → ③ → initial model", () => {
    const { commonModel, snapshot, visualization, superstructure, manifest, supports, solids } =
      fullChain();

    // ② Geometry: 9 supports on the real alignment
    expect(snapshot.supportLines.map((line) => line.stationM.value)).toEqual([
      50, 100, 150, 200, 250, 300, 350, 400, 450,
    ]);
    expect(visualization.solidGeometryParameters.length).toBeGreaterThan(0);

    // BridgeProject.Superstructure: shared facts + authorization state
    expect(superstructure.analysisReference.status).toBe("NOT_AUTHORIZED");
    expect(superstructure.mainGirderArrangement.length).toBe(2);
    expect(manifest.status.sections.superstructure).toMatchObject({
      owner: "SUPERSTRUCTURE_OWNER",
      state: "COMPLETE",
    });

    // ③ initial model: A1/A2 + P1..P7 all present with real placement
    expect(supports.map((s) => s.supportId)).toEqual([
      "A1", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "A2",
    ]);
    expect(solids.length).toBe(9);
    expect(supports[0]!.placement.station).toBe(50);
    expect(supports[8]!.placement.station).toBe(450);

    // CBDM provenance / authorization
    expect(commonModel.metadata.numericDesignAuthorization).toBe("NOT_GRANTED");
    expect(commonModel.analysisReference.status).toBe("NOT_AVAILABLE");
  });

  it("Save -> Load -> Replay preserves the shared data (CBDM + Superstructure + ③ project)", () => {
    const { commonModel, superstructure, supports, snapshot } = fullChain();

    // Save: canonical serialization of the shared records.
    const cbdmText = serializeCommonBridgeModel(commonModel);
    const superText = serializeBridgeProjectSuperstructure(superstructure);
    const subProject = serializeSubstructureProject({
      supports,
      projectId: "proj-1",
      bridgeId: "bridge-mtn",
    });
    expect(subProject.ok).toBe(true);
    if (!subProject.ok) return;
    const subJson = subProject.value?.json ?? "";

    // Load: parse + validate.
    const loadedCbdm = parseCommonBridgeModel(cbdmText);
    const loadedSuper = parseBridgeProjectSuperstructure(superText);
    const loadedSub = deserializeSubstructureProject(subJson);
    expect(loadedSub.ok).toBe(true);
    if (!loadedSub.ok) return;

    // Replay: rebuild ② Geometry from the loaded CBDM + the same Liner draft.
    const draft = buildMountainDraft();
    const replayedInput = buildBoundGeometryInput(loadedCbdm, {
      girderOffsetsM: { ...GIRDERS },
      girderIds: Object.keys(GIRDERS),
    });
    const replayed = new DefaultGeometryEngine(draft).generateSnapshot(replayedInput);
    expect(replayed.fingerprint).toBe(snapshot.fingerprint);

    // Replay: rebuild ③ placement from the loaded CBDM/manifest + draft.
    const replayedSupports = buildBoundSubstructure(loadedCbdm);
    const replayedSnapshots = makePlacementSnapshots(replayedSupports, draft);
    expect(Array.from(replayedSnapshots.values())).toEqual(
      Array.from(fullChain().snapshots.values()),
    );
  });

  it("keeps support mapping + provenance across the chain (no sample fallback)", () => {
    const { manifest, supports, commonModel } = fullChain();
    // Every manifest sharedFacts support maps 1:1 to a substructure Support.
    const manifestIds = new Set((manifest.sharedFacts?.supports ?? []).map((s) => s.supportId));
    for (const support of supports) {
      expect(manifestIds.has(support.supportId)).toBe(true);
    }
    // The BridgeProject.Superstructure bearing incidence matches the CBDM supports.
    const superstructure = fullChain().superstructure;
    const supportIds = new Set(supports.map((s) => s.supportId));
    for (const rel of superstructure.bearingSupportRelation) {
      expect(supportIds.has(rel.supportId)).toBe(true);
    }
    expect(commonModel.bridgeGeometry.supports.length).toBe(9);
  });

  it("is deterministic: two identical runs produce identical shared records", () => {
    const a = fullChain();
    const b = fullChain();
    expect(a.commonModel).toEqual(b.commonModel);
    expect(a.superstructure).toEqual(b.superstructure);
    expect(a.manifest).toEqual(b.manifest);
    expect(a.supports).toEqual(b.supports);
  });
});
