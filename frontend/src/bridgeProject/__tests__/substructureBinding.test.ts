import { describe, expect, it } from "vitest";
import { buildBoundSubstructure, buildBoundReactions } from "../substructureBinding";
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
import { BridgeProjectAdapterError } from "../validation";
import type { BridgeProject } from "../../contracts/bridgeProject";

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
  return { commonModel, manifest, alignment, geometry };
}

describe("buildBoundSubstructure (Phase 3-5)", () => {
  it("binds the CBDM supports into 9 substructure Supports (A1/P1..P7/A2)", () => {
    const { commonModel, manifest } = mountainChain();
    const supports = buildBoundSubstructure(commonModel, manifest);
    expect(supports.map((s) => s.supportId)).toEqual([
      "A1", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "A2",
    ]);
    expect(supports[0]!.supportType).toBe("abutment");
    expect(supports[8]!.supportType).toBe("abutment");
    expect(supports[4]!.supportType).toBe("pier");
    // station parity with the BridgeProject CBDM
    expect(supports[0]!.placement.station).toBe(50);
    expect(supports[8]!.placement.station).toBe(450);
    // skew bound (rad)
    expect(supports[4]!.skewRad).toBeCloseTo(Math.PI / 2, 9);
    // placement source = liner (real alignment authority)
    expect(supports[0]!.placement.source).toBe("liner");
  });

  it("binds bearing seats from the manifest sharedFacts (superstructure incidence)", () => {
    const { commonModel, manifest } = mountainChain();
    const supports = buildBoundSubstructure(commonModel, manifest);
    const a1 = supports.find((s) => s.supportId === "A1")!;
    expect(a1.bearingSeats.length).toBe(2);
    expect(a1.bearingSeats[0]!.seatId).toBe("A1-SEAT-GIRDER-1");
    expect(a1.bearingSeats[0]!.position.y).toBe(-4);
    // initial pier/abutment shape is SUBSTRUCTURE-owned (has a footing)
    expect(a1.abutment).toBeDefined();
    expect(supports[4]!.pier).toBeDefined();
  });

  it("fails closed when the CBDM has no supports", () => {
    const { commonModel } = mountainChain();
    const empty = { ...commonModel, bridgeGeometry: { ...commonModel.bridgeGeometry, supports: [] } };
    expect(() => buildBoundSubstructure(empty)).toThrowError(BridgeProjectAdapterError);
  });

  it("fails closed when a support has no declared station", () => {
    const { commonModel } = mountainChain();
    const noStation = {
      ...commonModel,
      bridgeGeometry: {
        ...commonModel.bridgeGeometry,
        supports: commonModel.bridgeGeometry.supports.map((s, i) =>
          i === 0 ? { ...s, fields: { kind: s.fields.kind } } : s,
        ),
      },
    };
    expect(() => buildBoundSubstructure(noStation)).toThrowError(BridgeProjectAdapterError);
  });
});

describe("buildBoundReactions (Phase 3-5 NOT_AUTHORIZED guard)", () => {
  it("surfaces NOT_AUTHORIZED reactions as input data only", () => {
    const { manifest } = mountainChain();
    const withReactions: BridgeProject = {
      ...manifest,
      sharedFacts: {
        ...manifest.sharedFacts,
        reactions: [
          {
            supportId: "P4",
            caseKind: "permanent",
            status: "NOT_AUTHORIZED",
            stateReason: "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
          },
        ],
      },
    };
    const reactions = buildBoundReactions(withReactions);
    expect(reactions.length).toBe(1);
    expect(reactions[0]!.supportId).toBe("P4");
    expect(reactions[0]!.cases[0]!.caseKind).toBe("permanent");
    expect(reactions[0]!.source).toBe("bridge-project");
    expect(reactions[0]!.sourceRevision).toContain("manifest-rev");
  });

  it("fails closed if a reaction claims CONFIRMED", () => {
    const { manifest } = mountainChain();
    const bad: BridgeProject = {
      ...manifest,
      sharedFacts: {
        ...manifest.sharedFacts,
        reactions: [
          { supportId: "P4", caseKind: "permanent", status: "CONFIRMED" as never },
        ],
      },
    };
    expect(() => buildBoundReactions(bad)).toThrowError(BridgeProjectAdapterError);
  });

  it("returns an empty list when no reactions exist", () => {
    const { manifest } = mountainChain();
    expect(buildBoundReactions(manifest)).toEqual([]);
  });
});
