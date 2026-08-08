import { describe, expect, it } from "vitest";
import { buildBoundGeometryInput, BINDING_CODES } from "../superstructureBinding";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import { buildCommonBridgeModel } from "../cbdmDocument";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import { BridgeProjectAdapterError } from "../validation";
import { DefaultGeometryEngine } from "../../apollo/geometry/engine";

const MOUNTAIN_GIRDERS = {
  "GIRDER-1": -4.0,
  "GIRDER-2": 4.0,
} as const;

function mountainCbdm() {
  const draft = buildMountainDraft();
  const alignment = buildBridgeProjectAlignment(draft);
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  return buildCommonBridgeModel(alignment, geometry);
}

function bound() {
  return buildBoundGeometryInput(mountainCbdm(), {
    girderOffsetsM: { ...MOUNTAIN_GIRDERS },
    girderIds: Object.keys(MOUNTAIN_GIRDERS),
  });
}

describe("buildBoundGeometryInput (Phase 3-3)", () => {
  it("produces a numeric GeometryEngineInput from the BridgeProject CBDM", () => {
    const input = bound();
    expect(input.supports.length).toBe(9);
    expect(input.supports[0]!.stationM).toBe(50);
    expect(input.supports[4]!.skewRad).toBeCloseTo(Math.PI / 2, 9);
    expect(input.bridgeLengthM).toBe(400);
    expect(input.spanLengthsM).toEqual([50, 50, 50, 50, 50, 50, 50, 50]);
    expect(input.girders.map((g) => g.id)).toEqual(["GIRDER-1", "GIRDER-2"]);
    expect(input.girderOffsetsM).toEqual(MOUNTAIN_GIRDERS);
  });

  it("fails closed when the CBDM has no supports", () => {
    const cbdm = mountainCbdm();
    const empty = { ...cbdm, bridgeGeometry: { ...cbdm.bridgeGeometry, supports: [] } };
    expect(() =>
      buildBoundGeometryInput(empty, { girderOffsetsM: { ...MOUNTAIN_GIRDERS } }),
    ).toThrowError(BridgeProjectAdapterError);
  });

  it("fails closed when supports lack declared stations", () => {
    const cbdm = mountainCbdm();
    const noStations = {
      ...cbdm,
      bridgeGeometry: {
        ...cbdm.bridgeGeometry,
        supports: cbdm.bridgeGeometry.supports.map((support) => ({
          ...support,
          fields: { kind: support.fields.kind },
        })),
      },
    };
    expect(() =>
      buildBoundGeometryInput(noStations, { girderOffsetsM: { ...MOUNTAIN_GIRDERS } }),
    ).toThrowError(BridgeProjectAdapterError);
    try {
      buildBoundGeometryInput(noStations, { girderOffsetsM: { ...MOUNTAIN_GIRDERS } });
    } catch (error) {
      expect((error as BridgeProjectAdapterError).code).toBe(BINDING_CODES.MISSING_STATION);
    }
  });

  it("derives bridge length from the support span when the aggregate field is absent", () => {
    const cbdm = mountainCbdm();
    const noAggregateLength = {
      ...cbdm,
      alignments: {
        alignments: cbdm.alignments.alignments.map((alignment, index) =>
          index === 0 ? { ...alignment, fields: { unitSystem: alignment.fields.unitSystem } } : alignment,
        ),
      },
    };
    const input = buildBoundGeometryInput(noAggregateLength, {
      girderOffsetsM: { ...MOUNTAIN_GIRDERS },
    });
    expect(input.bridgeLengthM).toBe(400);
  });

  it("fails closed when girder offsets are absent (superstructure-owned, not invented)", () => {
    expect(() => buildBoundGeometryInput(mountainCbdm())).toThrowError(
      BridgeProjectAdapterError,
    );
  });

  it("fails closed when spans are missing", () => {
    const cbdm = mountainCbdm();
    const noSpans = { ...cbdm, bridgeGeometry: { ...cbdm.bridgeGeometry, spans: [] } };
    expect(() =>
      buildBoundGeometryInput(noSpans, { girderOffsetsM: { ...MOUNTAIN_GIRDERS } }),
    ).toThrowError(BridgeProjectAdapterError);
  });

  it("keeps the Liner draft as the geometry authority (engine consumes stations + skew)", () => {
    const draft = buildMountainDraft();
    const engine = new DefaultGeometryEngine(draft);
    const snapshot = engine.generateSnapshot(bound());
    expect(snapshot.supportLines.map((line) => line.stationM.value)).toEqual([
      50, 100, 150, 200, 250, 300, 350, 400, 450,
    ]);
    expect(snapshot.supportLines[0]!.skewRad.value).toBeCloseTo(Math.PI / 2, 9);
  });
});
