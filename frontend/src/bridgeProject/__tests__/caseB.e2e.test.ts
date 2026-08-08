import { describe, expect, it } from "vitest";
import {
  reconstructAlignmentFromSample,
  reconstructionFactsFromSnapshot,
  reconstructionFactsFromSuperstructure,
} from "../alignmentReconstruction";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import {
  attachReconstructionToManifest,
  attachSubstructureToManifest,
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
import { BridgeProjectAdapterError } from "../validation";

const GIRDERS = { "GIRDER-1": -4.0, "GIRDER-2": 4.0 };

/** RB-001 superstructure sample facts (a ② sample WITHOUT any ① alignment). */
const RB001_FACTS = {
  bridgeId: "RB-S10-001",
  bridgeLengthM: 134.001,
  spanLengthsM: [40.201, 51.0, 42.8],
  supportIds: ["SUP-AR2", "SUP-PR1", "SUP-PR2", "SUP-PU15"],
  supportStationsM: [0, 40.201, 91.201, 134.001],
  deckWidthM: 8.01,
  girderOffsetsM: { "GIRDER-AG1": 1.47689, "GIRDER-AG2": -3.02859 },
  sourceReference: "rb001-sample:v1",
};

function runCaseB(facts: typeof RB001_FACTS) {
  // ② sample → BridgeProject (reconstruction contract) → ① partial alignment.
  const reconstructed = reconstructAlignmentFromSample(facts);
  const { alignment, reconstruction, draft } = reconstructed;
  // Reconstructed alignment → BridgeProject Geometry.
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  const commonModel = buildCommonBridgeModel(alignment, geometry);
  // CASE B origin manifest.
  let manifest = attachReconstructionToManifest(
    buildBridgeProjectManifest(alignment, geometry, commonModel),
    reconstruction,
  );
  // → ③ binding.
  const supports = buildBoundSubstructure(commonModel, manifest);
  const snapshots = makePlacementSnapshots(supports, draft);
  const subGroups = buildAllSupportSolids(supports as never, snapshots);
  manifest = attachSubstructureToManifest(
    manifest,
    supports.map((s) => s.supportId),
  );
  // ② integration check: run the reconstructed alignment through ② Geometry.
  const input = buildBoundGeometryInput(commonModel, {
    girderOffsetsM: { ...GIRDERS },
    girderIds: Object.keys(GIRDERS),
  });
  const snapshot = new DefaultGeometryEngine(draft).generateSnapshot(input);
  const superSolids = buildSnapshotVisualizationModel(snapshot, { bridgeName: "rb001" })
    .solidGeometryParameters;
  // Integrated 3D.
  const integrated = buildIntegratedScene3d(draft, {
    superSolids,
    subGroups,
    commonModel,
    snapshot,
  });
  return { alignment, reconstruction, geometry, commonModel, manifest, supports, subGroups, integrated, snapshot };
}

describe("Phase 3-9 CASE B E2E (②sample→①復元→③→統合3D)", () => {
  it("reconstructs a partial alignment from the RB-001 sample and runs ②→③", () => {
    const { alignment, reconstruction, manifest, supports, subGroups, integrated, snapshot } =
      runCaseB(RB001_FACTS);

    // ① partial alignment (status-marked)
    expect(alignment.bridgeLengthM.value).toBeCloseTo(134.001, 6);
    expect(manifest.status.sections.alignment.state).toBe("PARTIAL");
    // reconstruction statuses preserved
    const entries = reconstruction.entries!;
    expect(entries.find((e) => e.fieldKey === "bridgeLengthM")!.status).toBe("CONFIRMED");
    expect(entries.find((e) => e.fieldKey === "horizontalGeometry")!.status).toBe("INFERRED");
    expect(entries.find((e) => e.fieldKey === "verticalProfile")!.status).toBe("MISSING");
    // →③ supports (4) + solids
    expect(supports.length).toBe(4);
    expect(subGroups.length).toBe(4);
    expect(supports.map((s) => s.supportId)).toEqual(["SUP-AR2", "SUP-PR1", "SUP-PR2", "SUP-PU15"]);
    // ② runs on the reconstructed alignment
    expect(snapshot.supportLines.length).toBe(4);
    // integrated 3D data-consistent
    expect(integrated.consistency.supportsMatch).toBe(true);
    expect(integrated.substructureBoxes.length).toBeGreaterThanOrEqual(4);
  });

  it("Save → Load → Replay reproduces the reconstructed shared records", () => {
    const { commonModel, snapshot } = runCaseB(RB001_FACTS);
    const text = serializeCommonBridgeModel(commonModel);
    const loaded = parseCommonBridgeModel(text);
    const facts = { ...RB001_FACTS };
    const { draft } = reconstructAlignmentFromSample(facts);
    const replayedInput = buildBoundGeometryInput(loaded, {
      girderOffsetsM: { ...GIRDERS },
      girderIds: Object.keys(GIRDERS),
    });
    const replayed = new DefaultGeometryEngine(draft).generateSnapshot(replayedInput);
    expect(replayed.fingerprint).toBe(snapshot.fingerprint);
  });

  it("is deterministic (revision-stable): same sample → identical reconstruction", () => {
    const a = reconstructAlignmentFromSample(RB001_FACTS);
    const b = reconstructAlignmentFromSample(RB001_FACTS);
    expect(a.alignment).toEqual(b.alignment);
    expect(a.reconstruction).toEqual(b.reconstruction);
  });

  it("rejects a ①→②→① self-reconstruction cycle", () => {
    // Reconstruct from RB-001, run it forward as CASE A, then try to reconstruct
    // from the resulting superstructure back into the SAME alignment bridge.
    const { draft } = reconstructAlignmentFromSample(RB001_FACTS);
    const alignment = buildBridgeProjectAlignment(draft);
    const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
    const commonModel = buildCommonBridgeModel(alignment, geometry);
    const input = buildBoundGeometryInput(commonModel, {
      girderOffsetsM: { ...GIRDERS },
      girderIds: Object.keys(GIRDERS),
    });
    const snapshot = new DefaultGeometryEngine(draft).generateSnapshot(input);
    const superstructure = buildBridgeProjectSuperstructure(snapshot, { spanSystem: "continuous" });
    const facts = reconstructionFactsFromSuperstructure(superstructure, {
      spanLengthsM: snapshot.alignmentReferences[0]!.spanLengthsM.value as number[],
      supportStationsM: snapshot.supportLines.map((l) => l.stationM.value!) as number[],
    });
    // The superstructure now belongs to the reconstructed alignment; reconstructing
    // from it with the same bridge id is a self-loop and must be rejected.
    expect(() =>
      reconstructAlignmentFromSample(facts, { generatingBridgeId: superstructure.bridgeId }),
    ).toThrowError(BridgeProjectAdapterError);
  });

  it("workflow readiness: CASE B flags INFERRED/MISSING for user confirmation", () => {
    const { manifest, commonModel } = runCaseB(RB001_FACTS);
    const readiness = evaluateBridgeProjectReadiness(manifest, commonModel);
    expect(readiness.needsUserConfirmation).toBe(true);
    expect(readiness.inferred).toContain("horizontalGeometry");
    expect(readiness.missing).toContain("verticalProfile");
    expect(readiness.notAuthorized).toContain("numericDesignAuthorization");
  });

  it("CASE A still works after CASE B (reverse feature does not break forward)", () => {
    // Regression: run CASE A on the mountain sample.
    const draft = buildMountainDraft();
    const alignment = buildBridgeProjectAlignment(draft);
    const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
    const commonModel = buildCommonBridgeModel(alignment, geometry);
    const input = buildBoundGeometryInput(commonModel, {
      girderOffsetsM: { ...GIRDERS },
      girderIds: Object.keys(GIRDERS),
    });
    const snapshot = new DefaultGeometryEngine(draft).generateSnapshot(input);
    expect(snapshot.supportLines.length).toBe(9);
    expect(snapshot.supportLines[8]!.stationM.value).toBe(450);
  });
});
