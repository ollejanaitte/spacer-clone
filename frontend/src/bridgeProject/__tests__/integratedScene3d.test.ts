import { describe, expect, it } from "vitest";
import { buildIntegratedScene3d, verifyIntegratedConsistency } from "../integratedScene3d";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import { buildCommonBridgeModel } from "../cbdmDocument";
import { buildBoundGeometryInput } from "../superstructureBinding";
import { buildBoundSubstructure } from "../substructureBinding";
import { DefaultGeometryEngine } from "../../apollo/geometry/engine";
import { buildSnapshotVisualizationModel } from "../../apollo/visualization/snapshotVisualizationModel";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import { domainToThree } from "../../liner/samples/mountain-viaduct-500/threeCoords";
import { makePlacementSnapshots } from "../../substructure/planning/useSubstructureRealtimeUpdate";
import { buildAllSupportSolids } from "../../substructure/SubstructureSolidGenerator";

const GIRDERS = { "GIRDER-1": -4.0, "GIRDER-2": 4.0 };

function fullChain() {
  const draft = buildMountainDraft();
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
  const supports = buildBoundSubstructure(commonModel);
  const snapshots = makePlacementSnapshots(supports, draft);
  const subGroups = buildAllSupportSolids(supports as never, snapshots);
  return { draft, commonModel, snapshot, superSolids, subGroups };
}

describe("buildIntegratedScene3d (Phase 3-6)", () => {
  it("fuses terrain + ② superstructure + ③ substructure into one three-space scene", () => {
    const { draft, commonModel, superSolids, subGroups, snapshot } = fullChain();
    const scene = buildIntegratedScene3d(draft, {
      superSolids,
      subGroups,
      commonModel,
      snapshot,
    });
    // base terrain/road/bridge layers present
    expect(scene.base.terrain.positions.length).toBeGreaterThan(0);
    expect(scene.base.road.points.length).toBeGreaterThan(0);
    expect(scene.base.bridge.spans.length).toBe(8);
    // ③ substructure solids for A1/P1..P7/A2
    expect(scene.substructureBoxes.length).toBeGreaterThanOrEqual(9);
    const supportIds = new Set(scene.substructureBoxes.map((b) => b.supportId));
    expect(supportIds.has("A1")).toBe(true);
    expect(supportIds.has("A2")).toBe(true);
    expect(supportIds.has("P4")).toBe(true);
    // ② superstructure solids (girders + bearings)
    expect(scene.superstructureBoxes.length).toBeGreaterThan(0);
    expect(scene.superstructureBoxes.some((b) => b.entity === "girder")).toBe(true);
    expect(scene.superstructureBoxes.some((b) => b.entity === "bearing")).toBe(true);
    // all centers finite
    for (const box of [...scene.substructureBoxes, ...scene.superstructureBoxes]) {
      expect(box.center.every((n) => Number.isFinite(n))).toBe(true);
    }
    // ② bearing/girder origins are global and match the snapshot (data parity)
    const bearingSolid = scene.superstructureBoxes.find((b) => b.entity === "bearing");
    expect(bearingSolid).toBeDefined();
    const expectedBearing = snapshot.bearingPoints[0]!;
    const expected = domainToThree(expectedBearing.position);
    expect(bearingSolid!.center[0]).toBeCloseTo(expected[0], 6);
    expect(bearingSolid!.center[2]).toBeCloseTo(expected[2], 6);
  });

  it("proves support-XYZ parity across ③ solids, CBDM, and ② snapshot (data consistency)", () => {
    const { draft, commonModel, superSolids, subGroups, snapshot } = fullChain();
    const scene = buildIntegratedScene3d(draft, {
      superSolids,
      subGroups,
      commonModel,
      snapshot,
    });
    const check = verifyIntegratedConsistency(scene);
    expect(check.supportsMatch).toBe(true);
    expect(check.mismatches).toEqual([]);
  });

  it("is deterministic across two runs (Save/Load/Replay stable)", () => {
    const a = (() => {
      const { draft, commonModel, superSolids, subGroups, snapshot } = fullChain();
      return buildIntegratedScene3d(draft, { superSolids, subGroups, commonModel, snapshot });
    })();
    const b = (() => {
      const { draft, commonModel, superSolids, subGroups, snapshot } = fullChain();
      return buildIntegratedScene3d(draft, { superSolids, subGroups, commonModel, snapshot });
    })();
    expect(a.substructureBoxes).toEqual(b.substructureBoxes);
    expect(a.superstructureBoxes).toEqual(b.superstructureBoxes);
    expect(a.consistency).toEqual(b.consistency);
  });

  it("detects a planted support-position mismatch", () => {
    const { draft, commonModel, superSolids, subGroups, snapshot } = fullChain();
    const shifted = subGroups.map((group) => {
      if (group.supportId !== "P4") return group;
      return {
        ...group,
        transform: {
          ...group.transform,
          origin: { x: group.transform.origin.x + 5, y: group.transform.origin.y, z: group.transform.origin.z },
        },
      };
    });
    const scene = buildIntegratedScene3d(draft, {
      superSolids,
      subGroups: shifted,
      commonModel,
      snapshot,
    });
    expect(scene.consistency.supportsMatch).toBe(false);
    expect(scene.consistency.mismatches.length).toBeGreaterThan(0);
  });
});
