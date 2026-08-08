import { describe, expect, it } from "vitest";
import {
  buildCommonBridgeModel,
  buildBridgeProjectManifest,
  mapBpValueToCbdm,
  parseBridgeProjectManifest,
  parseCommonBridgeModel,
  serializeBridgeProjectManifest,
  serializeCommonBridgeModel,
} from "../cbdmDocument";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import { canonicalJsonForChecksum } from "../../contracts/legacy/checksum";
import { bpConfirmed, bpDerived, bpDeferred, bpMissing } from "../types";

function mountainChain() {
  const draft = buildMountainDraft();
  const alignment = buildBridgeProjectAlignment(draft);
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  return { draft, alignment, geometry };
}

describe("mapBpValueToCbdm", () => {
  it("maps CONFIRMED to a CONFIRMED ResolvedValue with authority", () => {
    const mapped = mapBpValueToCbdm(bpConfirmed(50, "m", "A1"));
    expect(mapped).toMatchObject({
      state: "CONFIRMED",
      value: 50,
      unit: "m",
      authority: "USER_PROVIDED_UNVERIFIED",
    });
  });

  it("maps DERIVED to a DERIVED ResolvedValue with derivedFrom + generatedBy", () => {
    const mapped = mapBpValueToCbdm(bpDerived(400, "m", "end-start", "tool"));
    expect(mapped).toMatchObject({
      state: "DERIVED",
      value: 400,
      unit: "m",
      derivedFrom: "end-start",
      generatedBy: "tool",
    });
  });

  it("maps MISSING to HOLD_INSUFFICIENT_SOURCE and DEFERRED to DEFERRED", () => {
    expect(mapBpValueToCbdm(bpMissing("m", "no vertical profile"))).toMatchObject({
      state: "HOLD_INSUFFICIENT_SOURCE",
      stateReason: "no vertical profile",
    });
    expect(mapBpValueToCbdm(bpDeferred("rad", "skew pending"))).toMatchObject({
      state: "DEFERRED",
      stateReason: "skew pending",
    });
  });
});

describe("buildCommonBridgeModel", () => {
  it("produces a schema-valid CBDM document carrying alignments + bridgeGeometry", () => {
    const { alignment, geometry } = mountainChain();
    const doc = buildCommonBridgeModel(alignment, geometry);
    expect(doc.documentKind).toBe("common-bridge-data-model");
    expect(doc.alignments.alignments.length).toBeGreaterThan(0);
    expect(doc.bridgeGeometry.supports.length).toBe(9);
    expect(doc.bridgeGeometry.spans.length).toBe(8);
    expect(doc.bridgeGeometry.girders).toEqual([]);
    expect(doc.analysisReference.status).toBe("NOT_AVAILABLE");
    expect(doc.contentChecksum.hexDigest).not.toBe("0".repeat(64));
    expect(doc.metadata.numericDesignAuthorization).toBe("NOT_GRANTED");
  });

  it("writes support station/skew with the keys the geometry input adapter reads", () => {
    const { alignment, geometry } = mountainChain();
    const doc = buildCommonBridgeModel(alignment, geometry);
    const p4 = doc.bridgeGeometry.supports.find((support) => support.id === "P4")!;
    expect(p4.fields.station).toMatchObject({ state: "CONFIRMED", value: 250, unit: "m" });
    expect(p4.fields.stationM).toMatchObject({ state: "CONFIRMED", value: 250, unit: "m" });
    expect(p4.fields.skewRad).toMatchObject({ state: "CONFIRMED" });
    expect(p4.fields.x).toMatchObject({ state: "DERIVED", unit: "m" });
  });

  it("is deterministic across two builds", () => {
    const { alignment: a1, geometry: g1 } = mountainChain();
    const { alignment: a2, geometry: g2 } = mountainChain();
    const d1 = buildCommonBridgeModel(a1, g1);
    const d2 = buildCommonBridgeModel(a2, g2);
    expect(d1).toEqual(d2);
    expect(serializeCommonBridgeModel(d1)).toBe(serializeCommonBridgeModel(d2));
  });
});

describe("CBDM Save/Load/Replay round-trip", () => {
  it("serialize -> parse -> identical document", () => {
    const { alignment, geometry } = mountainChain();
    const doc = buildCommonBridgeModel(alignment, geometry);
    const text = serializeCommonBridgeModel(doc);
    const reparsed = parseCommonBridgeModel(text);
    expect(reparsed).toEqual(doc);
  });

  it("replay: rebuilding from the same input reproduces the serialized bytes", () => {
    const { alignment, geometry } = mountainChain();
    const doc = buildCommonBridgeModel(alignment, geometry);
    const text1 = serializeCommonBridgeModel(doc);

    // Replay = re-run the whole chain from the serialized input facts.
    const draft = buildMountainDraft();
    const alignment2 = buildBridgeProjectAlignment(draft);
    const geometry2 = buildBridgeProjectGeometry(alignment2, draft.piers, draft.spans);
    const doc2 = buildCommonBridgeModel(alignment2, geometry2);
    expect(serializeCommonBridgeModel(doc2)).toBe(text1);
  });

  it("rejects NaN / Infinity during serialization (fail-closed)", () => {
    expect(() => canonicalJsonForChecksum({ value: Number.NaN })).toThrow();
    expect(() => canonicalJsonForChecksum({ value: Number.POSITIVE_INFINITY })).toThrow();
  });
});

describe("buildBridgeProjectManifest", () => {
  it("builds a schema-valid manifest referencing the common model", () => {
    const { alignment, geometry } = mountainChain();
    const cbdm = buildCommonBridgeModel(alignment, geometry);
    const manifest = buildBridgeProjectManifest(alignment, geometry, cbdm);
    expect(manifest.documentKind).toBe("bridge-project");
    expect(manifest.references.commonModel).toBeDefined();
    expect(manifest.references.commonModel!.documentId).toBe(cbdm.documentId);
    expect(manifest.sharedFacts?.supports?.length).toBe(9);
    expect(manifest.status.sections.alignment.owner).toBe("ALIGNMENT_OWNER");
    expect(manifest.status.sections.bridgeGeometry.owner).toBe("BRIDGE_PROJECT_SHARED");
  });

  it("serialize -> parse round-trip", () => {
    const { alignment, geometry } = mountainChain();
    const cbdm = buildCommonBridgeModel(alignment, geometry);
    const manifest = buildBridgeProjectManifest(alignment, geometry, cbdm);
    const text = serializeBridgeProjectManifest(manifest);
    const reparsed = parseBridgeProjectManifest(text);
    expect(reparsed).toEqual(manifest);
  });
});
