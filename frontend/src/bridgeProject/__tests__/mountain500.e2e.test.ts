import { describe, expect, it } from "vitest";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import {
  buildCommonBridgeModel,
  buildBridgeProjectManifest,
  parseCommonBridgeModel,
  parseBridgeProjectManifest,
  serializeCommonBridgeModel,
  serializeBridgeProjectManifest,
} from "../cbdmDocument";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import {
  BRIDGE_ABUTMENT_STATIONS,
  BRIDGE_PIER_STATIONS,
  BRIDGE_SPAN_PIER_PAIRS,
} from "../../liner/samples/mountain-viaduct-500/bridgeStations";
import { pointAtStationOffset } from "../../liner/core/coordinate3d";
import { CommonModelGeometryInputAdapter } from "../../apollo/geometry/geometryInputAdapter";

function runFullChain() {
  const draft = buildMountainDraft();
  const alignment = buildBridgeProjectAlignment(draft);
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  const cbdm = buildCommonBridgeModel(alignment, geometry);
  const manifest = buildBridgeProjectManifest(alignment, geometry, cbdm);
  return { draft, alignment, geometry, cbdm, manifest };
}

describe("mountain-viaduct-500 E2E: liner -> BridgeProject -> BridgeGeometry", () => {
  it("reproduces the expected bridge facts (A1/A2, P1-P7, 8 spans, 400m)", () => {
    const { alignment, geometry } = runFullChain();

    // Alignment extent
    expect(alignment.bridgeStartStationM.value).toBe(50);
    expect(alignment.bridgeEndStationM.value).toBe(450);
    expect(alignment.bridgeLengthM.value).toBe(400);

    // Supports: A1 + P1..P7 + A2, ascending
    const supportIds = geometry.supports.map((support) => support.supportId);
    expect(supportIds).toEqual(["A1", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "A2"]);
    expect(geometry.supports.map((support) => support.stationM.value)).toEqual([
      50, 100, 150, 200, 250, 300, 350, 400, 450,
    ]);

    // Spans match the reference span pairs, sum = bridge length
    expect(geometry.spans.length).toBe(8);
    geometry.spans.forEach((span, index) => {
      expect(span.startSupportId).toBe(BRIDGE_SPAN_PIER_PAIRS[index]![0]);
      expect(span.endSupportId).toBe(BRIDGE_SPAN_PIER_PAIRS[index]![1]);
    });
    const spanSum = geometry.spans.reduce((acc, span) => acc + span.lengthM.value!, 0);
    expect(spanSum).toBe(geometry.bridgeLengthM.value);

    // Skew: pi/2 rad for every support (sample input)
    for (const support of geometry.supports) {
      expect(support.skewRad.value).toBeCloseTo(Math.PI / 2, 9);
    }

    // Deck width derived from the cross-section (12 m)
    expect(geometry.deckWidthM!.value).toBeCloseTo(12, 6);
  });

  it("places support XYZ exactly on the Liner solver output (no reimplementation)", () => {
    const { draft, geometry } = runFullChain();
    const p4 = geometry.supports.find((support) => support.supportId === "P4")!;
    const direct = pointAtStationOffset(draft, 250, 0);
    expect(direct.ok).toBe(true);
    if (direct.ok) {
      expect(p4.position.x.value).toBeCloseTo(direct.value.x, 9);
      expect(p4.position.y.value).toBeCloseTo(direct.value.y, 9);
      expect(p4.position.z.value).toBeCloseTo(direct.value.z, 9);
      expect(p4.tangent.x.value).toBeCloseTo(direct.value.localFrame.tangent.x, 9);
    }
  });

  it("is fully deterministic across two runs (bytes identical after save/load)", () => {
    const first = runFullChain();
    const second = runFullChain();

    const cbdmText1 = serializeCommonBridgeModel(first.cbdm);
    const cbdmText2 = serializeCommonBridgeModel(second.cbdm);
    expect(cbdmText2).toBe(cbdmText1);

    const manifestText1 = serializeBridgeProjectManifest(first.manifest);
    const manifestText2 = serializeBridgeProjectManifest(second.manifest);
    expect(manifestText2).toBe(manifestText1);
  });

  it("preserves meaning/values/status/source across Save -> Load (CBDM + manifest)", () => {
    const { cbdm, manifest } = runFullChain();

    const cbdmText = serializeCommonBridgeModel(cbdm);
    const loadedCbdm = parseCommonBridgeModel(cbdmText);
    expect(loadedCbdm).toEqual(cbdm);

    const manifestText = serializeBridgeProjectManifest(manifest);
    const loadedManifest = parseBridgeProjectManifest(manifestText);
    expect(loadedManifest).toEqual(manifest);

    const p4 = loadedCbdm.bridgeGeometry.supports.find((support) => support.id === "P4")!;
    expect(p4.fields.stationM).toMatchObject({ state: "CONFIRMED", value: 250, unit: "m" });
    expect(p4.fields.x).toMatchObject({ state: "DERIVED", unit: "m" });
    expect(loadedCbdm.bridgeGeometry.spans.length).toBe(8);
    expect(loadedCbdm.bridgeGeometry.supports.length).toBe(9);
  });

  it("replays deterministically after reload (rebuild from the same input)", () => {
    const original = runFullChain();
    const originalText = serializeCommonBridgeModel(original.cbdm);

    const draft = buildMountainDraft();
    const alignment2 = buildBridgeProjectAlignment(draft);
    const geometry2 = buildBridgeProjectGeometry(alignment2, draft.piers, draft.spans);
    const cbdm2 = buildCommonBridgeModel(alignment2, geometry2);
    expect(serializeCommonBridgeModel(cbdm2)).toBe(originalText);
  });

  it("marks numeric design values NOT_AUTHORIZED at the document level (fail-closed)", () => {
    const { cbdm } = runFullChain();
    expect(cbdm.metadata.numericDesignAuthorization).toBe("NOT_GRANTED");
    expect(cbdm.metadata.designOrConstructionUse).toBe("PROHIBITED");
    expect(cbdm.analysisReference.status).toBe("NOT_AVAILABLE");
  });

  it("lets the existing CommonModelGeometryInputAdapter consume the numeric bridgeGeometry (Phase 3-3 prep)", () => {
    const { cbdm } = runFullChain();
    const adapter = new CommonModelGeometryInputAdapter();
    const input = adapter.adapt(cbdm);
    expect(input.supports.length).toBe(9);
    const p4 = input.supports.find((support) => support.id === "P4")!;
    expect(p4.stationM).toBe(250);
    expect(p4.skewRad).toBeCloseTo(Math.PI / 2, 9);
    expect(input.gridPointIds.length).toBe(0);
    // Alignment ids are surfaced so Phase 3-3 can bind the real Liner draft.
    expect(input.alignmentIds.length).toBeGreaterThanOrEqual(1);
  });

  it("reports alignment samples that cover every pier/abutment station", () => {
    const { alignment } = runFullChain();
    const expected = [...BRIDGE_ABUTMENT_STATIONS, ...BRIDGE_PIER_STATIONS].sort((a, b) => a - b);
    const sampled = alignment.stations
      .filter((station) => station.supportId !== undefined)
      .map((station) => station.stationM.value!)
      .sort((a, b) => a - b);
    expect(sampled).toEqual(expected);
  });
});
