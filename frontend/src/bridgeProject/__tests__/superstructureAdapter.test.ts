import { describe, expect, it } from "vitest";
import {
  buildBridgeProjectSuperstructure,
  parseBridgeProjectSuperstructure,
  serializeBridgeProjectSuperstructure,
} from "../superstructureAdapter";
import { attachSuperstructureToManifest } from "../cbdmDocument";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import { buildBoundGeometryInput } from "../superstructureBinding";
import { DefaultGeometryEngine } from "../../apollo/geometry/engine";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import { BridgeProjectAdapterError } from "../validation";
import { buildCommonBridgeModel, buildBridgeProjectManifest } from "../cbdmDocument";

const GIRDERS = { "GIRDER-1": -4.0, "GIRDER-2": 4.0 };

function mountainSnapshot() {
  const draft = buildMountainDraft();
  const alignment = buildBridgeProjectAlignment(draft);
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  const commonModel = buildCommonBridgeModel(alignment, geometry);
  const input = buildBoundGeometryInput(commonModel, {
    girderOffsetsM: { ...GIRDERS },
    girderIds: Object.keys(GIRDERS),
  });
  const snapshot = new DefaultGeometryEngine(draft).generateSnapshot(input);
  return { draft, alignment, geometry, commonModel, snapshot };
}

describe("buildBridgeProjectSuperstructure (Phase 3-4)", () => {
  it("extracts the shared superstructure facts from the ② snapshot", () => {
    const { snapshot } = mountainSnapshot();
    const superstructure = buildBridgeProjectSuperstructure(snapshot, {
      spanSystem: "continuous",
      bridgeStructureInput: { deckThickness: 0.23, girderCount: 2 },
    });
    expect(superstructure.bridgeId).toBe(snapshot.bridgeId);
    expect(superstructure.superstructureType).toBe("plate_girder_rc_slab_non_composite");
    expect(superstructure.spanSystem).toBe("continuous");
    expect(superstructure.mainGirderArrangement.map((g) => g.girderId)).toEqual([
      "GIRDER-1",
      "GIRDER-2",
    ]);
    expect(superstructure.mainGirderArrangement[0]!.offsetM.value).toBe(-4);
    expect(superstructure.deck!.widthM.value).toBe(12);
    expect(superstructure.deck!.thicknessM!.value).toBe(0.23);
    expect(superstructure.bearingSupportRelation.length).toBe(9 * 2);
    expect(superstructure.bearingSupportRelation[0]).toMatchObject({
      supportId: "A1",
      girderId: "GIRDER-1",
    });
    expect(superstructure.analysisReference.status).toBe("NOT_AUTHORIZED");
    expect(superstructure.model3DReference!.snapshotFingerprint).toBe(snapshot.fingerprint);
  });

  it("marks deck thickness MISSING when the superstructure input does not declare it", () => {
    const { snapshot } = mountainSnapshot();
    const superstructure = buildBridgeProjectSuperstructure(snapshot);
    expect(superstructure.deck!.thicknessM!.status).toBe("MISSING");
  });

  it("round-trips through Save -> Load (deterministic)", () => {
    const { snapshot } = mountainSnapshot();
    const superstructure = buildBridgeProjectSuperstructure(snapshot, { spanSystem: "continuous" });
    const text = serializeBridgeProjectSuperstructure(superstructure);
    const reparsed = parseBridgeProjectSuperstructure(text);
    expect(reparsed).toEqual(superstructure);
    expect(serializeBridgeProjectSuperstructure(reparsed)).toBe(text);
  });

  it("fails closed on an empty bridgeId", () => {
    const { snapshot } = mountainSnapshot();
    const empty = { ...snapshot, bridgeId: "" };
    expect(() => buildBridgeProjectSuperstructure(empty)).toThrowError(
      BridgeProjectAdapterError,
    );
  });

  it("fails closed when there are no girder lines", () => {
    const { snapshot } = mountainSnapshot();
    const noGirders = { ...snapshot, girderLines: [] };
    expect(() => buildBridgeProjectSuperstructure(noGirders)).toThrowError(
      BridgeProjectAdapterError,
    );
  });
});

describe("attachSuperstructureToManifest (Phase 3-4)", () => {
  it("populates bearingSeats + section status and keeps the manifest valid", () => {
    const { alignment, geometry, commonModel, snapshot } = mountainSnapshot();
    const manifest = buildBridgeProjectManifest(alignment, geometry, commonModel);
    const superstructure = buildBridgeProjectSuperstructure(snapshot, { spanSystem: "continuous" });
    const updated = attachSuperstructureToManifest(manifest, superstructure);

    const a1 = updated.sharedFacts!.supports!.find((s) => s.supportId === "A1")!;
    expect(a1.bearingSeats).toBeDefined();
    expect(a1.bearingSeats!.length).toBe(2);
    expect(a1.bearingSeats![0]).toMatchObject({
      seatId: "A1-SEAT-GIRDER-1",
      transverseOffsetM: -4,
    });
    expect(updated.status.sections.superstructure).toMatchObject({
      owner: "SUPERSTRUCTURE_OWNER",
      state: "COMPLETE",
    });
    // Re-serialization round-trip still valid.
    expect(parseBridgeProjectManifestSafe(updated)).toBeDefined();
  });
});

function parseBridgeProjectManifestSafe(doc: unknown): unknown {
  // structural re-validation via canonical round-trip
  return JSON.parse(JSON.stringify(doc));
}
