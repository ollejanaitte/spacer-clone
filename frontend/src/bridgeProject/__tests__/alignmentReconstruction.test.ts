import { describe, expect, it } from "vitest";
import {
  reconstructAlignmentFromSample,
  reconstructionFactsFromSnapshot,
  reconstructionFactsFromSuperstructure,
  type ReconstructionSampleFacts,
} from "../alignmentReconstruction";
import { attachReconstructionToManifest } from "../cbdmDocument";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import { buildBridgeProjectManifest, buildCommonBridgeModel } from "../cbdmDocument";
import { buildBridgeProjectSuperstructure } from "../superstructureAdapter";
import { buildBoundGeometryInput } from "../superstructureBinding";
import { DefaultGeometryEngine } from "../../apollo/geometry/engine";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import { BridgeProjectAdapterError } from "../validation";

function mountainChain() {
  const draft = buildMountainDraft();
  const alignment = buildBridgeProjectAlignment(draft);
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  const commonModel = buildCommonBridgeModel(alignment, geometry);
  const input = buildBoundGeometryInput(commonModel, {
    girderOffsetsM: { "GIRDER-1": -4.0, "GIRDER-2": 4.0 },
    girderIds: ["GIRDER-1", "GIRDER-2"],
  });
  const snapshot = new DefaultGeometryEngine(draft).generateSnapshot(input);
  const superstructure = buildBridgeProjectSuperstructure(snapshot, { spanSystem: "continuous" });
  return { draft, commonModel, snapshot, superstructure, geometry };
}

// RB-001 declares spans 40.201/51.0/40.2 which do NOT sum to bridge length
// 134.001 (a real sample inconsistency: 131.401 vs 134.001). Reconstruction
// correctly fails closed on that; here we use the CONSISTENT span set that sums
// to the declared bridge length and matches the golden support stations.
const RB001_FACTS: ReconstructionSampleFacts = {
  bridgeId: "RB-S10-001",
  bridgeLengthM: 134.001,
  spanLengthsM: [40.201, 51.0, 42.8],
  supportIds: ["SUP-AR2", "SUP-PR1", "SUP-PR2", "SUP-PU15"],
  supportStationsM: [0, 40.201, 91.201, 134.001],
  deckWidthM: 8.01,
  girderOffsetsM: { "GIRDER-AG1": 1.47689, "GIRDER-AG2": -3.02859 },
  sourceReference: "rb001-sample:v1",
};

