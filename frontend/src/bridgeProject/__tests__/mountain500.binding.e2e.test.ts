import { describe, expect, it } from "vitest";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import { buildCommonBridgeModel, serializeCommonBridgeModel, parseCommonBridgeModel } from "../cbdmDocument";
import { buildBoundGeometryInput } from "../superstructureBinding";
import { DefaultGeometryEngine } from "../../apollo/geometry/engine";
import { buildSnapshotVisualizationModel } from "../../apollo/visualization/snapshotVisualizationModel";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import type { BuildIntermediateInput } from "../../liner/core/pipeline/pipeline";

const GIRDERS = { "GIRDER-1": -4.0, "GIRDER-2": 4.0 };

function buildChain(draft: BuildIntermediateInput) {
  const alignment = buildBridgeProjectAlignment(draft);
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  const commonModel = buildCommonBridgeModel(alignment, geometry);
  const input = buildBoundGeometryInput(commonModel, {
    girderOffsetsM: { ...GIRDERS },
    girderIds: Object.keys(GIRDERS),
  });
  const engine = new DefaultGeometryEngine(draft);
  return { alignment, geometry, commonModel, input, engine };
}

function mountain() {
  return buildChain(buildMountainDraft());
}

describe("Phase 3-3 E2E: mountain-500 ①→② (BridgeProject bound)", () => {
  it("CASE A-1: full chain produces a bound Geometry snapshot on the real alignment", () => {
    const { engine, input } = mountain();
    const snapshot = engine.generateSnapshot(input);

    // 400 m bridge, A1/A2 + P1..P7 at global alignment stations
    expect(snapshot.supportLines.map((line) => line.stationM.value)).toEqual([
      50, 100, 150, 200, 250, 300, 350, 400, 450,
    ]);
    expect(snapshot.supportLines[0]!.supportId).toBe("A1");
    expect(snapshot.supportLines[8]!.supportId).toBe("A2");
    // skew = pi/2 on every support
    for (const line of snapshot.supportLines) {
      expect(line.skewRad.value).toBeCloseTo(Math.PI / 2, 9);
    }
    // deck width bound from the cross-section
    expect(snapshot.deckReferences[0]!.widthM.value).toBe(12);
    // girder lines span the bridge extent
    expect(snapshot.girderLines[0]!.stationStartM).toBe(50);
    expect(snapshot.girderLines[0]!.stationEndM).toBe(450);
  });

  it("CASE A-1 3D: snapshot produces solid geometry (3D display payload)", () => {
    const { engine, input } = mountain();
    const snapshot = engine.generateSnapshot(input);
    const model = buildSnapshotVisualizationModel(snapshot, { bridgeName: "bridge-mtn" });
    expect(model.solidGeometryParameters.length).toBeGreaterThan(0);
  });

  it("CASE A-2: a road-alignment change propagates to the superstructure geometry", () => {
    const base = buildMountainDraft();
    const mutated = buildMountainDraft();
    // Move the downstream abutment A2 from station 450 to 460 (and the last span end).
    mutated.piers = (base.piers ?? []).map((pier) =>
      pier.id === "A2" ? { ...pier, physicalDistance: 460 } : pier,
    );
    mutated.spans = (base.spans ?? []).map((span) =>
      span.pierIdEnd === "A2" ? { ...span, endPhysicalDistance: 460 } : span,
    );

    const before = mountain().engine.generateSnapshot(buildChain(base).input);
    const after = buildChain(mutated).engine.generateSnapshot(buildChain(mutated).input);

    const beforeLength = before.alignmentReferences[0]!.bridgeLengthM.value!;
    const afterLength = after.alignmentReferences[0]!.bridgeLengthM.value!;
    // The bridge length + last support station reflect the change.
    expect(before.supportLines[8]!.stationM.value).toBe(450);
    expect(after.supportLines[8]!.stationM.value).toBe(460);
    expect(beforeLength).toBe(400);
    expect(afterLength).toBe(410);
    // Mutation is NOT ignored (no fixed sample values).
    expect(after.fingerprint).not.toBe(before.fingerprint);
  });

  it("CASE A-3: Save -> Load -> Replay reproduces the identical Geometry", () => {
    const { commonModel, engine, input } = mountain();
    const snapshot = engine.generateSnapshot(input);

    // Save: serialize the BridgeProject CBDM; Load: parse it back.
    const text = serializeCommonBridgeModel(commonModel);
    const loaded = parseCommonBridgeModel(text);
    const replayedInput = buildBoundGeometryInput(loaded, {
      girderOffsetsM: { ...GIRDERS },
      girderIds: Object.keys(GIRDERS),
    });

    // Replay: re-run the engine on the loaded input + the same Liner draft.
    const replayed = new DefaultGeometryEngine(buildMountainDraft()).generateSnapshot(replayedInput);
    expect(replayed).toEqual(snapshot);
  });

  it("is deterministic: two identical runs produce the same fingerprint", () => {
    const a = mountain().engine.generateSnapshot(mountain().input);
    const b = mountain().engine.generateSnapshot(mountain().input);
    expect(a.fingerprint).toBe(b.fingerprint);
  });
});
