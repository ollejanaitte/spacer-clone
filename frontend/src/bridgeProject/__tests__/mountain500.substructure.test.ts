import { describe, expect, it } from "vitest";
import { buildBoundSubstructure } from "../substructureBinding";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import {
  attachSuperstructureToManifest,
  buildBridgeProjectManifest,
  buildCommonBridgeModel,
} from "../cbdmDocument";
import { buildBridgeProjectSuperstructure } from "../superstructureAdapter";
import { buildBoundGeometryInput } from "../superstructureBinding";
import { DefaultGeometryEngine } from "../../apollo/geometry/engine";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import { makePlacementSnapshots } from "../../substructure/planning/useSubstructureRealtimeUpdate";
import { computeAllPlacements } from "../../substructure/SupportPlacementEngine";
import { buildAllSupportSolids } from "../../substructure/SubstructureSolidGenerator";

function mountainChain() {
  const draft = buildMountainDraft();
  const alignment = buildBridgeProjectAlignment(draft);
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  const commonModel = buildCommonBridgeModel(alignment, geometry);
  let manifest = buildBridgeProjectManifest(alignment, geometry, commonModel);
  const input = buildBoundGeometryInput(commonModel, {
    girderOffsetsM: { "GIRDER-1": -4.0, "GIRDER-2": 4.0 },
    girderIds: ["GIRDER-1", "GIRDER-2"],
  });
  const snapshot = new DefaultGeometryEngine(draft).generateSnapshot(input);
  const superstructure = buildBridgeProjectSuperstructure(snapshot, { spanSystem: "continuous" });
  manifest = attachSuperstructureToManifest(manifest, superstructure);
  const supports = buildBoundSubstructure(commonModel, manifest);
  return { draft, commonModel, manifest, supports, snapshot };
}

describe("Phase 3-5: BridgeProject → substructure real placement (mountain ①→③)", () => {
  it("produces 9 supports with BridgeProject-bound placement facts", () => {
    const { supports } = mountainChain();
    expect(supports.map((s) => s.supportId)).toEqual([
      "A1", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "A2",
    ]);
    expect(supports.map((s) => s.placement.station)).toEqual([
      50, 100, 150, 200, 250, 300, 350, 400, 450,
    ]);
    expect(supports[4]!.skewRad).toBeCloseTo(Math.PI / 2, 9);
    expect(supports[0]!.bearingSeats.length).toBe(2);
  });

  it("computes REAL placement snapshots from the LINER alignment (non-identity basis)", () => {
    const { draft, supports } = mountainChain();
    const snapshots = makePlacementSnapshots(supports, draft);
    expect(snapshots.size).toBe(9);

    // A1 at station 50 on the curved alignment: position should NOT be (50, 0, 0).
    const a1 = snapshots.get("A1")!;
    expect(a1.source).toBe("liner");
    expect(Number.isFinite(a1.position.x)).toBe(true);
    expect(a1.tangent).not.toEqual({ x: 1, y: 0, z: 0 });
    expect(a1.transverse).not.toEqual({ x: 0, y: 1, z: 0 });
    expect(a1.skewRad).toBeCloseTo(Math.PI / 2, 9);

    // Identical inputs → identical snapshots (deterministic replay).
    const again = makePlacementSnapshots(supports, buildMountainDraft());
    expect(again).toEqual(snapshots);
  });

  it("the SupportPlacementEngine path agrees with makePlacementSnapshots", () => {
    const { draft, supports } = mountainChain();
    const viaEngine = computeAllPlacements(supports, draft);
    expect(viaEngine.fatalCount).toBe(0);
    const snapshots = makePlacementSnapshots(supports, draft);
    supports.forEach((support, index) => {
      const engineSnapshot = viaEngine.results[index]!.snapshot;
      const wrapper = snapshots.get(support.supportId)!;
      expect(wrapper.position).toEqual(engineSnapshot.position);
      expect(wrapper.skewRad).toBeCloseTo(engineSnapshot.skewRad, 9);
    });
  });

  it("builds 3D solids for every support from the real placement (Pier/Abutment initial model)", () => {
    const { draft, supports } = mountainChain();
    const snapshots = makePlacementSnapshots(supports, draft);
    const solids = buildAllSupportSolids(supports as never, snapshots);
    expect(solids.length).toBe(9);
    // A1/A2 abutments and P1..P7 piers all produce solids.
    const ids = new Set(solids.map((g) => g.supportId));
    for (const support of supports) {
      expect(ids.has(support.supportId)).toBe(true);
    }
  });

  it("keeps NOT_AUTHORIZED reactions out of the placement path (no fabricated reactions)", () => {
    const { manifest } = mountainChain();
    expect(manifest.sharedFacts?.reactions ?? []).toEqual([]);
  });
});
