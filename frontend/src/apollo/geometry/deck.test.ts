import { describe, expect, it } from "vitest";
import type { LinearAlignment } from "../../liner/core/types";
import { LinerAlignmentConnector } from "./alignmentConnector";
import { buildDeckReference, deckEdgeOffsetsFromWidth, RB001_DECK_SPEC } from "./deck";

const ALIGNMENT: LinearAlignment = {
  id: "ALN-ACL",
  linerModelId: "RB-S10-001",
  coordinatePolicyId: "global",
  elements: [
    { type: "straight", id: "L1", start: { x: 0, y: 0 }, azimuth: 0, length: 134.001 },
  ],
};

function buildConnector(): LinerAlignmentConnector {
  return new LinerAlignmentConnector({
    alignment: ALIGNMENT,
    stationDefinition: { originDisplayedStation: 0, interval: 10 },
    offsets: [0],
    z: 0,
    computedAt: "2026-01-01T00:00:00.000Z",
  });
}

describe("deck reference / boundary (Phase 6-2)", () => {
  it("derives centred edge offsets from total width", () => {
    expect(deckEdgeOffsetsFromWidth(8.01)).toEqual({ left: -4.005, right: 4.005 });
  });

  it("builds a deck reference with golden dimensions and boundary", () => {
    const deck = buildDeckReference(
      { spec: RB001_DECK_SPEC, stationStartM: 0, stationEndM: 134.001, alignmentId: "ALN-ACL" },
      buildConnector(),
    );
    expect(deck.deckId).toBe("DECK-01");
    expect(deck.widthM.value).toBeCloseTo(8.01, 9); // G-GEO-0017
    expect(deck.thicknessM.value).toBeCloseTo(0.23, 9); // G-GEO-0018
    expect(deck.elevationM?.value).toBeCloseTo(10.0, 9); // G-GEO-0032
    expect(deck.edgeOffsetM).toEqual({ left: -4.005, right: 4.005 });
    expect(deck.boundary).toHaveLength(4);
    // boundary corners sampled from LINER straight alignment
    expect(deck.boundary![0].x).toBeCloseTo(0, 9);
    expect(deck.boundary![0].y).toBeCloseTo(-4.005, 9); // start-left
    expect(deck.boundary![2].x).toBeCloseTo(134.001, 9); // end-right
    expect(deck.boundary![2].y).toBeCloseTo(4.005, 9);
  });
});
