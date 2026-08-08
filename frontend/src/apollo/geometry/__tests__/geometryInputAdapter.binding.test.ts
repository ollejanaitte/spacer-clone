import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CommonModelGeometryInputAdapter } from "../geometryInputAdapter";
import { buildBridgeProjectAlignment } from "../../../bridgeProject/alignmentAdapter";
import { buildBridgeProjectGeometry } from "../../../bridgeProject/bridgeGeometryGenerator";
import { buildCommonBridgeModel } from "../../../bridgeProject/cbdmDocument";
import { buildMountainDraft } from "../../../liner/samples/mountain-viaduct-500/fixture";

const LEGACY_FIXTURE = resolve(
  process.cwd(),
  "../docs/apollo/step10/reference_bridge_001/phase5/fixtures/reference_bridge_001_common_model.json",
);

function mountainCbdm() {
  const draft = buildMountainDraft();
  const alignment = buildBridgeProjectAlignment(draft);
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  return buildCommonBridgeModel(alignment, geometry);
}

describe("CommonModelGeometryInputAdapter (Phase 3-3 numeric binding)", () => {
  it("extracts spanLengthsM ordered by start station from the Phase 3-2 CBDM", () => {
    const input = new CommonModelGeometryInputAdapter().adapt(mountainCbdm());
    expect(input.spanLengthsM).toEqual([50, 50, 50, 50, 50, 50, 50, 50]);
  });

  it("extracts bridgeLengthM from the alignment aggregate", () => {
    const input = new CommonModelGeometryInputAdapter().adapt(mountainCbdm());
    expect(input.bridgeLengthM).toBe(400);
  });

  it("extracts support stationM/skewRad as numeric values", () => {
    const input = new CommonModelGeometryInputAdapter().adapt(mountainCbdm());
    expect(input.supports.length).toBe(9);
    expect(input.supports[0]!.stationM).toBe(50);
    expect(input.supports[4]!.stationM).toBe(250);
    expect(input.supports[4]!.skewRad).toBeCloseTo(Math.PI / 2, 9);
  });

  it("extracts deckSpecs width from deck entities", () => {
    const input = new CommonModelGeometryInputAdapter().adapt(mountainCbdm());
    expect(input.deckSpecs).toEqual([{ deckId: expect.any(String), widthM: 12 }]);
  });

  it("never invents numeric values for a legacy fixture without them", () => {
    const legacy = JSON.parse(readFileSync(LEGACY_FIXTURE, "utf8")) as unknown;
    const input = new CommonModelGeometryInputAdapter().adapt(legacy);
    // Legacy fixture has no numeric span/bridge-length fields -> stay undefined.
    expect(input.spanLengthsM).toBeUndefined();
    expect(input.bridgeLengthM).toBeUndefined();
    expect(input.deckSpecs).toBeUndefined();
    // Supports without station values stay empty.
    for (const support of input.supports) {
      expect(support.stationM).toBeUndefined();
      expect(support.skewRad).toBeUndefined();
    }
  });
});