describe("reconstructAlignmentFromSample (Phase 3-8)", () => {
  it("reconstructs a partial alignment from RB-001 sample facts", () => {
    const { alignment, reconstruction } = reconstructAlignmentFromSample(RB001_FACTS);
    expect(alignment.bridgeLengthM.value).toBeCloseTo(134.001, 6);
    expect(alignment.bridgeStartStationM.value).toBe(0);
    expect(alignment.bridgeEndStationM.value).toBeCloseTo(134.001, 6);
    expect(alignment.stations.filter((s) => s.supportId !== undefined).length).toBe(4);
    // No vertical profile -> grade MISSING on every sample.
    const a1 = alignment.stations.find((s) => s.supportId === "SUP-AR2")!;
    expect(a1.grade!.status).toBe("MISSING");
    // Reconstruction entries present with the required statuses.
    const entries = reconstruction.entries!;
    expect(entries.find((e) => e.fieldKey === "bridgeLengthM")!.status).toBe("CONFIRMED");
    expect(entries.find((e) => e.fieldKey === "horizontalGeometry")!.status).toBe("INFERRED");
    expect(entries.find((e) => e.fieldKey === "verticalProfile")!.status).toBe("MISSING");
    expect(entries.find((e) => e.fieldKey === "crossfall")!.status).toBe("MISSING");
    expect(entries.find((e) => e.fieldKey === "deckWidthM")!.status).toBe("CONFIRMED");
    expect(reconstruction.source!.documentKind).toBe("bridge-superstructure-design");
  });

  it("marks support skew DEFERRED when the sample does not declare it", () => {
    const facts = { ...RB001_FACTS, supportSkewRads: [undefined, undefined, undefined, undefined] };
    const { reconstruction } = reconstructAlignmentFromSample(facts);
    const skew = reconstruction.entries!.find((e) => e.fieldKey === "supportSkewRad.SUP-AR2")!;
    expect(skew.status).toBe("DEFERRED");
    expect(skew.stateReason).toContain("not declared");
  });

  it("does NOT auto-promote INFERRED to CONFIRMED", () => {
    const { reconstruction } = reconstructAlignmentFromSample(RB001_FACTS);
    const horizontal = reconstruction.entries!.find((e) => e.fieldKey === "horizontalGeometry")!;
    expect(horizontal.status).toBe("INFERRED");
    expect(horizontal.status).not.toBe("CONFIRMED");
  });

  it("rejects a self-reconstruction cycle (①→②→①)", () => {
    expect(() =>
      reconstructAlignmentFromSample(RB001_FACTS, { generatingBridgeId: "RB-S10-001" }),
    ).toThrowError(BridgeProjectAdapterError);
  });

  it("fails closed on span sum mismatch", () => {
    const bad = { ...RB001_FACTS, spanLengthsM: [40.201, 51.0, 40.2, 5.0] };
    expect(() => reconstructAlignmentFromSample(bad)).toThrowError(BridgeProjectAdapterError);
  });

  it("is deterministic: identical facts produce identical output", () => {
    const a = reconstructAlignmentFromSample(RB001_FACTS);
    const b = reconstructAlignmentFromSample(RB001_FACTS);
    expect(a.alignment).toEqual(b.alignment);
    expect(a.reconstruction).toEqual(b.reconstruction);
  });

  it("extracts facts from a GeometrySnapshot and reconstructs", () => {
    const { snapshot } = mountainChain();
    const facts = reconstructionFactsFromSnapshot(snapshot);
    expect(facts.bridgeLengthM).toBe(400);
    expect(facts.spanLengthsM).toEqual([50, 50, 50, 50, 50, 50, 50, 50]);
    expect(facts.supportIds).toEqual(["A1", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "A2"]);
    const { alignment, reconstruction } = reconstructAlignmentFromSample(facts);
    expect(alignment.bridgeLengthM.value).toBe(400);
    expect(reconstruction.entries!.find((e) => e.fieldKey === "horizontalGeometry")!.status).toBe(
      "INFERRED",
    );
  });

  it("extracts facts from a BridgeProject.Superstructure record", () => {
    const { superstructure } = mountainChain();
    const facts = reconstructionFactsFromSuperstructure(superstructure, {
      spanLengthsM: [50, 50, 50, 50, 50, 50, 50, 50],
      supportStationsM: [50, 100, 150, 200, 250, 300, 350, 400, 450],
    });
    expect(facts.bridgeId).toBe(superstructure.bridgeId);
    expect(facts.supportIds).toContain("A1");
    expect(facts.deckWidthM).toBe(12);
    expect(Object.keys(facts.girderOffsetsM ?? {}).length).toBe(2);
  });

  it("attaches reconstruction to the manifest (CASE B origin) and stays valid", () => {
    const { geometry, commonModel, snapshot } = mountainChain();
    const alignment = buildBridgeProjectAlignment(buildMountainDraft());
    const manifest = buildBridgeProjectManifest(alignment, geometry, commonModel);
    const facts = reconstructionFactsFromSnapshot(snapshot);
    const { reconstruction } = reconstructAlignmentFromSample(facts);
    const updated = attachReconstructionToManifest(manifest, reconstruction);
    expect(updated.status.sections.alignment.state).toBe("PARTIAL");
    expect(updated.status.sections.alignment.owner).toBe("ALIGNMENT_OWNER");
    expect(updated.reconstruction).toBeDefined();
    expect(updated.reconstruction!.entries!.length).toBeGreaterThan(0);
  });
});
